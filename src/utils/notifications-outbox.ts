// src/utils/notifications-outbox.ts
import crypto from 'node:crypto';
import { sendTelegramNotification } from './telegram.js';

function isValidEmailAddress(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export const DEFAULT_OUTBOX_PROCESSING_LEASE_MS = 60_000;
export const DEFAULT_LEGACY_OUTBOX_STALE_MS = 180_000;

export type OutboxNotificationStatus =
  | 'pending'
  | 'processing'
  | 'accepted_by_mailapp'
  | 'sent'
  | 'failed'
  | 'unknown'
  | 'skipped_no_valid_email'
  | 'skipped_not_configured'
  | 'cancelled_order_deleted'
  | 'unknown_deleted_during_dispatch';

export interface OutboxClaimResult {
  claimed: boolean;
  claimId?: string;
  reason?:
    | 'ALREADY_SENT'
    | 'IN_FLIGHT'
    | 'AMBIGUOUS_UNKNOWN'
    | 'SKIPPED'
    | 'FAILED_BLOCKED'
    | 'ORDER_DELETED'
    | 'CLAIM_ERROR';
  status: OutboxNotificationStatus | string;
  record?: Record<string, any> | null;
}

export interface OutboxLeaseInspectionResult {
  state:
    | 'NOT_PROCESSING'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'LEGACY_ACTIVE'
    | 'LEGACY_STALE'
    | 'INVALID_TIMESTAMP';
  expiresAtMs?: number;
  startedAtMs?: number;
}

export interface OutboxReconcileResult {
  ok: boolean;
  outcome:
    | 'NOT_FOUND'
    | 'NOT_PROCESSING'
    | 'IN_FLIGHT'
    | 'RECONCILED_UNKNOWN'
    | 'MANUAL_REVIEW_REQUIRED'
    | 'ORDER_DELETED'
    | 'RECONCILE_ERROR';
  status: OutboxNotificationStatus | string;
  transitioned: boolean;
  manualReviewRequired?: boolean;
  diagnosticCode?: string;
  record?: Record<string, any> | null;
}

function isPlainObject(val: unknown): val is Record<string, any> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function resolveNowMs(nowMs?: number, getNowMs?: () => number): number {
  if (typeof nowMs === 'number' && Number.isFinite(nowMs)) {
    return nowMs;
  }
  if (typeof getNowMs === 'function') {
    const dynamicMs = getNowMs();
    if (typeof dynamicMs === 'number' && Number.isFinite(dynamicMs)) {
      return dynamicMs;
    }
  }
  return Date.now();
}

function resolvePositiveMs(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : fallback;
}

/**
 * Inspects an outbox record's processing lease state without mutating it.
 */
export function inspectOutboxProcessingLease(
  record: unknown,
  options: { nowMs?: number; getNowMs?: () => number; legacyStaleMs?: number } = {}
): OutboxLeaseInspectionResult {
  if (!isPlainObject(record) || String(record.status || '') !== 'processing') {
    return { state: 'NOT_PROCESSING' };
  }

  const nowMs = resolveNowMs(options.nowMs, options.getNowMs);
  const legacyStaleMs = resolvePositiveMs(options.legacyStaleMs, DEFAULT_LEGACY_OUTBOX_STALE_MS);

  if (typeof record.processingLeaseExpiresAt === 'string' && record.processingLeaseExpiresAt.trim()) {
    const expMs = Date.parse(record.processingLeaseExpiresAt);
    if (Number.isFinite(expMs)) {
      return {
        state: nowMs < expMs ? 'ACTIVE' : 'EXPIRED',
        expiresAtMs: expMs
      };
    }
    return { state: 'INVALID_TIMESTAMP' };
  }

  // Legacy processing record missing processingLeaseExpiresAt: derive conservative threshold from processingStartedAt
  if (typeof record.processingStartedAt === 'string' && record.processingStartedAt.trim()) {
    const startMs = Date.parse(record.processingStartedAt);
    if (Number.isFinite(startMs)) {
      return {
        state: nowMs - startMs < legacyStaleMs ? 'LEGACY_ACTIVE' : 'LEGACY_STALE',
        startedAtMs: startMs
      };
    }
  }

  return { state: 'INVALID_TIMESTAMP' };
}

/**
 * Returns true strictly when the record is `processing` with a valid active lease.
 */
export function isOutboxProcessingLeaseActive(
  record: unknown,
  options: { nowMs?: number; getNowMs?: () => number; legacyStaleMs?: number } = {}
): boolean {
  const inspection = inspectOutboxProcessingLease(record, options);
  return inspection.state === 'ACTIVE' || inspection.state === 'LEGACY_ACTIVE';
}

export function getConfirmationOutboxId(orderId: string): string {
  return `notif_order_${orderId}_confirmation`;
}

export function getTelegramOutboxId(orderId: string): string {
  return `notif_order_${orderId}_telegram`;
}

export function getMakeOutboxId(orderId: string): string {
  return `notif_order_${orderId}_make`;
}

/**
 * Builds deterministic fixed-ID outbox initialization records for an order
 * without storing any plaintext or encrypted invoice tokens.
 */
export function buildOrderOutboxInitialRecords(params: {
  orderId: string;
  invoiceCode: string;
  orderData: Record<string, any>;
  nowIso?: string;
}): Record<string, Record<string, any>> {
  const { orderId, invoiceCode, orderData, nowIso = new Date().toISOString() } = params;

  const canonicalEmail = isValidEmailAddress(orderData?.email)
    ? String(orderData.email).trim().toLowerCase()
    : '';
  const hasValidOutboxEmail = isValidEmailAddress(canonicalEmail);

  const confirmationId = getConfirmationOutboxId(orderId);
  const telegramId = getTelegramOutboxId(orderId);
  const makeId = getMakeOutboxId(orderId);

  return {
    [confirmationId]: {
      notificationId: confirmationId,
      orderId,
      invoiceCode,
      channel: 'email',
      recipientEmail: canonicalEmail || 'N/A',
      recipientName: orderData?.name || 'N/A',
      eventType: 'ORDER_CONFIRMATION',
      orderStatus: 'جديد',
      status: hasValidOutboxEmail ? 'pending' : 'skipped_no_valid_email',
      attempts: 0,
      createdAt: nowIso,
      lastAttemptAt: nowIso
    },
    [telegramId]: {
      notificationId: telegramId,
      orderId,
      invoiceCode,
      channel: 'telegram',
      eventType: 'TELEGRAM_ORDER_NOTIFICATION',
      status: 'pending',
      attempts: 0,
      createdAt: nowIso,
      lastAttemptAt: nowIso
    },
    [makeId]: {
      notificationId: makeId,
      orderId,
      invoiceCode,
      channel: 'make',
      eventType: 'MAKE_ORDER_WEBHOOK',
      status: 'pending',
      attempts: 0,
      createdAt: nowIso,
      lastAttemptAt: nowIso
    }
  };
}

function isDeletedTombstone(val: unknown): boolean {
  if (!isPlainObject(val)) return false;
  const st = String(val.status || '').toUpperCase();
  return st === 'DELETING' || st === 'COMMITTING_DELETE' || st === 'DELETED';
}

function buildCancelledDeletedAudit(params: {
  notificationId: string;
  orderId: string;
  current: Record<string, any> | null;
  nowIso: string;
}): Record<string, any> {
  const { notificationId, orderId, current, nowIso } = params;
  return {
    notificationId,
    orderId: orderId || (typeof current?.orderId === 'string' ? current.orderId : ''),
    channel: typeof current?.channel === 'string' ? current.channel : 'unknown',
    eventType: typeof current?.eventType === 'string' ? current.eventType : 'UNKNOWN',
    status: 'cancelled_order_deleted',
    attempts: Number(current?.attempts) || 0,
    createdAt: current?.createdAt || nowIso,
    lastAttemptAt: nowIso,
    cancelledAt: nowIso,
    orderDeletedAt: nowIso
  };
}

/**
 * Atomically claims a notifications_outbox record via Firebase RTDB `.transaction()`
 * transitioning eligible states (`pending`, or `failed` when permitted) -> `processing`,
 * persisting a processing lease (`processingLeaseExpiresAt`) alongside `processingStartedAt` and `claimId`.
 * Prevents concurrent duplicate dispatches, blocks deleted/deleting orders (fail-closed),
 * and never auto-retries `unknown`, `processing`, or sent items.
 */
export async function claimOutboxNotification(params: {
  adminDb: any;
  notificationId: string;
  orderId?: string;
  initialRecord?: Record<string, any>;
  allowRetryFailed?: boolean;
  allowSkipIfNoValidEmail?: boolean;
  hasValidEmail?: boolean;
  nowMs?: number;
  getNowMs?: () => number;
  leaseMs?: number;
}): Promise<OutboxClaimResult> {
  const {
    adminDb,
    notificationId,
    orderId,
    initialRecord,
    allowRetryFailed = false,
    allowSkipIfNoValidEmail = false,
    hasValidEmail = true
  } = params;

  const targetOrderId =
    typeof orderId === 'string' && orderId.trim()
      ? orderId.trim()
      : typeof initialRecord?.orderId === 'string' && initialRecord.orderId.trim()
        ? initialRecord.orderId.trim()
        : '';

  if (!adminDb || typeof adminDb.ref !== 'function') {
    return {
      claimed: true,
      claimId: `mem_${crypto.randomUUID()}`,
      status: 'processing',
      record: initialRecord || null
    };
  }

  // Pre-claim fail-closed check against privateDeletedOrders/{orderId}
  if (targetOrderId) {
    try {
      const preDelSnap = await adminDb.ref(`privateDeletedOrders/${targetOrderId}`).once('value');
      const preDelVal = preDelSnap?.val?.() ?? null;
      if (isDeletedTombstone(preDelVal)) {
        return {
          claimed: false,
          reason: 'ORDER_DELETED',
          status: 'cancelled_order_deleted',
          record: null
        };
      }
    } catch (err: any) {
      console.warn(
        `[NotificationsOutbox] Pre-claim deleted-order check error for ${notificationId}:`,
        err?.code || err?.message || 'deleted_check_error'
      );
      return {
        claimed: false,
        reason: 'CLAIM_ERROR',
        status: 'unknown',
        record: null
      };
    }
  }

  const outboxRef = adminDb.ref(`notifications_outbox/${notificationId}`);
  const claimId = crypto.randomUUID();
  const claimNowMs = resolveNowMs(params.nowMs, params.getNowMs);
  const effectiveLeaseMs = resolvePositiveMs(params.leaseMs, DEFAULT_OUTBOX_PROCESSING_LEASE_MS);
  const nowIso = new Date(claimNowMs).toISOString();
  const processingLeaseExpiresAt = new Date(claimNowMs + effectiveLeaseMs).toISOString();

  if (typeof outboxRef.transaction !== 'function') {
    return {
      claimed: true,
      claimId,
      status: 'processing',
      record: initialRecord || null
    };
  }

  try {
    let blockedReason: OutboxClaimResult['reason'] | undefined;
    let skippedNoEmail = false;
    let previousStatusBeforeClaim = 'pending';

    const tx = await outboxRef.transaction((current: any) => {
      blockedReason = undefined;
      skippedNoEmail = false;

      if (!isPlainObject(current)) {
        previousStatusBeforeClaim = 'pending';
        if (allowSkipIfNoValidEmail && !hasValidEmail) {
          skippedNoEmail = true;
          return {
            ...(initialRecord || {}),
            notificationId,
            status: 'skipped_no_valid_email',
            attempts: 0,
            createdAt: initialRecord?.createdAt || nowIso,
            lastAttemptAt: nowIso
          };
        }

        return {
          ...(initialRecord || {}),
          notificationId,
          status: 'processing',
          claimId,
          processingStartedAt: nowIso,
          processingLeaseExpiresAt,
          lastAttemptAt: nowIso,
          attempts: Number(initialRecord?.attempts) || 0,
          createdAt: initialRecord?.createdAt || nowIso
        };
      }

      const st = String(current.status || 'pending');
      previousStatusBeforeClaim = st;

      if (st === 'accepted_by_mailapp' || st === 'sent') {
        blockedReason = 'ALREADY_SENT';
        return undefined;
      }
      if (st === 'processing') {
        blockedReason = 'IN_FLIGHT';
        return undefined;
      }
      if (st === 'unknown') {
        blockedReason = 'AMBIGUOUS_UNKNOWN';
        return undefined;
      }
      if (st === 'skipped_not_configured') {
        blockedReason = 'SKIPPED';
        return undefined;
      }
      if (st === 'skipped_no_valid_email' && (!allowSkipIfNoValidEmail || !hasValidEmail)) {
        blockedReason = 'SKIPPED';
        return undefined;
      }
      if (st === 'cancelled_order_deleted' || st === 'unknown_deleted_during_dispatch') {
        blockedReason = 'ORDER_DELETED';
        return undefined;
      }
      if (st === 'failed' && !allowRetryFailed) {
        blockedReason = 'FAILED_BLOCKED';
        return undefined;
      }

      if (allowSkipIfNoValidEmail && !hasValidEmail) {
        skippedNoEmail = true;
        return {
          ...current,
          ...(initialRecord ? { recipientEmail: initialRecord.recipientEmail } : {}),
          status: 'skipped_no_valid_email',
          lastAttemptAt: nowIso
        };
      }

      return {
        ...current,
        ...(initialRecord
          ? {
              orderId: current.orderId || initialRecord.orderId,
              invoiceCode: current.invoiceCode || initialRecord.invoiceCode,
              channel: current.channel || initialRecord.channel,
              eventType: current.eventType || initialRecord.eventType
            }
          : {}),
        status: 'processing',
        claimId,
        processingStartedAt: nowIso,
        processingLeaseExpiresAt,
        lastAttemptAt: nowIso
      };
    });

    const val = tx?.snapshot?.val?.() ?? null;

    if (skippedNoEmail || val?.status === 'skipped_no_valid_email') {
      return {
        claimed: false,
        reason: 'SKIPPED',
        status: 'skipped_no_valid_email',
        record: val
      };
    }

    if (tx?.committed && isPlainObject(val) && val.status === 'processing' && val.claimId === claimId) {
      // Post-claim fencing check before handing control to external dispatch:
      // If the order entered DELETING / DELETED concurrently just before dispatch,
      // cancel cleanly (no external dispatch ever occurred) and abort.
      const resolvedOrderId =
        targetOrderId || (typeof val?.orderId === 'string' && val.orderId.trim() ? val.orderId.trim() : '');
      if (resolvedOrderId) {
        try {
          const postDelSnap = await adminDb.ref(`privateDeletedOrders/${resolvedOrderId}`).once('value');
          const postDelVal = postDelSnap?.val?.() ?? null;
          if (isDeletedTombstone(postDelVal)) {
            const closeIso = new Date(resolveNowMs(params.nowMs, params.getNowMs)).toISOString();
            const closeTx = await outboxRef.transaction((cur: any) => {
              if (!isPlainObject(cur)) return undefined;
              if (cur.status !== 'processing' || cur.claimId !== claimId) return undefined;
              return buildCancelledDeletedAudit({
                notificationId,
                orderId: resolvedOrderId,
                current: cur,
                nowIso: closeIso
              });
            });
            return {
              claimed: false,
              reason: 'ORDER_DELETED',
              status: 'cancelled_order_deleted',
              record: closeTx?.snapshot?.val?.() ?? null
            };
          }
        } catch (postErr: any) {
          console.warn(
            `[NotificationsOutbox] Post-claim deleted-order check error for ${notificationId}:`,
            postErr?.code || postErr?.message || 'post_claim_check_error'
          );
          try {
            await outboxRef.transaction((cur: any) => {
              if (!isPlainObject(cur)) return undefined;
              if (cur.status !== 'processing' || cur.claimId !== claimId) return undefined;
              const {
                claimId: _c,
                processingStartedAt: _p,
                processingLeaseExpiresAt: _exp,
                ...rest
              } = cur;
              return {
                ...rest,
                status: previousStatusBeforeClaim,
                lastAttemptAt: new Date(resolveNowMs(params.nowMs, params.getNowMs)).toISOString()
              };
            });
          } catch {
            // best-effort release
          }
          return {
            claimed: false,
            reason: 'CLAIM_ERROR',
            status: 'unknown',
            record: null
          };
        }
      }

      return {
        claimed: true,
        claimId,
        status: 'processing',
        record: val
      };
    }

    const currentStatus = String(val?.status || '');
    const resolvedReason: OutboxClaimResult['reason'] =
      blockedReason ||
      (currentStatus === 'accepted_by_mailapp' || currentStatus === 'sent'
        ? 'ALREADY_SENT'
        : currentStatus === 'processing'
          ? 'IN_FLIGHT'
          : currentStatus === 'unknown'
            ? 'AMBIGUOUS_UNKNOWN'
            : currentStatus === 'cancelled_order_deleted' ||
                currentStatus === 'unknown_deleted_during_dispatch'
              ? 'ORDER_DELETED'
              : currentStatus === 'failed'
                ? 'FAILED_BLOCKED'
                : 'IN_FLIGHT');

    return {
      claimed: false,
      reason: resolvedReason,
      status: currentStatus || 'unknown',
      record: val
    };
  } catch (err: any) {
    console.warn(
      `[NotificationsOutbox] Claim transaction error for ${notificationId}:`,
      err?.code || err?.message || 'claim_error'
    );
    return {
      claimed: false,
      reason: 'CLAIM_ERROR',
      status: 'unknown',
      record: null
    };
  }
}

/**
 * Updates an owned `processing` outbox record after external call completion.
 * Aborts cleanly if the order was deleted during dispatch or claim ownership was superseded,
 * and strips active processing lease metadata upon finalization.
 */
export async function finalizeOutboxNotification(params: {
  adminDb: any;
  notificationId: string;
  claimId: string;
  status: OutboxNotificationStatus;
  error?: string | null;
  message?: string | null;
  extra?: Record<string, any>;
  nowMs?: number;
  getNowMs?: () => number;
}): Promise<{ finalized: boolean; status?: string }> {
  const { adminDb, notificationId, claimId, status, error = null, message = null, extra = {} } = params;
  if (!adminDb || typeof adminDb.ref !== 'function') {
    return { finalized: false };
  }

  try {
    const outboxRef = adminDb.ref(`notifications_outbox/${notificationId}`);
    if (typeof outboxRef.transaction !== 'function') {
      return { finalized: false };
    }

    const nowIso = new Date(resolveNowMs(params.nowMs, params.getNowMs)).toISOString();
    const tx = await outboxRef.transaction((current: any) => {
      if (!isPlainObject(current)) return undefined;
      if (
        current.status === 'cancelled_order_deleted' ||
        current.status === 'unknown_deleted_during_dispatch'
      ) {
        return undefined;
      }
      if (current.status !== 'processing') return undefined;
      if (!current.claimId || current.claimId !== claimId) return undefined;

      const nextAttempts = (Number(current.attempts) || 0) + (status === 'skipped_not_configured' ? 0 : 1);
      const {
        claimId: _clearedClaim,
        processingStartedAt: _clearedStart,
        processingLeaseExpiresAt: _clearedLease,
        ...rest
      } = current;
      return {
        ...rest,
        ...extra,
        status,
        attempts: nextAttempts,
        lastAttemptAt: nowIso,
        error,
        message
      };
    });

    const finalSnapVal = tx?.snapshot?.val?.() ?? null;
    return {
      finalized: Boolean(tx?.committed),
      status: isPlainObject(finalSnapVal) ? String(finalSnapVal.status || '') : undefined
    };
  } catch (err: any) {
    console.warn(
      `[NotificationsOutbox] Finalize transaction error for ${notificationId}:`,
      err?.code || err?.message || 'finalize_error'
    );
    return { finalized: false };
  }
}

/**
 * Safely reconciles a single potentially stale `processing` outbox record via an individual RTDB `.transaction()`.
 * - Active lease -> leaves `processing` untouched and returns `IN_FLIGHT`.
 * - Expired lease (or stale legacy record) -> transitions to `unknown` (never `pending` or `failed`) and strips active processing metadata.
 * - Legacy `processing` record with missing/malformed timestamp -> leaves blocked and flags `manualReviewRequired`.
 * - Non-`processing` and deletion audit states -> untouched and preserved.
 */
export async function reconcileStaleOutboxNotification(params: {
  adminDb: any;
  notificationId: string;
  nowMs?: number;
  getNowMs?: () => number;
  leaseMs?: number;
  legacyStaleMs?: number;
}): Promise<OutboxReconcileResult> {
  const { adminDb, notificationId } = params;
  if (!adminDb || typeof adminDb.ref !== 'function' || typeof notificationId !== 'string' || !notificationId.trim()) {
    return {
      ok: false,
      outcome: 'RECONCILE_ERROR',
      status: 'unknown',
      transitioned: false,
      manualReviewRequired: true,
      diagnosticCode: 'RECONCILE_UNAVAILABLE'
    };
  }

  const outboxRef = adminDb.ref(`notifications_outbox/${notificationId.trim()}`);
  if (typeof outboxRef.transaction !== 'function') {
    return {
      ok: false,
      outcome: 'RECONCILE_ERROR',
      status: 'unknown',
      transitioned: false,
      manualReviewRequired: true,
      diagnosticCode: 'RECONCILE_UNAVAILABLE'
    };
  }

  const nowMs = resolveNowMs(params.nowMs, params.getNowMs);
  const nowIso = new Date(nowMs).toISOString();
  const legacyStaleMs = resolvePositiveMs(params.legacyStaleMs, DEFAULT_LEGACY_OUTBOX_STALE_MS);

  try {
    let outcome: OutboxReconcileResult['outcome'] = 'NOT_PROCESSING';
    let diagnosticCode: string | undefined;
    let manualReviewRequired = false;

    const tx = await outboxRef.transaction((current: any) => {
      diagnosticCode = undefined;
      manualReviewRequired = false;

      if (!isPlainObject(current)) {
        outcome = 'NOT_FOUND';
        return undefined;
      }

      const st = String(current.status || 'pending');
      if (st === 'cancelled_order_deleted' || st === 'unknown_deleted_during_dispatch') {
        outcome = 'ORDER_DELETED';
        return undefined;
      }
      if (st !== 'processing') {
        outcome = 'NOT_PROCESSING';
        return undefined;
      }

      const inspection = inspectOutboxProcessingLease(current, {
        nowMs,
        legacyStaleMs
      });

      if (inspection.state === 'ACTIVE' || inspection.state === 'LEGACY_ACTIVE') {
        outcome = 'IN_FLIGHT';
        return undefined;
      }

      if (inspection.state === 'INVALID_TIMESTAMP') {
        outcome = 'MANUAL_REVIEW_REQUIRED';
        manualReviewRequired = true;
        diagnosticCode = 'MISSING_OR_INVALID_PROCESSING_TIMESTAMP';
        if (
          current.manualReviewRequired === true &&
          current.staleDiagnosticCode === diagnosticCode
        ) {
          return undefined;
        }
        return {
          ...current,
          manualReviewRequired: true,
          staleProcessingDetectedAt: current.staleProcessingDetectedAt || nowIso,
          staleDiagnosticCode: diagnosticCode,
          error: current.error || diagnosticCode,
          message: 'Processing timestamp is missing or malformed; manual review required before any dispatch'
        };
      }

      // Expired lease or stale legacy processing record -> transition safely to `unknown`
      outcome = 'RECONCILED_UNKNOWN';
      diagnosticCode =
        inspection.state === 'LEGACY_STALE' ? 'LEGACY_PROCESSING_STALE' : 'PROCESSING_LEASE_EXPIRED';

      const {
        claimId: _clearedClaim,
        processingStartedAt: _clearedStart,
        processingLeaseExpiresAt: _clearedLease,
        ...rest
      } = current;

      return {
        ...rest,
        status: 'unknown',
        attempts: (Number(current.attempts) || 0) + 1,
        lastAttemptAt: nowIso,
        staleProcessingDetectedAt: nowIso,
        staleDiagnosticCode: diagnosticCode,
        error: diagnosticCode,
        message: 'Processing lease expired before completion; marked unknown to prevent duplicate dispatch'
      };
    });

    const val = tx?.snapshot?.val?.() ?? null;
    const finalStatus = isPlainObject(val) ? String(val.status || '') : '';

    if (outcome === 'NOT_FOUND') {
      return {
        ok: true,
        outcome: 'NOT_FOUND',
        status: 'unknown',
        transitioned: false,
        record: null
      };
    }

    if (outcome === 'RECONCILED_UNKNOWN' && tx?.committed && finalStatus === 'unknown') {
      return {
        ok: true,
        outcome: 'RECONCILED_UNKNOWN',
        status: 'unknown',
        transitioned: true,
        diagnosticCode,
        record: val
      };
    }

    if (outcome === 'MANUAL_REVIEW_REQUIRED') {
      return {
        ok: true,
        outcome: 'MANUAL_REVIEW_REQUIRED',
        status: finalStatus || 'processing',
        transitioned: false,
        manualReviewRequired: true,
        diagnosticCode: diagnosticCode || 'MISSING_OR_INVALID_PROCESSING_TIMESTAMP',
        record: val
      };
    }

    if (outcome === 'IN_FLIGHT' || finalStatus === 'processing') {
      return {
        ok: true,
        outcome: 'IN_FLIGHT',
        status: 'processing',
        transitioned: false,
        record: val
      };
    }

    if (
      outcome === 'ORDER_DELETED' ||
      finalStatus === 'cancelled_order_deleted' ||
      finalStatus === 'unknown_deleted_during_dispatch'
    ) {
      return {
        ok: true,
        outcome: 'ORDER_DELETED',
        status: finalStatus || 'cancelled_order_deleted',
        transitioned: false,
        record: val
      };
    }

    return {
      ok: true,
      outcome: 'NOT_PROCESSING',
      status: finalStatus || 'unknown',
      transitioned: false,
      record: val
    };
  } catch (err: any) {
    console.warn(
      `[NotificationsOutbox] Reconcile stale transaction error for ${notificationId}:`,
      err?.code || err?.message || 'reconcile_error'
    );
    return {
      ok: false,
      outcome: 'RECONCILE_ERROR',
      status: 'unknown',
      transitioned: false,
      manualReviewRequired: true,
      diagnosticCode: 'RECONCILE_TRANSACTION_FAILED'
    };
  }
}

/**
 * Safely dispatches Telegram order notification backed by fixed-ID Outbox fencing.
 * Never throws synchronously or rejects.
 */
export async function dispatchTelegramOutboxNotification(params: {
  orderId: string;
  orderData: Record<string, any>;
  adminDb: any;
  sendTelegramFn?: (args: any) => Promise<any>;
  timeoutMs?: number;
  nowMs?: number;
  getNowMs?: () => number;
  leaseMs?: number;
}): Promise<{ status: string; claimed: boolean; message?: string }> {
  const {
    orderId,
    orderData,
    adminDb,
    sendTelegramFn = sendTelegramNotification,
    timeoutMs = 4000,
    nowMs,
    getNowMs,
    leaseMs
  } = params;

  const notificationId = getTelegramOutboxId(orderId);
  const nowIso = new Date(resolveNowMs(nowMs, getNowMs)).toISOString();

  try {
    const claim = await claimOutboxNotification({
      adminDb,
      notificationId,
      orderId,
      allowRetryFailed: false,
      nowMs,
      getNowMs,
      leaseMs,
      initialRecord: {
        notificationId,
        orderId,
        invoiceCode: orderData?.invoiceCode || '',
        channel: 'telegram',
        eventType: 'TELEGRAM_ORDER_NOTIFICATION',
        status: 'pending',
        attempts: 0,
        createdAt: nowIso,
        lastAttemptAt: nowIso
      }
    });

    if (!claim.claimed || !claim.claimId) {
      return {
        claimed: false,
        status: claim.status,
        message:
          claim.reason === 'ORDER_DELETED'
            ? 'Telegram notification skipped because order is being deleted or deleted'
            : 'Telegram notification already handled or in progress'
      };
    }

    let finalStatus: OutboxNotificationStatus = 'failed';
    let finalError: string | null = null;
    let finalMessage: string | null = null;
    const extra: Record<string, any> = {};

    try {
      const tgResult = await Promise.resolve().then(() =>
        sendTelegramFn({
          order: orderData,
          orderId,
          timeoutMs
        })
      );

      if (
        !tgResult ||
        tgResult.status === 'SUCCESS' ||
        tgResult.allSuccessful === true ||
        (tgResult.success === true && tgResult.status !== 'PARTIAL_SUCCESS' && tgResult.status !== 'FAILURE')
      ) {
        finalStatus = 'sent';
        finalMessage = 'Telegram notification dispatched';
      } else if (tgResult.status === 'SIMULATED') {
        finalStatus = 'sent';
        extra.simulated = true;
        finalMessage = tgResult.message || 'Telegram notification simulated (not configured)';
      } else {
        const hasTimeout =
          Array.isArray(tgResult.results) &&
          tgResult.results.some((r: any) => r?.error?.code === 'NETWORK_TIMEOUT' || r?.error?.code === 'TIMEOUT');
        if (tgResult.anySuccessful === true || tgResult.status === 'PARTIAL_SUCCESS' || hasTimeout) {
          finalStatus = 'unknown';
          finalError = hasTimeout ? 'NETWORK_TIMEOUT' : 'PARTIAL_DELIVERY_UNKNOWN';
          finalMessage = 'Telegram delivery outcome is partial or ambiguous after timeout';
        } else {
          finalStatus = 'failed';
          const firstErr = Array.isArray(tgResult.results)
            ? tgResult.results.find((r: any) => !r?.success)?.error
            : null;
          finalError = firstErr?.code || 'TELEGRAM_DISPATCH_FAILED';
          finalMessage = firstErr?.description || 'Telegram notification delivery failed';
        }
      }
    } catch (tgErr: any) {
      const errName = String(tgErr?.name || '');
      const errMsg = String(tgErr?.message || tgErr || 'telegram_error');
      const isTimeout =
        errName === 'AbortError' ||
        errMsg.toLowerCase().includes('timeout') ||
        errMsg.toLowerCase().includes('aborted');

      finalStatus = isTimeout ? 'unknown' : 'failed';
      finalError = isTimeout ? 'NETWORK_TIMEOUT' : 'TELEGRAM_EXCEPTION';
      finalMessage = errMsg;
      console.error('[CreateOrder] Telegram order notification failed (resilient):', errMsg);
    }

    const finRes = await finalizeOutboxNotification({
      adminDb,
      notificationId,
      claimId: claim.claimId,
      status: finalStatus,
      error: finalError,
      message: finalMessage,
      extra,
      nowMs,
      getNowMs
    });

    return {
      claimed: true,
      status: finRes.finalized ? finalStatus : finRes.status || finalStatus,
      message: finalMessage || undefined
    };
  } catch (outerErr: any) {
    console.error('[NotificationsOutbox] Unexpected Telegram outbox error (isolated):', outerErr?.message || outerErr);
    return { claimed: false, status: 'failed', message: outerErr?.message || 'telegram_outbox_error' };
  }
}

/**
 * Safely dispatches Make.com webhook backed by fixed-ID Outbox fencing.
 * Classifies timeouts/aborts as `unknown` (never auto-retried) and clear errors as `failed`.
 * Never throws synchronously or rejects.
 */
export async function dispatchMakeWebhookOutboxNotification(params: {
  orderId: string;
  orderData: Record<string, any>;
  adminDb: any;
  fetchFn?: typeof globalThis.fetch;
  makeWebhookUrl?: string;
  timeoutMs?: number;
  nowMs?: number;
  getNowMs?: () => number;
  leaseMs?: number;
}): Promise<{ status: string; claimed: boolean; message?: string }> {
  const {
    orderId,
    orderData,
    adminDb,
    fetchFn = globalThis.fetch,
    makeWebhookUrl = process.env.MAKE_WEBHOOK_URL,
    timeoutMs = 4000,
    nowMs,
    getNowMs,
    leaseMs
  } = params;

  const notificationId = getMakeOutboxId(orderId);
  const nowIso = new Date(resolveNowMs(nowMs, getNowMs)).toISOString();

  try {
    const claim = await claimOutboxNotification({
      adminDb,
      notificationId,
      orderId,
      allowRetryFailed: false,
      nowMs,
      getNowMs,
      leaseMs,
      initialRecord: {
        notificationId,
        orderId,
        invoiceCode: orderData?.invoiceCode || '',
        channel: 'make',
        eventType: 'MAKE_ORDER_WEBHOOK',
        status: 'pending',
        attempts: 0,
        createdAt: nowIso,
        lastAttemptAt: nowIso
      }
    });

    if (!claim.claimed || !claim.claimId) {
      return {
        claimed: false,
        status: claim.status,
        message:
          claim.reason === 'ORDER_DELETED'
            ? 'Make webhook skipped because order is being deleted or deleted'
            : 'Make webhook already handled or in progress'
      };
    }

    if (!makeWebhookUrl || typeof makeWebhookUrl !== 'string' || !makeWebhookUrl.trim()) {
      const finSkipped = await finalizeOutboxNotification({
        adminDb,
        notificationId,
        claimId: claim.claimId,
        status: 'skipped_not_configured',
        error: null,
        message: 'MAKE_WEBHOOK_URL is not configured',
        nowMs,
        getNowMs
      });
      return {
        claimed: true,
        status: finSkipped.finalized ? 'skipped_not_configured' : finSkipped.status || 'skipped_not_configured'
      };
    }

    const isGmailEnabled = process.env.GMAIL_NOTIFICATIONS_ENABLED === 'true';
    const isMakeEmailExplicitlyDisabled = process.env.DISABLE_MAKE_INVOICE_EMAIL === 'true';
    const shouldSuppressMakeInvoiceEmail = isGmailEnabled || isMakeEmailExplicitlyDisabled;

    const makePayload = {
      ...orderData,
      sendEmailInvoice: !shouldSuppressMakeInvoiceEmail,
      skipEmailNotification: shouldSuppressMakeInvoiceEmail,
      disableBrevoEmail: shouldSuppressMakeInvoiceEmail,
      emailProvider: isGmailEnabled ? 'GMAIL_RELAY' : (shouldSuppressMakeInvoiceEmail ? 'NONE' : 'BREVO')
    };

    const makeController = new AbortController();
    const makeTimer = setTimeout(() => makeController.abort(), timeoutMs);

    let finalStatus: OutboxNotificationStatus = 'failed';
    let finalError: string | null = null;
    let finalMessage: string | null = null;

    try {
      const response = await Promise.resolve().then(() =>
        fetchFn(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(makePayload),
          signal: makeController.signal
        })
      );

      clearTimeout(makeTimer);

      if (response && response.ok) {
        finalStatus = 'sent';
        finalMessage = `Make webhook accepted (HTTP ${response.status})`;
      } else {
        const httpStatus = response?.status ?? 'UNKNOWN';
        finalStatus = 'failed';
        finalError = `HTTP_${httpStatus}`;
        finalMessage = `Make webhook returned HTTP ${httpStatus}`;
      }
    } catch (whErr: any) {
      clearTimeout(makeTimer);
      const errName = String(whErr?.name || '');
      const errMsg = String(whErr?.message || whErr || 'make_webhook_error');
      const isTimeout =
        errName === 'AbortError' ||
        errMsg.toLowerCase().includes('abort') ||
        errMsg.toLowerCase().includes('timeout');

      finalStatus = isTimeout ? 'unknown' : 'failed';
      finalError = isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR';
      finalMessage = errMsg;
      console.error('Make webhook sending failed (resilient):', errMsg);
    }

    const finRes = await finalizeOutboxNotification({
      adminDb,
      notificationId,
      claimId: claim.claimId,
      status: finalStatus,
      error: finalError,
      message: finalMessage,
      nowMs,
      getNowMs
    });

    return {
      claimed: true,
      status: finRes.finalized ? finalStatus : finRes.status || finalStatus,
      message: finalMessage || undefined
    };
  } catch (outerErr: any) {
    console.error('[NotificationsOutbox] Unexpected Make outbox error (isolated):', outerErr?.message || outerErr);
    return { claimed: false, status: 'failed', message: outerErr?.message || 'make_outbox_error' };
  }
}

/**
 * Strips customer PII, claim internals, payloads, and token artifacts from an outbox record
 * before exposing metadata to admin API consumers.
 */
export function sanitizeOutboxRecordForAdmin(rec: unknown): Record<string, any> | null {
  if (!isPlainObject(rec)) return null;
  return {
    notificationId: typeof rec.notificationId === 'string' ? rec.notificationId : '',
    orderId: typeof rec.orderId === 'string' ? rec.orderId : '',
    channel: typeof rec.channel === 'string' ? rec.channel : 'unknown',
    eventType: typeof rec.eventType === 'string' ? rec.eventType : '',
    orderStatus: typeof rec.orderStatus === 'string' ? rec.orderStatus : undefined,
    status: typeof rec.status === 'string' ? rec.status : 'unknown',
    attempts: Number(rec.attempts) || 0,
    createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : null,
    lastAttemptAt: typeof rec.lastAttemptAt === 'string' ? rec.lastAttemptAt : null,
    processingStartedAt: typeof rec.processingStartedAt === 'string' ? rec.processingStartedAt : null,
    processingLeaseExpiresAt: typeof rec.processingLeaseExpiresAt === 'string' ? rec.processingLeaseExpiresAt : null,
    staleProcessingDetectedAt: typeof rec.staleProcessingDetectedAt === 'string' ? rec.staleProcessingDetectedAt : null,
    staleDiagnosticCode: typeof rec.staleDiagnosticCode === 'string' ? rec.staleDiagnosticCode : null,
    manualReviewRequired: Boolean(rec.manualReviewRequired),
    error: typeof rec.error === 'string' ? rec.error : null,
    message: typeof rec.message === 'string' ? rec.message : null
  };
}
