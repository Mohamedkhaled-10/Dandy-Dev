# تدقيق الاسترداد المعماري — المرحلة الحادية عشرة (Phase 11 Recovery Audit)
## المتجر متعدد اللغات وتفعيل الواجهة الإنجليزية ومبدّل اللغة (Multilingual Storefront Activation)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 11 — Recovery, Audit & Completion  
**الهوية البصرية:** Botanical Editorial Commerce (`ar` RTL على `/`، و`en` LTR على `/en/`)  
**المراجع الميدانية المفحوصة:** `DANDY_PHASE_10_PRE_IMPLEMENTATION_AUDIT_AR.md`، `DANDY_PHASE_10_FINAL_REPORT_AR.md`، `DANDY_PHASE_11_PRE_IMPLEMENTATION_AUDIT_AR.md`، وكامل شجرة الكود تحت `src/` و`public/` و`test/`.

---

## 1. البصمة الرقمية الأساسية للملفات المحمية (Protected Configuration Baseline SHA-256)

تم التحقق من بصمات ملفات الإعداد والبناء والنشر قبل متابعة أي تعديلات في هذا الاسترداد:

| الملف المحمي | بصمة SHA-256 الحالية | المرجع (Phase 10) | الحالة |
|---|---|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | متطابق |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | متطابق |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | متطابق |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | متطابق |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | متطابق |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | متطابق |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | متطابق |
| `firebase.json` | `a75107328c6d0e1e3ae7e16bc79e469cd5acfc50c75aa52f3ac0ba7fc2110de0` | — | مرجع ثابت |
| `firebase/database.rules.json` | `95ce07641125abf8a4459cc3f2312a1369c67048b54736e5d9e5120bf243f1fb` | — | مرجع ثابت |
| `firebase/firestore.rules` | `2a2a44b4ca12946969c0caa3006abbe25a2b4d40508ae128fa2710093c140e65` | — | مرجع ثابت |

*(ملاحظة مسجّلة بموضوعية: ملف `bun.lock` المذكور في شجرة البداية أُزيل قبل تفعيل قيد الحماية أثناء خطوة ترحيل الحزم الأولية، ولا توجد نسخة احتياطية منه داخل الحاوية).*

---

## 2. مصفوفة تنفيذ الميزات (Feature-by-Feature Implementation Matrix)

| المجال / الميزة | الحالة الفعلية عند التدقيق | الملفات المسؤولة | الملاحظات والتفاصيل الميدانية |
|---|---|---|---|
| بنية `src/i18n/*` الأساسية (الأنواع، المحولات، المترجم، التنسيق، السيو، فحص الاكتمال) | **مكتمل ومفعل** | `src/i18n/{types,config,resolve-locale,routes,translator,format,metadata,translation-check,index}.ts` | `LOCALE_CONFIGS.en.isPubliclyPublished = true` وجميع مسارات `ROUTE_REGISTRY` الـ 20 منشورة (`englishPublished: true`). |
| قاموس الواجهة الإنجليزي (`EN_MESSAGES`) | **مكتمل (193/193)** | `src/i18n/messages/en.ts`, `ar.ts` | نسبة الاكتمال `100%` عبر جميع النطاقات الـ 20 (`0` مفاتيح مفقودة). |
| محتوى التصنيفات الإنجليزي (`EN_CATEGORY_CONTENT`) | **مكتمل (4/4)** | `src/i18n/content/en/categories.ts` | يغطي `skin-care`, `hair-care`, `body-care`, `fragrance` كاملةً بجميع حقول SEO. |
| محتوى المنتجات الإنجليزي (`EN_PRODUCT_CONTENT`) | **مكتمل (32/32)** | `src/i18n/content/en/products.ts` | يغطي جميع المنتجات النشطة الـ 32 وتسميات المتغيرات (`variantLabels`). |
| محتوى المقالات الإنجليزي (`EN_ARTICLE_CONTENT`) | **مكتمل (8/8)** | `src/i18n/content/en/articles.ts` | جميع المقالات الـ 8 المنشورة مترجمة مع `publishedInLocale: true`. |
| تراكب Studio وPink Friday الإنجليزي | **مكتمل جزئياً — به تسريب حقل واحد** | `src/i18n/content/en/{homepage-studio,pink-friday}.ts`, `src/i18n/content/adapters.ts`, `src/layouts/BaseLayout.astro` | **`resolveLocalizedPinkFridayCampaign()`** لا يطبّق `overlay.subtitle` على `visuals.subtitle`، ما يؤدي لظهور العنوان الفرعي العربي في `/en/pink-friday`؛ كما يمرر `BaseLayout.astro` كائن `window.__PINK_FRIDAY_CONFIG` غير مترجم وكلمات مفتاحية افتراضية `keywords` بالعربية في صفحات `/en/`. |
| مكونات العرض المشتركة (`src/components/views/*`) | **مكتمل (20 عرضاً موحداً)** | `src/components/views/*.astro` | تمنع تكرار منطق التجارة عبر تمرير `locale: Locale = 'ar'`. |
| المسارات الإنجليزية العامة (`src/pages/en/*`) + `/en/404` | **مكتمل (21 ملفاً + `404.astro`)** | `src/pages/en/*.astro`, `src/pages/404.astro` | جميع المسارات ترجع `HTTP 200` (و`/en/offers` يعيد التوجيه `301` إلى `/en/special-offers`، و`/en/404` يرجع `404` باللغة الإنجليزية `LTR`). |
| مبدّل اللغة (`LanguageSwitcher`) | **مكتمل ومختبر جزئياً** | `src/components/layout/LanguageSwitcher.astro`, `SiteHeader.astro`, `MobileNavDrawer.astro` | ظاهر في هيدر الديسكتوب وقائمة الجوال، يحذف التوكنات الحساسة، لم يُختبر بعد across جميع الـ 5 أحجام في المتصفح. |
| سكربتات المتصفح والتجارة (`src/scripts/*-client.ts`) | **مكتمل** | `src/scripts/{cart,pdp,catalog,invoice,track-order,account,account-auth,homepage-studio,product-card}-client.ts` | فحص النصوص أظهر تعاملها الصحيح مع `isEn` دون نصوص عربية غير محمية؛ تم سابقاً إصلاح تصدير `localizeInternalStoreHref` وإصلاح `invoiceHref`/`trackHref` في `account.ts`. |
| حركات الدخول والتقليل الحركي (Phase 7) | **مكتمل ومشترك** | `src/utils/animations.ts`, `src/scripts/page-entrance.ts`, `src/styles/animations.css` | يعمل على المسارات الإنجليزية والعربية مع احترام `prefers-reduced-motion`. |
| خريطة الموقع والسيو (`sitemap.xml` & `hreflang`) | **مكتمل — يحتاج تحقق إضافي** | `src/pages/sitemap.xml.ts`, `src/i18n/metadata.ts` | `sitemap.xml` يخرج `110` رابطاً (`55` عربي + `55` إنجليزي) مع `xhtml:link` المتبادل (`ar`, `en`, `x-default`). |
| اختبارات الوحدة (`src/scripts/*.test.ts`) | **مكتمل ومجتاز (77/77)** | `src/scripts/*.test.ts` | جميع الاختبارات الـ 77 تعمل بنجاح عبر `tsx --test`. |
| اختبارات `test/*.test.mjs` القديمة | **5 إخفاقات معروفة ناتجة عن إعادة هيكلة Views** | `test/email-relay.test.mjs`, `test/meta-pixel.test.mjs` | تقرأ `src/pages/{cart,invoice,privacy-policy}.astro` مباشرةً التي صارت تغلف `src/components/views/*View.astro` و`<ConsentBanner locale={resolvedLang} />`. |
| التحقق عبر المتصفح الحقيقي (5 أبعاد شاشة + تدفقات كاملة) | **ناقص / غير مكتمل بعد** | Playwright Chromium | لم يُختبر بعد على المقاسات `430×932` و`768×1024` و`1024×768` ولا عبر جولة التحقق التفاعلية الكاملة (كميات السلة، الحذف، الفلاتر، البحث، الدفع والتحقق من الأخطاء، قائمة الجوال، `prefers-reduced-motion`). |
| التقرير النهائي المطلوب بجميع محاوره الـ 22 | **ناقص التحديث** | `DANDY_PHASE_11_FINAL_REPORT_AR.md` | النسخة الحالية موجزة ولا تغطي الأقسام الـ 22 المطلوبة ولا نتائج فحص الـ 5 أبعاد الكاملة. |

---

## 3. الملفات الحالية ومسؤولياتها (Existing Files & Responsibilities)

- **`src/i18n/`**:
  - `types.ts`, `config.ts`, `resolve-locale.ts`, `routes.ts`, `translator.ts`, `format.ts`, `metadata.ts`, `translation-check.ts`, `index.ts`: عقود اللغات، أولوية المسار `URL-first`، خريطة الـ 20 مساراً، محرك الترجمة، تنسيق العملات والأرقام، توليد `canonical` و`hreflang`، ومدقق الاكتمال.
  - `messages/{ar,en}.ts`: قواميس الواجهة الكاملة بـ 193 مفتاحاً في 20 نطاقاً.
  - `content/{ar,en}/{categories,products,articles}.ts` + `content/en/{homepage-studio,pink-friday}.ts` + `content/adapters.ts`: محولات العرض الأمامية المفصولة تماماً عن بيانات Firebase.
- **`src/components/views/*.astro` (20 ملفاً)**: عروض الصفحات المشتركة بين المسارين العربي والإنجليزي.
- **`src/pages/en/` (21 ملفاً) + `src/pages/404.astro` + `src/pages/sitemap.xml.ts`**: المسارات العامة للمتجر الإنجليزي ومعالجة 404 وخريطة الموقع ثنائية اللغة.
- **`src/components/layout/` و`src/components/home/` و`src/components/catalog/` و`src/components/commerce/`**: مكونات الواجهة المشتركة المعتمدة على الخصائص المنطقية `RTL`/`LTR` و`LanguageSwitcher.astro`.

---

## 4. ما تم إنجازه وما تبقّى من فجوات وتراجعات مكتشفة

### أ. الأعمال المكتملة المحافظ عليها:
- استخراج عروض الصفحات الـ 20 في `src/components/views/` وبناء كافة صفحات `/en/` الـ 21 مع تحويل `/en/offers` بـ `301`.
- إتمام ترجمة 193/193 مفتاح واجهة، 4/4 تصنيفات، 32/32 منتجاً نشطاً، و8/8 مقالات منشورة.
- إصلاح `localizeInternalStoreHref` و`account.ts` (`invoiceHref`/`trackHref`) وتفعيل بوابة النشر وتحديث `sitemap.xml.ts` و`localization.test.ts`.

### ب. العيوب والانحدارات المكتشفة أثناء التدقيق الفعلي (Detected Defects / Regressions):
1. **تسريب نص عربي في `/en/pink-friday`:** دالة `resolveLocalizedPinkFridayCampaign` في `src/i18n/content/adapters.ts` لم تحدّث `visuals.subtitle` من `overlay.subtitle`، مما أظهر النص العربي الوارد من RTDB على `/en/pink-friday`.
2. **كلمات `keywords` و`__PINK_FRIDAY_CONFIG` في `src/layouts/BaseLayout.astro`:** القيمة الافتراضية لـ `keywords` في `BaseLayout.astro` ما زالت تحتوي على كلمات عربية حتى عند `pathLocale === 'en'`، وكائن `window.__PINK_FRIDAY_CONFIG` يُحقن بالنسخة العربية الخام بدلاً من المترجمة عند `resolvedLang === 'en'`.
3. **5 إخفاقات في `test/email-relay.test.mjs` و`test/meta-pixel.test.mjs`:** بسبب اعتماد الاختبارات القديمة على مسارات الملفات قبل استخراج `src/components/views/` وعلى `<ConsentBanner />` بدون خاصية `locale`.
4. **قصور التغطية الاختبارية بالمتصفح:** لم تُنفذ بعد جولات التحقق عبر المقاسات الخمسة (`390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`) واختبار دورة السلة والدفع والبحث وقائمة الجوال وتقليل الحركة كاملةً.

---

## 5. خطة التنفيذ المعتمدة على الاعتماديات (Dependency-Aware Execution Plan)

1. **المرحلة B/E — معالجة التسريبات المكتشفة:**
   - تحديث `resolveLocalizedPinkFridayCampaign` في `src/i18n/content/adapters.ts` لتغطية `visuals.subtitle`.
   - تحديث `src/layouts/BaseLayout.astro` لتمرير `keywords` إنجليزية افتراضياً عند `pathLocale === 'en'` وتطبيق `resolveLocalizedPinkFridayCampaign` على `window.__PINK_FRIDAY_CONFIG` عند `resolvedLang === 'en'`.
   - إضافة اختبار وحدة في `src/scripts/localization.test.ts` يتحقق من عدم تسرب `visuals.subtitle` العربية في Pink Friday الإنجليزية.
2. **المرحلة H — إعادة التحقق الشامل (Unit + Build + Lint + Browser 5-Viewport Matrix):**
   - إعادة فحص جميع مسارات `/en/` الـ 26 عبر HTTP للتأكد من خلوها التام (`0`) من أي نص عربي متسرب في الـ HTML و`<head>`.
   - تشغيل `npx --yes tsx --test src/scripts/*.test.ts` و`compile_applet` و`lint_applet`.
   - تشغيل فحص متصفح Chromium حقيقي عبر `playwright-cli` على المقاسات الخمسة (`390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`) لكلا اللغتين (`ar` و`en`) والتحقق من:
     - مبدّل اللغة (ديسكتوب + قائمة الجوال)، السلة (إضافة، تعديل كمية، حذف، حساب الإجمالي)، التحقق من نموذج الدفع، البحث والفلاتر، لافتة الخصوصية (`ConsentBanner`)، حركات الدخول و`prefers-reduced-motion`، وانعدام التمرير الأفقي وأخطاء الكونسول.
3. **المرحلة I — التحقق النهائي من البصمات وإصدار التقرير الشامل:**
   - التحقق النهائي من بصمات `SHA-256` لجميع الملفات المحمية.
   - إصدار `DANDY_PHASE_11_FINAL_REPORT_AR.md` متضمناً جميع الأقسام الـ 22 المطلوبة بدقة تامة دون تنفيذ أي `git commit` أو `git push`.
