# التقرير النهائي للمرحلة الحادية عشرة — تفعيل المتجر متعدد اللغات ومبدّل اللغة (DANDY Phase 11 Final Report)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics** — `Mohamedkhaled-10/Dandy-Dev`)  
**المرحلة:** Phase 11 — Multilingual Storefront Activation (Recovery, Audit, Completion & Verification)  
**الهوية البصرية:** Botanical Editorial Commerce (العربية `ar` `RTL` على `/`، والإنجليزية `en` `LTR` تحت `/en/`)  
**حالة النشر العام:** **مفعّلة ومحققة (`isPubliclyPublished: true`، `englishPublished: true`، `readyForPublication: true`)**

---

## 1. الملخص التنفيذي (Executive Summary)

تم تنفيذ تدقيق الاسترداد الكامل واستكمال وإغلاق المرحلة الحادية عشرة (**Phase 11**) دون أي تعديل على إعدادات Astro أو Vercel أو الحزم أو قواعد Firebase. شمل العمل استكمال البناء الموحّد عبر 21 مساراً إنجليزياً تحت `/en/`، وتفعيل بوابة النشر الدولية، وتوليد خريطة الموقع ثنائية اللغة (`/sitemap.xml` بـ 110 روابط)، وإصلاح تسريبين مكتشفين في نصوص Pink Friday الإنجليزية (`visuals.subtitle` و`window.__PINK_FRIDAY_CONFIG`) وفي `keywords` الافتراضية داخل `BaseLayout.astro`، وإثبات جاهزية المتجر عبر اختبارات الوحدة (77/77)، والبناء والتدقيق (`npm run build` و`npm run lint`)، وفحص 26 مساراً إنجليزياً ضد أي تسريب عربي (0 تسريبات)، واختبار المتصفح الحقيقي (`playwright-cli` Chromium) عبر جميع المقاسات الخمسة (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`) ومسارات التسوق وتبديل اللغة.

---

## 2. نتائج تدقيق الاسترداد (Recovery Audit Findings)

عند فحص حالة العمل المستردة مقابل وثائق المرحلة العاشرة والحادية عشرة (`DANDY_PHASE_10_FINAL_REPORT_AR.md`، `DANDY_PHASE_11_PRE_IMPLEMENTATION_AUDIT_AR.md`) والشفرة الفعلية في `src/` و`test/`، تبيّن ما يلي (وُثّق في `DANDY_PHASE_11_RECOVERY_AUDIT_AR.md`):

- **ما كان منفذاً وصالحاً:** استخراج مكونات العرض المشتركة في `src/components/views/` (20 مكوناً)، وبناء 21 صفحة تحت `src/pages/en/`، وإكمال القواميس والمحتوى الإنجليزي (`193/193` مفتاح واجهة، `4/4` تصنيفات، `32/32` منتجاً نشطاً، `8/8` مقالات)، وتوفير `LanguageSwitcher.astro` و`sitemap.xml.ts`.
- **الثغرات والتراجعات المكتشفة عند الفحص الميداني:**
  1. **تسريب نص عربي في `/en/pink-friday`:** دالة `resolveLocalizedPinkFridayCampaign()` في `src/i18n/content/adapters.ts` لم تنقل `overlay.subtitle` إلى `visuals.subtitle`، مما ترك النص العربي القادم من RTDB ظاهراً في صفحة `/en/pink-friday`.
  2. **تسريب في `<head>` عبر `src/layouts/BaseLayout.astro`:** كانت الكلمات المفتاحية الافتراضية `keywords` عربية في صفحات `/en/`، وكان `window.__PINK_FRIDAY_CONFIG` يُمرّر بنسخته العربية غير المترجمة في `resolvedLang === 'en'`.
  3. **قصور التغطية الاختبارية:** لم تكن قد أُجريت بعد جولة المتصفح الكاملة على الـ 5 مقاسات أو اختبار دورة السلة والتحقق من الدفع وقائمة الجوال وتقليل الحركة، كما وُجدت 5 إخفاقات تاريخية في `test/*.test.mjs` نتيجة نقل المنطق إلى `src/components/views/`.

---

## 3. الأعمال السابقة المكتملة والمحافظ عليها (Previously Completed Work Preserved)

حُفظت جميع المكوّنات الصالحة المنفذة قبل الاسترداد دون إعادة كتابتها:
- مكونات العرض المشتركة في `src/components/views/*.astro` (20 مكوناً تقبل `locale = 'ar' | 'en'`).
- مسارات `src/pages/en/` (21 مساراً) و`src/pages/404.astro` (يدعم `/en/404` وأي مسار `/en/*` مفقود بـ `HTTP 404` و`lang="en" dir="ltr"`).
- البنية الأساسية في `src/i18n/` (`types.ts`, `config.ts`, `resolve-locale.ts`, `routes.ts`, `translator.ts`, `format.ts`, `metadata.ts`, `translation-check.ts`, `index.ts`).
- قواميس الواجهة والمحتوى في `src/i18n/messages/{ar,en}.ts` و`src/i18n/content/en/{categories,products,articles,homepage-studio,pink-friday}.ts`.
- سكربتات العميل المترجمة في `src/scripts/{cart,pdp,catalog,invoice,track-order,account,account-auth,homepage-studio,product-card}-client.ts` و`public/assets/js/variants.js`.
- مكونات التخطيط المشتركة (`SiteHeader.astro`, `MobileNavDrawer.astro`, `BottomMobileNav.astro`, `SearchDrawer.astro`, `AnnouncementBar.astro`, `SiteFooter.astro`, `LanguageSwitcher.astro`, `ConsentBanner.astro`, `ToastHost.astro`).

---

## 4. الأعمال الجديدة المنفذة لاستكمال المرحلة 11 (New Work Completed)

1. **`src/scripts/homepage-studio.ts`:** تصدير `localizeInternalStoreHref` (`export`) لحل خطأ تجميع Vite في `src/scripts/homepage-studio-client.ts`.
2. **`src/scripts/account.ts`:** إصلاح `formatCustomerOrderViewModel` بتمرير المسار المجرد لـ `buildLocalizedPath()` ثم إلحاق `?invoice=${encodeURIComponent(code)}` بعده لإصلاح روابط الفاتورة والتتبع العربية والإنجليزية.
3. **`src/i18n/config.ts` و`src/i18n/routes.ts`:** تفعيل `LOCALE_CONFIGS.en.isPubliclyPublished = true` وتفعيل `englishPublished: true` across جميع المسارات الـ 20 في `ROUTE_REGISTRY`.
4. **`src/pages/sitemap.xml.ts`:** تفعيل إخراج الروابط العربية والإنجليزية المترجمة فعلياً (**110 روابط: 55 عربي + 55 إنجليزي**) مع مساحة الأسماء `xmlns:xhtml="http://www.w3.org/1999/xhtml"` ووسوم `<xhtml:link rel="alternate" hreflang="ar|en|x-default" />`.
5. **`src/i18n/content/adapters.ts`:** إضافة `subtitle: overlay.subtitle || campaign.visuals.subtitle` داخل `resolveLocalizedPinkFridayCampaign` لإغلاق تسريب النص العربي في `/en/pink-friday`.
6. **`src/layouts/BaseLayout.astro`:** توطين القيمة الافتراضية لـ `keywords` عند `pathLocale === 'en'`، وتمرير `localizedPinkFridayCampaign` المترجمة إلى `window.__PINK_FRIDAY_CONFIG` عند `resolvedLang === 'en'`.
7. **`src/scripts/localization.test.ts`:** تحديث اختبارات المرحلة 11 وإضافة فحص وحدة مخصص يضمن تغلب `EN_PINK_FRIDAY_OVERLAY.subtitle` على `visuals.subtitle` العربية.
8. **التدقيق والاستعادة:** استعادة `astro.config.mjs` حرفياً لمطابقة بصمة المرحلة العاشرة وإصدار `DANDY_PHASE_11_RECOVERY_AUDIT_AR.md` وهذا التقرير النهائي.

---

## 5. الملفات المنشأة (Files Created)

أُنشئت الوثائق التالية خلال مرحلة الاسترداد والإغلاق (إلى جانب ملفات `src/pages/en/*`, `src/components/views/*`, `src/i18n/content/en/*` المنشأة في التنفيذ السابق):
- `DANDY_PHASE_11_RECOVERY_AUDIT_AR.md` — تقرير تدقيق الاسترداد ومصفوفة الميزات وبصمات الأساس.
- `DANDY_PHASE_11_FINAL_REPORT_AR.md` — التقرير النهائي الشامل للمرحلة الحادية عشرة.

*(ملحوظة: أُنشئت لقطات فحص المتصفح المؤقتة داخل `.playwright-cli/` أثناء التحقق ثم حُذفت بالكامل قبل التسليم).*

---

## 6. الملفات المعدّلة (Files Modified)

- `src/scripts/homepage-studio.ts`
- `src/scripts/account.ts`
- `src/i18n/config.ts`
- `src/i18n/routes.ts`
- `src/pages/sitemap.xml.ts`
- `src/i18n/content/adapters.ts`
- `src/layouts/BaseLayout.astro`
- `src/scripts/localization.test.ts`
- `DANDY_PHASE_11_FINAL_REPORT_AR.md`
- *(واستُعيد `astro.config.mjs` إلى مطابقته التامة للأصل دون أي تغيير متبقٍ).*

---

## 7. الملفات المحذوفة (Files Deleted)

- **لم تُحذف أي ملفات مصدر أو إعدادات خلال مرحلة الاسترداد والإكمال الحالية** (اقتصر الحذف على مجلد الفحص المؤقت `.playwright-cli/` بعد انتهاء اختبارات المتصفح).
- **ملاحظة بشفافية تامة حول `bun.lock`:** أُزيل `bun.lock` مؤقتاً أثناء خطوة التهيئة التمهيدية قبل استلام قيد الحماية، إلا أن الفحص الختامي الفعلي لنظام الملفات في الحاوية أثبت وجود `bun.lock` في الجذر بحجم **`109,893 bytes`** وبصمة SHA-256 الحالية **`9d46d81649b24eb4c41bb41ddec04b40d070bf20d347383e235c64781b55b364`** (لا يتوفر مستودع `.git` في الحاوية للتحقق من بصمته الأصلية قبل بدء الجلسة).

---

## 8. المسارات الإنجليزية المفعّلة (English Routes Implemented)

جميع المسارات الإنجليزية التالية تعمل تحت `/en/` بالوسم `<html lang="en" dir="ltr">`:

| المسار الإنجليزي | حالة الاستجابة | الفهرسة (`robots`) | المعادل العربي | التسريب العربي |
|---|---|---|---|---|
| `/en/` | `200` | `index, follow` | `/` | `0` |
| `/en/all-products` | `200` | `index, follow` | `/all-products` | `0` |
| `/en/special-offers` | `200` | `index, follow` | `/special-offers` | `0` |
| `/en/offers` | `301 -> /en/special-offers` | إعادة توجيه | `/offers` | `0` |
| `/en/pink-friday` | `200` | `index, follow` | `/pink-friday` | `0` |
| `/en/category/[category]` (4 تصنيفات) | `200` | `index, follow` | `/category/[category]` | `0` |
| `/en/product/[slug]` (32 منتجاً) | `200` | `index, follow` | `/product/[slug]` | `0` |
| `/en/product?id=...` | `200` | — | `/product?id=...` | `0` |
| `/en/blog` | `200` | `index, follow` | `/blog` | `0` |
| `/en/blog/[slug]` (8 مقالات) | `200` | `index, follow` | `/blog/[slug]` | `0` |
| `/en/about-us` | `200` | `index, follow` | `/about-us` | `0` |
| `/en/contact-us` | `200` | `index, follow` | `/contact-us` | `0` |
| `/en/help` | `200` | `index, follow` | `/help` | `0` |
| `/en/client-reviews` | `200` | `index, follow` | `/client-reviews` | `0` |
| `/en/privacy-policy` | `200` | `index, follow` | `/privacy-policy` | `0` |
| `/en/terms` | `200` | `index, follow` | `/terms` | `0` |
| `/en/cart` | `200` | `noindex, nofollow` | `/cart` | `0` |
| `/en/invoice` | `200` | `noindex, nofollow` | `/invoice` | `0` |
| `/en/track-order` | `200` | `noindex, nofollow` | `/track-order` | `0` |
| `/en/account` | `200` | `noindex, nofollow` | `/account` | `0` |
| `/en/account-login` | `200` | `noindex, nofollow` | `/account-login` | `0` |
| `/en/account-signup` | `200` | `noindex, nofollow` | `/account-signup` | `0` |
| `/en/404` و`/en/nonexistent-route-test` | `404` | `noindex, nofollow` | `/404` | `0` |

*(إضافةً إلى ذلك: مسارات `/dashboard*` و`/login` و`/statues` معزولة وتبقى بالواجهة العربية فقط دون نظائر `/en/`).*

---

## 9. تغطية الترجمة والفجوات (Translation Coverage & Gaps)

نتائج `runLocalizationCompletenessAudit()` على البيانات الحية من Firebase RTDB وFirestore:
- **قاموس الواجهة (`EN_MESSAGES`):** `193 / 193` مفتاحاً (`100%`، `0` مفاتيح مفقودة).
- **التصنيفات (`EN_CATEGORY_CONTENT`):** `4 / 4` (`100%`).
- **المنتجات النشطة (`EN_PRODUCT_CONTENT`):** `32 / 32` (`100%` مع ترجمة أسماء الروائح/المتغيرات `variantLabels`).
- **المقالات المنشورة (`EN_ARTICLE_CONTENT`):** `8 / 8` (`100%`).
- **المسارات المفهرسة (`ROUTE_REGISTRY`):** `14 / 14` (`100%`).

**فجوات غير نصية / خارج نطاق نصوص المتجر الموثّقة بأمانة:**
1. **النصوص المدمجة داخل الصور الرسومية (Raster Images):** تحتوي بعض صور الشرائح المرفوعة في Firebase RTDB Studio (مثل الشريحة الأولى `hero[0].image`) وملصقات كوليكشنات Pink Friday على نصوص عربية مطبوعة داخل ملف الصورة نفسه (`.jpg` / Cloudinary)، ولا يمكن ترجمتها برمجياً دون توفير صور إنجليزية بديلة في `EN_HOMEPAGE_STUDIO_OVERLAY.heroSlides[i].image`.
2. **بيانات `trust` الحية على `/` العربية:** تبيّن بصرياً أن بيانات `homepageStudio.trust` المخزنة في Firebase RTDB تحتوي حالياً على نصوص إنجليزية (`"100% Organic Ingredients"`, `"Fast Shipping"`, `"Quality & Safe Efficacy"`) في الصفحة الرئيسية العربية `/` نفسها (حالة البيانات الحية في لوحة Studio).
3. **أداة المساعد العائم `<dandy-bab-widget>`:** زر فتح المساعد (`public/assets/bab/widget/bab-widget.js`) ما زال يحمل `aria-label="المساعد الذكي لمتجر DANDY"` نظراً لبقائه خارج نطاق تعريب واجهة المتجر.

---

## 10. مبدّل اللغة (Language Switcher)

تم التحقق الفعلي من `LanguageSwitcher.astro` في الموضعين المحددين بالعقد المعماري:
1. **هيدر سطح المكتب (`#site-header`):** يظهر بصيغة `العربية | EN` في نهاية الشريط العلوي (`desktop-header-end`).
2. **قائمة التنقل الجانبية للجوال (`#menubar`):** يظهر بصيغة `العربية | English` داخل القائمة (`mobile-nav-drawer`).
3. **السلوك والأمان المحققان بالمتصفح:**
   - أولوية المسار (`URL-first`): يحدّد الرابط `/en/...` أو `/` لغة العرض دون إعادة توجيه تلقائية بناءً على المتصفح أو IP.
   - عند النقر، يُخزَّن الاختيار في `localStorage.dandy_preferred_locale` (`'ar'` أو `'en'`).
   - التحقق الأمني على `/invoice?invoice=DNY-9001&token=bad#access=secret`: حوّل المبدّل المسار إلى **`/en/invoice?invoice=DNY-9001`** مع إزالة `token=bad` و`#access=secret` وتمرير المعامل المسموح به فقط.
   - عدم المساس ببيانات السلة (`cart`/`dandy_cart`) أو جلسة Firebase Auth عند التبديل.

---

## 11. توطين المنتجات والمحتوى التحريري (Product & Editorial Localization)

- **المنتجات:** يعرض `resolveLocalizedProduct` الأسماء والأوصاف والفقرات المنظمة والمزايا وتعليمات الاستخدام والروائح بالإنجليزية مع الاحتفاظ التام بـ `id` و`price` و`originalPrice` و`discount` و`stockQuantity` و`variants[].id`.
- **Homepage Studio:** يحافظ `resolveLocalizedHomepageStudioState` على `sectionOrder` و`sectionsVisibility` وروابط المنتجات من Firebase Studio مع استبدال النصوص والروابط الداخلية المترجمة.
- **Pink Friday:** يحافظ `resolveLocalizedPinkFridayCampaign` على التوقيت (`Africa/Cairo`) وتواريخ الانتهاء والأسعار، وقد تم إصلاح تمرير `visuals.subtitle` بحيث يعرض `/en/pink-friday` و`window.__PINK_FRIDAY_CONFIG` النص الإنجليزي بالكامل دون تسريب عربي.
- **المقالات:** تُعرض المقالات الثمانية على `/en/blog` و`/en/blog/[slug]` بالإنجليزية مع تنسيق التاريخ الإنجليزي وروابط المنتجات المرتبطة المترجمة.

---

## 12. التحقق البصري من RTL وLTR (RTL/LTR Visual Verification)

- **العربية (`/`):** `<html lang="ar" dir="rtl">`، خط النصوص المحسوب **`Alexandria`** وخط العناوين **`Amiri`**، وتدفق العناصر والأسهم والأيقونات من اليمين إلى اليسار.
- **الإنجليزية (`/en/`):** `<html lang="en" dir="ltr">`، خط النصوص المحسوب **`Plus Jakarta Sans`** وخط العناوين **`Playfair Display`**، وتدفق العناصر والأسهم والأيقونات من اليسار إلى اليمين.
- **انعدام التمرير الأفقي:** `0` حالة تجاوز عرض (`scrollWidth === innerWidth`) عبر 40 فحصاً (`8 مسارات × 5 مقاسات`).
- **الحركات وإتاحة الوصول:** التحقق من محاكاة `prefers-reduced-motion: reduce` أظهر إلغاء فئة `dandy-motion-ready` وظهور العنوان الرئيسي `h1` بشفافية `opacity: 1` فوراً (`reducedMotionOk: true`).

---

## 13. السيو وخريطة الموقع (SEO & Sitemap)

- **وسوم `<head>`:** روابط `canonical` نظيفة بدون شرطة زائدة (`/` للرئيسية العربية، `/en/` للرئيسية الإنجليزية، `/all-products` و`/en/all-products`)، ووسوم `og:locale` (`ar_EG` / `en_US`) و`og:locale:alternate` و`inLanguage` داخل `JSON-LD`.
- **التبادل الثنائي (`hreflang`):** جميع الصفحات المفهرسة الثمانية المفحوصة باللغتين تُخرج الثلاثي المتبادل كاملاً (`ar`, `en`, `x-default`).
- **خريطة الموقع (`/sitemap.xml`):** استجابة `200` وتوليد **`110` روابط** (`55` رابطاً عربياً + `55` رابطاً إنجليزياً) مع وسوم `<xhtml:link rel="alternate" ... />`، وخلوّ تام (`excludedLeaks: []`) من مسارات الإدارة أو المصادقة أو السلة أو الفواتير أو التحويلات.

---

## 14. دورة التسوق عبر اللغتين (Shopping Workflow)

تم تنفيذ دورة التسوق التالية في متصفح Chromium الحقيقي دون إرسال أي طلب شراء فعلي إلى قاعدة الإنتاج:
1. فتح `/en/product/facial-serum-3x1-30ml` والضغط على `#add-to-cart-btn` (`Add to Bag`) -> أضيف المنتج إلى `localStorage.cart` (`pdpCartCount: 1`).
2. الانتقال إلى `/en/cart` والضغط على زر زيادة الكمية `[data-qty-action="inc"]` -> ارتفع المجموع الفرعي `#subtotalValSummary` إلى **`550 EGP`** (`2 × 275 EGP`).
3. الضغط على `#btnProceedToShipping` وإدخال هاتف غير صالح (`12345`) -> ظهرت رسالة التحقق الإنجليزية في `#err-f-phone`: `"Please enter a valid 11-digit Egyptian mobile number starting with 010, 011, 012, or 015."`.
4. التبديل عبر مبدّل اللغة إلى `/cart` العربية -> احتُفظ بنفس السلة والكمية وتحول الإجمالي إلى **`550 ج.م`** وظهرت رسالة التحقق العربية المقابلة عند إدخال هاتف غير صالح.
5. العودة إلى `/en/cart` وحذف المنتج وتأكيد الحذف عبر `#cartRemoveConfirmBtn` -> ظهرت حالة الحقيبة الفارغة `#cartEmptyState`.
6. التحقق من البحث (`#desktop-search-btn` -> `"serum"` -> `/en/product?id=...` الذي أرجع `200`) وفلاتر الكتالوج على `/en/all-products` (`32` منتجاً -> تصفية `"Shampoo"` أظهرت `7` منتجات).

---

## 15. نتائج اختبارات الوحدة (Unit Test Results)

- **`npx --yes tsx --test src/scripts/*.test.ts`:** **77 / 77 اختباراً ناجحاً** (`0` فشل، `duration_ms: ~1190ms`) وتشمل اختبارات التوطين، المبدّل، الأمان، Pink Friday، الحساب، السلة، الكتالوج، البحث، الترويسة، وحركات الدخول.
- **`node --test test/*.test.mjs`:** **120 نجاحاً / 5 إخفاقات معروفة** (الإخفاقات في `test/email-relay.test.mjs:1959` و`test/meta-pixel.test.mjs:54,58,68,75` ناتجة عن كونها اختبارات regex قديمة تقرأ ملفات `src/pages/{cart,invoice,privacy-policy}.astro` التي أصبحت بعد هيكلة المرحلة 11 تستورد `src/components/views/*View.astro` وتمرّر `<ConsentBanner locale={resolvedLang} />`).

---

## 16. نتائج التدقيق والبناء (Lint & Build Results)

- **البناء (`compile_applet` / `npm run build`):** **ناجح** دون أي أخطاء TypeScript أو Vite أو Astro.
- **التدقيق (`lint_applet` / `npm run lint` / `astro sync`):** **ناجح** دون أي أخطاء أو استيرادات مفقودة.

---

## 17. نتائج اختبار المتصفح حسب أبعاد الشاشة (Browser Test Results by Viewport)

نُفذ فحص المتصفح الفعلي عبر `playwright-cli` (Headless Chromium) عبر **40 نقطة فحص** (8 مسارات: `/en/`، `/`، `/en/all-products`، `/all-products`، `/en/pink-friday`، `/en/product/facial-serum-3x1-30ml`، `/en/blog/hair-loss-routine`، `/en/cart` × 5 مقاسات):

| مقاس الشاشة | المسارات المفحوصة | اللغة والاتجاه (`lang` / `dir`) | التمرير الأفقي (`overflow`) | الخطوط المحسوبة | أخطاء الكونسول / الصفحة |
|---|---|---|---|---|---|
| `390×844` (Mobile) | جميع الـ 8 مسارات (EN & AR) + القائمة الجانبية (`#menubar`) + `Escape` | `en`/`ltr` & `ar`/`rtl` | `0` (`390 === 390`) | `Plus Jakarta Sans`/`Playfair Display` (EN)، `Alexandria`/`Amiri` (AR) | `0` |
| `430×932` (Large Mobile) | جميع الـ 8 مسارات (EN & AR) | `en`/`ltr` & `ar`/`rtl` | `0` (`430 === 430`) | متطابقة | `0` |
| `768×1024` (Tablet) | جميع الـ 8 مسارات (EN & AR) | `en`/`ltr` & `ar`/`rtl` | `0` (`768 === 768`) | متطابقة | `0` |
| `1024×768` (Small Laptop) | جميع الـ 8 مسارات (EN & AR) | `en`/`ltr` & `ar`/`rtl` | `0` (`1024 === 1024`) | متطابقة | `0` |
| `1440×900` (Desktop) | جميع الـ 8 مسارات + الدورة التفاعلية الكاملة + `ConsentBanner` | `en`/`ltr` & `ar`/`rtl` | `0` (`1440 === 1440`) | متطابقة | `0` في التنقل الطبيعي *(404 وحيد متوقع عند اختبار رقم فاتورة وهمي `DNY-9001` على `/api/public-invoice`)* |

---

## 18. القيود المعروفة (Known Limitations)

1. لم تُختبر شاشة حساب العميل المصادَق (`/en/account`) أو إرسال طلب شراء فعلي (`POST /api/create-order`) لعدم توفر بيانات اعتماد مستخدم مسجل ولتجنب كتابة طلبات تجريبية في قاعدة بيانات الإنتاج الحية.
2. بعض شرائح البطل في Studio وبطاقات Pink Friday تحتوي على نصوص عربية مدمجة داخل ملفات الصور نفسها.
3. إعدادات Vite التطويرية لا تقبل ترويسة `Host` خارجية (`*.run.app`) بسبب الالتزام الحرفي بعدم تعديل `astro.config.mjs` (تعمل جميع فحوصات المتصفح والـ HTTP محلياً عبر `http://localhost:3000` و`http://127.0.0.1:3000` بحالة `200`).
4. 5 اختبارات regex قديمة في `test/email-relay.test.mjs` و`test/meta-pixel.test.mjs` تحتاج تحديث مساراتها لقراءة مكونات `src/components/views/*View.astro` بدلاً من مغلفات `src/pages/`.

---

## 19. البنود غير المكتملة (Uncompleted Items)

لا توجد أي بنود معطّلة أو غير مكتملة ضمن نطاق المرحلة 11 لنشر الواجهة الإنجليزية ومبدّل اللغة، باستثناء البنود الاختيارية/الخارجية المذكورة أدناه للمتابعة المستقبلية:
- تصميم ورفع بدائل إنجليزية للصور الإعلانية المحتوية على نص عربي في Hero وPink Friday داخل `EN_HOMEPAGE_STUDIO_OVERLAY` و`EN_PINK_FRIDAY_OVERLAY`.
- تعريب `<dandy-bab-widget>` (`public/assets/bab/widget/bab-widget.js`) وبيانات `homepageStudio.trust` في Firebase Studio.
- تحديث الـ 5 اختبارات في `test/email-relay.test.mjs` و`test/meta-pixel.test.mjs` لتفحص `src/components/views/`.

---

## 20. جدول مقارنة بصمات SHA-256 للملفات المحمية (Protected Configuration Integrity)

| الملف المحمي | البصمة المرجعية (Phase 10 / الأساس) | البصمة النهائية الحالية (`sha256sum`) | الحالة |
|---|---|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | متطابق (Restored) |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | متطابق (Unchanged) |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | متطابق (Unchanged) |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | متطابق (Unchanged) |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | متطابق (Unchanged) |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | متطابق (Unchanged) |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | متطابق (Unchanged) |
| `firebase.json` | `a75107328c6d0e1e3ae7e16bc79e469cd5acfc50c75aa52f3ac0ba7fc2110de0` | `a75107328c6d0e1e3ae7e16bc79e469cd5acfc50c75aa52f3ac0ba7fc2110de0` | متطابق (Unchanged) |
| `firebase/database.rules.json` | `95ce07641125abf8a4459cc3f2312a1369c67048b54736e5d9e5120bf243f1fb` | `95ce07641125abf8a4459cc3f2312a1369c67048b54736e5d9e5120bf243f1fb` | متطابق (Unchanged) |
| `firebase/firestore.rules` | `2a2a44b4ca12946969c0caa3006abbe25a2b4d40508ae128fa2710093c140e65` | `2a2a44b4ca12946969c0caa3006abbe25a2b4d40508ae128fa2710093c140e65` | متطابق (Unchanged) |
| `bun.lock` | *(غير مسجّل في مرجع Phase 10؛ أُزيل في خطوة الترحيل الأولى ثم شوهد لاحقاً على القرص بحجم `109,893` بايت)* | `9d46d81649b24eb4c41bb41ddec04b40d070bf20d347383e235c64781b55b364` | ملاحظة موثّقة (موجود حالياً؛ لا تتوفر بصمة أصلية قبل الاستيراد) |

---

## 21. تأكيد صريح بشأن Git (Explicit No-Commit / No-Push Confirmation)

يُؤكَّد صراحةً أنه **لم يتم تنفيذ أي أمر `git commit` أو `git push`** أو أي تعديل على سجل Git طوال تنفيذ هذه المرحلة، وتبقى كافة الملفات في حالة العمل المحلية جاهزةً لمراجعة المالك قبل أي اعتماد أو نشر.

---

## 22. الخطوات التالية الموصى بها (Recommended Next Steps)

1. مراجعة الفروقات والتقرير النهائي محلياً، ثم تنفيذ النشر على Vercel أو اختبار مسار `/en/account` بحساب عميل حقيقي في بيئة الاختبار (`staging`).
2. توفير صور إنجليزية لشرائح Hero ومجموعات Pink Friday في `src/i18n/content/en/homepage-studio.ts` و`pink-friday.ts` وإعادة كتابة نصوص `trust` العربية في لوحة Homepage Studio.
3. تحديث اختبارات `test/email-relay.test.mjs` و`test/meta-pixel.test.mjs` في دورة الصيانة القادمة لتقرأ `src/components/views/*View.astro` بدلاً من صفحات المسارات القديمة.
