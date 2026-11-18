# وثيقة التدقيق المعماري قبل التنفيذ — المرحلة الحادية عشرة (Phase 11 Pre-Implementation Audit)
## تفعيل المتجر الإنجليزي الكامل ومبدّل اللغة (Complete English Storefront & Language Switching)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 11 — Complete English Storefront & Language Switching Only  
**الهوية البصرية المعتمدة:** Botanical Editorial Commerce (العربية RTL افتراضياً على `/`، والإنجليزية LTR تحت `/en/`)  
**الوضع المرجعي قبل أي تعديل:** إتمام المراحل 0–10 + `77/77` اختبار وحدة ناجح + صفر ملفات مُعدّلة حتى لحظة هذا التدقيق.

---

## البصمة الرقمية المرجعية للملفات المحمية (Protected Baseline SHA-256)

تم فحص ملفات الإعداد والبناء والنشر المحمية مباشرةً من مساحة العمل وتوثيق بصماتها الرقمية قبل إجراء أي تعديل:

| الملف المحمي | بصمة SHA-256 المرجعية | الحالة |
|---|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | سليم ومطابق لمرجع المرحلة 10 |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | سليم ومطابق |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | سليم ومطابق |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | سليم ومطابق |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | سليم ومطابق |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | سليم ومطابق |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | سليم ومطابق |

*(ملاحظة: لا توجد ملفات `package-lock.json` أو `.env` أو `.npmrc` أو `.nvmrc` أو `vite.config.*` في المستودع.)*

---

## 1. التحقق من البنية التحتية للمرحلة العاشرة (Phase 10 Infrastructure Verification)

تعمل وحدة `src/i18n/` بصورة مستقرة وخالية من التبعيات الخارجية، وتضم الملفات القائمة التالية:
- `src/i18n/types.ts` (539 سطراً): عقود `Locale`, `Direction`, `RouteDefinition`, `TranslationCatalog`, `ProductLocalizedContent`, `CategoryLocalizedContent`, `ArticleLocalizedContent`, `PinkFridayLocalizedOverlay`, `HomepageStudioLocalizedOverlay`, `TranslationCompletenessReport`, و`LanguageSwitcherContract`.
- `src/i18n/config.ts`: يعرّف `DEFAULT_LOCALE = 'ar'` و`SUPPORTED_LOCALES = ['ar', 'en']`؛ حالة `LOCALE_CONFIGS.en.isPubliclyPublished` ما زالت `false`.
- `src/i18n/resolve-locale.ts`: يطبق قاعدة URL-first (أي مسار غير `/en` أو `/en/*` يُعامل كـ `'ar'` حتى لو خُزّن تفضيل سابق)، ويعرّف `LANGUAGE_SWITCHER_CONTRACT` بموقعي الربط `['desktop-header-end', 'mobile-nav-drawer']` ومفتاح `dandy_preferred_locale`.
- `src/i18n/routes.ts`: يحتوي 20 مساراً في `ROUTE_REGISTRY` (14 مساراً قابلاً للفهرسة `indexable: true` و6 مسارات خدمية/حسابية `indexable: false`)، إضافةً إلى `/404` ومسارات التحويل التراثي (`/offers`, `/post`, `/product`) وعزل الإدارة (`/dashboard*`, `/login`, `/statues`, `/api/*`). جميع المسارات تحمل حالياً `englishPublished: false`.
- `src/i18n/translator.ts`, `src/i18n/format.ts`, `src/i18n/metadata.ts`, `src/i18n/translation-check.ts`, `src/i18n/content/adapters.ts`, `src/i18n/index.ts`.
- اختبارات الوحدة الحالية `npx --yes tsx --test src/scripts/*.test.ts` تمر بنسبة **77/77** دون أخطاء.

**ملاحظة معمارية مكتشفة:**
- لا يحتوي `HomepageStudioLocalizedOverlay` حالياً على حقل لترجمة عناصر `customSections[].items` (مثل أسئلة وأجوبة FAQ)، ولا على حقل لترجمة `reviews` الديناميكية عند احتوائها على نص عربي.
- لا يصرح نوع `PinkFridayVisuals` في `src/utils/pink-friday-server.ts` عن `headline` و`subtitle` و`heroImageUrl` رغم وجودها فعلياً في بيانات RTDB الحية، كما يحتاج `PinkFridayLocalizedOverlay` لدعم تخطي `headline` و`subtitle` واختيارياً `heroImageOverride` عند وجود نص عربي داخل صورة البانر.

---

## 2. الحالة الراهنة لاكتمال الترجمة الإنجليزية (Current English Translation Completeness)

تشغيل `runLocalizationCompletenessAudit()` على البيانات الحية الحالية (32 منتجاً نشطاً + 8 مقالات منشورة) يُظهر النتيجة الفعلية الآتية:

| المحور | القيمة الحالية | الإجمالي المطلوب | نسبة الاكتمال | الناقص |
|---|---|---|---|---|
| قاموس الواجهة (`EN_MESSAGES`) | `47` مفتاحاً | `193` مفتاحاً | `24.35%` | `146` مفتاحاً (17 نطاقاً فارغاً بالكامل) |
| التصنيفات (`EN_CATEGORY_CONTENT`) | `0` مكتمل | `4` تصنيفات | `0%` | `h1Title`, `introText`, `seoTitle`, `seoDescription` لكل تصنيف |
| المنتجات النشطة (`EN_PRODUCT_CONTENT`) | `0` مترجم | `32` منتجاً نشطاً | `0%` | جميع المنتجات الـ 32 + تسميات المتغيرات |
| المقالات المنشورة (`EN_ARTICLE_CONTENT`) | `0` مترجم | `8` مقالات منشورة | `0%` | جميع المقالات الـ 8 |
| خريطة المسارات (`ROUTE_REGISTRY`) | `14/14` معرّفاً | `14` مساراً قابلاً للفهرسة | `100%` تعريفاً (`0%` نشراً) | `englishPublished: false` على جميع المسارات |
| **`readyForPublication`** | **`false`** | **`true`** | — | غير جاهز للنشر العام بعد |

النطاقات الثلاثة المعبأة جزئياً حالياً في `EN_MESSAGES` هي: `common` (22 مفتاحاً)، `navigation` (20 مفتاحاً)، `categories` (5 مفاتيح).  
النطاقات الـ 17 الفارغة بالكامل هي: `header`, `footer`, `home`, `catalog`, `product`, `cart`, `checkout`, `orders`, `account`, `auth`, `blog`, `reviews`, `support`, `forms`, `errors`, `legal`, `consent`.

---

## 3. الجرد الكامل للمنتجات النشطة الحالية (Complete Active Product Inventory)

تم فحص Firebase RTDB `/products.json` مباشرةً، وتبين وجود **32 منتجاً نشطاً (`!isHidden`) و0 منتجات مخفية**:

1. `-OW9U9Af024A9LrbOU4f` — `كريم بديل الليزر 60 جم | Laser Replacement Cream 60gm` (`Body care` -> `body-care`, 0 variants)
2. `-OW9WB1GTP1GaDoqcd2R` — `ماسكارا علاجية | Treatment Mascara` (`Body care` -> override `skin-care`, 0 variants)
3. `-OW9YLJvzoW2u9P4ISmA` — `كريم تقشير كعب القدم 60 جم | Foot Peeling Cream 60 gm` (`Body care` -> `body-care`, 0 variants)
4. `-OWF2juQihSL1HV8PwTT` — `سيروم الاظافر | Nail Serum` (`Body care` -> `body-care`, 0 variants)
5. `-OWF4DCXsfQGlA7OOy11` — `مزيل عرق | Deodorant` (`Body care` -> `body-care`, 0 variants)
6. `-OWF5L62TkM4Y0odMy-l` — `هير واكس 80 جم | Hair Wax 80 gm` (`Hair care` -> `hair-care`, 0 variants)
7. `-OWF6uqnhnu3TCvoqLSD` — `معطر للجسم والشعر | Body &Hair Mist` (`Perfume` -> `fragrance`, 4 variants: `sweet-sugar`, `purple-flowers`, `candy-fruits`, `cherrys-love`)
8. `-OWF8NVhw0HgIaJRVOYL` — `مخمرية 30 جم | Solid Perfume 30 gm` (`Perfume` -> `fragrance`, 3 variants: `sweet-sugar`, `purple-flowers`, `candy-fruits`)
9. `-OWF9Deint3XcB6iNdCE` — `تنت | Tint` (`Body care` -> override `skin-care`, 0 variants)
10. `-OWFAaqOFptMA4YEPL7p` — `كريم لليدين 60 جم | Hand Cream 60 gm` (`Body care` -> `body-care`, 0 variants)
11. `-O_4D5IO_nPZf1fKcVlJ` — `شامبو فرى سالفيت 500 مل | Free sulfate Shampoo 500ml` (`Hair care` -> `hair-care`, 0 variants)
12. `-ObKDCc_il_Dz2_Mih-a` — `هير واكس 50 جم | Hair Wax 50 gm` (`Hair care` -> `hair-care`, 0 variants)
13. `-OvPo-cuVeLHWSU8KQ22` — `سيروم الوجه 3×1 - 30 مل | Serum 30 ml` (`Skin care` -> `skin-care`, 0 variants)
14. `-OvPpP6udx6LlLOL9O34` — `غسول الوجه للبشرة الدهنية والمختلطة 150 مل | Facial Cleanser 150 ml` (`Skin care` -> `skin-care`, 0 variants)
15. `-OvPpguWTAtcaWirD9Um` — `ليب بالم | Lip Balm` (`Body care` -> override `skin-care`, 3 variants: `s` Strawberry, `w` Watermelon, `c` Coconut)
16. `-OvPq4qdTQ-LqYbxr6Yv` — `بادى اسبلاش ٢٥٠ مل | Body Splash 250 ml` (`Perfume` -> `fragrance`, 4 variants: `vanilla-wave`, `rosy-velvet`, `freezy-crystal`, `golden-breeze`)
17. `-OvPqarOBOnNgQ_-kpTl` — `بادى باتر 150 جم | Body Butter 150 gm` (`Perfume` -> override `body-care`, 3 variants: `vanilla-wave`, `rosy-velvet`, `freezy-crystal`)
18. `-OvPqzneo_vqpucc-ef8` — `بادي سبلاش 25 مل | Body Splash 25 ml` (`Perfume` -> `fragrance`, 4 variants: `vanilla-wave`, `rosy-velvet`, `freezy-crystal`, `golden-breeze`)
19. `-OvPrFcWZtH_7tuSs7HJ` — `بادي سبلاش 100 مل | Body Splash 100 ml` (`Perfume` -> `fragrance`, 4 variants: `vanilla-wave`, `rosy-velvet`, `freezy-crystal`, `golden-breeze`)
20. `-Ow3pLIN18dRNJ4SdJsq` — `Hair Booster - ميكس زيوت للانبات وتطويل الشعر` (`Hair care` -> `hair-care`, 0 variants)
21. `-Ow3pm4awZPtvEZgewr7` — `اسبراي تساقط - Anti Hair Loss Spray` (`Hair care` -> `hair-care`, 0 variants)
22. `-Ow3qRPqc7hbleYuJOkI` — `شامبو القشرة 250 مل - Anti Dandruff Shampoo` (`Hair care` -> `hair-care`, 0 variants)
23. `-Ox6gMQgCgsSR-DrXTWk` — `شامبو التساقط - Anti hair loss shampoo 250 مل` (`Hair care` -> `hair-care`, 0 variants)
24. `-Ox6gklPQABGE7xPcq9a` — `اسبراي قشره - anti dandruff spray 60 مل` (`Hair care` -> `hair-care`, 0 variants)
25. `-Ox6hMmd9Ku_sU4d8le-` — `Hair mask - حمام كريم - ماسك الترميم 250 مل` (`Hair care` -> `hair-care`, 0 variants)
26. `-Ox6kxYMSw7H675QwVz0` — `مجموعة القشرة - Anti Dandruff Collection` (`Hair care` -> `hair-care`, 0 variants)
27. `-Ox6lYUp_xif6WXAHMGO` — `مجموعة التساقط - Anti hair loss` (`Hair care` -> `hair-care`, 0 variants)
28. `-Ox6sNW3Ki0Am9E6R9n_` — `هير ماسك + شامبو خالي من السلفات - Hair Repair Collection` (`Hair care` -> `hair-care`, 0 variants)
29. `-Ox6w5wfqsuhTgYlMDBs` — `مجموعة العناية بالبشرة | Skin care collection` (`Skin care` -> `skin-care`, 0 variants)
30. `-Ox74e3NwfE2TabGBnUT` — `مجموعة مسك 3 تولات 3 مل` (`Perfume` -> `fragrance`, 0 variants)
31. `-OxC877LX3vzD-3Pi_th` — `مسك داندى ٦ مل - متوفر ثلاثة روائح` (`Perfume` -> `fragrance`, 3 Arabic-labeled variants: `م`: مسك أبيض, `م-1`: مسك رمان, `م-2`: مسك باودر)
32. `-P5hKLdYUiIFHPxjSNUm` — `DANDY Body Lotion | 200 ML` (`Body care` -> `body-care`, 3 variants: `v` Vanilla Wave, `f` Freezy Crystal, `r` Rosy Velvet) — **مكتشف جديد غير مدرج في `EXISTING_PRODUCT_SLUG_MAP` (31 عنصراً سابقاً)، ويولّد له `getDeterministicSlug()` الرابط `dandy-body-lotion-200ml` تلقائياً.**

---

## 4. الإدخالات المحلية المترجمة حالياً للمنتجات (Existing Localized Product Entries)

- `src/i18n/content/en/products.ts` فارغ حالياً: `EN_PRODUCT_CONTENT = Object.freeze({})` (`0 / 32` منتجات).
- `CANONICAL_PRODUCT_IDS` مرتبط حالياً فقط بـ `Object.keys(EXISTING_PRODUCT_SLUG_MAP)` (31 معرّفاً)؛ يلزم إضافة `-P5hKLdYUiIFHPxjSNUm` لضمان تغطية جميع المنتجات الـ 32 النشطة.
- المتغيرات العطرية في `-OxC877LX3vzD-3Pi_th` (`م`, `م-1`, `م-2`) مكتوبة بالعربية في RTDB، بينما بقية المتغيرات مكتوبة بالإنجليزية (`Vanilla Wave`, `Sweet Sugar`...) وتحتاج جميعها لتعيين `variantLabels` صريح وفق `variant.id` دون المساس بالمعرّفات أو بنية السلة.

---

## 5. اكتمال ترجمة التصنيفات (Category Translation Completeness)

توجد 4 تصنيفات معيارية في `CATEGORY_TAXONOMY`: `hair-care`, `body-care`, `fragrance`, `skin-care`.  
في `src/i18n/content/en/categories.ts` لا يتوفر حالياً سوى `slug` و`name` (`Hair Care`, `Body Care`, `Fragrance`, `Skin Care`)؛ بينما تنقص الحقول الأربعة المطلوبة في كل تصنيف: `h1Title`, `introText`, `seoTitle`, `seoDescription` (إضافة إلى `shortTagline` الاختياري لبطاقات الصفحة الرئيسية).  
تُحفظ قواعد التصنيف (`PRODUCT_CATEGORY_OVERRIDES`) وتعدادات المنتجات دون تغيير.

---

## 6. جرد توطين المقالات (Article Localization Inventory)

يحتوي Firestore على **8 مقالات منشورة (`status === 'published'`)**، و`EN_ARTICLE_CONTENT` فارغ حالياً (`0 / 8`):

1. `0tZxM9DLSOffrbIBMMs1` — `hair-loss-routine` (`روتين العناية بالشعر المتساقط والضعيف`)
2. `65UuwUILHvPVmQVYLHPM` — `daily-fragrance-body-splash-routine` (`طريقة استخدام البادي سبلاش وتثبيت الرائحة`)
3. `9YXgxdqQhAUR8JCiuwUD` — `daily-skincare-routine-healthy-skin` (`أفضل روتين يومي للعناية بالبشرة والحفاظ على نضارتها`)
4. `DQ5YpvA8vG9Z81o4cqCG` — `post-hair-removal-skincare-routine` (`روتين العناية بالبشرة بعد إزالة الشعر`)
5. `EH9B7m1ig2AN9XWCGXEW` — `anti-dandruff-routine` (`روتين العناية بفروة الرأس المعرضة للقشرة`)
6. `Tj3wrs7zEXKeSaQ3zaiC` — `oily-skin-routine` (`روتين العناية بالبشرة الدهنية والمختلطة`)
7. `ZAU7UHMySr7pWY0XQFx3` — `daily-beauty-routine-hair-skin-body` (`روتينك اليومي سر جمالك – من أول شعرك لبشرتك لجسمك`)
8. `koNMIj06K0EgKwhGiZEf` — `daily-hair-care-routine-dry-damaged-hair` (`أفضل روتين يومي للعناية بالشعر الجاف والمتقصف`)

تتضمن المقالات صوراً مدمجة داخل الـ HTML وروابط داخلية نحو `/product/...` و`/category/...` و`/all-products`؛ عند كتابة `EN_ARTICLE_CONTENT` يجب الحفاظ على روابط الصور نفسها بأوصاف `alt` إنجليزية وتوجيه الروابط الداخلية داخل المقالات الإنجليزية إلى `/en/...`، وتفعيل `publishedInLocale: true` بعد استكمال النص والميتاداتا لكل مقال.

---

## 7. النصوص العربية الثابتة المتبقية في الواجهة (Remaining Hardcoded Arabic UI Strings)

رصد التدقيق نصوصاً عربية ثابتة داخل كافة طبقات واجهة المتجر:
- **مكونات الغلاف العام:** `AnnouncementBar.astro`, `SiteHeader.astro`, `SearchDrawer.astro`, `MobileNavDrawer.astro`, `BottomMobileNav.astro`, `SiteFooter.astro`, `ConsentBanner.astro`.
- **مكونات الرئيسية والكتالوج والمنتج:** `HeroEditorial.astro`, `CategoryDiscovery.astro`, `FeaturedProducts.astro`, `PinkFridayHomeSection.astro`, `EditorialBrandStory.astro`, `TrustStripSection.astro`, `ReviewsHomeSection.astro`, `BlogHomeSection.astro`, `CustomStudioSection.astro`, `ProductCard.astro`, `CatalogToolbar.astro`, `MobileFilterDrawer.astro`, `CategoryEditorialHeader.astro`, `CatalogEmptyState.astro`, `ProductGallery.astro`, `ProductInfo.astro`, `VariantSwatches.astro`, `QuantityStepper.astro`, `BotanicalFeatureGrid.astro`, `ReviewSummaryPanel.astro`.
- **مكونات الدفع والحساب والتحرير:** `CheckoutPageHeader.astro`, `CheckoutStepper.astro`, `CartRemoveDialog.astro`, `OrderStatusTimeline.astro`, `AuthEditorialLayout.astro`, `EditorialPageHeader.astro`.
- **صفحات المتجر تحت `src/pages/`:** جميع الصفحات الـ 20+ من `index.astro` و`all-products.astro` و`cart.astro` حتى `privacy-policy.astro` و`terms.astro` و`404.astro`.

---

## 8. سمات `dir="rtl"` وخطوط `dandy-font-ar-*` الثابتة المتبقية

### أ. سمات `dir="rtl"` الثابتة في مكونات وصفحات العميلات (11 ملفاً):
1. `src/components/layout/BottomMobileNav.astro`
2. `src/components/layout/AnnouncementBar.astro`
3. `src/components/layout/SiteFooter.astro`
4. `src/components/layout/SiteHeader.astro`
5. `src/components/layout/MobileNavDrawer.astro`
6. `src/components/layout/SearchDrawer.astro`
7. `src/components/catalog/MobileFilterDrawer.astro`
8. `src/components/ConsentBanner.astro`
9. `src/pages/product/[...slug].astro` (`<main dir="rtl">`)
10. `src/pages/category/[category].astro` (`<main dir="rtl">` + `<aside dir="rtl">`)
11. `src/pages/pink-friday.astro` (`<main dir="rtl">`)

*(أما `DashboardNav.astro` و`dashboard.astro` و`dashboard-pink-friday.astro` فهي واجهات إدارية عربية صرفة وتبقى كما هي دون تغيير.)*

### ب. قواعد الخطوط الصلبة `--dandy-font-ar-*` وفئة `.dandy-font-ar-display`:
- في `src/styles/base.css`: العنصر `body` يفرض `font-family: var(--dandy-font-ar-sans)`، والفئة `.dandy-font-ar-display` تفرض `font-family: var(--dandy-font-ar-display)` على العناوين عبر أغلب الصفحات والمكونات.
- في `src/styles/components.css` ومعظم ملفات `.astro` في `src/components/` و`src/pages/`: توجد عشرات القواعد المباشرة التي تحدد `font-family: var(--dandy-font-ar-sans)` أو `--dandy-font-ar-display`.
- الحل غير الكاسر: توجيه `tokens.css` / `base.css` (عبر `--dandy-font-active-sans` و`--dandy-font-active-display`) وتبديل المرجعيات في المكونات والصفحات إلى المتغير النشط مع ضبط `line-height` الإنجليزي لـ `.dandy-font-ar-display` عند `html[lang="en"]` بحيث تظل `Alexandria` و`Amiri` مطابقتين في العربية وتتحول تلقائياً إلى `Plus Jakarta Sans` و`Playfair Display` في الإنجليزية.
- كما لوحظ في `SiteHeader.astro` و`Breadcrumb` وأسهم التنقل أن بعض الأيقونات تستعمل `chevron-left` الصريحة؛ يلزم توحيدها عبر `directional={true}` أو عكس الاتجاه لـ `LTR` لكي تتطابق الأسهم في الاتجاهين.

---

## 9. الرسائل العربية المُولّدة ديناميكياً في JavaScript / TypeScript

تم رصد الملفات التفاعلية الآتية التي تولّد نصوصاً وتنسيقات عربية مباشرة في المتصفح أو أثناء SSR:
- `public/assets/js/variants.js`: يعرض `'الرائحة'` / `'الروائح'` وفواصل `'، '` وأسماء الروائح عند عدم وجود خريطة محلية.
- `src/scripts/product-card.ts` و`src/scripts/product-card-client.ts`: حالات `أضيفي للسلة` / `تمت الإضافة` / `نفذت الكمية` / `ج.م` وتنبيهات التوست.
- `src/scripts/product-pdp.ts` و`src/scripts/pdp-client.ts`: أقسام `parseDescriptionSections()`, تنبيهات اختيار الرائحة الإلزامي، حالة المخزون، وإضافة التقييمات والمفضلة.
- `src/scripts/catalog.ts` و`src/scripts/catalog-client.ts`: فلاتر السعر، عداد النتائج، حالة عدم وجود نتائج، والترتيب.
- `src/scripts/purchase-flow.ts` و`src/scripts/cart-client.ts`: خطوات السلة والشحن، تقدم الشحن المجاني (`> 2000 ج.م`)، تسميات `GOVERNORATES`, رسائل التحقق من الهاتف المصري والاسم والعنوان، حذف العناصر، وتقديم الطلب.
- `src/scripts/invoice-client.ts` و`src/scripts/track-order-client.ts`: عرض الفاتورة وحالات الطلب والتواريخ وأسماء المحافظات ورسائل البحث والواتساب.
- `src/scripts/account.ts`, `src/scripts/account-client.ts`, `src/scripts/account-auth-client.ts`: لوحة العميلة، المفضلة، العناوين، الطلبات، وتسجيل الدخول/الإنشاء ورسائل أخطاء Firebase Auth.
- `src/scripts/homepage-studio.ts` و`src/scripts/homepage-studio-client.ts`: القيم الافتراضية للهيرو (`DEFAULT_HERO_SLIDE`), البانر (`DEFAULT_PROMO_BANNER`), والمزايا (`DEFAULT_TRUST_ITEMS`), وتحديثات المعاينة الحيّة (`STUDIO_UPDATE_STATE`).
- `src/scripts/shell.ts` و`SearchDrawer.astro`: قائمة التنقل والبحث الفوري في الدرج.
- `src/pages/pink-friday.astro`: سكربت التفاعل المباشر للعدّ التنازلي وباقات الكوليكشن واختيار الروائح وإضافة الباقات للسلة.

---

## 10. متطلبات توطين Admin Studio (Admin Studio Localization Requirements)

كشف فحص `/homepage` الفعلي في RTDB التفاصيل الآتية:
- **`sectionOrder`:** يحتوي 11 مفتاحاً (`hero`, `trust`, `categories`, `offers`, `promo`, `newArrivals`, `sec-custom-mtybjcz3-xcqb`, `reviews`, `blog`, `sec-custom-mtyc2ji8-ak18`, `sec-custom-mtyc16g8-bwsf`). يجب الحفاظ على الترتيب والرؤية والمعرفات وروابط المنتجات مشتركة 100% بين العربية والإنجليزية.
- **`benefits` (المزايا الثلاث):** مكتوبة حالياً بالإنجليزية في RTDB الحي (`Tailored Skin Treatments`, `Outstanding Reviews`, `Seamless Replacements`). عند تفعيل التراكب الإنجليزي في المرحلة 11 يجب توفير نصوص إنجليزية مصقولة، مع إبقاء سلوك العربية دون تعديل RTDB.
- **`sections`:** عناوين `offers` و`newArrivals` في RTDB مكتوبة بالإنجليزية (`Special Offers`, `Our Premium Products`) مع ظهور `visible: true` لهما و`false` لـ `categories` و`bestsellers`. يلزم الحفاظ على `visibility` الحقيقية وتوطين النصوص للـ overlay الإنجليزي.
- **`dynamicHero`:** 3 شرائح تحمل نصوصاً فارغة حالياً فتعتمد على الافتراضات البرمجية في `homepage-studio.ts`؛ يجب أن توفر افتراضيات `homepage-studio.ts` دعماً لمعامل `locale` أو تراكب `EN_HOMEPAGE_STUDIO_OVERLAY`. كما يلزم التحقق بصرياً أثناء فحص المتصفح من صور الهيرو الجوال (`mobileImage`) لعدم إظهار نص عربي مدمج داخل واجهة إنجليزية.
- **`customSections` (3 أقسام حية):**
  1. `sec-custom-mtybjcz3-xcqb` (نوع `products`، `title: "Hair Care"`، `subtitle: "منتجات العناية بالشعر"`، `linkText: "عرض كل المنتجات"`، `linkUrl: "/all-products"`).
  2. `sec-custom-mtyc16g8-bwsf` (نوع `faq`، `title: "الأسئلة الشائعة"`، `subtitle: "كل ما تودين معرفته عن منتجات داندي واستخدامها"`، ويضم عنصرين بأسئلة وأجوبة عربية).
  3. `sec-custom-mtyc2ji8-ak18` (نوع `video`، عنوان ووصف بالإنجليزية مسبقاً).
  - **ملاحظة حرجة:** نوع `HomepageStudioLocalizedOverlay` و`resolveLocalizedHomepageStudioState()` في المرحلة 10 يدعمان الحقول الرئيسية لـ `customSections` لكنهما لا يترجمان مصفوفة `items` داخل `faq`/`grid` ولا يوطّنان `linkUrl`/`ctaLink` إلى `/en/...`. يجب توسيع التراكب لدعم `items` وإعادة ربط الروابط الداخلية، وإخفاء أي نص عربي غير مترجم بأمان بدلاً من تسريبه.
- **`reviews` / `dynamicReviews`:** 6 عناصر تضم وصفاً مثل `"Dandy Beauty Skin Car Outcome"` (به خطأ إملائي `"Car"` في المصدر) أو `"عميلة داندي" / "تجربة رائعة"`؛ يُضاف دعم تراكب اختياري لـ `reviews` لعرض وصف إنجليزي سليم لبطاقات الصور في النسخة الإنجليزية.

---

## 11. متطلبات توطين Pink Friday (Pink Friday Localization Requirements)

كشف فحص `/settings/pinkFriday/publishedActiveCampaign` الفعلي:
- المعرّف: `pink-friday-2026`، التوقيت: `2026-11-06T00:00:00` إلى `2026-11-30T23:59:00` (`Africa/Cairo`).
- يحتوي **0 عروض فردية (`offers`)** و**16 كوليكشن نشطة (`collections`)** (`col_1793908780148` إلى `col_1794001565549`).
- تضم `visuals` الحقول الفعلية: `badgeText: "Pink Friday"`, `bannerPosition: "bottom"`, `ctaText: "اكتشفي العروض"`, `headline: "عروض Pink Friday"`, `subtitle: "استمتعي خصومات..."`, و`heroImageUrl` (`Dandy_Pink_Friday_Cosmetics_Sale.png`).
- **متطلبات التنفيذ:**
  - توسيع `PinkFridayVisuals` و`PinkFridayLocalizedOverlay` لدعم `headline` و`subtitle` واختيارياً `heroImageOverride` (إذا احتوت الصورة المذكورة على نص عربي مدمج عند الفحص البصري).
  - استكمال جميع ترجمات الـ 16 كوليكشن في `src/i18n/content/en/pink-friday.ts` مع الإبقاء التام على `startAt`, `endAt`, أسعار الباقات، نسبة الخصم، معرفات المنتجات، ومعرفات الروائح كما هي، وتمرير الترجمات الإنجليزية للمنتجات والروائح إلى الواجهة التفاعلية للباقات.

---

## 12. سلوك SEO و`hreflang` والسايت ماب الحالي (Existing SEO & Hreflang Behavior)

- **`BaseLayout.astro`:** يقبل `lang`, `dir`, `canonical`, `alternates = []`, `ogLocale`، وينتج حالياً `<html lang="ar" dir="rtl">` وروابط canonical عربية دون بادئة، ولا يخرج أي وسم `<link rel="alternate" hreflang="...">` ما دامت `alternates` فارغة.
- **`metadata.ts`:** الدوال `buildCanonicalUrl()`, `buildHreflangAlternates()`, `buildLocalizedSeoMetadata()`, `buildLocalizedWebPageJsonLd()`, `buildLocalizedBreadcrumbJsonLd()` جاهزة ومغلقة حالياً عبر `isLocalePublished('en') === false`.
- **البيانات المهيكلة الحالية:**
  - `generateCategoryJsonLd()` في `src/utils/categories.ts` يثبّت `'inLanguage': 'ar'` و`'الرئيسية'` وروابط `${SITE_URL}/product/...`. يلزم إضافة معامل `locale: Locale = 'ar'` وتوطين النصوص والروابط إلى `/en/` عند `locale === 'en'` مع بقاء العربية مطابقة.
  - `generateProductJsonLd()` في `src/utils/products.ts` يقرأ اسم المنتج ووصفه وفئته بالعربية؛ يلزم إتاحة تمرير عرض المنتج المترجم عند `locale === 'en'` دون تغيير `sku` أو `priceCurrency: 'EGP'`.
- **`src/pages/sitemap.xml.ts`:** ينتج حالياً الروابط العربية فقط (27+ رابطاً حالياً مع الـ 32 منتجاً والـ 8 مقالات و`pink-friday`) بصيغة `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`. يلزم تحديثه بعد اجتياز بوابة النشر ليضم مسارات `/en/` المترجمة والمنشورة فعلياً مع وسوم `xmlns:xhtml="http://www.w3.org/1999/xhtml"` و`<xhtml:link rel="alternate" hreflang="ar|en|x-default">`.

---

## 13. حالة بوابة النشر العام (Public Locale Publication-Gate Status)

- `LOCALE_CONFIGS.en.isPubliclyPublished` = **`false`** في `src/i18n/config.ts`.
- `ROUTE_REGISTRY[*].englishPublished` = **`false`** لجميع المسارات الـ 20 في `src/i18n/routes.ts`.
- `runLocalizationCompletenessAudit()` يُرجع **`readyForPublication: false`**.
- **الالتزام الصارم:** تظل هذه البوابة مغلقة طوال مراحل بناء المحتوى والمكونات والصفحات، ولا تُحوَّل إلى `true` ولا يُفعَّل `hreflang` أو `/sitemap.xml` الإنجليزي إلا بعد تحقق `readyForPublication === true` على جميع النطاقات والتصنيفات والمنتجات الـ 32 والمقالات الـ 8 والمسارات الـ 14 المفهرسة.

---

## 14. الملفات المتوقع إنشاؤها وتعديلها (Expected Created & Modified Files)

### أ. خطة عدم التكرار المعماري (Shared Views Architecture):
لتفادي تكرار منطق التجارة عبر صفحتين لكل مسار، ستُستخرج أجسام الصفحات الحالية إلى وحدات عرض مشتركة تحت `src/components/views/` تقبل `locale: Locale = 'ar'`، بحيث يستدعيها المسار العربي `src/pages/*.astro` بـ `locale="ar"` والمسار الإنجليزي `src/pages/en/*.astro` بـ `locale="en"`.

### ب. ملفات جديدة مقترحة:
1. `DANDY_PHASE_11_PRE_IMPLEMENTATION_AUDIT_AR.md` (هذه الوثيقة).
2. `src/i18n/content/en/homepage-studio.ts` — تراكب `EN_HOMEPAGE_STUDIO_OVERLAY`.
3. `src/i18n/content/en/pink-friday.ts` — تراكب `EN_PINK_FRIDAY_OVERLAY` (يشمل الكوليكشنز الـ 16).
4. `src/components/views/*.astro` — مكونات العرض المشتركة لصفحات المتجر (~20 صفحة عرض موحدة).
5. `src/pages/en/` — جميع المسارات الإنجليزية العامة الـ 21:
   `index.astro`, `all-products.astro`, `category/[category].astro`, `product/[...slug].astro`, `special-offers.astro`, `offers.astro` (تحويل 301 إلى `/en/special-offers`), `pink-friday.astro`, `cart.astro`, `invoice.astro`, `track-order.astro`, `account-login.astro`, `account-signup.astro`, `account.astro`, `blog.astro`, `blog/[...slug].astro`, `client-reviews.astro`, `about-us.astro`, `contact-us.astro`, `help.astro`, `privacy-policy.astro`, `terms.astro`.
6. `DANDY_PHASE_11_FINAL_REPORT_AR.md` — التقرير الختامي.

### ج. ملفات متوقع تعديلها:
- طبقة `src/i18n/*`: `types.ts`, `messages/en.ts`, `content/en/{categories,products,articles}.ts`, `content/adapters.ts`, `translation-check.ts`, `index.ts`, وفي خطوة التفعيل فقط `config.ts` و`routes.ts`.
- الأنماط والتخطيط: `src/styles/{tokens,base,components}.css`, `src/layouts/BaseLayout.astro`.
- المكونات المشتركة: جميع مكونات `layout/`, `home/`, `catalog/`, `commerce/`, `editorial/`, `account/`, `product/ProductCard.astro`, و`ConsentBanner.astro` + `ToastHost.astro`.
- الأدوات والسكربتات النقية والعميلة: `src/utils/{categories,products,pink-friday-server}.ts`, `public/assets/js/variants.js`, `src/scripts/{shell,toast,homepage-studio,homepage-studio-client,product-card,product-card-client,product-pdp,pdp-client,catalog,catalog-client,purchase-flow,cart-client,invoice-client,track-order-client,account,account-client,account-auth-client,localization.test}.ts`.
- الصفحات العربية الحالية في `src/pages/`: تمرير `locale="ar"` عبر المكونات المشتركة + دعم الإنجليزية في `src/pages/404.astro` + تحديث `src/pages/sitemap.xml.ts`.

---

## 15. مخاطر التوافق على النسخة العربية (Risks to Arabic Storefront Compatibility)

1. **خطر تغيّر الخطوط أو الاتجاه في العربية:** تعديل قواعد CSS الخاصة بـ `dandy-font-ar-*` أو إزالة `dir="rtl"` قد يؤدي لانقلاب اتجاه أو خط الصفحة العربية إذا فُقدت القيمة الافتراضية `locale = 'ar'`. *(التخفيف: تثبيت `locale: Locale = 'ar'` في كل التواقيع وفحص `/` و10 مسارات عربية عبر Playwright بعد التعديل).*
2. **خطر انكسار السلة المشتركة أو التسعير عند تبديل اللغة:** حفظ الاسم الإنجليزي بدلاً من حفظ الهوية، أو تغيير مفاتيح `localStorage.cart`/`dandy_cart` أو `variant.id`. *(التخفيف: عرض الأسماء المترجمة وقت العرض عبر `productId` و`variantId` مع إبقاء بنية التخزين وطلب `/api/create-order` موحدة).*
3. **خطر تسريب توكن الفاتورة (`#access=` / `?token=`) في مبدّل اللغة:** *(التخفيف: الاعتماد الحصري على `resolveRouteCounterpart()` التي تحذف المفاتيح الحساسة وهاش `#access=` تلقائياً).*
4. **خطر تعارض Studio Live Preview أو اختفاء أقسام في العربية:** *(التخفيف: الإبقاء على `resolveLocalizedHomepageStudioState(state, 'ar')` كدالة هوية بدون أي تعديل، وتمرير التراكب الإنجليزي فقط لـ `locale === 'en'` مع التحقق من `/?studio_preview=1` و`/en/?studio_preview=1`).*
5. **خطر تلف المسارات التراثية (`/offers`, `/post`, `/product`):** *(التخفيف: عدم تعديل سلوكها العربي وإضافة اختبار تحقق).*

---

## 16. خطة التنفيذ المرحلية المرتبة (Phase 11 Implementation Plan)

1. إتمام القاموس الإنجليزي الكامل في `src/i18n/messages/en.ts` (جميع النطاقات الـ 20 / 193 مفتاحاً) وتحديث `types.ts` لدعم `customSections.items`, `reviews`, و`PinkFridayVisuals` الموسعة.
2. تأليف `src/i18n/content/en/categories.ts` (التصنيفات الأربعة كاملةً).
3. تأليف `src/i18n/content/en/products.ts` (جميع المنتجات النشطة الـ 32 + تسميات المتغيرات بالمعرفات الثابتة + خريطة مختصرة لسكربتات العميل).
4. تأليف `src/i18n/content/en/articles.ts` (المقالات الـ 8 المنشورة كاملةً مع توطين `alt` الصور والروابط الداخلية إلى `/en/...`).
5. إنشاء `homepage-studio.ts` و`pink-friday.ts` وتحديث `adapters.ts` و`translation-check.ts` و`index.ts`.
6. تعميم `--dandy-font-active-*`، تعميم `locale` و`dir` على `BaseLayout.astro` وجميع المكونات المشتركة، وتصحيح الأيقونات الاتجاهية لـ LTR/RTL.
7. تركيب مبدّل اللغة في الديسكتوب (`SiteHeader.astro`) والموبايل (`MobileNavDrawer.astro`) بالاعتماد على `LANGUAGE_SWITCHER_CONTRACT` و`resolveRouteCounterpart()`.
8. توطين السكربتات النقية وسكربتات المتصفح (`variants.js`, `SearchDrawer`, `*-client.ts`, `pink-friday`) وتنسيق العملة والأرقام عبر `src/i18n/format.ts`.
9. تحويل صفحات المتجر إلى مكونات عرض مشتركة وبناء جميع الصفحات الإنجليزية الـ 21 تحت `src/pages/en/` + دعم الإنجليزية في `404.astro` + توطين JSON-LD في `categories.ts` و`products.ts`.
10. توسيع اختبارات `localization.test.ts` وتشغيل `runLocalizationCompletenessAudit()` للتحقق من `readyForPublication === true`.
11. تفعيل بوابة النشر (`isPubliclyPublished: true`, `englishPublished: true`) وتحديث `sitemap.xml.ts` بوسوم `xhtml:link`.
12. تشغيل اختبارات الوحدة + `compile_applet` + `lint_applet` + فحص المتصفح الشامل Playwright (5 أبعاد، تسوق عابر للغات، ضيف، معاينة Studio، تراجع عربي كامل).
13. التحقق النهائي من بصمات SHA-256 للملفات المحمية وإصدار `DANDY_PHASE_11_FINAL_REPORT_AR.md`.
