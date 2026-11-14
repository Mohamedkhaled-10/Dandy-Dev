export const prerender = false;

// src/pages/api/admin/delete-order.js
// Protected Admin API for safely deleting an order, revoking invoice access,
// cancelling unsent outbox events, and writing idempotency/order tombstones.
import crypto from 'node:crypto';
import { getAdminDb } from '../../../utils/firebase-admin.ts';
import { verifyAdminRequest, adminUnauthorizedResponse } from '../../../utils/admin-auth.js';

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

const SENT_OR_AMBIGUOUS_OUTBOX_STATUSES = new Set([
  'sent',
  'accepted_by_mailapp',
  'unknown'
]);

function isPlainObject(val) {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...extraHeaders
    }
  });
}

function validateOrderId(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128 || /[.#$\[\]/]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export async function POST({ request, _deps = undefined }) {
  // 1. Validate Content-Type: application/json
  const contentType = (request?.headers?.get?.('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return jsonResponse(
      {
        success: false,
        error: 'INVALID_CONTENT_TYPE',
        message: 'نوع المحتوى غير مدعوم. يجب إرسال application/json.'
      },
      415
    );
  }

  // 2. Authenticate Admin (admin@dandy.com + email_verified === true) strictly via Bearer Token
  const authResult = await verifyAdminRequest(request, _deps);
  if (!authResult.authorized) {
    return adminUnauthorizedResponse(authResult);
  }
  const admin = authResult.admin;

  // 3. Parse JSON strictly
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'صيغة JSON المرسلة غير صالحة.'
      },
      400
    );
  }

  if (!isPlainObject(body)) {
    return jsonResponse(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'صيغة البيانات المرسلة غير صالحة.'
      },
      400
    );
  }

  const orderId = validateOrderId(body.orderId);
  if (!orderId) {
    return jsonResponse(
      {
        success: false,
        error: 'INVALID_ORDER_ID',
        message: 'معرف الطلب غير صالح.'
      },
      400
    );
  }

  // 4. Resolve Firebase Admin DB
  let adminDb = _deps?.adminDb !== undefined ? _deps.adminDb : null;
  if (!adminDb && !_deps?.simulateMissingDb) {
    try {
      adminDb = getAdminDb();
    } catch {
      adminDb = null;
    }
  }

  if (!adminDb || typeof adminDb.ref !== 'function') {
    return jsonResponse(
      {
        success: false,
        error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
        message: 'قاعدة البيانات غير متاحة مؤقتاً.'
      },
      503
    );
  }

  const nowIso = new Date().toISOString();
  const deleteAttemptId = crypto.randomUUID();
  const deletedOrderRef = adminDb.ref(`privateDeletedOrders/${orderId}`);

  // Track rollback handles if multi-path cleanup fails before committing
  let acquiredTombstoneLock = false;
  const fencedIdemRecords = [];

  const rollbackLocksSafely = async () => {
    for (const item of fencedIdemRecords) {
      try {
        await adminDb.ref(`privateOrderIdempotency/${item.requestKeyHash}`).transaction((cur) => {
          if (!isPlainObject(cur)) return undefined;
          if (cur.status !== 'DELETING' || cur.deleteAttemptId !== deleteAttemptId) {
            return undefined;
          }
          return item.previousRecord;
        });
      } catch (rbErr) {
        console.warn('[DeleteOrder] Failed rolling back idempotency fencing state:', rbErr?.code || 'rollback_err');
      }
    }

    if (acquiredTombstoneLock) {
      try {
        await deletedOrderRef.transaction((cur) => {
          if (!isPlainObject(cur)) return undefined;
          if (cur.status !== 'DELETING' || cur.deleteAttemptId !== deleteAttemptId) {
            return undefined;
          }
          return null;
        });
      } catch (rbErr) {
        console.warn('[DeleteOrder] Failed rolling back deletion tombstone lock:', rbErr?.code || 'rollback_err');
      }
    }
  };

  try {
    // 5. Step A — Single-path atomic CAS decision point on privateDeletedOrders/{orderId}
    let tombstoneBlockReason = null;
    const tombstoneTx = await deletedOrderRef.transaction((current) => {
      tombstoneBlockReason = null;
      if (isPlainObject(current)) {
        if (current.status === 'DELETED') {
          tombstoneBlockReason = 'ALREADY_DELETED';
          return undefined;
        }
        if (current.status === 'DELETING') {
          tombstoneBlockReason = 'DELETE_IN_PROGRESS';
          return undefined;
        }
      }
      return {
        orderId,
        status: 'DELETING',
        deleteAttemptId,
        requestedAt: nowIso,
        requestedBy: admin.email
      };
    });

    const tombstoneVal = tombstoneTx?.snapshot?.val?.();
    if (
      !tombstoneTx?.committed ||
      !isPlainObject(tombstoneVal) ||
      tombstoneVal.status !== 'DELETING' ||
      tombstoneVal.deleteAttemptId !== deleteAttemptId
    ) {
      if (tombstoneBlockReason === 'ALREADY_DELETED') {
        return jsonResponse(
          {
            success: false,
            error: 'ORDER_NOT_FOUND',
            message: 'هذا الطلب غير موجود أو تم حذفه مسبقاً.'
          },
          404
        );
      }
      return jsonResponse(
        {
          success: false,
          error: 'DELETE_IN_PROGRESS',
          message: 'عملية حذف هذا الطلب جارية بالفعل. يرجى الانتظار.'
        },
        409
      );
    }
    acquiredTombstoneLock = true;

    // 6. Step B — Inspect order, privateOrderAccess, privateInvoiceAccess, notifications_outbox, privateOrderIdempotency
    const [orderSnap, orderAccessSnap, idemQuerySnap, outboxQuerySnap, invQuerySnap] = await Promise.all([
      adminDb.ref(`orders/${orderId}`).once('value'),
      adminDb.ref(`privateOrderAccess/${orderId}`).once('value'),
      adminDb.ref('privateOrderIdempotency').orderByChild('reservedOrderId').equalTo(orderId).once('value'),
      adminDb.ref('notifications_outbox').orderByChild('orderId').equalTo(orderId).once('value'),
      adminDb.ref('privateInvoiceAccess').orderByChild('orderId').equalTo(orderId).once('value')
    ]);

    const existingOrder = orderSnap.val();
    const existingOrderAccess = orderAccessSnap.val();
    const idemMatches = isPlainObject(idemQuerySnap.val()) ? idemQuerySnap.val() : {};
    const outboxMatches = isPlainObject(outboxQuerySnap.val()) ? outboxQuerySnap.val() : {};
    const invQueryMatches = isPlainObject(invQuerySnap.val()) ? invQuerySnap.val() : {};

    // Check if any related idempotency record is active PENDING/COMMITTING, or fence each record atomically
    const idemKeys = Object.keys(idemMatches);
    for (const reqKeyHash of idemKeys) {
      let fenceRejectReason = null;
      let prevSnapshot = null;

      const idemTx = await adminDb.ref(`privateOrderIdempotency/${reqKeyHash}`).transaction((current) => {
        fenceRejectReason = null;
        prevSnapshot = null;
        if (!isPlainObject(current)) return undefined;
        if (current.reservedOrderId !== orderId) return undefined;

        if (current.status === 'PENDING' || current.status === 'COMMITTING') {
          fenceRejectReason = 'ORDER_IN_FLIGHT_OR_COMMITTING';
          return undefined;
        }
        if (current.status === 'DELETING') {
          fenceRejectReason = 'DELETE_IN_PROGRESS';
          return undefined;
        }
        if (current.status === 'DELETED') {
          return current;
        }

        prevSnapshot = JSON.parse(JSON.stringify(current));
        const {
          commitPayload: _stripPayload,
          commitPayloadSizeBytes: _stripSize,
          responseSummary: _stripSummary,
          ...rest
        } = current;

        return {
          ...rest,
          status: 'DELETING',
          deleteAttemptId,
          deletingAt: nowIso,
          updatedAt: nowIso
        };
      });

      if (fenceRejectReason === 'ORDER_IN_FLIGHT_OR_COMMITTING') {
        await rollbackLocksSafely();
        return jsonResponse(
          {
            success: false,
            error: 'ORDER_IN_FLIGHT_OR_COMMITTING',
            message: 'لا يمكن حذف الطلب أثناء وجود عملية إنشاء أو تثبيت نشطة (PENDING/COMMITTING).'
          },
          409
        );
      }

      if (fenceRejectReason === 'DELETE_IN_PROGRESS' || !idemTx?.committed) {
        await rollbackLocksSafely();
        return jsonResponse(
          {
            success: false,
            error: 'ORDER_DELETE_CONFLICT',
            message: 'تعذر حسم قفل الحذف بسبب تحديث متزامن للطلب. يرجى إعادة المحاولة.'
          },
          409
        );
      }

      if (prevSnapshot) {
        fencedIdemRecords.push({ requestKeyHash: reqKeyHash, previousRecord: prevSnapshot });
      }
    }

    // If neither order nor access nor idempotency records exist, roll back lock and return 404
    if (!isPlainObject(existingOrder) && !isPlainObject(existingOrderAccess) && idemKeys.length === 0) {
      await rollbackLocksSafely();
      return jsonResponse(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'الطلب غير موجود أو تم حذفه مسبقاً.'
        },
        404
      );
    }

    // 7. Build deterministic cleanup & tombstone update set
    const deleteUpdates = {};

    // Remove main order record
    deleteUpdates[`orders/${orderId}`] = null;

    // Revoke privateOrderAccess without retaining any plaintext or encrypted token
    deleteUpdates[`privateOrderAccess/${orderId}`] = {
      orderId,
      status: 'revoked',
      revokedAt: nowIso,
      revokedReason: 'ADMIN_ORDER_DELETED'
    };

    // Collect all invoice access hashes linked to this order and revoke them (never log tokenHash)
    const tokenHashesToRevoke = new Set(Object.keys(invQueryMatches));
    if (isPlainObject(existingOrderAccess) && typeof existingOrderAccess.tokenHash === 'string' && existingOrderAccess.tokenHash.trim()) {
      tokenHashesToRevoke.add(existingOrderAccess.tokenHash.trim());
    }

    for (const tHash of tokenHashesToRevoke) {
      deleteUpdates[`privateInvoiceAccess/${tHash}`] = {
        orderId,
        tokenHash: tHash,
        status: 'revoked',
        revokedAt: nowIso,
        revokedReason: 'ADMIN_ORDER_DELETED'
      };
    }

    // Clean/Cancel notifications_outbox records without keeping unnecessary PII
    let cancelledOutboxCount = 0;
    let retainedAuditOutboxCount = 0;
    for (const [notifId, notifRec] of Object.entries(outboxMatches)) {
      if (!isPlainObject(notifRec)) continue;
      const st = String(notifRec.status || 'pending');

      if (SENT_OR_AMBIGUOUS_OUTBOX_STATUSES.has(st)) {
        // Retain minimal non-PII audit trail for sent / accepted_by_mailapp / unknown dispatches
        retainedAuditOutboxCount++;
        deleteUpdates[`notifications_outbox/${notifId}`] = {
          notificationId: notifId,
          orderId,
          channel: typeof notifRec.channel === 'string' ? notifRec.channel : 'unknown',
          eventType: typeof notifRec.eventType === 'string' ? notifRec.eventType : 'UNKNOWN',
          status: st,
          attempts: Number(notifRec.attempts) || 0,
          createdAt: notifRec.createdAt || nowIso,
          lastAttemptAt: notifRec.lastAttemptAt || nowIso,
          orderDeletedAt: nowIso
        };
      } else {
        // Cancel unsent/pending/failed/processing/skipped notifications and strip PII
        cancelledOutboxCount++;
        deleteUpdates[`notifications_outbox/${notifId}`] = {
          notificationId: notifId,
          orderId,
          channel: typeof notifRec.channel === 'string' ? notifRec.channel : 'unknown',
          eventType: typeof notifRec.eventType === 'string' ? notifRec.eventType : 'UNKNOWN',
          status: 'cancelled_order_deleted',
          attempts: Number(notifRec.attempts) || 0,
          createdAt: notifRec.createdAt || nowIso,
          lastAttemptAt: nowIso,
          cancelledAt: nowIso
        };
      }
    }

    // Finalize privateOrderIdempotency records as DELETED tombstones (preserve fingerprint to block replay)
    for (const reqKeyHash of idemKeys) {
      const existingIdem = idemMatches[reqKeyHash];
      deleteUpdates[`privateOrderIdempotency/${reqKeyHash}`] = {
        requestKeyHash: reqKeyHash,
        requestFingerprint: existingIdem?.requestFingerprint || '',
        status: 'DELETED',
        reservedOrderId: orderId,
        attemptId: existingIdem?.attemptId || '',
        createdAt: existingIdem?.createdAt || nowIso,
        updatedAt: nowIso,
        deletedAt: nowIso,
        deletedBy: admin.email,
        expiresAt: existingIdem?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // Finalize privateDeletedOrders tombstone
    deleteUpdates[`privateDeletedOrders/${orderId}`] = {
      orderId,
      status: 'DELETED',
      deletedAt: nowIso,
      deletedBy: admin.email
    };

    // Optional hook for concurrency/atomicity tests
    if (typeof _deps?.beforeDeleteCommit === 'function') {
      await _deps.beforeDeleteCommit({ orderId, deleteUpdates, adminDb });
    }

    // 8. Execute multi-path cleanup atomically in RTDB root update; roll back fencing on failure
    await adminDb.ref().update(deleteUpdates);

    return jsonResponse(
      {
        success: true,
        orderId,
        deletedAt: nowIso,
        revokedTokensCount: tokenHashesToRevoke.size,
        cancelledOutboxCount,
        retainedAuditOutboxCount,
        tombstonedIdempotencyCount: idemKeys.length,
        message: 'تم حذف الطلب وإلغاء صلاحية روابط الفاتورة وتأمين السجلات التابعة بنجاح.'
      },
      200
    );
  } catch (err) {
    await rollbackLocksSafely();
    console.error('[DeleteOrder Error]:', err?.code || err?.message || 'delete_order_failed');
    return jsonResponse(
      {
        success: false,
        error: 'ORDER_DELETE_FAILED',
        message: 'تعذر إتمام حذف الطلب بالكامل. لم يتم تطبيق حذف جزئي.'
      },
      500
    );
  }
}

export async function ALL() {
  return jsonResponse(
    {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'الطريقة غير مسموح بها'
    },
    405,
    { Allow: 'POST' }
  );
}
