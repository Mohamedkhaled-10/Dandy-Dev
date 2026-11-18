# التقرير النهائي للمرحلة العاشرة — البنية التحتية متعددة اللغات والتوطين (DANDY Phase 10 Final Report)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 10 — Multilingual Architecture & Localization Foundation Only  
**الهوية البصرية المعتمدة:** Botanical Editorial Commerce (النسخة العربية RTL هي الافتراضية دون تغيير)  
**حالة النشر العام للغة الإنجليزية:** **مجهّزة معمارياً ومقفلة برمجياً (`isPubliclyPublished: false`) — لم تُنشر صفحات `/en/` للجمهور بعد (مؤجلة إلى المرحلة 11).**

---

## خريطة الحالة الرسمية (Implementation vs Testing vs Preparation vs Deferral Matrix)

| البند / القدرة | الحالة | الوصف الدقيق |
|---|---|---|
| بنية `src/i18n/*` الكاملة (الأنواع، الإعدادات، حل اللغة، المسارات، الترجمة، التنسيق، السيو، فحص الاكتمال، المحولات) | **تم تنفيذه وتم اختباره فعلياً** | 16 وحدة برمجية نقية وخالية من التبعيات الخارجية اختُبرت ضمن 9 مجموعات اختبار في `src/scripts/localization.test.ts` |
| دعم `BaseLayout.astro` و`tokens.css` و`base.css` لـ `lang`/`dir`/الخطوط النشطة و`alternates` | **تم تنفيذه وتم اختباره فعلياً** | يولّد `<html lang="ar" dir="rtl">` مطابقاً تماماً للنسخة العربية ويقبل `en`/`ltr` معزولاً مع صفر تغيّر بصري |
| تفعيل مسارات `/en/*` العامة في `src/pages/en/` | **مؤجل إلى المرحلة 11** | لم تُنشأ أي صفحات عامة تحت `/en/` التزاماً بحدود المرحلة العاشرة |
| مبدّل اللغة في الواجهة (Header / Mobile Drawer Language Switcher) | **تم تجهيز عقده فقط — لم يُفعّل** | العقد موثق في `LANGUAGE_SWITCHER_CONTRACT` دون عرض أي زر أو قائمة في واجهة العميلات |
| ترجمة نصوص المتجر والمنتجات والمقالات الإنجليزية الكاملة | **جزئي تأسيسي — الباقي مؤجل إلى المرحلة 11** | قُدِّمت أسماء الأقسام الموثقة والنواة المشتركة (`common`, `navigation`, `categories`) في `en.ts` فقط دون أي نصوص وهمية |
| توليد وسوم `hreflang` وروابط `/en/` داخل `sitemap.xml` | **تم تجهيزه لكن لم يُفعّل** | مُغلق برمجياً عبر `isLocalePublished('en') === false` (`buildHreflangAlternates` يعيد `[]` و`filterPublishableSitemapUrls` يستبعد `/en/`) |
| استثناء لوحات الإدارة وStudio (`/dashboard*`, `/login`, `/statues`, `/api/*`) وتعديل قواعد Firebase أو التسعير | **غير منفذ عمداً (خارج النطاق ومُحافظ عليه)** | لم يُمسّ أي مسار إداري أو قاعدة بيانات أو معادلة تسعير أو شحن أو ملف إعداد محمي |

---

## 1. الملخص التنفيذي (Executive Summary)

أُنجزت المرحلة العاشرة (**Phase 10**) لتأسيس البنية التحتية متعددة اللغات والتوطين لمتجر **Dandy Cosmetics** على نحو هندسي كامل ومنفصل تماماً عن العرض العام المؤجل إلى **المرحلة 11**. تم إنشاء منظومة `src/i18n/` الموحدة ذات الأنواع الصارمة (`TypeScript Strict Contracts`) بدون تثبيت أي حزم خارجية أو تعديل إعدادات Astro أو Vercel أو Firebase.  
أثبتت الاختبارات الآلية (`77/77` اختباراً ناجحاً تشمل **9 مجموعات اختبار جديدة للتوطين** مع الحفاظ الكامل على 68 اختباراً سابقاً) وفحص المتصفح الفعلي عبر Playwright (**17 فحصاً عبر 12 مساراً رئيسياً بأحجام سطح المكتب `1440×900` والجوال `390×844`**، بالإضافة لفحص `/sitemap.xml` و`/?studio_preview=1` وتجربة إضافة السلة والفحص المعزول لـ `dir="ltr"`) سلامة النسخة العربية القائمة بنسبة **100%** واستعداد البنية للانتقال المباشر إلى المرحلة 11.

---

## 2. مراجعة البنية التحتية والتوجيهية (Routing & Infrastructure Review)

- يعتمد المتجر على **Astro v7.3.1** بنمط التصيير الخادمي (`output: 'server'`).
- تم تثبيت القاعدة الصارمة: **العربية (`ar`, `rtl`) هي الافتراضية على المسارات غير المسبوقة ببادئة** (`/`، `/all-products`، `/category/[category]`، `/product/[...slug]`، إلخ)؛ وتُخصَّص **الإنجليزية (`en`, `ltr`) مستقبلاً تحت البادئة `/en/` فقط** دون إضافة `/ar/` ودون أي إعادة توجيه قسرية بناءً على اللغة أو الموقع الجغرافي.
- عالج السجل `ROUTE_REGISTRY` في `src/i18n/routes.ts` جميع المسارات الـ 20 الأساسية للمتجر، بالإضافة إلى `/404` ومسارات التحويل التراثي الثلاثة (`/offers`, `/post`, `/product`) وعزل نطاق الإدارة والـ API (`/dashboard*`, `/login`, `/statues`, `/api/*`).
- وُثِّق ذلك مسبقاً قبل أي تعديل برمجي في وثيقة التدقيق المعماري [`DANDY_PHASE_10_PRE_IMPLEMENTATION_AUDIT_AR.md`](./DANDY_PHASE_10_PRE_IMPLEMENTATION_AUDIT_AR.md).

---

## 3. حوكمة اللغة والاتجاه (Locale Governance & Directionality)

- **`DEFAULT_LOCALE = 'ar'`** و**`SUPPORTED_LOCALES = ['ar', 'en']`** في `src/i18n/config.ts`.
- ضبط `LOCALE_CONFIGS`:
  - **`ar`:** `htmlLang: 'ar'`, `dir: 'rtl'`, `intlLocale: 'ar-EG'`, `ogLocale: 'ar_EG'`, `routePrefix: ''`, `isDefault: true`, `isPubliclyPublished: true`.
  - **`en`:** `htmlLang: 'en'`, `dir: 'ltr'`, `intlLocale: 'en-EG'`, `ogLocale: 'en_US'`, `routePrefix: '/en'`, `isDefault: false`, **`isPubliclyPublished: false`**.
- **سياسة الأولوية الحتمية (`resolveDocumentLocale`):** المسار الفعلي للرابط (`URL`) يسبق دائماً `localStorage.dandy_preferred_locale` وتفضيلات المتصفح (`navigator.languages`). الدخول على مسار عربي غير مسبوق ببادئة يبقى دائماً `ar/rtl` حتى لو كان التفضيل المخزن سابقاً `'en'`.

---

## 4. استراتيجية المسارات والنظائر (URL Strategy & Counterpart Mapping)

- توفر دالة `stripLocalePrefix()` إزالة آمنة للبوادئ المكررة عن طريق الخطأ مثل `/en/en/cart/` -> `/cart`، مع حماية المسارات الشبيهة بالاسم مثل `/en-sample` و`/english` و`/offers` و`/post` من التصنيف الخاطئ.
- تضبط `resolveRouteCounterpart()`:
  1. **التحويل التراثي:** `/offers?utm_medium=social` يُوجّه نظيرياً إلى `/en/special-offers?utm_medium=social`.
  2. **المسارات الديناميكية:** `/product/facial-serum-3x1-30ml` <-> `/en/product/facial-serum-3x1-30ml` مع دعم `targetSlug` مستقبلاً إن تغير الرابط مع ثبات `id`.
  3. **فقدان الترجمة (`entity-untranslated`):** عند عدم توفر ترجمة مقال معين (`targetEntityExists: false`) ينتقل التبديل بأمان إلى فهرس القسم (`/en/blog` أو `/en/all-products`) بدلاً من صفحة `404`.
  4. **بوابة النشر في المرحلة 10:** في الوضع الحالي (`isPubliclyPublished: false`) تُعيد الدالة `isSwitchSafe: false` مع السبب `'locale-unpublished'` ما لم يُمرَّر علم اختبار معزول `allowUnpublishedPreviewTarget: true`.
  5. **عزل الإدارة:** أي مسار تحت `/dashboard*`, `/login`, `/statues`, `/api/*` يعيد `routeKind: 'admin-excluded'` و`isSwitchSafe: false` و`fallbackReason: 'route-excluded'`.

---

## 5. إدارة معاملات البحث والأجزاء والروابط الحساسة (Query Params, Fragments & Security)

- طبّقت `sanitizeLocalizedQueryParams()` **قائمة سماح صريحة لكل نوع مسار (`allowedQueryParams`)**:
  - في الكتالوج والتصنيفات: `search`, `category`, `sort`, `page`, `price`, `sale`, `availability`, `bestseller` مع معاملات الحملات (`utm_*`, `fbclid`, `gclid`).
  - في الفواتير والتتبع: `invoice`, `id`, `code` فقط.
- **حظر التسريب الأمني:** تُحذف قسراً أي مفاتيح حساسة (`access`, `token`, `idtoken`, `password`, `pass`, `auth`, `secret`, `key`) من الاستعلام أو من جزء الهاش (`#access=...`, `#token=...`, `#auth=...`, `#session=...`) عند توليد الروابط النظيرة. تم اختبار ذلك عملياً على `/invoice?invoice=INV-9001&token=leak#access=private-secret`.

---

## 6. معمارية القواميس ونظام الترجمة (Translation Dictionary & Accessor System)

- نُفِّذ الكود المصدري الموحد للأقسام الـ 20 في `src/i18n/messages/ar.ts` (`AR_MESSAGES: TranslationCatalog`):
  `common`, `navigation`, `header`, `footer`, `home`, `catalog`, `categories`, `product`, `cart`, `checkout`, `orders`, `account`, `auth`, `blog`, `reviews`, `support`, `forms`, `errors`, `legal`, `consent`.
- نُفِّذ القاموس الجزئي المقصود `src/i18n/messages/en.ts` (`EN_MESSAGES: DeepPartial<TranslationCatalog>`) متضمناً `common`, `navigation`, `categories` فقط حتى يرصد مدقق الاكتمال المفاتيح المؤجلة للمرحلة 11 بدقة دون أقنعة نصية مصطنعة.
- دالة `t(locale, key, params?)` و`resolveTranslation(...)` في `src/i18n/translator.ts`:
  - آمنة للتصيير الخادمي SSR بدون أي اعتماد على DOM أو المتصفح.
  - تدعم استبدال المتغيرات مثل `{percent}`.
  - عند غياب مفتاح في الإنجليزية تُرجع افتراضياً وسماً صريحاً `[untranslated:en:<key>]` لمنع تسرب العربية بصمت في واجهة إنجليزية، مع دعم خيار `missingStrategy: 'arabic-fallback'` عند الاستدعاء الصريح فقط.

---

## 7. محول المحتوى المملوك للواجهة الأمامية (Frontend-Owned Localized Content Adapters)

صُمّمت طبقة `src/i18n/content/` بالكامل لربط المحتوى المترجم مستقبلاً بمعرفات البيانات الثابتة في الواجهة دون أي تعديل على قواعد بيانات Firebase:
- **المنتجات:** `src/i18n/content/ar/products.ts` و`en/products.ts` (`EN_PRODUCT_CONTENT` مفهرس بمعرّفات RTDB الثابتة في `EXISTING_PRODUCT_SLUG_MAP` مثل `-OvPo-cuVeLHWSU8KQ22`).
- **التصنيفات:** `src/i18n/content/ar/categories.ts` و`en/categories.ts` (محملة بأسماء الفئات الأربعة المعتمدة فقط: `Hair Care`, `Body Care`, `Fragrance`, `Skin Care`، مع إبقاء نصوص SEO والوصف للمرحلة 11).
- **المقالات:** `src/i18n/content/ar/articles.ts` و`en/articles.ts` (مفهرسة بمعرّفات Firestore ومؤمنة بـ `publishedInLocale`).
- **المحولات النقية (`src/i18n/content/adapters.ts`):** `resolveLocalizedProduct()`, `resolveLocalizedCategory()`, `resolveLocalizedArticle()`, `resolveLocalizedHomepageStudioState()`, `resolveLocalizedPinkFridayCampaign()`, `resolveLocalizedGovernorateLabel()`, `resolveLocalizedOrderStatusLabel()`.

---

## 8. استقلالية البيانات التجارية وعدم تحوّل الكيانات المشتركة (Shared Commerce Immutability)

أكدت اختبارات `localization.test.ts` عدم مساس طبقة التوطين مطلقاً بأي كيان تجاري أو حسابي:
- بقاء `product.id`, `resolvedSlug`, `price`, `originalPrice`, `discount`, `onSale`, `isSoldOut`, `stockQuantity`, `image`, و`variants[].id` دون تغيير أو نسخ معدل.
- ترجمة أسماء الروائح (`variantLabels`) تُقرأ عبر مفتاح `variant.id` بحيث تبقى عناصر السلة (`localStorage.cart`) ومعرّفات المتغيرات متوافقة تماماً بين العربية والإنجليزية.
- الحفاظ على قيم المحافظات الأساسية في `GOVERNORATES` (`Cairo`, `Gharbia`, `Assiut`...) وأسعار الشحن (`85` / `70` / `100` / `120` والشحن المجاني `> 2000 EGP`) كما هي في `purchase-flow.ts` مع ترجمة التسمية المعروضة فقط.

---

## 9. توافقية Admin Studio وحملات Pink Friday (Studio & Campaign Localization Contract)

- **Admin Studio (`resolveLocalizedHomepageStudioState`):** يفرض التزاماً معمارياً بأن تظل مصفوفة ترتيب الأقسام (`sectionOrder`) وحالة الإظهار (`sectionsVisibility`) وقوائم المنتجات اليدوية (`manualProducts`) والحدود (`limit`) وروابط الصور والفيديو مشتركة ومقروءة من مصدر Studio الواحد، بينما تُطبّق نصوص الإنجليزية كطبقة تراكب اختيارية (`HomepageStudioLocalizedOverlay`) عبر المعرّفات (`heroSlides`, `trustItems`, `sections`, `promoBanner`, `categories`, `customSections`).
- **Pink Friday (`resolveLocalizedPinkFridayCampaign`):** يحتفظ بتوقيت الحملة (`Africa/Cairo`، `startAt`, `endAt`) وبأسعار العروض والباقات ونسب الخصم دون تعديل، ويسمح مستقبلاً بتغليف نصوص العنوان والوصف وشارات الباقات عبر `PinkFridayLocalizedOverlay`.

---

## 10. التنسيق المحلي للأرقام والعملات والتواريخ والوحدات (Intl Formatting & Mixed Bidi)

في `src/i18n/format.ts`:
- `formatNumber()`: يعتمد `Intl.NumberFormat('ar-EG-u-nu-latn')` للعربية و`en-EG` للإنجليزية لضمان وضوح الأرقام التجارية اللاتينية وتنسيق الآلاف (`1,250`).
- `formatCurrencyEgp()`: يستقبل الرقم الصافي فقط ويُخرج `275 ج.م` في العربية و`275 EGP` في الإنجليزية — مع **عدم إعادة تحليل السلاسل النصية حسابياً أبداً**.
- `formatPercent()`, `formatQuantity()` (`1 قطعة` / `3 قطع` مقابل `1 item` / `3 items`), `formatDate()`, `formatDateTime()`.
- `formatMixedMeasurement()`: يغلف القياسات المختلطة العربية بمحارف العزل المعيارية Unicode Isolates (`\u206630 مل\u2069`) لمنع انعكاس الوحدات داخل السطور ثنائية الاتجاه.

---

## 11. معالجة الاتجاهات المنطقية في CSS وRTL/LTR (Logical CSS & Directional UI Audit)

- أظهر فحص `grep` الشامل على كامل `src/styles/`, `src/components/`, وصفحات المتجر أن المراحل 1–9 طبقت الخصائص المنطقية (`padding-inline`, `margin-inline`, `inset-inline`, `border-inline-start`, `text-align: start`) بنجاح ولم يبقَ أي استخدام فيزيائي `left/right` أو `padding-left/right` متسرب في واجهة العميلات.
- يدعم `Icon.astro` خاصية `directional` المقترنة بـ `:dir(rtl) .dandy-icon-directional { transform: scaleX(-1); }`.
- أُضيف في هذه المرحلة تحديث محدود غير معطِّل في `tokens.css` و`base.css`:
  - تعريف `--dandy-font-active-sans` و`--dandy-font-active-display` مع تبديل `html[lang="en"]` إلى `Plus Jakarta Sans` و`Playfair Display`.
  - إضافة قواعد `html[dir="ltr"] .dandy-prose` و`html[lang="en"] .dandy-font-localized-display` مع إبقاء كافة القواعد العربية (`lang="ar"`, `dir="rtl"`) مطابقة 100%.

---

## 12. التوثيق الميداني لما تبقى من RTL الثابت لتجهيز المرحلة 11 (Remaining Static RTL Inventory)

خلال مراجعة المكونات قبل التفعيل، حُصرت النقاط الآتية المؤجلة عمداً إلى المرحلة 11 دون تعديل واجهة المرحلة الحالية:
1. سمات `dir="rtl"` الصلبة الموضعية داخل `SiteHeader.astro`, `SiteFooter.astro`, `AnnouncementBar.astro`, `SearchDrawer.astro`, `MobileNavDrawer.astro`, `BottomMobileNav.astro`, `ConsentBanner.astro`, `MobileFilterDrawer.astro`, `product/[...slug].astro`, `category/[category].astro`, `pink-friday.astro` (تُستبدل بـ `dir` موروث أو ممرّر عبر `locale` في المرحلة 11).
2. استعلام السكيما `generateCategoryJsonLd()` في `src/utils/categories.ts` الذي يثبت حالياً `'inLanguage': 'ar'` واسم `'الرئيسية'` (يوجد البديل الجاهز `buildLocalizedBreadcrumbJsonLd` و`buildLocalizedWebPageJsonLd` في `src/i18n/metadata.ts`).
3. حقول `parseDescriptionToHtml()` في `src/utils/products.ts` المنسقة بعناوين عربية ثابتة وأيقونات FA (المعالج الهيكلي `ProductDescriptionLocalizedSection` جاهز للربط في المرحلة 11).

---

## 13. تحسين محركات البحث، الروابط المعيارية، وHreflang (SEO, Canonical & Hreflang Safety)

في `src/i18n/metadata.ts`:
- `buildCanonicalUrl()`: يحافظ في المرحلة 10 على نفس الروابط المعيارية العربية غير المسبوقة ببادئة (`https://dandy-ebon.vercel.app/...`).
- **`buildHreflangAlternates()` (مؤمن ببوابة النشر):** يتحقق أولاً من `isLocalePublished('en') === true` ثم من وجود النظير الفعلي وعدم استخدام fallback أو استثناء الإدارة. وبما أن الإنجليزية مقفلة في المرحلة 10 (`false`)، **ترجع الدالة مصفوفة فارغة `[]` ولا يُخرج أي وسم `<link rel="alternate" hreflang="...">` خاطئ**.
- عند تفعيل علم المحاكاة المعزول في الاختبار (`enPublishedOverride: true`)، تُصدر الدالة بدقة المتناظرات الثلاثية المتبادلة (`ar`, `en`, و`x-default` نحو النسخة العربية)، وتُلغيها تلقائياً عند `targetEntityExists: false`.
- `filterPublishableSitemapUrls()`: يضمن عدم تسرب أي مسار `/en/` إلى `sitemap.xml` قبل اكتمال المرحلة 11.

---

## 14. فحص اكتمال التوطين وبوابة النشر (Translation Completeness Validator)

أُنشئ المدقق `src/i18n/translation-check.ts` (`runLocalizationCompletenessAudit`):
- يفحص 5 محاور دفعة واحدة: مفاتيح `AR_MESSAGES` مقابل `EN_MESSAGES`، التصنيفات الـ 4، المنتجات النشطة (`!isHidden`)، المقالات المنشورة (`status === 'published'`)، والمسارات المفهرسة في `ROUTE_REGISTRY`.
- يصنّف صراحة قائمة `SHARED_COMMERCE_EXEMPTIONS` لكي لا يعتبر المعرفات والأسعار والصور والخصومات والمخزون والمحافظات ناقصة ترجمة.
- عند تشغيله على حالة المرحلة 10 الفعلية يرجع `readyForPublication: false` ويحصر المفاتيح الناقصة والأصناف، وعند اختباره على حزمة محاكاة مكتملة يرجع `readyForPublication: true`.

---

## 15. تحديثات القالب الجذري `BaseLayout.astro` (Minimal Layout Foundation)

- وُصلت خصائص `lang` و`dir` في `src/layouts/BaseLayout.astro` بدالة `getDocumentAttributes(lang)` مع خاصية اختيارية `alternates?: HreflangAlternate[] = []`.
- الناتج الفعلي لجميع صفحات المتجر الـ 25 في المرحلة 10 بقي حرفياً `<html lang="ar" dir="rtl">` و`alternates = []` دون إصدار أي وسم بديل مبكر.

---

## 16. خطة مبدّل اللغة المجهز مستقبلاً (Prepared Language Switcher Contract)

وُثِّق العقد `LANGUAGE_SWITCHER_CONTRACT` في `src/i18n/resolve-locale.ts`:
- مواقع الربط المستقبلية المخطط لها في المرحلة 11: `['desktop-header-end', 'mobile-nav-drawer']`.
- مفتاح التخزين الاختياري: `dandy_preferred_locale` عبر دوال آمنة لا تعتمد على المتصفح عند الاختبار (`persistLocalePreference`, `readStoredLocalePreference`).
- القائمة المحمية من المساس عند التبديل: السلة (`cart`, `dandy_cart`)، جلسة العميل (`firebase.auth.currentUser`)، الأسعار، المعرفات، وسجلات الطلبات.
- **في المرحلة 10 لم يُعرض أي عنصر UI لمبدّل اللغة بناءً على القيد الصارم.**

---

## 17. اختبارات الوحدة الآلية (Automated Unit Tests — 77/77 Pass)

تمت إضافة ملف [`src/scripts/localization.test.ts`](./src/scripts/localization.test.ts) وتشغيل كافة اختبارات المشروع بأمر `npx --yes tsx --test src/scripts/*.test.ts`:
- **إجمالي الاختبارات المنفذة:** `77` اختباراً.
- **الناجحة:** **`77` (بنسبة 100%)** — منها 9 مجموعات اختبار شاملة للمرحلة 10 + 68 اختباراً سابقاً من المراحل 1–9.
- **الفاشلة:** `0`.

تغطي اختبارات `localization.test.ts`: إعدادات اللغة، أولوية الرابط على التفضيل والمتصفح، ثبات عقد مبدّل اللغة، النظائر وحذف `/en/en/` ومنع تسرب `token`/`#access=` ومعالجة المقالات غير المترجمة، دوال `t()` وكشف المفاتيح الناقصة، تنسيق `Intl` وعزل الوحدات، السيو وبوابة `hreflang`/`sitemap`، عدم تحوير بيانات المنتجات/السلة/الشحن/Studio/Pink Friday، وأداة فحص الاكتمال.

---

## 18. التحقق عبر المتصفح الحقيقي Playwright (Real-Browser Regression & Compatibility Verification)

نُفِّذ الفحص الفعلي عبر `playwright-cli` (Chromium Headless) ضد الخادم المحلي المجمع `http://127.0.0.1:3000`:
- **المسارات المفحوصة على سطح المكتب (`1440×900`):** 12 مساراً أساسياً: `/`, `/all-products`, `/category/skin-care`, `/product/facial-serum-3x1-30ml`, `/cart`, `/invoice`, `/track-order`, `/account-login`, `/account-signup`, `/blog`, `/about-us`, `/help`.
- **المسارات المفحوصة على الجوال (`390×844`):** 5 مسارات أساسية: `/`, `/all-products`, `/product/facial-serum-3x1-30ml`, `/cart`, `/blog`.
- **النتائج المرصودة فعلياً:**
  - `all200: true` (جميع الـ 17 تحميلاً أعادت `HTTP 200`).
  - `allArRtl: true` (`lang="ar"` و`dir="rtl"` على جميع الصفحات).
  - `zeroHreflang: true` (0 وسوم `hreflang` في DOM).
  - `zeroSwitcher: true` (0 عناصر مبدّل لغة في الواجهة).
  - `maxOverflowPx: 0` (انعدام أي انزياح أو تمرير أفقي على الديسكتوب والموبايل).
  - `hasEnInSitemap: false` (`/sitemap.xml` خالٍ تماماً من أي رابط `/en/`).
  - `cartAfterAdd: 1` (إضافة المنتج للسلة من `/product/facial-serum-3x1-30ml` نجحت وحدّثت الشارة والسلة).
  - `studioPreviewLiveSyncPassed: true` (رسالة `STUDIO_UPDATE_STATE` على `/?studio_preview=1` حدّثت الهيرو فوراً).
  - `ltrCheck`: عند تطبيق `lang="en"` و`dir="ltr"` في بيئة DOM معزولة على `/`، انتقل الاتجاه إلى `direction: ltr` والخط المحسوب إلى `"Plus Jakarta Sans", ...` مع `overflowPx: 0`.
  - `consoleErrors: []` و`pageErrors: []`.
- جرت مراجعة اللقطات المصورة فعلياً عبر Chromium للرئيسية (`1440×900` و`390×844`) وصفحة المنتج ثم حُذفت ملفات `.playwright-cli/` المؤقتة بعد انتهاء الفحص.

---

## 19. سلامة البناء والتدقيق اللغوي والبرمجي (Build & Lint Co-Verification)

- نُفِّذ البناء والتدقيق `compile_applet` + `lint_applet` معاً بعد آخر تعديل برمجي لضمان عدم وجود أي أخطاء TypeScript أو Astro SSR أو استيراد مفقود.

---

## 20. التحقق من ملفات الإعداد والبناء المحمية (Protected Config Integrity & SHA-256)

تمت مطابقة البصمة الرقمية (`sha256sum`) لكل ملف من الملفات السبعة المحمية قبل وبعد التنفيذ وكانت المطابقة **100% حرفياً**:

| الملف المحمي | بصمة SHA-256 المتحققة (قبل = بعد) | الحالة |
|---|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | سليم ومطابق |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | سليم ومطابق |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | سليم ومطابق |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | سليم ومطابق |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | سليم ومطابق |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | سليم ومطابق |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | سليم ومطابق |

---

## 21. فحص نظافة الاعتمادات والحزم (Dependency & Package Hygiene)

- **صفر** حزم npm جديدة مُثبتة أو محذوفة.
- **صفر** تعديلات على `package.json` أو `package-lock.json`.
- تعتمد المنظومة بالكامل على TypeScript الصافي وواجهات الويب القياسية (`Intl.NumberFormat`, `Intl.DateTimeFormat`, `URLSearchParams`, Unicode Isolates).

---

## 22. جرد الملفات المُنشأة والمعدّلة في المرحلة العاشرة (Complete File Manifest)

### ملفات مُنشأة جديدة:
1. `DANDY_PHASE_10_PRE_IMPLEMENTATION_AUDIT_AR.md` — وثيقة التدقيق المعماري قبل التنفيذ.
2. `src/i18n/types.ts` — كافة العقود والأنواع البرمجية للمنظومة متعددة اللغات.
3. `src/i18n/config.ts` — إعدادات اللغتين `ar` و`en` وبوابة النشر `isPubliclyPublished`.
4. `src/i18n/resolve-locale.ts` — محلل اللغة المرتبط بالمسار أولاً + عقد التفضيل ومبدّل اللغة.
5. `src/i18n/routes.ts` — سجل المسارات النظيرة، تصفية الاستعلام، ومنع البادئات المكررة وعزل الإدارة.
6. `src/i18n/messages/ar.ts` — قاموس الواجهة العربية الكامل بـ 20 نطاقاً (`TranslationCatalog`).
7. `src/i18n/messages/en.ts` — العقد الإنجليزي الجزئي التأسيسي (`common`, `navigation`, `categories`).
8. `src/i18n/translator.ts` — محرك `t()` و`resolveTranslation()` و`hasTranslation()`.
9. `src/i18n/format.ts` — أدوات `Intl` للعملة المصرية والأرقام والتواريخ والنسب ووحدات القياس.
10. `src/i18n/content/ar/categories.ts` & `src/i18n/content/en/categories.ts` — محولا التصنيفات.
11. `src/i18n/content/ar/products.ts` & `src/i18n/content/en/products.ts` — محولا المنتجات بمعرّف RTDB.
12. `src/i18n/content/ar/articles.ts` & `src/i18n/content/en/articles.ts` — محولا المقالات بمعرّف Firestore.
13. `src/i18n/content/adapters.ts` — المحولات النقية غير المحوِّرة للمنتجات والتصنيفات والمقالات وStudio وPink Friday والمحافظات وحالات الطلب.
14. `src/i18n/metadata.ts` — بناة `canonical`, `hreflang` المشروط, JSON-LD, وفلتر السايت ماب.
15. `src/i18n/translation-check.ts` — مدقق جاهزية واكتمال الترجمة للمرحلة 11.
16. `src/i18n/index.ts` — التصدير الموحد لمكتبة `src/i18n`.
17. `src/scripts/localization.test.ts` — اختبارات الوحدة الشاملة للمرحلة 10.
18. `DANDY_PHASE_10_FINAL_REPORT_AR.md` — التقرير النهائي الحالي.

### ملفات محدّثة بحدها الأدنى غير المعطّل:
1. `src/layouts/BaseLayout.astro` — قبول `dir` المشتق من `getDocumentAttributes(lang)` وتمرير `alternates = []`.
2. `src/styles/tokens.css` — إضافة رموز الخط النشط `--dandy-font-active-*` لـ `html[lang="en"]`.
3. `src/styles/base.css` — إضافة `html[dir="ltr"] .dandy-prose` و`.dandy-font-localized-display`.

---

## 23. حدود النطاق المؤكدة (Strict Scope Boundaries Respected)

- لا توجد أي مسارات عامة تحت `/en/` في `src/pages/` في هذه المرحلة.
- لا يوجد أي مبدّل لغة مرئي في الهيدر أو الفوتر أو درج الموبايل.
- لم تُترجم القوالب أو المنتجات أو المقالات ترجمة آلية مزيفة؛ ما لم يُترجم يظل موثقاً ومعلماً بوضوح أمام أداة `runLocalizationCompletenessAudit`.
- لم يُمسّ أي مسار من `/dashboard*` أو `/statues` أو `/login` أو `/api/*`.
- لم يُنفّذ أي `git commit` أو `git push`.

---

## 24. أمان البيانات والخصوصية (Data Privacy & Auth Boundary Verification)

- لا تعتمد محولات `src/i18n/` على أسرار خادم أو مفاتيح وصول خاصة.
- تمنع `resolveRouteCounterpart` قاطعاً نقل `#access=...` أو `#token=` أو `?token=` عند التبديل في فواتير العملاء `/invoice`.
- لا تغيّر المنظومة منطق التحقق من الهوية في `account-auth-client.ts` أو إنشاء الطلبات في `/api/create-order`.

---

## 25. جودة الكود والاعتمادية بدون تبعيات (Zero-Dependency Architecture Audit)

- جميع الوحدات تحت `src/i18n/` خالية تماماً من استدعاءات `window` المباشرة غير الآمنة وتعمل بالتساوي داخل SSR الخادمي وبيئة اختبارات Node وبيئة العميل.
- تم التحقق من استيراد المسارات بدقة عبر TypeScript و`tsx` وتمرير البناء الكامل لـ Astro SSR.

---

## 26. تجربة المطورين في المرحلة القادمة (Developer Ergonomics for Phase 11)

- يكفي استيراد أي دالة أو نوع من نقطة الدخول الموحدة `src/i18n/index.ts`.
- عند إضافة ترجمة جديدة في `messages/en.ts`، يتحقق المترجم من الأنواع عبر `TranslationCatalog`، كما يقيس `runLocalizationCompletenessAudit()` نسبة الإنجاز فوراً بالأرقام الدقيقة.

---

## 27. المخاطر المتبقية والقيود (Residual Risks & Constraints)

1. قد تحتوي بعض الحقول النصية القادمة مستقبلاً من Admin Studio أو RTDB على وصف مدمج بالعربية والإنجليزية (مثل `سيروم الوجه 3×1 | Serum 30 ml`)، لذا ستحتاج المرحلة 11 مراجعة بشرية لقوائم `EN_PRODUCT_CONTENT` لضمان تسميات إنجليزية أنيقة غير مكررة.
2. تستدعي بعض المكونات الحالية (`SiteHeader`, `SiteFooter`, `SearchDrawer`) سمة `dir="rtl"` صريحة على حاويات فرعية، وسيكون إبدالها بسمة ديناميكية أول خطوة عند بناء الصفحات الإنجليزية في المرحلة 11.
3. النصوص الحالية داخل لوحة إدارة **Admin Studio** (`/dashboard-index`) تخص المظهر العربي الحالي فقط؛ وعند فتح المرحلة 11 يلزم ربط الطبقة الاختيارية `HomepageStudioLocalizedOverlay` لقراءة النصوص الإنجليزية دون كسر اللوحة الحالية.

---

## 28. معايير قبول الجاهزية للمرحلة 11 (Phase 11 Readiness Gate)

لا يُسمح بتغيير `LOCALE_CONFIGS.en.isPubliclyPublished` إلى `true` في المرحلة 11 إلا بعد استيفاء الشروط الخمسة الآتية مجتمعة:
1. عودة `runLocalizationCompletenessAudit()` بقيمة `readyForPublication: true` للنطاقات والمحتوى المعتمد للنشر.
2. عدم وجود أي وسم `[untranslated:en:...]` في أي مسار إنجليزي منشور.
3. اجتياز اختبارات Playwright الكاملة لنسخة `/en/` (`dir="ltr"`, `lang="en"`, فحص البطاقات، الفلاتر، PDP، السلة، الفاتورة، وتتبع الطلب).
4. تفعيل وسوم `hreflang` الثلاثية المتبادلة وتحديث `sitemap.xml.ts` فقط للصفحات الإنجليزية المنشورة فعلياً.
5. بقاء السلة والمصادقة والشحن وتزامن Studio مشتركة وسليمة 100% بين اللغتين.

---

## 29. الخطة التفصيلية الموصى بها للمرحلة الحادية عشرة — تفعيل المتجر الإنجليزي (Phase 11 Preparation Plan — 15 Steps)

1. **استكمال قاموس الواجهة (`src/i18n/messages/en.ts`):** ترجمة ومراجعة جميع النطاقات الـ 18 المتبقية (`header`, `footer`, `home`, `catalog`, `product`, `cart`, `checkout`, `orders`, `account`, `auth`, `blog`, `reviews`, `support`, `forms`, `errors`, `legal`, `consent`).
2. **تأليف بيانات التصنيفات الإنجليزية (`src/i18n/content/en/categories.ts`):** استكمال `h1Title`, `introText`, `seoTitle`, `seoDescription` للتصنيفات الأربعة المعتمدة.
3. **إدخال محتوى المنتجات الإنجليزي (`src/i18n/content/en/products.ts`):** توطين أسماء المنتجات الـ 31+ ووصفها وأقسامها الهيكلية وأسماء الروائح (`variantLabels`) مرتبطةً بمعرفات RTDB دون مساس بالأسعار أو المخزون.
4. **تجهيز تراكب Studio الإنجليزي وحملة Pink Friday (`HomepageStudioLocalizedOverlay` & `PinkFridayLocalizedOverlay`):** توفير النصوص التسويقية الإنجليزية للهيرو والمزايا والبانر الترويجي وباقات Pink Friday مع احترام `sectionOrder` و`sectionsVisibility` من RTDB.
5. **توطين المقالات المختارة (`src/i18n/content/en/articles.ts`):** إدخال المقالات الإنجليزية الجاهزة للنشر بعلامة `publishedInLocale: true`، مع تفعيل مسار التراجع التلقائي لأي مقال غير مترجم.
6. **تعميم خاصية `locale` على المكونات المشتركة:** تمرير `locale: Locale = 'ar'` إلى `SiteHeader.astro`, `SiteFooter.astro`, `AnnouncementBar.astro`, `ProductCard.astro`, ومكونات الـ PDP والكتالوج والـ Checkout مع استبدال النصوص الصلبة بدالة `t(locale, ...)` ودعم `dir` المنطقي بدل `dir="rtl"` الثابت.
7. **ضبط الخطوط وإيقاع الاتجاه الإنجليزي:** التحقق من `Playfair Display` للعناوين التحريرية و`Plus Jakarta Sans` للنصوص الإنجليزية وحجم المسافات والتباعدات تحت `dir="ltr"`.
8. **تحديث محول التنسيقات داخل السكربتات التفاعلية (`product-card-client`, `pdp-client`, `cart-client`, `catalog-client`):** قراءة `document.documentElement.lang` لتطبيق `formatCurrencyEgp(..., locale)` وتسميات الحالة (`resolveLocalizedOrderStatusLabel`) والمحافظات (`resolveLocalizedGovernorateLabel`).
9. **إنشاء صفحات المتجر الإنجليزية تحت `src/pages/en/`:** بناء `/en/`, `/en/all-products`, `/en/category/[category]`, `/en/product/[...slug]`, `/en/special-offers`, `/en/pink-friday`, `/en/cart`, `/en/invoice`, `/en/track-order`, `/en/account-login`, `/en/account-signup`, `/en/account`, `/en/blog`, `/en/blog/[...slug]`, `/en/client-reviews`, `/en/about-us`, `/en/contact-us`, `/en/help`, `/en/privacy-policy`, `/en/terms` عبر وحدات مكونات مشتركة دون تكرار منطق التجارة.
10. **تنفيذ مبدّل اللغة المزدوج (`Header` + `MobileNavDrawer`):** ربط العقد `LANGUAGE_SWITCHER_CONTRACT` بدالة `resolveRouteCounterpart` ليتنقل الزائر بسلاسة مع الحفاظ التام على السلة وحساب Firebase ومعاملات البحث المصرح بها.
11. **إنتاج بيانات `SEO` و`JSON-LD` للغتين:** استخدام `buildLocalizedSeoMetadata()`, `buildLocalizedWebPageJsonLd()`, و`buildLocalizedBreadcrumbJsonLd()` داخل كل من الصفحات العربية والإنجليزية.
12. **ربط `hreflang` وتحديث `sitemap.xml.ts`:** ضبط `isPubliclyPublished = true` لـ `en` بعد اجتياز مدقق الاكتمال، وتحديث `sitemap.xml.ts` لإدراج روابط `/en/` المكتملة فقط وإخراج وسوم `hreflang="ar"`, `hreflang="en"`, و`hreflang="x-default"` المتبادلة.
13. **اختبار التدفق المزدوج للسلة والحساب والطلبات:** التحقق من الانتقال من منتج عربي -> إضافته للسلة -> التبديل إلى `/en/cart` -> إتمام طلب اختباري والتحقق من حفظ القيم المعيارية في RTDB.
14. **مراجعة `Playwright` البصرية الشاملة للنسختين العربية والإنجليزية:** فحص كافة الصفحات الإنجليزية بأبعاد `390×844` و`1440×900` والتأكد من `0px overflow` وسلامة الخطوط والأيقونات الاتجاهية.
15. **إصدار التقرير الختامي للمرحلة 11 (`DANDY_PHASE_11_FINAL_REPORT_AR.md`):** توثيق نتائج النشر والتكافؤ السيو والاعتماد النهائي.

---

## 30. الاعتماد الختامي للمرحلة العاشرة (Phase 10 Sign-off)

**الحالة النهائية:** أُنجزت المرحلة العاشرة بنجاح كامل وبصفر أخطاء في اختبارات الوحدة (`77/77`)، وصفر أخطاء في متصفح Playwright عبر المسارات الممثلة والنسخة العربية والمعاينة المباشرة لـ Studio، مع مطابقة تامة لبصمات SHA-256 للملفات السبعة المحمية وبقاء النشر العام للغة الإنجليزية معزولاً بأمان حتى المرحلة الحادية عشرة.
