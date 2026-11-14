import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getAllArticles,
  getArticleBySlug,
  getArticleById,
  parseFirestoreArticle,
  clearArticlesCache
} from '../src/utils/articles.ts';
import {
  GET as publicArticlesGET,
  ALL as publicArticlesALL,
  MAX_PUBLIC_ARTICLES_LIMIT,
  DEFAULT_PUBLIC_ARTICLES_LIMIT
} from '../src/pages/api/public-articles.js';

const ROOT = process.cwd();

function makeDocSnap(id, data, meta = {}) {
  return {
    id,
    exists: meta.exists !== undefined ? meta.exists : true,
    createTime: meta.createTime ? { toDate: () => new Date(meta.createTime) } : undefined,
    updateTime: meta.updateTime ? { toDate: () => new Date(meta.updateTime) } : undefined,
    data: () => data
  };
}

function makeMockDeps(docList) {
  const byId = new Map(docList.map((d) => [d.id, d]));
  return {
    firestore: {
      collection(name) {
        assert.equal(name, 'articles');
        return {
          async get() {
            return {
              docs: docList,
              forEach(cb) {
                for (const d of docList) cb(d);
              }
            };
          },
          doc(docId) {
            return {
              async get() {
                return byId.get(docId) || makeDocSnap(docId, null, { exists: false });
              }
            };
          }
        };
      }
    }
  };
}

test('A. Published & Legacy Articles: returns status=published and legacy articles missing status, sorted newest-first', async () => {
  clearArticlesCache();

  const docs = [
    makeDocSnap('legacy-1', {
      title: 'مقال قديم بدون حقل حالة',
      slug: 'legacy-article-no-status',
      category: 'العناية بالبشرة',
      excerpt: 'ملخص قديم',
      content: '<p>محتوى قديم</p>',
      createdAt: { toDate: () => new Date('2026-01-10T10:00:00Z') }
    }),
    makeDocSnap('pub-2', {
      title: 'روتين الشعر اليومي',
      slug: 'daily-hair-routine',
      category: 'العناية بالشعر',
      status: 'published',
      image: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      excerpt: 'ملخص الشعر',
      content: '<p>محتوى الشعر</p>',
      createdAt: { toDate: () => new Date('2026-06-15T12:00:00Z') }
    }),
    makeDocSnap('legacy-null-status', {
      title: 'مقال قديم بحالة null',
      slug: 'legacy-null-status',
      category: 'العطور',
      status: null,
      content: '<p>نص العناية بالعطور الطبيعية</p>'
    }, {
      createTime: '2026-03-01T08:00:00Z'
    })
  ];

  const deps = makeMockDeps(docs);
  const all = await getAllArticles(true, deps);

  assert.equal(all.length, 3);
  assert.deepEqual(
    all.map((a) => a.id),
    ['pub-2', 'legacy-null-status', 'legacy-1']
  );

  // Cloudinary optimization preserved
  assert.ok(all[0].image.includes('/c_fill,w_1280,h_720,g_center,q_auto:good,f_auto/'));

  const bySlug = await getArticleBySlug('legacy-article-no-status', deps);
  assert.ok(bySlug);
  assert.equal(bySlug.id, 'legacy-1');
  assert.equal(bySlug.status, 'published');

  const byId = await getArticleById('legacy-null-status', deps);
  assert.ok(byId);
  assert.equal(byId.slug, 'legacy-null-status');
});

test('B. Draft Protection: drafts are excluded from getAllArticles, getArticleBySlug, getArticleById, and public-articles API', async () => {
  const docs = [
    makeDocSnap('pub-1', {
      title: 'مقال منشور',
      slug: 'published-article',
      status: 'published',
      excerpt: 'وصف منشور',
      content: '<p>محتوى منشور</p>',
      updatedBy: 'admin@dandy.com',
      adminEmail: 'admin@dandy.com',
      internalNotes: 'ملاحظة سرية',
      createdAt: '2026-07-01T10:00:00Z'
    }),
    makeDocSnap('draft-1', {
      title: 'مسودة سرية لا يجب أن تظهر',
      slug: 'secret-draft-slug',
      status: 'draft',
      excerpt: 'ملخص مسودة',
      content: '<p>محتوى مسودة غير منشور</p>',
      updatedBy: 'admin@dandy.com',
      createdAt: '2026-08-01T10:00:00Z'
    })
  ];

  const deps = makeMockDeps(docs);

  const all = await getAllArticles(true, deps);
  assert.equal(all.length, 1);
  assert.equal(all[0].id, 'pub-1');

  assert.equal(await getArticleBySlug('secret-draft-slug', deps), null);
  assert.equal(await getArticleById('draft-1', deps), null);

  const res = await publicArticlesGET({
    request: new Request('https://dandy-ebon.vercel.app/api/public-articles?limit=10'),
    url: new URL('https://dandy-ebon.vercel.app/api/public-articles?limit=10'),
    _deps: deps
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.articles.length, 1);
  assert.equal(body.articles[0].id, 'pub-1');

  // Ensure draft text never appears in serialized response
  const serialized = JSON.stringify(body);
  assert.ok(!serialized.includes('draft-1'));
  assert.ok(!serialized.includes('secret-draft-slug'));
  assert.ok(!serialized.includes('مسودة سرية'));

  // Ensure strictly allowlisted fields & zero admin/internal leakage
  const allowedKeys = new Set(['id', 'title', 'slug', 'category', 'image', 'excerpt', 'date', 'createdAt']);
  for (const key of Object.keys(body.articles[0])) {
    assert.ok(allowedKeys.has(key), `Unexpected field leaked in public article card: ${key}`);
  }
  assert.equal(body.articles[0].updatedBy, undefined);
  assert.equal(body.articles[0].adminEmail, undefined);
  assert.equal(body.articles[0].internalNotes, undefined);
  assert.equal(body.articles[0].status, undefined);
  assert.equal(body.articles[0].content, undefined);
});

test('C. Unknown Status: rejects non-standard status values by default', async () => {
  const unknownStatuses = ['archived', 'pending', 'private', 'deleted', '', 123, true, {}];

  for (const badStatus of unknownStatuses) {
    const doc = makeDocSnap(`bad-${String(badStatus)}`, {
      title: 'مقال بحالة غير معروفة',
      slug: 'unknown-status-article',
      status: badStatus,
      content: '<p>محتوى</p>'
    });

    assert.equal(
      parseFirestoreArticle(doc),
      null,
      `Unknown status (${JSON.stringify(badStatus)}) must return null`
    );
  }

  const deps = makeMockDeps([
    makeDocSnap('archived-1', {
      title: 'مقال مؤرشف',
      slug: 'archived-slug',
      status: 'archived',
      content: '<p>أرشيف</p>'
    }),
    makeDocSnap('pending-1', {
      title: 'مقال قيد المراجعة',
      slug: 'pending-slug',
      status: 'pending',
      content: '<p>مراجعة</p>'
    })
  ]);

  assert.deepEqual(await getAllArticles(true, deps), []);
  assert.equal(await getArticleBySlug('archived-slug', deps), null);
  assert.equal(await getArticleById('pending-1', deps), null);
});

test('D. Public Articles API: supports limit, clamps oversized limit, handles DB errors safely without secrets', async () => {
  const docs = Array.from({ length: 25 }, (_, idx) =>
    makeDocSnap(`art-${idx + 1}`, {
      title: `مقال رقم ${idx + 1}`,
      slug: `article-${idx + 1}`,
      status: 'published',
      excerpt: idx === 0 ? '' : `ملخص ${idx + 1}`,
      content: idx === 0 ? '<p>محتوى مستخلص تلقائياً للملخص</p>' : `<p>محتوى ${idx + 1}</p>`,
      createdAt: new Date(Date.UTC(2026, 0, idx + 1)).toISOString()
    })
  );
  const deps = makeMockDeps(docs);

  // 1. limit=3
  const res3 = await publicArticlesGET({
    request: new Request('https://dandy-ebon.vercel.app/api/public-articles?limit=3'),
    url: new URL('https://dandy-ebon.vercel.app/api/public-articles?limit=3'),
    _deps: deps
  });
  assert.equal(res3.status, 200);
  assert.ok(res3.headers.get('cache-control')?.includes('public'));
  const data3 = await res3.json();
  assert.equal(data3.success, true);
  assert.equal(data3.articles.length, 3);
  // Sorted newest first (art-25, art-24, art-23)
  assert.deepEqual(data3.articles.map((a) => a.id), ['art-25', 'art-24', 'art-23']);

  // 2. Oversized limit=999 clamped to MAX_PUBLIC_ARTICLES_LIMIT
  const resMax = await publicArticlesGET({
    request: new Request('https://dandy-ebon.vercel.app/api/public-articles?limit=999'),
    url: new URL('https://dandy-ebon.vercel.app/api/public-articles?limit=999'),
    _deps: deps
  });
  assert.equal(resMax.status, 200);
  const dataMax = await resMax.json();
  assert.equal(dataMax.articles.length, MAX_PUBLIC_ARTICLES_LIMIT);

  // 3. Invalid / negative limit falls back safely to DEFAULT_PUBLIC_ARTICLES_LIMIT
  const resBadLimit = await publicArticlesGET({
    request: new Request('https://dandy-ebon.vercel.app/api/public-articles?limit=-5'),
    url: new URL('https://dandy-ebon.vercel.app/api/public-articles?limit=-5'),
    _deps: deps
  });
  assert.equal(resBadLimit.status, 200);
  const dataBad = await resBadLimit.json();
  assert.equal(dataBad.articles.length, DEFAULT_PUBLIC_ARTICLES_LIMIT);

  // 4. Simulated Firebase failure returns safe 503 with zero credentials or stack traces
  const errRes = await publicArticlesGET({
    request: new Request('https://dandy-ebon.vercel.app/api/public-articles?limit=3'),
    url: new URL('https://dandy-ebon.vercel.app/api/public-articles?limit=3'),
    _deps: { simulateError: true }
  });
  assert.equal(errRes.status, 503);
  assert.ok(errRes.headers.get('cache-control')?.includes('no-store'));
  const errBody = await errRes.json();
  assert.equal(errBody.success, false);
  assert.equal(errBody.error, 'ARTICLES_UNAVAILABLE');
  assert.deepEqual(errBody.articles, []);
  const errText = JSON.stringify(errBody);
  assert.ok(!errText.includes('Simulated Firestore unavailability'));
  assert.ok(!errText.includes('PRIVATE KEY'));
  assert.ok(!errText.includes('FIREBASE_SERVICE_ACCOUNT'));

  // 5. Non-GET method rejected cleanly
  const methodRes = await publicArticlesALL();
  assert.equal(methodRes.status, 405);
  assert.equal(methodRes.headers.get('allow'), 'GET');
});

test('E. Homepage & Security Boundaries: index.astro uses /api/public-articles?limit=3 without unfiltered Firestore query or Admin SDK in browser', () => {
  const indexContent = fs.readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
  assert.ok(
    !indexContent.includes("firestore.collection('articles')"),
    'index.astro must not run direct unfiltered firestore.collection("articles") queries'
  );
  assert.ok(
    indexContent.includes("fetch('/api/public-articles?limit=3'"),
    'index.astro loadHomeBlog() must call /api/public-articles?limit=3'
  );
  assert.ok(!indexContent.includes('firebase-admin'));

  // Verify articles.ts no longer uses unauthenticated Firestore REST API
  const articlesService = fs.readFileSync(path.join(ROOT, 'src/utils/articles.ts'), 'utf8');
  assert.ok(!articlesService.includes('firestore.googleapis.com'));
  assert.ok(articlesService.includes("import { getFirestore } from 'firebase-admin/firestore'"));
  assert.ok(articlesService.includes('getAdminApp()'));

  // Verify Firestore rules remain hardened (no allow read: if true on articles)
  const fsRules = fs.readFileSync(path.join(ROOT, 'firebase/firestore.rules'), 'utf8');
  assert.ok(!/allow\s+read:\s*if\s+true/.test(fsRules));
  assert.match(fsRules, /resource\.data\.status\s*==\s*'published'/);
});

test('F. Admin Blog Compatibility: dashboard-blog.astro keeps verified admin CRUD + draft/published toggle + change_logs', () => {
  const adminBlog = fs.readFileSync(path.join(ROOT, 'src/pages/dashboard-blog.astro'), 'utf8');
  assert.ok(adminBlog.includes("user.email.toLowerCase() !== 'admin@dandy.com'"));
  assert.ok(adminBlog.includes('user.emailVerified !== true'));
  assert.ok(adminBlog.includes("db.collection('articles').orderBy('createdAt', 'desc').get()"));
  assert.ok(adminBlog.includes("db.collection('articles').doc(editId).update(payload)"));
  assert.ok(adminBlog.includes("db.collection('articles').add(payload)"));
  assert.ok(adminBlog.includes("db.collection('articles').doc(id).delete()"));
  assert.ok(adminBlog.includes("collection('change_logs').add("));
  assert.ok(!adminBlog.includes('firebase-admin'));
});
