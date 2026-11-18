# وثيقة التدقيق المعماري قبل التنفيذ — المرحلة العاشرة (Phase 10 Pre-Implementation Audit)
## البنية التحتية متعددة اللغات والتوطين (Multilingual Architecture & Localization Foundation)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 10 — Multilingual Architecture & Localization Foundation Only  
**الهوية البصرية المعتمدة:** Botanical Editorial Commerce  
**الحالة المرجعية قبل التنفيذ:** إتمام المراحل 0–9 + مزامنة Admin Studio + التوجيه الفني المتجاوب للهيرو  
**نطاق هذه الوثيقة:** فحص وتوثيق البنية القائمة قبل تعديل أو إنشاء أي ملف برمجي في المرحلة العاشرة.

---

## 1. بنية التوجيه والمسارات الحالية (Existing Routing Architecture)

يعمل المتجر على **Astro v7.3.1** بنمط التصيير الخادمي (**SSR — `output: 'server'`** مع محوّل Node محلياً وVercel للإنتاج دون مساس بأي إعدادات نشر).
تضم شجرة `src/pages/` الفئات الآتية:

1. **مسارات واجهة العميلات (25 مساراً فعلياً غير مسبوقة ببادئة لغة):**
   - **الصفحة الرئيسية والمتجر العام:** `/` (`index.astro`), `/all-products` (`all-products.astro`).
   - **التصنيفات والمنتجات:** `/category/[category]` (`category/[category].astro` — يقبل 4 تصنيفات معيارية: `skin-care`, `hair-care`, `body-care`, `fragrance`), `/product/[...slug]` (`product/[...slug].astro`), `/product` (`product.astro` — تحويل 301 للمعرف القديم أو 404).
   - **العروض والحملات:** `/special-offers` (`special-offers.astro`), `/offers` (`offers.astro` — تحويل 301 إلى `/special-offers` مع حفظ معاملات التتبع), `/pink-friday` (`pink-friday.astro`).
   - **رحلة الشراء والطلبات:** `/cart` (`cart.astro` — مدمج به خطوات إتمام الطلب الثلاث), `/invoice` (`invoice.astro` — يدعم `?invoice=`, `?id=`, `#access=`, `#token=`), `/track-order` (`track-order.astro`).
   - **المصادقة وحساب العميلة:** `/account-login` (`account-login.astro`), `/account-signup` (`account-signup.astro`), `/account` (`account.astro`).
   - **المحتوى التحريري وآراء العميلات:** `/blog` (`blog.astro`), `/blog/[...slug]` (`blog/[...slug].astro`), `/post` (`post.astro` — تحويل 301 من `?slug=` أو `?id=` إلى `/blog/[slug]`), `/client-reviews` (`client-reviews.astro`).
   - **الدعم والثقة والسياسات والأخطاء:** `/about-us`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`.
2. **نقاط نهاية السيو والتغذية:** `/sitemap.xml` (`sitemap.xml.ts`)، `/merchant-feed.xml` (`merchant-feed.xml.ts`).
3. **مسارات الإدارة والخلفية (خارج التعديل):** `/dashboard*`, `/statues`, `/login`, `/api/*` (`create-order`, `public-invoice`, `order-status`, `submit-review`, `link-customer-orders`, `product`, `verify-turnstile`, `send-telegram`, `health`, `admin/*`, `pink-friday/*`).
4. **التخطيط الجذري المركزي:** `src/layouts/BaseLayout.astro` هو الغلاف المشترك لجميع الصفحات، ويقبل بالفعل خصائص `lang = 'ar'` و`dir = 'rtl'` و`canonical` و`title` و`description` و`keywords` و`robots`.
5. **تطبيع المسارات الحالي:** توجد دالة `normalizeRoutePath()` و`isNavHrefActive()` في `src/scripts/shell.ts` وتتعاملان مع المسارات غير المسبوقة ببادئة لغة.

**قرار التوافق المساري للمرحلة العاشرة:** الإبقاء التام على المسارات العربية الحالية كما هي دون بادئة `/ar/` ودون أي إعادة توجيه تلقائية؛ وحصر دعم المسارات المستقبلية الإنجليزية تحت بادئة `/en/` فقط من خلال طبقة `src/i18n/routes.ts` و`src/i18n/resolve-locale.ts` دون تفعيل صفحات `/en/` عامة في هذه المرحلة.

---

## 2. مصادر المحتوى العربي الحالية (Current Arabic Content Sources)

تتوزع النصوص العربية الحالية في المتجر بين:
1. **قوالب ومكونات الواجهة الثابتة:**
   - الغلاف العالمي (`AnnouncementBar.astro`, `SiteHeader.astro`, `SearchDrawer.astro`, `MobileNavDrawer.astro`, `BottomMobileNav.astro`, `SiteFooter.astro`, `ConsentBanner.astro`).
   - مكونات التجارة والكتالوج (`ProductCard.astro`, `ProductGallery.astro`, `ProductInfo.astro`, `VariantSwatches.astro`, `QuantityStepper.astro`, `BotanicalFeatureGrid.astro`, `ReviewSummaryPanel.astro`, `CatalogToolbar.astro`, `MobileFilterDrawer.astro`, `CategoryEditorialHeader.astro`, `CatalogEmptyState.astro`, `CheckoutPageHeader.astro`, `CheckoutStepper.astro`, `CartRemoveDialog.astro`, `OrderStatusTimeline.astro`).
   - مكونات الحساب والتحرير والصفحات الثابتة (`AuthEditorialLayout.astro`, `EditorialPageHeader.astro`, `about-us.astro`, `contact-us.astro`, `help.astro`, `privacy-policy.astro`, `terms.astro`, `404.astro`).
2. **وحدات المنطق النقي والتفاعل بالمتصفح:**
   - رسائل الخطأ والتحقق وإشارات الحالة والأسعار داخل `src/scripts/product-card.ts`، `src/scripts/product-pdp.ts`، `src/scripts/catalog.ts`، `src/scripts/purchase-flow.ts`، `src/scripts/account.ts`، و`src/scripts/homepage-studio.ts`.
3. **قواعد بيانات السحابة:** Firebase RTDB (`products`, `reviews`, `testimonials`, `homepage`, `categories`, `settings/pinkFriday`) وFirestore (`articles`).

---

## 3. تصنيف البيانات الثابتة والديناميكية (Static & Dynamic Data Classification)

تم تصنيف كافة محتويات المتجر إلى الفئات الثماني الآتية:

| الفئة | المصدر الحالي | القابلية للتوطين والنهج الموصى به |
|---|---|---|
| **1. نصوص الواجهة العربية الثابتة** | مكونات `.astro` وملفات `.ts` | قابلة للتجميع في قاموس مفاتيح دلالي مُعرّف الأنواع (`src/i18n/messages/ar.ts` مقابل عقد `en.ts`) دون المساس بالمحتوى العربي القائم. |
| **2. بيانات المنتجات الديناميكية** | RTDB `/products.json` + `src/utils/products.ts` | **الكيان التجاري مشترك بالكامل** (`id`, `resolvedSlug`, `price`, `originalPrice`, `discount`, `onSale`, `isSoldOut`, `stockQuantity`, `image`, `variants`)؛ بينما **الاسم والوصف والمميزات وبيانات SEO** محتوى يحتاج توطيناً مرتبطاً بمعرّف المنتج الثابت `product.id` عبر طبقة تكييف أمامية. |
| **3. بيانات التصنيفات** | `CATEGORY_TAXONOMY` في `src/utils/categories.ts` + RTDB `/categories.json` | الكود المعرفي `slug` (`hair-care`, `body-care`, `fragrance`, `skin-care`) مشترك، بينما `arabicName`/`name` و`h1Title` و`introText` و`seoTitle` و`seoDescription` بيانات قابلة للتوطين عبر معرّف القسم. |
| **4. بيانات الحملات الترويجية** | RTDB `/settings/pinkFriday/publishedActiveCampaign.json` | توقيت الحملة (`startAt`, `endAt`, `timezone: Africa/Cairo`) وأسعار العروض والباقات ونسب الخصم **مشتركة وغير قابلة للتعديل**؛ أما نصوص الشارات والعناوين الترويجية في الـ `visuals` والـ `collections` فتُوطَّن عبر طبقة العرض عند توفر ترجمات في المرحلة 11. |
| **5. المحتوى التحريري (المدونة)** | Firestore `articles` عبر `src/utils/articles.ts` | المعرّف `id` والـ `slug` وتواريخ النشر والصورة مشتركة، بينما `title` و`excerpt` و`content` و`category` ومواد SEO محتوى تحريري مستقل لكل لغة (وقد تختلف المقالات المترجمة المنشورة فعلياً في المرحلة 11). |
| **6. المحتوى المُنشأ من العميلات** | RTDB `/reviews/$productId` و`/testimonials` | أسماء العميلات والتقييمات وتعليقات المراجعة ولقطات التجارب تبقى كما وردت من مصدرها الموثق ولا تُترجم آلياً أو تُزيف؛ يقتصر التوطين على عناوين القسم وتسميات الإحصاء وحالة التحقق من الشراء. |
| **7. بيانات المعاملات والطلبات التاريخية** | RTDB `/orders` + `/api/create-order` + `/api/public-invoice` | تبقى أرقام الفواتير (`invoiceCode`) والأصناف المسجلة وقت الطلب والأسعار والمدفوعات محفوظة كما صُدرت. تُوطَّن تسميات الحالة (`New`, `Processing`, `Shipped`, `Delivered`, `Cancelled`) وأسماء المحافظات (`GOVERNORATES`) وعناوين الواجهة فقط. |
| **8. محتوى الصفحة الرئيسية المخصّص من الإدارة** | RTDB `/homepage.json` + `/categories.json` | ترتيب الأقسام (`sectionOrder`) والرؤية (`sectionsVisibility`) والصور وروابط المنتجات والأقسام مشتركة؛ بينما النصوص المخصّصة تحتاج خريطة امتداد لغوية اختيارية مستقبلية دون تعديل عقد Studio الحالي. |

---

## 4. بنى Firebase ذات الصلة بالتوطين (Existing Firebase Structures)

- **Firebase Realtime Database (`dandy-562fc-default-rtdb.europe-west1.firebasedatabase.app`):**
  - `/products/{id}`: يحمل حقولاً بالاسم العربي (`name`) أو ثنائية اللغة (`title | name`)، ووصفاً عربياً منسقاً بفقرات (`description`)، ومتغيرات عطرية (`variants` بأسماء عربية غالباً)، وتصنيفاً خام (`category`) مثل `'Hair care'` / `'Perfume'` / `'Skin care'`، ولا يحتوي حالياً على حقول ترجمة إنجليزية مثل `nameEn` أو `descriptionEn`.
  - `/reviews/{productId}` و`/testimonials`: تقييمات عميلات حقيقية بنصوص عربية وأرقام طلبات (`orderId`).
  - `/homepage` و`/categories`: إعدادات Admin Studio الحالية لـ `hero` و`sections` و`trust` و`reviews` و`promoBanner` و`customSections` و`categories`.
  - `/settings/pinkFriday/publishedActiveCampaign`: إعدادات Pink Friday السنوية وأسعار العروض والباقات.
  - `/customers/{uid}` و`/orders/{orderId}`: سجلات العميلات والعناوين المحفوظة (`Asyut -> Assiut` مطبّع في الكود)، والمفضلات، والطلبات التاريخية.
- **Firebase Firestore:**
  - مجموعة `articles`: تحتوي حالياً على ~24 مقالاً منشوراً بالعربية مع `slug` لاتيني موثق و`status` (`published` / `draft`)، دون حقل `locale` أو حقول `titleEn` / `contentEn`.
- **الالتزام الصارم في المرحلة العاشرة:** لا يتم تعديل أي مخطط (Schema) أو قاعدة أمان (`database.rules.json` / `firestore.rules`) أو بيانات حية في Firebase، وتُبنى طبقة التكييف على ملكية الواجهة الأمامية (Frontend Content Adapter) بالارتباط عبر المعرّفات الثابتة (`id`).

---

## 5. حقول المحتوى للمنتجات والتصنيفات (Product & Category Content Fields)

1. **المنتجات (`src/utils/products.ts` & `src/scripts/product-pdp.ts`):**
   - المعرف الدائم: `product.id` (مفاتيح Firebase مثل `-OvPo-cuVeLHWSU8KQ22`) والـ `resolvedSlug` المعتمد عبر `EXISTING_PRODUCT_SLUG_MAP` (31 منتجاً + قواعد التوليد الحتمي).
   - لاحظ التدقيق أن `parseDescriptionToHtml()` في `products.ts` يحتوي أيقونات Font Awesome وعناوين عربية صريحة (`مميزات`, `طريقة الاستخدام`, `النتائج`, `المكونات`, `الفوائد`)، بينما `parseDescriptionSections()` في `product-pdp.ts` يعالج نفس الأقسام بهيكل منظم (`overview`, `features`, `ingredients`, `usage`, `results`). ستُحفظ سلوكيات الصفحة العربية دون تغيير، وتُصمَّم عقود `ProductLocalizedContent` لدعم الأقسام المهيكلة باللغة المطلوبة لاحقاً.
   - حقول الحجم/الوزن (`extractVolumeLabel`) والروائح (`variants`) وأسماء المتغيرات ستُعرّف كعقود تكييف مساعدة بالمعرّفات دون تغيير مفاتيح السلة (`product.id::variantIds`).
2. **التصنيفات (`src/utils/categories.ts`):**
   - توجد 4 تصنيفات معيارية ثابتة: `hair-care`, `body-care`, `fragrance`, `skin-care`، ويحتوي كل كائن بالفعل على حقل إنجليزي أولي (`name`: `'Hair Care'`, `'Body Care'`, `'Fragrance'`, `'Skin Care'`) وحقل عربي (`arabicName`)، بينما الحقول التحريرية والسيو (`h1Title`, `introText`, `seoTitle`, `seoDescription`) عربية فقط حالياً.
   - كما يربط `PRODUCT_CATEGORY_OVERRIDES` أربعة معرّفات منتجات محددة بتصنيفاتها الوظيفية الصحيحة دون لمس قاعدة البيانات.

---

## 6. بنية محتوى المدونة والمقالات (Blog Content Structures)

- تُجلب المقالات عبر Firestore REST API في `src/utils/articles.ts` (`Article`: `id`, `title`, `slug`, `category`, `status`, `image`, `excerpt`, `content`, `date`, `createdAt`, `updatedAt`).
- كل مقال منشور يمتلك `slug` لاتينياً ثابتاً (مثل `hair-loss-routine`, `daily-skincare-routine-healthy-skin`) ومرتبط بـ `ARTICLE_TO_PRODUCT_SLUGS` في `src/scripts/account.ts`.
- **متطلبات المرحلة 11 (الموثقة في عقد المرحلة 10):** لا يُفرض نشر كل المقالات دفعة واحدة بالإنجليزية؛ إذا لم يكتمل ترجمة مقال بعينه للغة الإنجليزية، يظل المسار النظير غير مُفعل ولا يُدرج في `hreflang` أو `sitemap.xml`، بينما تستخدم صفحة `/en/blog/[slug]` (عند نشرها في المرحلة 11) استراتيجية التراجع الصريحة نحو قائمة المدونة الإنجليزية أو المقالات المنشورة المتاحة.

---

## 7. معمارية تخصيص Admin Studio وجاهزية التوطين (Admin Studio Architecture)

تعمل مزامنة الصفحة الرئيسية في `src/pages/index.astro` عبر `src/utils/homepage.ts` و`src/scripts/homepage-studio.ts` و`src/scripts/homepage-studio-client.ts` و`src/pages/dashboard-index.astro`:
- **العناصر المشتركة (المستقلة عن اللغة):**
  - `sectionOrder` و`sectionsVisibility` و`data-studio-section` (`hero`, `trust`, `offers`, `categories`, `promo`, `newArrivals`, `blog`, `reviews`, ومقاطع `custom-<id>`).
  - معرفات المنتجات اليدوية (`manualProducts`), حدود العرض (`limit`), مصادر العرض (`offers`, `bestsellers`, `manual`), ومعرفات التصنيفات الأربعة، ومعظم الصور المحايدة لغوياً.
- **العناصر النصية المخصّصة حالياً بالعربية:**
  - `hero[].title/subtitle/buttonText`، `sections[].title/subtitle`، `trust.item1..3.title/desc`، `promoBanner.eyebrow/title/desc/ctaText`، `categories[slug].name/tagline/count`، `customSections[].title/subtitle/content/eyebrow/desc/ctaText/linkText/items[].title/desc/q/a`.
- **بروتوكول المعاينة الحيّة (`STUDIO_UPDATE_STATE`):** يرسل الاستوديو رسالة `postMessage` تحتوي على `state`.
- **العقد التوطيني المُصمَّم في المرحلة 10 (دون تعديل لوحة الإدارة):** دعم امتداد اختياري غير كاسر على مستوى النموذج المطبَّع (`HomepageStudioLocalizedOverlay` / `translations?: { en?: ... }` مستقبلاً) يقرأ نفس الترتيب والـ `visibility` والـ `productIds` والصور المشتركة، ويسمح لطبقة التوطين باستبدال النصوص المخصّصة عند توفرها مستقبلاً أو الاقتصار على القيم المترجمة المعتمدة دون خلط عشوائي للغات.

---

## 8. نتائج تدقيق التوافق مع الاتجاهين RTL/LTR (RTL/LTR Compatibility Audit)

أظهر الفحص الشامل لجميع ملفات `src/styles/` و`src/components/` و`src/pages/` ما يلي:
1. **إيجابيات محققة من المراحل 1–9:**
   - استخدام ممتاز للخصائص المنطقية (`margin-inline`, `padding-inline`, `inset-inline-start`, `inset-inline-end`, `text-align: start`) مع **0** استخدامات لعبارات `padding-left`/`padding-right`/`margin-left`/`margin-right`/`border-left`/`border-right`/`text-align: left|right` في واجهة العميلات وصفحاتها ومكوناتها.
   - `BaseLayout.astro` يدعم أصلاً `lang` و`dir` ويحمّل في استدعاء واحد الخطوط الثنائية المعتمدة (`Alexandria`, `Amiri`, `Playfair Display`, `Plus Jakarta Sans`).
   - `src/styles/tokens.css` يعرّف بالفعل متغيرات الخطوط (`--dandy-font-ar-*` و`--dandy-font-en-*`) وارتفاعات الأسطر (`--dandy-leading-*-ar` و`--dandy-leading-*-en`).
   - `src/components/ui/Icon.astro` يدعم خاصية `directional?: boolean` و`src/styles/components.css` يطبق `.dandy-icon-directional` عبر `:dir(rtl) { transform: scaleX(-1); }`.
   - محرك الحركة `PageEntranceManager` (`src/scripts/page-entrance.ts`) يعتمد على إزاحة عمودية محايدة `translate3d(0, distance, 0)` فقط.
2. **نقاط تحتاج مواءمة هندسية طفيفة وغير كاسرة (أو توثيق للمرحلة 11):**
   - عدة مكونات عامة تكتب `dir="rtl"` صراحة على عنصرها الجذري (`SiteHeader.astro`, `SiteFooter.astro`, `AnnouncementBar.astro`, `SearchDrawer.astro`, `MobileNavDrawer.astro`, `BottomMobileNav.astro`, `ConsentBanner.astro`, `MobileFilterDrawer.astro`, وبعض صفحات `main`) — يجب في التحضير المعماري ألا تتصلب تلك المكونات على `dir="rtl"` عند تمرير `dir` مستقبلاً (مع بقاء القيمة الافتراضية `'rtl'`).
   - العديد من المكونات تحدد `font-family: var(--dandy-font-ar-sans)` أو `--dandy-font-ar-display` صراحة بدلاً من متغير دلالي نشط يتبدل مع `html[lang="en"]`؛ في المرحلة 10 يمكن إضافة دعم خط نشط دلالي في `tokens.css` / `base.css` (مثل ربط `html[lang="en"]` بـ `--dandy-font-active-*`) دون التأثير مطلقاً على الصفحة العربية `lang="ar"`.
   - الفحص الخاص بالأسهم في `SiteHeader.astro` (مثل `chevron-left` داخل قائمة التصنيفات) و`Breadcrumb` يستفيد من توحيد اتجاه `chevron-right` مع `directional={true}` أو تكييف الاسم حسب `dir` عند المرحلة 11.

---

## 9. معمارية السيو وخريطة الموقع والبيانات المهيكلة (SEO & Sitemap Architecture)

- **`<link rel="canonical">`:** يتولد تلقائياً في `BaseLayout.astro` باستخدام `SITE_URL` + المسار النظيف دون سلاش ختامي (باستثناء `/`). يجب أن تبقى كافة روابط `canonical` العربية دون تغيير.
- **`hreflang`:** غير موجودة حالياً. **القاعدة الإلزامية في المرحلة 10:** عدم توليد أي وسم `hreflang` يشير إلى مسار `/en/` غير منشور أو غير موجود؛ يقتصر دور `src/i18n/metadata.ts` على بناء دوال آمنة تتحقق من نشر اللغة وتوفر المسار النظير قبل إخراج أي `alternate`.
- **`/sitemap.xml` (`src/pages/sitemap.xml.ts`):** يولّد قائمة الروابط العربية المنشورة فقط. يجب الحفاظ عليه 100% كما هو دون إضافة أي مسار `/en/` غير مفعّل. عند التفعيل في المرحلة 11 سيستعمل السايت ماب دالة التحقق من النشر وإصدار `<xhtml:link rel="alternate" ...>` للمسارات المنشورة فعلياً فقط.
- **البيانات المهيكلة (`JSON-LD`):**
  - `generateCategoryJsonLd()` في `src/utils/categories.ts` يثبّت `'inLanguage': 'ar'` و`'الرئيسية'`.
  - `generateProductJsonLd()` في `src/utils/products.ts` يمرر `'priceCurrency': 'EGP'` و`name` و`description`.
  - مقالات المدونة تمرر `BlogPosting` و`BreadcrumbList`.
  - في `src/i18n/metadata.ts` ستُجهَّز مساعدات توليد Metadata و`hreflang` و`inLanguage` المتوافقة مع `ar` و`en` دون تعديل المخرجات العربية الحالية.

---

## 10. توافق بيانات السلة والحسابات والطلبات والعملة (Cart, Account, Orders & Currency)

- **السلة (`localStorage.cart` و`localStorage.dandy_cart`):** تحتفظ السلة بهيكل العناصر: `{ id, productId, name, price, image, discount, onSale, quantity, hasVariants, variantType, selectedVariants, type, isCollection, isPinkFriday, selectedItems }`. لا يجوز فصل سلة عربية عن سلة إنجليزية، ولا مسح السلة أو تعديل المعرفات أو الأسعار عند تبديل اللغة.
- **المصادقة وحساب العميلة (`Firebase Auth` + `/customers/$uid`):** الجلسة موحدة عبر النطاق نفسه (`dandy-ebon.vercel.app`)؛ العناوين المحفوظة تستخدم أكواد المحافظات الإنجليزية المعتمدة (`GOVERNORATES.value` مثل `'Cairo'`, `'Assiut'`) وتُعرض عبر تسمية اللغة المختارة فقط (`labelAr` أو مستقبلًا `labelEn`)، بينما تبقى المفضلات (`wishlist`) مرتبطة بـ `productId` نفسه.
- **الطلبات التاريخية والفاتورة (`/invoice`, `/track-order`, `/account`):** تحتفظ بسجل العناصر المسجل لحظة الشراء و`invoiceCode` و`phone` و`status` (`New`, `Processing`, `Shipped`, `Delivered`, `Cancelled`). لا يجوز تعديل أسماء العناصر المحفوظة داخل سجل الطلب التاريخي عند تغيير لغة العرض، بل تُعرّب وتُترجم **عناوين الواجهة والحالات وأسماء المحافظات والتواريخ فقط** وفق لغة العرض المختارة.
- **العملة والأسعار:** الجنيه المصري (`EGP`) هو العملة الوحيدة؛ تعتمد جميع الحسابات على الأرقام المصدرية فقط دون استخراج الأرقام من سلاسل العملات المنسقة (`formatCurrencyEgp`).

---

## 11. معمارية اللغة والتوطين الموصى بها (Recommended Locale Architecture)

تستند معمارية المرحلة العاشرة إلى وحدة نظيفة خفيفة الوزن تحت `src/i18n/` بدون أي حزم خارجية (استخدام TypeScript الصرف و`Intl.NumberFormat` / `Intl.DateTimeFormat`):
- **استراتيجية الروابط:** العربية (`ar`) هي الافتراضية بدون بادئة (`/`, `/product/...`, `/category/...`)، والإنجليزية (`en`) محجوزة تحت `/en/` ومُعطّلة النشر العام في المرحلة 10 (`isPubliclyPublished: false`).
- **أولوية تحديد اللغة (`resolveLocaleFromPath`):** المسار الفعلي في الرابط هو المصدر الحاسم:
  1. أي مسار مطابق لـ `/en` أو `/en/*` يُحدَّد كـ `'en'` (مع التمييز الصارم عن مسارات مثل `/offers` أو `/post` أو `/en-anything`).
  2. أي مسار غير مسبوق ببادئة `/en` يُحدَّد دائماً كـ `'ar'` بغض النظر عن `localStorage` أو تفضيل المتصفح (`Accept-Language`)، مع منع أي تحويل تلقائي مبني على المتصفح أو IP.
- **المفاتيح وتكامل المحتوى:** فصل كامل بين نصوص الواجهة الثابتة (`messages/`)، ومحتوى الكيانات المترجمة المرتبطة بـ `id` (`content/`)، والبيانات التجارية المشتركة.

---

## 12. مخاطر الهجرة والسيو المحتملة (Potential Migration & SEO Risks)

1. **خطر تلوث السيو (`Hreflang / Sitemap Poisoning`):** توليد روابط `hreflang` أو خرائط موقع تشير إلى صفحات `/en/` غير موجودة أو غير مترجمة سيسبب أخطاء 404 وتراجع ترتيب المتجر العربي. *(الحل: حارس `isPubliclyPublished` الصارم + التحقق من اكتمال الترجمة).*
2. **خطر الخلط اللغوي (`Mixed Language UI`):** عرض صفحات إنجليزية تضم نصوصاً عربية غير مترجمة أو نصوصاً وهمية. *(الحل: أداة `translation-check.ts` لكشف الفجوات قبل أي تفعيل).*
3. **خطر تضارب المسارات التراثية:** الخلط بين البادئات اللغوية ومسارات `/offers` أو `/post` أو `/product?id=` أو تكرار البادئة `/en/en/...`. *(الحل: اختبارات وحدة شاملة لمنع التكرار وفحص المسارات).*
4. **خطر تسريب الرموز الحساسة عند تبديل اللغة:** نسخ `#access=` أو `#token=` أو معاملات خطأ عند التحويل بين اللغات في صفحات الفاتورة والتتبع. *(الحل: قائمة بيضاء صريحة لمعاملات الاستعلام المسموح بها لكل نوع مسار في `routes.ts`).*
5. **خطر فصل السلة أو كسر حساب العميلة أو تسعير Pink Friday:** تمرير سلاسل نصية مترجمة إلى منطق التسعير أو تغيير معرفات العناصر في السلة. *(الحل: حفظ `product.id` و`price` و`cartItem` كما هي وتغطيتها باختبارات عدم التحور).*

---

## 13. الملفات والوحدات المقترحة للمرحلة العاشرة (Proposed Files & Utilities)

| المسار المقترح | الوظيفة والحدود |
|---|---|
| `src/i18n/types.ts` | جميع أنواع TypeScript للغات، الاتجاه، المسارات، القواميس، تكييف المحتوى، السيو، وتقارير الاكتمال. |
| `src/i18n/config.ts` | الإعداد المركزي للغات (`ar` الافتراضية المفعّلة، `en` المحضّرة غير المفعّلة للنشر العام)، الأنماط، ومساعدات الاتجاه. |
| `src/i18n/resolve-locale.ts` | دالة استخلاص اللغة من الرابط (URL-first)، التطبيع الآمن، ومعايير التخزين المستقبلي للتفضيل. |
| `src/i18n/routes.ts` | خريطة المسارات الثابتة والديناميكية، التحويل المتناظر (`resolveRouteCounterpart`)، تصفية الاستعلامات (Allowlist)، منع تكرار `/en/en`، وحماية `/offers` و`/post`. |
| `src/i18n/messages/ar.ts` | القاموس العربي الأساسي منسّقاً بفضاءات أسماء دلالية مطابقة لنصوص المتجر الحالية. |
| `src/i18n/messages/en.ts` | هيكل العقد الإنجليزي الجزئي المُعرّف بالنوع للمصطلحات المحضّرة دون تعبئة ترجمة كاملة أو نصوص وهمية. |
| `src/i18n/translator.ts` | مُستدعي الترجمة `t(locale, key, params?)` المتوافق مع SSR مع معالجة صريحة للمفاتيح المفقودة. |
| `src/i18n/content/types.ts` & `adapters.ts` | عقود ومكيّفات المحتوى المترجم للمنتجات والتصنيفات والمقالات واستوديو الرئيسية بالربط عبر `id` مع حماية البيانات التجارية المشتركة. |
| `src/i18n/content/ar/*` & `en/*` | حزم الربط المرجعية للعربية (`categories`, `products`, `articles`) وعقود التحضير الإنجليزية غير المنشورة. |
| `src/i18n/format.ts` | منسّقات الأرقام والعملة (`EGP`) والتواريخ والنسب والكميات عبر `Intl` دون تعديل القيم المصدرية. |
| `src/i18n/metadata.ts` | بناء الـ Canonical و`og:locale` و`JSON-LD` و`hreflang` المقيّد بصفحات منشورة فعلياً فقط. |
| `src/i18n/translation-check.ts` | مدقّق اكتمال الترجمة (كشف المفاتيح والمنتجات والتصنيفات والمقالات والميتاداتا والمسارات الناقصة مع استثناء المعرّفات والأسعار والصور). |
| `src/scripts/localization.test.ts` | اختبارات وحدة شاملة عبر `node:test` لكافة الوحدات المذكورة ومنع تحور بيانات التجارة. |
| *تحسين توافق محدود في التخطيط/الأنماط (عند التحقق الكامل من عدم كسر العربية)* | ضبط `BaseLayout.astro` ليستخدم `getLocaleConfig()` وربط سمات الاتجاه دون تغيير أي مخرجات عربية قائمة. |

---

## 14. المتطلبات المؤجلة إلى المرحلة الحادية عشرة (Deferred to Phase 11)

- إنشاء ونشر صفحات `/en/*` العامة بالكامل (الرئيسية، الكتالوج، التصنيفات، المنتجات، العروض، السلة، الفاتورة، التتبع، الحساب، المدونة، الدعم، السياسات، 404).
- تفعيل مبدّل اللغة في الهيدر والجوال للمستخدم النهائي.
- تعبئة الترجمة الإنجليزية الكاملة لنصوص المتجر والمنتجات والمقالات وقسم Studio الإنجليزي وبيانات السيو.
- تفعيل علامات `hreflang` المتبادلة في `<head>` وإدراج مسارات `/en/` المترجمة فعلياً في `/sitemap.xml`.
- تنفيذ اختبارات التسوّق الكاملة عبر متصفح حقيقي باللغتين والتبديل السلس مع بقاء السلة والحساب مشتركَين.
