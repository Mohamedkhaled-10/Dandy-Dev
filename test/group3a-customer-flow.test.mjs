// test/group3a-customer-flow.test.mjs
// End-to-end automated verification for DANDY Group 3A:
// Cart idempotency & Turnstile handling, Invoice fragment/sessionStorage flow,
// Order Tracking whitelist & PII cleanup, and Authenticated Customer Invoice Access API + Account integration.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import fsSync from 'node:fs';
import vm from 'node:vm';

const helperSource = fsSync.readFileSync(path.resolve('public/assets/js/order-flow-helpers.js'), 'utf8');
const helperSandbox = {
  globalThis: null,
  crypto: globalThis.crypto,
  TextEncoder,
  URLSearchParams
};
helperSandbox.globalThis = helperSandbox;
vm.runInNewContext(helperSource, helperSandbox);
const helpers = helperSandbox.DandyOrderFlow;
import {
  isValidInvoiceTokenFormat,
  hashInvoiceToken
} from '../src/utils/invoice-token.ts';
import {
  POST as customerInvoiceAccessPOST,
  GET as customerInvoiceAccessGET,
  ALL as customerInvoiceAccessALL
} from '../src/pages/api/customer-invoice-access.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    snapshot() {
      return Object.fromEntries(map.entries());
    }
  };
}

function createMockAdminDb(initialData = {}, options = {}) {
  const data = JSON.parse(JSON.stringify(initialData));

  function getAtPath(p) {
    if (!p) return data;
    const parts = p.split('/').filter(Boolean);
    let curr = data;
    for (const part of parts) {
      if (curr == null || typeof curr !== 'object') return undefined;
      curr = curr[part];
    }
    return curr === undefined ? null : curr;
  }

  function setAtPath(p, val) {
    const parts = p.split('/').filter(Boolean);
    if (!parts.length) return;
    let curr = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (curr[parts[i]] == null || typeof curr[parts[i]] !== 'object') {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    if (val === null || val === undefined) {
      delete curr[leaf];
    } else {
      curr[leaf] = JSON.parse(JSON.stringify(val));
    }
  }

  function makeRef(p = '') {
    return {
      key: p.split('/').filter(Boolean).pop() || null,
      async once() {
        if (options.failReads) throw new Error('Simulated RTDB read failure');
        const val = getAtPath(p);
        const cloned = val === null || val === undefined ? null : JSON.parse(JSON.stringify(val));
        return {
          exists: () => cloned !== null && cloned !== undefined,
          val: () => cloned
        };
      },
      async set(val) {
        if (options.failWrites) throw new Error('Simulated RTDB write failure');
        setAtPath(p, val);
      },
      async update(updates) {
        if (options.failWrites) throw new Error('Simulated RTDB update failure');
        if (p) {
          const existing = getAtPath(p) || {};
          setAtPath(p, { ...existing, ...updates });
        } else {
          for (const [k, v] of Object.entries(updates)) {
            setAtPath(k, v);
          }
        }
      },
      async transaction(updater) {
        if (options.failTransactions) throw new Error('Simulated RTDB tx failure');
        const current = getAtPath(p);
        const cloned = current === null || current === undefined ? null : JSON.parse(JSON.stringify(current));
        const nextVal = updater(cloned);
        if (nextVal !== undefined) setAtPath(p, nextVal);
        const finalVal = getAtPath(p);
        return {
          committed: true,
          snapshot: { val: () => (finalVal === null || finalVal === undefined ? null : JSON.parse(JSON.stringify(finalVal))) }
        };
      }
    };
  }

  return { data, ref: makeRef };
}

// ===========================================================================
// 1. Cart Client Idempotency & Request Fingerprinting
// ===========================================================================
test('1.1 Checkout fingerprint is deterministic across equivalent order payloads and changes on any mutation', async () => {
  const baseOrder = {
    name: 'نور أحمد محمد',
    phone: '01012345678',
    email: 'Nour@Example.com',
    governorate: 'Cairo',
    city: 'المعادي',
    address: 'شارع 9 عمارة 12',
    customerId: null,
    items: [
      {
        productId: 'prod_1',
        name: 'كريم بديل الليزر',
        quantity: 2,
        selectedVariants: [{ id: 'rose', name: 'الورد' }]
      }
    ]
  };

  const equivalentOrder = {
    name: '  نور أحمد محمد  ',
    phone: '+20 101 234 5678',
    email: 'nour@example.com',
    governorate: 'Cairo',
    city: 'المعادي',
    address: 'شارع 9 عمارة 12',
    customerId: null,
    items: [
      {
        selectedVariants: [{ name: 'الورد', id: 'rose' }],
        quantity: 2,
        name: 'كريم بديل الليزر',
        productId: 'prod_1',
        timestamp: 999999 // transient field ignored
      }
    ]
  };

  const hash1 = await helpers.computeLocalOrderFingerprintHex(baseOrder);
  const hash2 = await helpers.computeLocalOrderFingerprintHex(equivalentOrder);
  assert.match(hash1, /^[0-9a-f]{64}$/);
  assert.equal(hash1, hash2);

  // Changing phone, quantity, variant, address, or customerId must rotate the hash
  const changedQtyHash = await helpers.computeLocalOrderFingerprintHex({
    ...baseOrder,
    items: [{ ...baseOrder.items[0], quantity: 3 }]
  });
  assert.notEqual(hash1, changedQtyHash);

  const changedPhoneHash = await helpers.computeLocalOrderFingerprintHex({
    ...baseOrder,
    phone: '01112345678'
  });
  assert.notEqual(hash1, changedPhoneHash);

  const changedUidHash = await helpers.computeLocalOrderFingerprintHex({
    ...baseOrder,
    customerId: 'uid_abc'
  });
  assert.notEqual(hash1, changedUidHash);
});

test('1.2 sessionStorage checkout attempt keeps clientRequestId across retries, stores zero PII, and rotates on payload change', async () => {
  const sessionStorage = createMemoryStorage();
  const payload = {
    name: 'مريم عادل',
    phone: '01234567890',
    email: 'maryam@example.com',
    governorate: 'Alexandria',
    city: 'سموحة',
    address: 'شارع فوزي معاذ 24',
    customerId: null,
    items: [{ productId: 'p1', quantity: 1 }]
  };

  const fp1 = await helpers.computeLocalOrderFingerprintHex(payload);
  const attempt1 = helpers.resolveCheckoutAttemptState(sessionStorage, fp1);
  assert.equal(helpers.isValidUuidV4(attempt1.clientRequestId), true);
  assert.equal(attempt1.reused, false);

  // Verify zero PII is stored in sessionStorage
  const rawStored = sessionStorage.getItem(helpers.CHECKOUT_ATTEMPT_STORAGE_KEY);
  const parsedStored = JSON.parse(rawStored);
  assert.deepEqual(Object.keys(parsedStored).sort(), ['clientRequestId', 'fingerprintHash']);
  assert.equal(rawStored.includes('01234567890'), false);
  assert.equal(rawStored.includes('مريم'), false);
  assert.equal(rawStored.includes('maryam'), false);
  assert.equal(rawStored.includes('سموحة'), false);

  // Retry with identical details must reuse exact same clientRequestId
  const attemptRetry = helpers.resolveCheckoutAttemptState(sessionStorage, fp1);
  assert.equal(attemptRetry.reused, true);
  assert.equal(attemptRetry.clientRequestId, attempt1.clientRequestId);

  // Changing shipping address generates a brand new UUID v4 clientRequestId
  const fp2 = await helpers.computeLocalOrderFingerprintHex({
    ...payload,
    address: 'شارع 15 الدور الثاني'
  });
  const attemptChanged = helpers.resolveCheckoutAttemptState(sessionStorage, fp2);
  assert.equal(attemptChanged.reused, false);
  assert.notEqual(attemptChanged.clientRequestId, attempt1.clientRequestId);
  assert.equal(helpers.isValidUuidV4(attemptChanged.clientRequestId), true);

  helpers.clearCheckoutAttemptState(sessionStorage);
  assert.equal(sessionStorage.getItem(helpers.CHECKOUT_ATTEMPT_STORAGE_KEY), null);
});

test('1.3 classifyCreateOrderOutcome enforces strict cart, token, 409 conflict/expired/in-progress, 503, 429, and CAPTCHA rules', () => {
  const validToken = crypto.randomBytes(32).toString('base64url');

  // 1. HTTP 200 with valid invoiceAccessToken -> redirect to #access= & clear cart/attempt
  const okOutcome = helpers.classifyCreateOrderOutcome({
    ok: true,
    status: 200,
    result: { success: true, orderId: '-Ord1', invoiceCode: 'DNY-100200', invoiceAccessToken: validToken }
  });
  assert.equal(okOutcome.action, 'SUCCESS_REDIRECT');
  assert.equal(okOutcome.clearCart, true);
  assert.equal(okOutcome.clearAttempt, true);
  assert.equal(okOutcome.redirectUrl, `/invoice#access=${encodeURIComponent(validToken)}`);
  assert.equal(okOutcome.redirectUrl.includes('?id='), false);
  assert.equal(okOutcome.redirectUrl.includes('?invoice='), false);

  // 2. HTTP 200 missing invoiceAccessToken -> NEVER clear cart, keep clientRequestId
  const missingTokenOutcome = helpers.classifyCreateOrderOutcome({
    ok: true,
    status: 200,
    result: { success: true, orderId: '-Ord1', invoiceCode: 'DNY-100200' }
  });
  assert.equal(missingTokenOutcome.action, 'MISSING_INVOICE_TOKEN');
  assert.equal(missingTokenOutcome.clearCart, false);
  assert.equal(missingTokenOutcome.clearAttempt, false);
  assert.equal(missingTokenOutcome.keepClientRequestId, true);
  assert.equal(missingTokenOutcome.allowAutoRetry, false);

  // 3. 409 ORDER_IN_PROGRESS -> keep clientRequestId & cart, reset Turnstile
  const inProgressOutcome = helpers.classifyCreateOrderOutcome({
    ok: false,
    status: 409,
    result: { success: false, error: 'ORDER_IN_PROGRESS', message: 'جاري معالجة الطلب' }
  });
  assert.equal(inProgressOutcome.action, 'ORDER_IN_PROGRESS');
  assert.equal(inProgressOutcome.clearCart, false);
  assert.equal(inProgressOutcome.keepClientRequestId, true);
  assert.equal(inProgressOutcome.resetTurnstile, true);
  assert.equal(inProgressOutcome.allowAutoRetry, false);

  // 4. 409 IDEMPOTENCY_CONFLICT -> never auto-retry, prompt new attempt
  const conflictOutcome = helpers.classifyCreateOrderOutcome({
    ok: false,
    status: 409,
    result: { success: false, error: 'IDEMPOTENCY_CONFLICT' }
  });
  assert.equal(conflictOutcome.action, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflictOutcome.clearCart, false);
  assert.equal(conflictOutcome.allowAutoRetry, false);
  assert.equal(conflictOutcome.requireNewAttempt, true);

  // 5. 409 IDEMPOTENCY_KEY_EXPIRED -> never auto-regenerate or auto-resubmit!
  const expiredOutcome = helpers.classifyCreateOrderOutcome({
    ok: false,
    status: 409,
    result: { success: false, error: 'IDEMPOTENCY_KEY_EXPIRED' }
  });
  assert.equal(expiredOutcome.action, 'IDEMPOTENCY_KEY_EXPIRED');
  assert.equal(expiredOutcome.clearCart, false);
  assert.equal(expiredOutcome.allowAutoRetry, false);
  assert.equal(expiredOutcome.requireManualVerification, true);

  // 6. 503, 429, CAPTCHA failure, Network error -> preserve cart & clientRequestId, reset Turnstile
  for (const scenario of [
    { ok: false, status: 503, result: { error: 'SERVICE_TEMPORARILY_UNAVAILABLE' }, expectAction: 'TRANSIENT_KEEP_ID' },
    { ok: false, status: 429, result: { error: 'RATE_LIMIT_EXCEEDED' }, expectAction: 'RATE_LIMITED_KEEP_ID' },
    { ok: false, status: 403, result: { error: 'CAPTCHA_FAILED' }, expectAction: 'CAPTCHA_FAILED_KEEP_ID' },
    { networkError: true, expectAction: 'TRANSIENT_KEEP_ID' }
  ]) {
    const out = helpers.classifyCreateOrderOutcome(scenario);
    assert.equal(out.action, scenario.expectAction);
    assert.equal(out.clearCart, false);
    assert.equal(out.clearAttempt, false);
    assert.equal(out.keepClientRequestId, true);
    assert.equal(out.resetTurnstile, true);
    assert.equal(out.allowAutoRetry, false);
  }
});

// ===========================================================================
// 2. Invoice Page Fragment & sessionStorage Reload Persistence
// ===========================================================================
test('2.1 resolveInvoiceAccessToken persists #access token to sessionStorage for reload resilience and clears on 404 only', () => {
  const sessionStorage = createMemoryStorage();
  const token = crypto.randomBytes(32).toString('base64url');

  // Initial load from #access=...
  const firstLoad = helpers.resolveInvoiceAccessToken(`#access=${encodeURIComponent(token)}`, sessionStorage);
  assert.equal(firstLoad.token, token);
  assert.equal(firstLoad.source, 'hash');
  assert.equal(firstLoad.shouldStripHash, true);
  assert.equal(sessionStorage.getItem(helpers.INVOICE_SESSION_STORAGE_KEY), token);

  // Reload after history.replaceState stripped #access=...
  const reload = helpers.resolveInvoiceAccessToken('', sessionStorage);
  assert.equal(reload.token, token);
  assert.equal(reload.source, 'session');
  assert.equal(reload.shouldStripHash, false);

  // 429 / 503 keep token in sessionStorage and allow retry
  const rateLimited = helpers.classifyPublicInvoiceResponse({ ok: false, status: 429, data: {} });
  assert.equal(rateLimited.clearSessionToken, false);
  assert.equal(rateLimited.showRetry, true);

  const unavailable = helpers.classifyPublicInvoiceResponse({ ok: false, status: 503, data: {} });
  assert.equal(unavailable.clearSessionToken, false);
  assert.equal(unavailable.showRetry, true);

  // 404 clears token from sessionStorage
  const notFound = helpers.classifyPublicInvoiceResponse({ ok: false, status: 404, data: {} });
  assert.equal(notFound.clearSessionToken, true);
  assert.equal(notFound.showRetry, false);
  helpers.clearInvoiceSessionToken(sessionStorage);
  assert.equal(sessionStorage.getItem(helpers.INVOICE_SESSION_STORAGE_KEY), null);
});

// ===========================================================================
// 3. Tracking Page PII Migration & Legacy URL Phone Stripping
// ===========================================================================
test('3.1 dandy_recent_lookups strips phone from legacy records and never stores phone in new searches', () => {
  const localStorage = createMemoryStorage({
    dandy_recent_lookups: JSON.stringify([
      { code: 'dny-111222', phone: '01012345678', time: 1700000000000 },
      { code: 'DNY-333444', phone: '01298765432', extraSecret: 'leak', time: 1700000001000 }
    ])
  });

  const migrated = helpers.loadAndMigrateRecentLookups(localStorage, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), [
    { code: 'DNY-111222', time: 1700000000000 },
    { code: 'DNY-333444', time: 1700000001000 }
  ]);

  const rawAfterMigration = localStorage.getItem('dandy_recent_lookups');
  assert.equal(rawAfterMigration.includes('01012345678'), false);
  assert.equal(rawAfterMigration.includes('01298765432'), false);
  assert.equal(rawAfterMigration.includes('phone'), false);

  const updated = helpers.saveRecentLookupCode(localStorage, 'DNY-555666', 4);
  assert.equal(updated[0].code, 'DNY-555666');
  assert.equal('phone' in updated[0], false);
  assert.equal(localStorage.getItem('dandy_recent_lookups').includes('phone'), false);
});

test('3.2 extractTrackOrderUrlParams strips phone from query string and preserves code only', () => {
  const legacyParams = helpers.extractTrackOrderUrlParams('?code=dny-998877&phone=01012345678');
  assert.equal(legacyParams.code, 'DNY-998877');
  assert.equal(legacyParams.phone, '01012345678');
  assert.equal(legacyParams.shouldStripPhone, true);
  assert.equal(legacyParams.cleanedRelativeSearch, '?code=DNY-998877');
  assert.equal(legacyParams.cleanedRelativeSearch.includes('phone'), false);

  const codeOnlyParams = helpers.extractTrackOrderUrlParams('?code=DNY-123456');
  assert.equal(codeOnlyParams.code, 'DNY-123456');
  assert.equal(codeOnlyParams.phone, '');
  assert.equal(codeOnlyParams.shouldStripPhone, false);

  // Uniform 404 anti-enumeration message + 429 + 503 error texts
  const msg404 = helpers.classifyTrackOrderError({ status: 404, data: {} });
  const msg429 = helpers.classifyTrackOrderError({ status: 429, data: {} });
  const msg503 = helpers.classifyTrackOrderError({ status: 503, data: {} });
  assert.equal(msg404.includes('كود الفاتورة صحيح'), false);
  assert.match(msg429, /الحد المسموح|الانتظار/);
  assert.match(msg503, /غير متاحة مؤقت/);
});

// ===========================================================================
// 4. POST /api/customer-invoice-access Security & Ownership Tests
// ===========================================================================
test('4.1 customer-invoice-access enforces HTTP methods, Content-Type, Bearer auth, anti-enumeration 404, and issues encrypted token for owner', async () => {
  const encKey = crypto.randomBytes(32).toString('hex');
  const mockDb = createMockAdminDb({
    orders: {
      '-OrdOwner1': {
        invoiceCode: 'DNY-700100',
        name: 'سارة علي',
        phone: '01011112222',
        customerId: 'uid_owner_1',
        products: [{ name: 'سيروم', quantity: 1, price: 300, lineTotal: 300 }]
      },
      '-OrdOtherUser': {
        invoiceCode: 'DNY-700200',
        name: 'مها حسن',
        phone: '01122223333',
        customerId: 'uid_someone_else',
        products: [{ name: 'كريم', quantity: 1, price: 250, lineTotal: 250 }]
      }
    }
  });

  const mockAuth = {
    async verifyIdToken(token) {
      if (token === 'valid_user_id_token_12345') {
        return { uid: 'uid_owner_1' };
      }
      throw new Error('Firebase ID token expired or invalid');
    }
  };

  // 1. Method checks
  const getRes = await customerInvoiceAccessGET();
  assert.equal(getRes.status, 405);
  assert.equal(getRes.headers.get('allow'), 'POST');
  assert.equal((await customerInvoiceAccessALL()).status, 405);

  // 2. Content-Type check
  const badCtRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{}'
    }),
    clientAddress: '41.41.41.1'
  });
  assert.equal(badCtRes.status, 415);

  // 3. Missing / invalid Bearer token -> 401
  const noAuthRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.2',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });
  assert.equal(noAuthRes.status, 401);

  const badAuthRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer tampered_token_999'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.3',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });
  assert.equal(badAuthRes.status, 401);

  // 4. Accessing another customer's order vs non-existent order -> identical 404 anti-enumeration
  const otherOrderRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOtherUser' })
    }),
    clientAddress: '41.41.41.4',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });
  const missingOrderRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-NonExistentOrder999' })
    }),
    clientAddress: '41.41.41.5',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });

  assert.equal(otherOrderRes.status, 404);
  assert.equal(missingOrderRes.status, 404);
  assert.deepEqual(await otherOrderRes.json(), await missingOrderRes.json());

  // 5. Authenticated owner succeeds, returns valid token ONLY, persists encrypted token (no plaintext)
  const okRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.6',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });
  assert.equal(okRes.status, 200);
  assert.match(okRes.headers.get('cache-control') || '', /no-store/);
  assert.equal(okRes.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(okRes.headers.get('x-content-type-options'), 'nosniff');

  const okBody = await okRes.json();
  assert.equal(okBody.success, true);
  assert.equal(isValidInvoiceTokenFormat(okBody.invoiceAccessToken), true);
  assert.equal(okBody.order, undefined);
  assert.equal(mockDb.data.privateOrderAccess['-OrdOwner1'].token, undefined);
  assert.equal(mockDb.data.privateOrderAccess['-OrdOwner1'].encryptedToken?.alg, 'aes-256-gcm');
  assert.ok(mockDb.data.privateInvoiceAccess[hashInvoiceToken(okBody.invoiceAccessToken)]);

  // Calling again returns the same active decrypted token
  const secondRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.6',
    _deps: { adminDb: mockDb, adminAuth: mockAuth, redis: null, encryptionKey: encKey }
  });
  assert.equal(secondRes.status, 200);
  assert.equal((await secondRes.json()).invoiceAccessToken, okBody.invoiceAccessToken);
});

test('4.2 customer-invoice-access fails closed with 503 on store outage/missing IP and 429 on limit exceeded', async () => {
  const failingTxDb = createMockAdminDb({}, { failTransactions: true });
  const failingRedis = {
    limit: async () => {
      throw new Error('Redis timeout');
    }
  };

  // Outage -> 503
  const outageRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.50',
    _deps: {
      adminDb: failingTxDb,
      redis: failingRedis,
      adminAuth: { verifyIdToken: async () => ({ uid: 'u1' }) }
    }
  });
  assert.equal(outageRes.status, 503);
  assert.equal((await outageRes.json()).error, 'SERVICE_TEMPORARILY_UNAVAILABLE');

  // Missing client IP -> 503
  const missingIpRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    _deps: { adminDb: createMockAdminDb({}), redis: null }
  });
  assert.equal(missingIpRes.status, 503);

  // Rate limit exceeded -> 429 with Retry-After
  const limitedRes = await customerInvoiceAccessPOST({
    request: new Request('http://localhost:3000/api/customer-invoice-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid_user_id_token_12345'
      },
      body: JSON.stringify({ orderId: '-OrdOwner1' })
    }),
    clientAddress: '41.41.41.51',
    _deps: {
      adminDb: createMockAdminDb({}),
      redis: { limit: async () => ({ success: false, remaining: 0, limit: 60, reset: Date.now() + 30_000 }) }
    }
  });
  assert.equal(limitedRes.status, 429);
  assert.ok(Number(limitedRes.headers.get('retry-after')) > 0);
});

// ===========================================================================
// 5. Frontend Static Compliance Audit Across Astro Pages
// ===========================================================================
test('5.1 cart.astro, invoice.astro, track-order.astro, and account.astro strictly adhere to Group 3A security contracts', async () => {
  const [cartHtml, invoiceHtml, trackHtml, accountHtml] = await Promise.all([
    fs.readFile(path.resolve('src/pages/cart.astro'), 'utf8'),
    fs.readFile(path.resolve('src/pages/invoice.astro'), 'utf8'),
    fs.readFile(path.resolve('src/pages/track-order.astro'), 'utf8'),
    fs.readFile(path.resolve('src/pages/account.astro'), 'utf8')
  ]);

  // 1. cart.astro compliance
  assert.ok(cartHtml.includes('/assets/js/order-flow-helpers.js'));
  assert.ok(cartHtml.includes('clientRequestId'));
  assert.equal(cartHtml.includes('/invoice?id='), false, 'cart.astro must never redirect to ?id=');
  assert.equal(cartHtml.includes('/invoice?invoice='), false, 'cart.astro must never redirect to ?invoice=');
  assert.equal(cartHtml.includes('phone: phone'), false, 'cart.astro must never store phone in dandy_recent_lookups');
  assert.equal(cartHtml.includes("db.ref('orders')"), false, 'cart.astro must not read orders directly');

  // 2. invoice.astro compliance
  assert.ok(invoiceHtml.includes('/assets/js/order-flow-helpers.js'));
  assert.equal(invoiceHtml.includes('firebase.database()'), false, 'invoice.astro must not initialize direct RTDB reads');
  assert.equal(invoiceHtml.includes("db.ref('orders"), false, 'invoice.astro must not read orders directly');
  assert.ok(invoiceHtml.includes("cache: 'no-store'"));
  assert.ok(invoiceHtml.includes("fetch('/api/public-invoice'"));
  assert.ok(invoiceHtml.includes('history.replaceState'));
  assert.ok(invoiceHtml.includes('/track-order?code='));

  // 3. track-order.astro compliance
  assert.ok(trackHtml.includes('/assets/js/order-flow-helpers.js'));
  assert.equal(trackHtml.includes('firebase.database()'), false, 'track-order.astro must not initialize RTDB');
  assert.equal(trackHtml.includes("db.ref('orders')"), false, 'track-order.astro must not read orders directly');
  assert.ok(trackHtml.includes("fetch('/api/track-order'"));
  assert.ok(trackHtml.includes("cache: 'no-store'"));
  assert.equal(trackHtml.includes('resCustPhone'), false, 'track-order must not render customer phone element');
  assert.equal(trackHtml.includes('resCustAddress'), false, 'track-order must not render street address element');
  assert.equal(trackHtml.includes('resTotal'), false, 'track-order must not render totalAmount element');

  // 4. account.astro compliance
  assert.ok(accountHtml.includes('/assets/js/order-flow-helpers.js'));
  assert.ok(accountHtml.includes("db.ref('orders').orderByChild('customerId').equalTo(currentUser.uid)"));
  assert.ok(accountHtml.includes("fetch('/api/customer-invoice-access'"));
  assert.ok(accountHtml.includes("'/invoice#access=' + encodeURIComponent(data.invoiceAccessToken)"));
  assert.ok(accountHtml.includes('/track-order?code=${encodeURIComponent(invoiceCode)}'));
  assert.equal(accountHtml.includes('/invoice?invoice='), false, 'account.astro must not link to legacy ?invoice=');
});
