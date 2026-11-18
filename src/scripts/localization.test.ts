import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  LANGUAGE_SWITCHER_CONTRACT,
  LOCALE_CONFIGS,
  LOCALE_PREFERENCE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  buildCanonicalUrl,
  buildHreflangAlternates,
  buildLocalizedBreadcrumbJsonLd,
  buildLocalizedPath,
  buildLocalizedSeoMetadata,
  buildLocalizedWebPageJsonLd,
  classifyLocalizedRoute,
  filterPublishableSitemapUrls,
  formatCurrencyEgp,
  formatDate,
  formatMixedMeasurement,
  formatNumber,
  formatPercent,
  formatQuantity,
  getDocumentAttributes,
  getLocaleConfig,
  hasEnglishRoutePrefix,
  hasTranslation,
  isLocalePublished,
  persistLocalePreference,
  readStoredLocalePreference,
  resolveDocumentLocale,
  resolveLocaleFromPath,
  resolveLocalizedArticle,
  resolveLocalizedCategory,
  resolveLocalizedGovernorateLabel,
  resolveLocalizedHomepageStudioState,
  resolveLocalizedOrderStatusLabel,
  resolveLocalizedPinkFridayCampaign,
  resolveLocalizedProduct,
  resolveRouteCounterpart,
  resolveTranslation,
  runLocalizationCompletenessAudit,
  sanitizeLocalizedQueryParams,
  stripLocalePrefix,
  t,
  AR_MESSAGES,
} from '../i18n/index';
import type { Product } from '../utils/products';
import type { Article } from '../utils/articles';
import { INITIAL_2026_CAMPAIGN } from '../utils/pink-friday-server';
import type { HomepageStudioState } from './homepage-studio';
import { calculateShippingQuote, SHIPPING_RATES } from './purchase-flow';

test('locale configuration sets Arabic RTL published default and English LTR unpublished target', () => {
  assert.equal(DEFAULT_LOCALE, 'ar');
  assert.deepEqual([...SUPPORTED_LOCALES], ['ar', 'en']);

  assert.equal(LOCALE_CONFIGS.ar.dir, 'rtl');
  assert.equal(LOCALE_CONFIGS.ar.isPubliclyPublished, true);
  assert.equal(LOCALE_CONFIGS.ar.routePrefix, '');

  assert.equal(LOCALE_CONFIGS.en.dir, 'ltr');
  assert.equal(LOCALE_CONFIGS.en.isPubliclyPublished, false);
  assert.equal(LOCALE_CONFIGS.en.routePrefix, '/en');

  assert.equal(isLocalePublished('ar'), true);
  assert.equal(isLocalePublished('en'), false);
  assert.deepEqual(getDocumentAttributes('ar'), { lang: 'ar', dir: 'rtl' });
  assert.deepEqual(getDocumentAttributes('en'), { lang: 'en', dir: 'ltr' });
  assert.equal(getLocaleConfig('fr-FR').code, 'ar');
});

test('URL-first locale resolution ignores stored preferences and browser headers on Arabic routes', () => {
  assert.equal(resolveLocaleFromPath('/'), 'ar');
  assert.equal(resolveLocaleFromPath('/all-products'), 'ar');
  assert.equal(resolveLocaleFromPath('/product/facial-serum-3x1-30ml'), 'ar');
  assert.equal(resolveLocaleFromPath('/offers'), 'ar');
  assert.equal(resolveLocaleFromPath('/post'), 'ar');
  assert.equal(resolveLocaleFromPath('/en-sample'), 'ar');
  assert.equal(resolveLocaleFromPath('/english'), 'ar');

  assert.equal(hasEnglishRoutePrefix('/en'), true);
  assert.equal(hasEnglishRoutePrefix('/en/'), true);
  assert.equal(hasEnglishRoutePrefix('/en/all-products?sort=price-asc'), true);
  assert.equal(hasEnglishRoutePrefix('/en-gift-set'), false);

  const arabicWithEnPref = resolveDocumentLocale({
    pathname: '/all-products',
    storedPreference: 'en',
    browserLanguages: ['en-US', 'en'],
  });
  assert.equal(arabicWithEnPref.locale, 'ar');
  assert.equal(arabicWithEnPref.dir, 'rtl');
  assert.equal(arabicWithEnPref.source, 'default-unprefixed');
  assert.equal(arabicWithEnPref.storedPreferenceIgnoredDueToUrl, true);
  assert.equal(arabicWithEnPref.nonAuthoritativeBrowserHint, 'en');

  // Unpublished English route safely falls back when public enforcement is active
  const unpublishedEnPublic = resolveDocumentLocale({
    pathname: '/en/all-products',
    enforcePublishedOnly: true,
  });
  assert.equal(unpublishedEnPublic.locale, 'ar');
  assert.equal(unpublishedEnPublic.source, 'unpublished-fallback');

  // When preview mode inspects target locale explicitly
  const previewEn = resolveDocumentLocale({
    pathname: '/en/all-products',
    enforcePublishedOnly: false,
  });
  assert.equal(previewEn.locale, 'en');
  assert.equal(previewEn.dir, 'ltr');
  assert.equal(previewEn.source, 'url-prefix');
});

test('locale preference storage contract stays pure and safe without auto-redirects', () => {
  assert.equal(LANGUAGE_SWITCHER_CONTRACT.autoRedirectByBrowserOrIp, false);
  assert.equal(LANGUAGE_SWITCHER_CONTRACT.urlPrecedesStoredPreference, true);

  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
  };

  assert.equal(persistLocalePreference('en', mockStorage), true);
  assert.equal(mem.get(LOCALE_PREFERENCE_STORAGE_KEY), 'en');
  assert.equal(readStoredLocalePreference(mockStorage), 'en');
  assert.equal(readStoredLocalePreference(null), null);
});

test('route counterpart mapping preserves entities, handles duplicate prefixes, and enforces query allowlists', () => {
  // Duplicate `/en/en/` prefix collapse
  assert.equal(stripLocalePrefix('/en/en/cart/'), '/cart');
  assert.equal(buildLocalizedPath('/en/en/product/facial-serum-3x1-30ml', 'en'), '/en/product/facial-serum-3x1-30ml');
  assert.equal(buildLocalizedPath('/en/all-products', 'ar'), '/all-products');

  // Phase 10 unpublished state prevents public switching while computing safe target path
  const phase10Switch = resolveRouteCounterpart('/all-products?search=serum&price=150-300&token=secret', 'en');
  assert.equal(phase10Switch.targetPath, '/en/all-products');
  assert.equal(phase10Switch.isSwitchSafe, false);
  assert.equal(phase10Switch.fallbackReason, 'locale-unpublished');
  assert.deepEqual(phase10Switch.preservedQueryParams, ['search', 'price']);
  assert.deepEqual(phase10Switch.strippedQueryParams, ['token']);

  // Preview target enabled (simulating Phase 11 behavior)
  const productSwitch = resolveRouteCounterpart(
    '/product/facial-serum-3x1-30ml?utm_source=ig#reviews',
    'en',
    {},
    { allowUnpublishedPreviewTarget: true }
  );
  assert.equal(productSwitch.fullTargetUrl, '/en/product/facial-serum-3x1-30ml?utm_source=ig#reviews');
  assert.equal(productSwitch.isSwitchSafe, true);
  assert.equal(productSwitch.usedFallback, false);

  // Invoice route strips sensitive hash tokens (#access=...) and keeps only invoice ref
  const invoiceSwitch = resolveRouteCounterpart(
    '/invoice?invoice=INV-9001&token=leak#access=private-secret',
    'en',
    {},
    { allowUnpublishedPreviewTarget: true }
  );
  assert.equal(invoiceSwitch.fullTargetUrl, '/en/invoice?invoice=INV-9001');
  assert.deepEqual(invoiceSwitch.strippedQueryParams, ['token']);

  // Missing translated blog article safely falls back to /en/blog
  const missingArticleSwitch = resolveRouteCounterpart(
    '/blog/arabic-only-post?utm_campaign=spring',
    'en',
    { targetEntityExists: false },
    { allowUnpublishedPreviewTarget: true }
  );
  assert.equal(missingArticleSwitch.targetPath, '/en/blog');
  assert.equal(missingArticleSwitch.fullTargetUrl, '/en/blog?utm_campaign=spring');
  assert.equal(missingArticleSwitch.usedFallback, true);
  assert.equal(missingArticleSwitch.fallbackReason, 'entity-untranslated');
  assert.equal(missingArticleSwitch.isSwitchSafe, false);

  // Legacy route `/offers` maps to canonical `/en/special-offers`
  const offersSwitch = resolveRouteCounterpart(
    '/offers?utm_medium=social',
    'en',
    {},
    { allowUnpublishedPreviewTarget: true }
  );
  assert.equal(offersSwitch.fullTargetUrl, '/en/special-offers?utm_medium=social');

  // Admin / Studio / Login routes stay excluded from localization switching
  const adminRoute = resolveRouteCounterpart('/dashboard-index?tab=hero', 'en', {}, { allowUnpublishedPreviewTarget: true });
  assert.equal(adminRoute.routeKind, 'admin-excluded');
  assert.equal(adminRoute.targetPath, '/dashboard-index');
  assert.equal(adminRoute.isSwitchSafe, false);
  assert.equal(adminRoute.fallbackReason, 'route-excluded');

  assert.equal(classifyLocalizedRoute('/login').kind, 'admin-excluded');
  assert.equal(classifyLocalizedRoute('/statues').kind, 'admin-excluded');
  assert.deepEqual(sanitizeLocalizedQueryParams('?sort=price-asc&auth=bad', ['sort']).preserved, ['sort']);
});

test('translator resolves Arabic defaults, English prepared primitives, and flags missing keys explicitly', () => {
  assert.equal(t('ar', 'common.currencyEgp'), 'ج.م');
  assert.equal(t('en', 'navigation.home'), 'Home');
  assert.equal(t('en', 'common.discountBadge', { percent: 25 }), '25% OFF');
  assert.equal(t('ar', 'common.discountBadge', { percent: 25 }), 'خصم 25%');

  assert.equal(hasTranslation('ar', 'cart.confirmOrderCta'), true);
  assert.equal(hasTranslation('en', 'cart.confirmOrderCta'), false);

  // Explicit untranslated marker avoids silent mixed-language bugs
  const missingEn = resolveTranslation('en', 'cart.confirmOrderCta');
  assert.equal(missingEn.isTranslated, false);
  assert.equal(missingEn.missingKey, true);
  assert.equal(missingEn.text, '[untranslated:en:cart.confirmOrderCta]');

  // Optional fallback mode works cleanly when explicitly requested
  const fallbackEn = resolveTranslation('en', 'cart.confirmOrderCta', {
    missingStrategy: 'arabic-fallback',
  });
  assert.equal(fallbackEn.fallbackUsed, true);
  assert.equal(fallbackEn.text, AR_MESSAGES.cart.confirmOrderCta);

  // Invalid unknown key flagged explicitly
  const badKey = resolveTranslation('ar', 'unknown.nonexistentKey' as never);
  assert.equal(badKey.missingKey, true);
  assert.equal(badKey.text, '[missing-key:unknown.nonexistentKey]');
});

test('formatting helpers render locale-appropriate currency, numbers, dates, and isolated units', () => {
  assert.equal(formatNumber(1250, 'ar'), '1,250');
  assert.equal(formatNumber(1250, 'en'), '1,250');

  assert.equal(formatCurrencyEgp(275, 'ar'), '275 ج.م');
  assert.equal(formatCurrencyEgp(275, 'en'), '275 EGP');
  assert.equal(formatPercent(20, 'en'), '20%');

  assert.equal(formatQuantity(1, 'ar'), '1 قطعة');
  assert.equal(formatQuantity(3, 'ar'), '3 قطع');
  assert.equal(formatQuantity(1, 'en'), '1 item');
  assert.equal(formatQuantity(3, 'en'), '3 items');

  const mixedAr = formatMixedMeasurement(30, 'ml', 'ar');
  assert.equal(mixedAr, '\u206630 مل\u2069');
  assert.equal(formatMixedMeasurement(30, 'ml', 'en'), '30 ml');

  const formattedDateEn = formatDate('2026-11-18T12:00:00Z', 'en');
  assert.match(formattedDateEn, /2026/);
  assert.equal(formatDate('not-a-date', 'en'), '—');
});

test('metadata & SEO builders keep hreflang suppressed in Phase 10 and strictly reciprocal when published', () => {
  // Phase 10 default: Arabic canonicals untouched, zero hreflang tags emitted
  assert.equal(buildCanonicalUrl('/'), 'https://dandy-ebon.vercel.app/');
  assert.equal(buildCanonicalUrl('/all-products'), 'https://dandy-ebon.vercel.app/all-products');
  assert.deepEqual(buildHreflangAlternates('/all-products'), []);

  // Sitemap filter drops /en/ paths while English is unpublished
  const filteredSitemap = filterPublishableSitemapUrls([
    'https://dandy-ebon.vercel.app/',
    'https://dandy-ebon.vercel.app/all-products',
    'https://dandy-ebon.vercel.app/en/',
    'https://dandy-ebon.vercel.app/en/all-products',
  ]);
  assert.deepEqual(filteredSitemap, [
    'https://dandy-ebon.vercel.app/',
    'https://dandy-ebon.vercel.app/all-products',
  ]);

  // Phase 11 isolated simulation: published English generates reciprocal ar/en/x-default alternates
  const publishedMeta = buildLocalizedSeoMetadata({
    pathname: '/en/product/facial-serum-3x1-30ml',
    locale: 'en',
    title: '3-in-1 Facial Serum 30ml | Dandy Cosmetics',
    description: 'Botanical daily glow serum.',
    enPublishedOverride: true,
    targetEntityExists: true,
  });
  assert.equal(publishedMeta.canonical, 'https://dandy-ebon.vercel.app/en/product/facial-serum-3x1-30ml');
  assert.equal(publishedMeta.dir, 'ltr');
  assert.equal(publishedMeta.ogLocale, 'en_US');
  assert.deepEqual(publishedMeta.alternates, [
    { hreflang: 'ar', href: 'https://dandy-ebon.vercel.app/product/facial-serum-3x1-30ml' },
    { hreflang: 'en', href: 'https://dandy-ebon.vercel.app/en/product/facial-serum-3x1-30ml' },
    { hreflang: 'x-default', href: 'https://dandy-ebon.vercel.app/product/facial-serum-3x1-30ml' },
  ]);

  // Missing translated entity omits hreflang alternates cleanly even if English is published
  assert.deepEqual(
    buildHreflangAlternates('/blog/untranslated-post', {
      enPublishedOverride: true,
      targetEntityExists: false,
    }),
    []
  );

  const webPageLd = buildLocalizedWebPageJsonLd({
    locale: 'en',
    canonicalUrl: 'https://dandy-ebon.vercel.app/en/',
    name: 'Dandy Cosmetics',
    description: 'Natural Skincare & Haircare',
  });
  assert.equal(webPageLd.inLanguage, 'en');

  const breadcrumbLd = buildLocalizedBreadcrumbJsonLd({
    locale: 'en',
    canonicalUrl: 'https://dandy-ebon.vercel.app/en/all-products',
    items: [{ name: 'All Products', pathOrUrl: '/en/all-products' }],
  }) as { itemListElement: Array<{ name: string }> };
  assert.equal(breadcrumbLd.itemListElement[0].name, 'Home');
});

test('localized content adapters never mutate commerce data, pricing, variants, or Studio layout', () => {
  const sampleProduct: Product = {
    id: '-OvPo-cuVeLHWSU8KQ22',
    name: 'سيروم الوجه 3×1',
    resolvedSlug: 'facial-serum-3x1-30ml',
    description: 'سيروم طبيعي للبشرة',
    price: 275,
    originalPrice: 320,
    discount: 14,
    category: 'Skin care',
    image: 'https://example.com/serum.jpg',
    inStock: true,
    stockQuantity: 12,
    hasVariants: true,
    variants: [
      { id: 'v_rose', name: 'الورد الدمشقي', isAvailable: true },
      { id: 'v_lavender', name: 'اللافندر', isAvailable: false },
    ],
  };

  const enView = resolveLocalizedProduct(sampleProduct, 'en', {
    customEnCatalog: {
      '-OvPo-cuVeLHWSU8KQ22': {
        productId: '-OvPo-cuVeLHWSU8KQ22',
        name: '3-in-1 Facial Serum 30ml',
        description: 'Botanical brightening facial serum.',
        variantLabels: {
          v_rose: 'Damask Rose',
          v_lavender: 'Wild Lavender',
        },
      },
    },
  });

  // Commercial fields and IDs remain untouched
  assert.equal(enView.product.id, sampleProduct.id);
  assert.equal(enView.product.price, 275);
  assert.equal(enView.product.discount, 14);
  assert.equal(enView.product.stockQuantity, 12);
  assert.equal(sampleProduct.name, 'سيروم الوجه 3×1');
  assert.equal(enView.localization.hasTranslation, true);
  assert.equal(enView.localization.content.name, '3-in-1 Facial Serum 30ml');
  assert.equal(enView.localization.variants[0].id, 'v_rose');
  assert.equal(enView.localization.variants[0].localizedName, 'Damask Rose');
  assert.equal(enView.localization.variants[1].isAvailable, false);

  // Category & Governorate & Order status adapters keep backend keys intact
  const enCat = resolveLocalizedCategory('skin-care', 'en');
  assert.equal(enCat.content.name, 'Skin Care');
  assert.equal(enCat.hasTranslation, false); // Partial in Phase 10 until full SEO copy authored

  assert.equal(resolveLocalizedGovernorateLabel('Gharbia', 'ar'), 'الغربية');
  assert.equal(resolveLocalizedGovernorateLabel('Gharbia', 'en'), 'Gharbia');
  assert.equal(calculateShippingQuote(500, 'Gharbia').shippingFee, SHIPPING_RATES.Gharbia);
  assert.equal(resolveLocalizedOrderStatusLabel('قيد التجهيز', 'en').label, 'Preparing Order');

  // Homepage Studio adapter preserves section order, visibility, and products strictly
  const studioBaseline: HomepageStudioState = {
    hero: [{ title: 'جمال طبيعي', subtitle: 'عناية يومية', buttonText: 'تسوقي الآن', image: '/hero.jpg' }],
    sections: [{ id: 'offers', order: 1, visible: true, title: 'العروض', type: 'offers', limit: 8 }],
    trust: { item1: { title: 'شحن سريع', desc: 'لجميع المحافظات' } },
    reviews: [],
    categories: {},
    sectionOrder: ['hero', 'trust', 'offers', 'categories'],
    sectionsVisibility: { hero: true, trust: true, offers: true, categories: true },
  };
  const localizedStudio = resolveLocalizedHomepageStudioState(studioBaseline, 'en', {
    locale: 'en',
    heroSlides: { 0: { title: 'Natural Botanical Rituals', buttonText: 'Shop Now' } },
    sections: { offers: { title: 'Curated Offers' } },
  });
  assert.deepEqual(localizedStudio.sectionOrder, studioBaseline.sectionOrder);
  assert.deepEqual(localizedStudio.sectionsVisibility, studioBaseline.sectionsVisibility);
  assert.equal(localizedStudio.hero[0].title, 'Natural Botanical Rituals');
  assert.equal(studioBaseline.hero[0].title, 'جمال طبيعي'); // Non-mutating

  // Pink Friday adapter preserves dates & pricing math
  const pfLocalized = resolveLocalizedPinkFridayCampaign(INITIAL_2026_CAMPAIGN, 'en', {
    campaignId: INITIAL_2026_CAMPAIGN.id,
    title: 'Pink Friday Rituals',
    subtitle: 'Limited seasonal botanical offers.',
    ctaText: 'Explore Offers',
    badgeText: 'Pink Friday',
  });
  assert.equal(pfLocalized.endAt, INITIAL_2026_CAMPAIGN.endAt);
  assert.equal(pfLocalized.title, 'Pink Friday Rituals');

  // Article adapter flags missing English article explicitly
  const sampleArticle: Article = {
    id: 'art_1',
    title: 'روتين العناية بالشعر',
    slug: 'hair-care-routine',
    category: 'العناية بالشعر',
    status: 'published',
    image: '/img.jpg',
    excerpt: 'ملخص المقال',
    content: '<p>محتوى المقال</p>',
  };
  assert.equal(resolveLocalizedArticle(sampleArticle, 'en').hasTranslation, false);
});

test('translation completeness audit flags missing Phase 10 English assets accurately and passes complete fixture', () => {
  const mockProducts: Product[] = [
    { id: '-OvPo-cuVeLHWSU8KQ22', name: 'سيروم الوجه', resolvedSlug: 'facial-serum-3x1-30ml', price: 275 },
  ];
  const mockArticles: Article[] = [
    {
      id: 'art_1',
      title: 'روتين',
      slug: 'hair-routine',
      category: 'شعر',
      status: 'published',
      image: '/a.jpg',
      excerpt: 'ملخص',
      content: '<p>نص</p>',
    },
  ];

  // Phase 10 actual state: incomplete English dictionary/content must report NOT readyForPublication
  const phase10Audit = runLocalizationCompletenessAudit({
    products: mockProducts,
    articles: mockArticles,
  });
  assert.equal(phase10Audit.readyForPublication, false);
  assert.ok(phase10Audit.uiDictionary.missingKeys.length > 50);
  assert.deepEqual(phase10Audit.products.missingProductIds, ['-OvPo-cuVeLHWSU8KQ22']);
  assert.deepEqual(phase10Audit.articles.missingArticleIds, ['art_1']);
  assert.ok(phase10Audit.sharedCommerceExemptions.includes('product.price'));

  // Simulated Phase 11 complete fixture must return readyForPublication: true
  const fullEnMessages = structuredClone(AR_MESSAGES);
  const fullCategories = {
    'hair-care': { name: 'Hair Care', h1Title: 'Hair Care', introText: 'Intro', seoTitle: 'Hair Care | Dandy', seoDescription: 'Desc' },
    'body-care': { name: 'Body Care', h1Title: 'Body Care', introText: 'Intro', seoTitle: 'Body Care | Dandy', seoDescription: 'Desc' },
    fragrance: { name: 'Fragrance', h1Title: 'Fragrance', introText: 'Intro', seoTitle: 'Fragrance | Dandy', seoDescription: 'Desc' },
    'skin-care': { name: 'Skin Care', h1Title: 'Skin Care', introText: 'Intro', seoTitle: 'Skin Care | Dandy', seoDescription: 'Desc' },
  };
  const readyAudit = runLocalizationCompletenessAudit({
    products: mockProducts,
    articles: mockArticles,
    enMessages: fullEnMessages,
    enCategories: fullCategories,
    enProducts: {
      '-OvPo-cuVeLHWSU8KQ22': {
        productId: '-OvPo-cuVeLHWSU8KQ22',
        name: 'Facial Serum',
        description: 'Botanical serum',
      },
    },
    enArticles: {
      art_1: {
        articleId: 'art_1',
        slug: 'hair-routine',
        title: 'Hair Routine',
        category: 'Hair Care',
        excerpt: 'Summary',
        contentHtml: '<p>Content</p>',
        publishedInLocale: true,
      },
    },
  });
  assert.equal(readyAudit.readyForPublication, true);
  assert.equal(readyAudit.uiDictionary.missingKeys.length, 0);
});
