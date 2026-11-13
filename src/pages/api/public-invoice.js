export const prerender = false;

// src/pages/api/public-invoice.js
import { getAdminDb } from '../../utils/firebase-admin.ts';
import {
  getSafeClientIp,
  extractAstroClientAddress,
  checkServerRateLimit
} from '../../utils/server-rate-limit.ts';
import { lookupPublicInvoiceByToken, isValidInvoiceTokenFormat } from '../../utils/invoice-token.ts';

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

function methodNotAllowedResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'الطريقة غير مسموح بها'
    }),
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        'Allow': 'POST'
      }
    }
  );
}

function serviceUnavailableResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      message: 'الخدمة غير متاحة مؤقتاً، يرجى المحاولة بعد قليل.'
    }),
    {
      status: 503,
      headers: SECURITY_HEADERS
    }
  );
}

function rateLimitFailureResponse(rateLimitResult) {
  if (!rateLimitResult || !rateLimitResult.available || rateLimitResult.reason === 'store_unavailable') {
    return serviceUnavailableResponse();
  }

  const headers = { ...SECURITY_HEADERS };
  if (
    typeof rateLimitResult.retryAfterSeconds === 'number' &&
    Number.isFinite(rateLimitResult.retryAfterSeconds) &&
    rateLimitResult.retryAfterSeconds > 0
  ) {
    headers['Retry-After'] = String(Math.ceil(rateLimitResult.retryAfterSeconds));
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً.'
    }),
    {
      status: 429,
      headers
    }
  );
}

export async function POST(context) {
  const { request, _deps = null } = context || {};
  const clientAddress = extractAstroClientAddress(context);

  try {
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_CONTENT_TYPE',
          message: 'نوع المحتوى غير مدعوم، يرجى إرسال JSON.'
        }),
        { status: 415, headers: SECURITY_HEADERS }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'طلب غير صالح'
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'صيغة الطلب غير صالحة'
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    let adminDb = _deps?.adminDb || null;
    if (!adminDb && !_deps?.simulateMissingDb) {
      try {
        adminDb = getAdminDb();
      } catch {
        adminDb = null;
      }
    }

    // Trusted Client IP + Fail-Closed Serverless distributed rate limiting: 60 queries / 10 min per IP
    const clientIp = getSafeClientIp({
      request,
      clientAddress,
      ...(_deps?.ipContext || {})
    });
    if (!clientIp) {
      return serviceUnavailableResponse();
    }

    const rateLimitResult = await checkServerRateLimit({
      namespace: 'publicInvoice',
      key: clientIp,
      maxRequests: 60,
      windowMs: 10 * 60 * 1000,
      adminDb,
      redis: _deps?.redis
    });

    if (!rateLimitResult.allowed) {
      return rateLimitFailureResponse(rateLimitResult);
    }

    // Strictly accept only token from access/token fields (ignore orderId/invoiceCode/phone/customerId)
    const rawAccess = typeof body.access === 'string'
      ? body.access
      : (typeof body.token === 'string' ? body.token : '');

    if (!isValidInvoiceTokenFormat(rawAccess)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_ACCESS_TOKEN',
          message: 'رابط الفاتورة غير صالح أو منتهي الصلاحية'
        }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    if (!adminDb) {
      console.error('[PublicInvoice Error]: Firebase Admin DB is unavailable');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SERVER_ERROR',
          message: 'حدث خطأ أثناء تحميل الفاتورة. يرجى المحاولة لاحقاً.'
        }),
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const lookup = await lookupPublicInvoiceByToken(rawAccess, adminDb);

    if (!lookup.ok) {
      if (lookup.reason === 'db_error') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'SERVER_ERROR',
            message: 'حدث خطأ أثناء تحميل الفاتورة. يرجى المحاولة لاحقاً.'
          }),
          { status: 500, headers: SECURITY_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVOICE_NOT_FOUND',
          message: 'لم يتم العثور على الفاتورة المطلوبة أو تم إلغاء صلاحية الرابط'
        }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: lookup.order
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (err) {
    console.error('[PublicInvoice Error]:', err?.message || 'unexpected_error');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: 'حدث خطأ أثناء تحميل الفاتورة. يرجى المحاولة لاحقاً.'
      }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

export async function GET() {
  return methodNotAllowedResponse();
}

export async function ALL() {
  return methodNotAllowedResponse();
}
