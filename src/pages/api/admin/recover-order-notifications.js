export const prerender = false;

// src/pages/api/admin/recover-order-notifications.js
// Protected Admin API for safely recovering pending outbox notifications and
// reconciling stale processing records for a single order without duplicating completed/ambiguous sends.
import { getAdminDb } from '../../../utils/firebase-admin.ts';
import { verifyAdminRequest, adminUnauthorizedResponse } from '../../../utils/admin-auth.js';
import {
  sendOrderNotification,
  hasValidCoreOrderShape
} from '../../../utils/email-service.ts';
import { getOrCreateInvoiceToken } from '../../../utils/invoice-token.ts';
import {
  reconcileStaleOutboxNotification,
  dispatchTelegramOutboxNotification,
  dispatchMakeWebhookOutboxNotification,
  sanitizeOutboxRecordForAdmin
} from '../../../utils/notifications-outbox.ts';

const MAX_OUTBOX_RECOVERY_RECORDS = 20;

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

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

function isTombstoneDeletedState(val) {
  if (!isPlainObject(val)) return false;
  const st = String(val.status || '').toUpperCase();
  return st === 'DELETING' || st === 'COMMITTING_DELETE' || st === 'DELETED';
}

async function checkOrderDeletionState(db, orderId) {
  try {
    const snap = await db.ref(`privateDeletedOrders/${orderId}`).once('value');
    const val = snap?.val?.() ?? null;
    if (isTombstoneDeletedState(val)) {
      return { ok: true, deleted: true, tombstoneStatus: String(val.status || 'DELETED') };
    }
    return { ok: true, deleted: false, tombstoneStatus: null };
  } catch {
    return { ok: false, deleted: false, tombstoneStatus: null };
  }
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

  // 3. Parse & validate JSON object
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

  // 4. Resolve Firebase Admin DB (fail-closed)
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

  const resolveNowMs = () => {
    if (typeof _deps?.getNowMs === 'function') {
      const dynamicMs = _deps.getNowMs();
      if (typeof dynamicMs === 'number' && Number.isFinite(dynamicMs)) {
        return dynamicMs;
      }
    }
    if (typeof _deps?.nowMs === 'number' && Number.isFinite(_deps.nowMs)) {
      return _deps.nowMs;
    }
    return undefined;
  };

  try {
    // 5. Check privateDeletedOrders/{orderId} (fail-closed on DB errors)
    const preDelCheck = await checkOrderDeletionState(adminDb, orderId);
    if (!preDelCheck.ok) {
      return jsonResponse(
        {
          success: false,
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: 'تعذر التحقق من حالة حذف الطلب في قاعدة البيانات.'
        },
        503
      );
    }
    if (preDelCheck.deleted) {
      return jsonResponse(
        {
          success: false,
          error: 'ORDER_DELETED',
          message: 'تم حذف هذا الطلب أو جاري حذفه ولا يمكن استئناف إشعاراته.'
        },
        409
      );
    }

    // 6. Fetch orders/{orderId} and enforce core order shape
    let orderData;
    try {
      const orderSnap = await adminDb.ref(`orders/${orderId}`).once('value');
      orderData = orderSnap?.val?.() ?? null;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: 'تعذر قراءة بيانات الطلب من قاعدة البيانات.'
        },
        503
      );
    }

    if (!orderData) {
      return jsonResponse(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'الطلب غير موجود.'
        },
        404
      );
    }

    if (!hasValidCoreOrderShape(orderData)) {
      return jsonResponse(
        {
          success: false,
          error: 'INVALID_ORDER_SHAPE',
          message: 'بيانات الطلب الأساسية غير مكتملة أو غير صالحة.'
        },
        422
      );
    }

    // 7. Bounded indexed query for notifications_outbox belonging to orderId
    let rawOutboxVal;
    try {
      let query = adminDb.ref('notifications_outbox').orderByChild('orderId').equalTo(orderId);
      if (typeof query.limitToFirst === 'function') {
        query = query.limitToFirst(MAX_OUTBOX_RECOVERY_RECORDS);
      }
      const outboxSnap = await query.once('value');
      rawOutboxVal = outboxSnap?.val?.() ?? null;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: 'تعذر قراءة سجل الإشعارات من قاعدة البيانات.'
        },
        503
      );
    }

    const entries = isPlainObject(rawOutboxVal)
      ? Object.entries(rawOutboxVal)
          .filter(([, rec]) => isPlainObject(rec))
          .slice(0, MAX_OUTBOX_RECOVERY_RECORDS)
      : [];

    const summary = {
      processed: 0,
      alreadyCompleted: 0,
      inFlight: 0,
      reconciledUnknown: 0,
      failed: 0,
      skipped: 0
    };

    const sendNotifFn = _deps?.sendOrderNotification || sendOrderNotification;
    const resolveTokenFn = _deps?.getOrCreateInvoiceToken || getOrCreateInvoiceToken;
    const dispatchTgFn = _deps?.dispatchTelegramOutboxNotification || dispatchTelegramOutboxNotification;
    const dispatchMakeFn = _deps?.dispatchMakeWebhookOutboxNotification || dispatchMakeWebhookOutboxNotification;

    const settledResults = await Promise.allSettled(
      entries.map(async ([recordKey, rawRec]) => {
        const notificationId =
          typeof rawRec.notificationId === 'string' && rawRec.notificationId.trim()
            ? rawRec.notificationId.trim()
            : recordKey;
        const channel = typeof rawRec.channel === 'string' ? rawRec.channel : 'unknown';
        const status = String(rawRec.status || 'pending');

        if (status === 'accepted_by_mailapp' || status === 'sent') {
          return { bucket: 'alreadyCompleted', notificationId, channel, status };
        }

        if (
          status === 'cancelled_order_deleted' ||
          status === 'unknown_deleted_during_dispatch' ||
          status === 'skipped_no_valid_email' ||
          status === 'skipped_not_configured' ||
          status === 'unknown'
        ) {
          return { bucket: 'skipped', notificationId, channel, status };
        }

        if (status === 'failed') {
          // Manual retry only — never auto-dispatch failed records during recovery
          return { bucket: 'failed', notificationId, channel, status };
        }

        if (status === 'processing') {
          const recRes = await reconcileStaleOutboxNotification({
            adminDb,
            notificationId,
            nowMs: resolveNowMs(),
            getNowMs: _deps?.getNowMs,
            leaseMs: _deps?.leaseMs,
            legacyStaleMs: _deps?.legacyStaleMs
          });

          if (!recRes.ok) {
            return {
              bucket: 'failed',
              notificationId,
              channel,
              status: 'unknown',
              manualReviewRequired: true
            };
          }
          if (recRes.outcome === 'RECONCILED_UNKNOWN') {
            return { bucket: 'reconciledUnknown', notificationId, channel, status: 'unknown' };
          }
          if (recRes.outcome === 'MANUAL_REVIEW_REQUIRED') {
            return {
              bucket: 'inFlight',
              notificationId,
              channel,
              status: recRes.status || 'processing',
              manualReviewRequired: true
            };
          }
          if (recRes.outcome === 'IN_FLIGHT') {
            return { bucket: 'inFlight', notificationId, channel, status: 'processing' };
          }
          if (recRes.outcome === 'ORDER_DELETED') {
            return { bucket: 'skipped', notificationId, channel, status: recRes.status || 'cancelled_order_deleted' };
          }
          return { bucket: 'skipped', notificationId, channel, status: recRes.status || status };
        }

        if (status === 'pending') {
          // Re-check deletion tombstone right before dispatching this channel
          const preDispatchDel = await checkOrderDeletionState(adminDb, orderId);
          if (!preDispatchDel.ok) {
            return { bucket: 'failed', notificationId, channel, status: 'unknown' };
          }
          if (preDispatchDel.deleted) {
            return { bucket: 'skipped', notificationId, channel, status: 'cancelled_order_deleted' };
          }

          if (channel === 'email') {
            let invoiceAccessToken;
            try {
              invoiceAccessToken = await resolveTokenFn(
                orderId,
                adminDb,
                _deps?.encryptionKey !== undefined ? { encryptionKey: _deps.encryptionKey } : {}
              );
            } catch {
              return { bucket: 'failed', notificationId, channel, status: 'failed' };
            }

            // Re-verify deletion state after async token lookup
            const postTokenDel = await checkOrderDeletionState(adminDb, orderId);
            if (!postTokenDel.ok) {
              return { bucket: 'failed', notificationId, channel, status: 'unknown' };
            }
            if (postTokenDel.deleted) {
              return { bucket: 'skipped', notificationId, channel, status: 'cancelled_order_deleted' };
            }

            const emailArgs = {
              order: orderData,
              orderId,
              eventType: rawRec.eventType || 'ORDER_CONFIRMATION',
              newStatus: rawRec.orderStatus || orderData.status,
              retryNotificationId: notificationId,
              allowRetryFailed: false,
              invoiceAccessToken,
              adminDb
            };
            const nowVal = resolveNowMs();
            if (typeof nowVal === 'number') emailArgs.nowMs = nowVal;
            if (typeof _deps?.getNowMs === 'function') emailArgs.getNowMs = _deps.getNowMs;
            if (typeof _deps?.leaseMs === 'number') emailArgs.leaseMs = _deps.leaseMs;

            const emailRes = await sendNotifFn(emailArgs);
            const resStatus = String(emailRes?.status || 'failed');

            if (resStatus === 'accepted_by_mailapp' || resStatus === 'sent') {
              return {
                bucket: emailRes?.deduplicated ? 'alreadyCompleted' : 'processed',
                notificationId,
                channel,
                status: resStatus
              };
            }
            if (resStatus === 'processing') {
              return { bucket: 'inFlight', notificationId, channel, status: 'processing' };
            }
            if (resStatus === 'unknown') {
              return { bucket: 'reconciledUnknown', notificationId, channel, status: 'unknown' };
            }
            if (
              resStatus === 'skipped_no_valid_email' ||
              resStatus === 'skipped_not_configured' ||
              resStatus === 'cancelled_order_deleted' ||
              resStatus === 'unknown_deleted_during_dispatch'
            ) {
              return { bucket: 'skipped', notificationId, channel, status: resStatus };
            }
            return { bucket: 'failed', notificationId, channel, status: resStatus };
          }

          if (channel === 'telegram') {
            const tgRes = await dispatchTgFn({
              orderId,
              orderData,
              adminDb,
              sendTelegramFn: _deps?.sendTelegramNotification,
              timeoutMs: _deps?.telegramTimeoutMs,
              nowMs: resolveNowMs(),
              getNowMs: _deps?.getNowMs,
              leaseMs: _deps?.leaseMs
            });
            const resStatus = String(tgRes?.status || 'failed');
            if (resStatus === 'sent' || resStatus === 'accepted_by_mailapp') {
              return {
                bucket: tgRes?.claimed ? 'processed' : 'alreadyCompleted',
                notificationId,
                channel,
                status: resStatus
              };
            }
            if (resStatus === 'processing') {
              return { bucket: 'inFlight', notificationId, channel, status: 'processing' };
            }
            if (resStatus === 'unknown') {
              return { bucket: 'reconciledUnknown', notificationId, channel, status: 'unknown' };
            }
            if (
              resStatus === 'skipped_not_configured' ||
              resStatus === 'skipped_no_valid_email' ||
              resStatus === 'cancelled_order_deleted' ||
              resStatus === 'unknown_deleted_during_dispatch'
            ) {
              return { bucket: 'skipped', notificationId, channel, status: resStatus };
            }
            return { bucket: 'failed', notificationId, channel, status: resStatus };
          }

          if (channel === 'make') {
            const makeRes = await dispatchMakeFn({
              orderId,
              orderData,
              adminDb,
              fetchFn: _deps?.fetchFn,
              makeWebhookUrl: _deps?.makeWebhookUrl,
              timeoutMs: _deps?.makeTimeoutMs,
              nowMs: resolveNowMs(),
              getNowMs: _deps?.getNowMs,
              leaseMs: _deps?.leaseMs
            });
            const resStatus = String(makeRes?.status || 'failed');
            if (resStatus === 'sent' || resStatus === 'accepted_by_mailapp') {
              return {
                bucket: makeRes?.claimed ? 'processed' : 'alreadyCompleted',
                notificationId,
                channel,
                status: resStatus
              };
            }
            if (resStatus === 'processing') {
              return { bucket: 'inFlight', notificationId, channel, status: 'processing' };
            }
            if (resStatus === 'unknown') {
              return { bucket: 'reconciledUnknown', notificationId, channel, status: 'unknown' };
            }
            if (
              resStatus === 'skipped_not_configured' ||
              resStatus === 'skipped_no_valid_email' ||
              resStatus === 'cancelled_order_deleted' ||
              resStatus === 'unknown_deleted_during_dispatch'
            ) {
              return { bucket: 'skipped', notificationId, channel, status: resStatus };
            }
            return { bucket: 'failed', notificationId, channel, status: resStatus };
          }

          return { bucket: 'skipped', notificationId, channel, status };
        }

        return { bucket: 'skipped', notificationId, channel, status };
      })
    );

    const fallbackItems = [];
    for (let i = 0; i < settledResults.length; i++) {
      const settled = settledResults[i];
      if (settled.status === 'fulfilled' && settled.value) {
        const item = settled.value;
        if (Object.prototype.hasOwnProperty.call(summary, item.bucket)) {
          summary[item.bucket]++;
        }
        fallbackItems.push({
          notificationId: item.notificationId,
          channel: item.channel,
          status: item.status,
          ...(item.manualReviewRequired ? { manualReviewRequired: true } : {})
        });
      } else {
        const [recordKey, rawRec] = entries[i] || [];
        summary.failed++;
        fallbackItems.push({
          notificationId:
            typeof rawRec?.notificationId === 'string' && rawRec.notificationId.trim()
              ? rawRec.notificationId.trim()
              : String(recordKey || ''),
          channel: typeof rawRec?.channel === 'string' ? rawRec.channel : 'unknown',
          status: 'failed'
        });
      }
    }

    // Re-read sanitized notifications snapshot to reflect latest persisted state without exposing PII/tokens
    let sanitizedNotifications = fallbackItems;
    try {
      let postQuery = adminDb.ref('notifications_outbox').orderByChild('orderId').equalTo(orderId);
      if (typeof postQuery.limitToFirst === 'function') {
        postQuery = postQuery.limitToFirst(MAX_OUTBOX_RECOVERY_RECORDS);
      }
      const postSnap = await postQuery.once('value');
      const postVal = postSnap?.val?.() ?? null;
      if (isPlainObject(postVal)) {
        sanitizedNotifications = Object.values(postVal)
          .slice(0, MAX_OUTBOX_RECOVERY_RECORDS)
          .map((rec) => sanitizeOutboxRecordForAdmin(rec))
          .filter(Boolean);
      }
    } catch {
      // Keep safe fallbackItems computed from settled operations
    }

    return jsonResponse(
      {
        success: true,
        orderId,
        summary,
        notifications: sanitizedNotifications
      },
      200
    );
  } catch (err) {
    console.error('[RecoverOrderNotifications Error]:', err?.code || 'recover_failed');
    return jsonResponse(
      {
        success: false,
        error: 'NOTIFICATION_RECOVERY_FAILED',
        message: 'تعذر إتمام معالجة الإشعارات المعلقة للطلب.'
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
