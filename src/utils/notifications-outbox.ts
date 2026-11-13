// src/utils/notifications-outbox.ts
import crypto from 'node:crypto';
import { sendTelegramNotification } from './telegram.js';

function isValidEmailAddress(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export type OutboxNotificationStatus =
  | 'pending'
  | 'processing'
  | 'accepted_by_mailapp'
  | 'sent'
  | 'failed'
  | 'unknown'
  | 'skipped_no_valid_email'
  | 'skipped_not_configured';

export interface OutboxClaimResult {
  claimed: boolean;
  claimId?: string;
  reason?:
    | 'ALREADY_SENT'
    | 'IN_FLIGHT'
    | 'AMBIGUOUS_UNKNOWN'
    | 'SKIPPED'
    | 'FAILED_BLOCKED'
    | 'CLAIM_ERROR';
  status: OutboxNotificationStatus | string;
  record?: Record<string, any> | null;
}

function isPlainObject(val: unknown): val is Record<string, any> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
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

/**
 * Atomically claims a notifications_outbox record via Firebase RTDB `.transaction()`
 * transitioning eligible states (`pending`, or `failed` when permitted) -> `processing`.
 * Prevents concurrent duplicate dispatches and never auto-retries `unknown` or sent items.
 */
export async function claimOutboxNotification(params: {
  adminDb: any;
  notificationId: string;
  initialRecord?: Record<string, any>;
  allowRetryFailed?: boolean;
  allowSkipIfNoValidEmail?: boolean;
  hasValidEmail?: boolean;
}): Promise<OutboxClaimResult> {
  const {
    adminDb,
    notificationId,
    initialRecord,
    allowRetryFailed = false,
    allowSkipIfNoValidEmail = false,
    hasValidEmail = true
  } = params;

  if (!adminDb || typeof adminDb.ref !== 'function') {
    return {
      claimed: true,
      claimId: `mem_${crypto.randomUUID()}`,
      status: 'processing',
      record: initialRecord || null
    };
  }

  const outboxRef = adminDb.ref(`notifications_outbox/${notificationId}`);
  const claimId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

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

    const tx = await outboxRef.transaction((current: any) => {
      blockedReason = undefined;
      skippedNoEmail = false;

      if (!isPlainObject(current)) {
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
          lastAttemptAt: nowIso,
          attempts: Number(initialRecord?.attempts) || 0,
          createdAt: initialRecord?.createdAt || nowIso
        };
      }

      const st = String(current.status || 'pending');

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
 */
export async function finalizeOutboxNotification(params: {
  adminDb: any;
  notificationId: string;
  claimId: string;
  status: OutboxNotificationStatus;
  error?: string | null;
  message?: string | null;
  extra?: Record<string, any>;
}): Promise<void> {
  const { adminDb, notificationId, claimId, status, error = null, message = null, extra = {} } = params;
  if (!adminDb || typeof adminDb.ref !== 'function') return;

  try {
    const outboxRef = adminDb.ref(`notifications_outbox/${notificationId}`);
    if (typeof outboxRef.transaction !== 'function') return;

    const nowIso = new Date().toISOString();
    await outboxRef.transaction((current: any) => {
      if (!isPlainObject(current)) return undefined;
      if (current.claimId && current.claimId !== claimId) return undefined;

      const nextAttempts = (Number(current.attempts) || 0) + (status === 'skipped_not_configured' ? 0 : 1);
      const { claimId: _clearedClaim, processingStartedAt: _clearedStart, ...rest } = current;
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
  } catch (err: any) {
    console.warn(
      `[NotificationsOutbox] Finalize transaction error for ${notificationId}:`,
      err?.code || err?.message || 'finalize_error'
    );
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
}): Promise<{ status: string; claimed: boolean; message?: string }> {
  const {
    orderId,
    orderData,
    adminDb,
    sendTelegramFn = sendTelegramNotification,
    timeoutMs = 4000
  } = params;

  const notificationId = getTelegramOutboxId(orderId);
  const nowIso = new Date().toISOString();

  try {
    const claim = await claimOutboxNotification({
      adminDb,
      notificationId,
      allowRetryFailed: false,
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
        message: 'Telegram notification already handled or in progress'
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

    await finalizeOutboxNotification({
      adminDb,
      notificationId,
      claimId: claim.claimId,
      status: finalStatus,
      error: finalError,
      message: finalMessage,
      extra
    });

    return { claimed: true, status: finalStatus, message: finalMessage || undefined };
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
}): Promise<{ status: string; claimed: boolean; message?: string }> {
  const {
    orderId,
    orderData,
    adminDb,
    fetchFn = globalThis.fetch,
    makeWebhookUrl = process.env.MAKE_WEBHOOK_URL,
    timeoutMs = 4000
  } = params;

  const notificationId = getMakeOutboxId(orderId);
  const nowIso = new Date().toISOString();

  try {
    const claim = await claimOutboxNotification({
      adminDb,
      notificationId,
      allowRetryFailed: false,
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
        message: 'Make webhook already handled or in progress'
      };
    }

    if (!makeWebhookUrl || typeof makeWebhookUrl !== 'string' || !makeWebhookUrl.trim()) {
      await finalizeOutboxNotification({
        adminDb,
        notificationId,
        claimId: claim.claimId,
        status: 'skipped_not_configured',
        error: null,
        message: 'MAKE_WEBHOOK_URL is not configured'
      });
      return { claimed: true, status: 'skipped_not_configured' };
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

    await finalizeOutboxNotification({
      adminDb,
      notificationId,
      claimId: claim.claimId,
      status: finalStatus,
      error: finalError,
      message: finalMessage
    });

    return { claimed: true, status: finalStatus, message: finalMessage || undefined };
  } catch (outerErr: any) {
    console.error('[NotificationsOutbox] Unexpected Make outbox error (isolated):', outerErr?.message || outerErr);
    return { claimed: false, status: 'failed', message: outerErr?.message || 'make_outbox_error' };
  }
}
