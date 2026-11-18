# تقرير تدقيق ما قبل الإطلاق — المرحلة التاسعة (DANDY Phase 9 Pre-Release Audit)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 9 — Final UI/UX Audit & Production Polish Only  
**الهوية البصرية:** Botanical Editorial Commerce (متجر عربي RTL أولاً)  
**بيئة الفحص:** الخادم المحلي (`http://localhost:3000`) + فحص الشيفرة المصدرية + فحص المتصفح الحقيقي (`playwright-cli` / Chromium) + اختبارات الوحدة  

---

## 1. ملخص نطاق التدقيق والضوابط الصارمة

تهدف المرحلة التاسعة إلى تنفيذ مراجعة نهائية شاملة للجودة وتجربة المستخدم والاتساق البصري والأداء وإتاحة الوصول عبر جميع مسارات العملاء قبل الإطلاق الرسمي، **دون إجراء أي إعادة تصميم، ودون إضافة متجر إنجليزي أو زر تبديل لغة، ودون تعديل أي ملفات بنية أو إعدادات أو عقود بيانات**.

### ضوابط الحماية التحققية (Protected Configuration Checksums)
تم فحص بصمات **SHA-256** لكافة ملفات الإعداد والبناء والنشر المحمية قبل البدء بأي تعديل:

| الملف المحمي | بصمة SHA-256 المرجعية المسجلة |
| --- | --- |
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` |

---

## 2. الجرد الكامل لمسارات التطبيق (Complete Route Inventory)

### أ. المسارات المواجهة للعملاء (25 مساراً فحصاً وتوثيقاً)
1. `/` — الصفحة الرئيسية المتزامنة مع Admin Studio (`src/pages/index.astro`)
2. `/all-products` — الكتالوج الكامل لجميع المنتجات (`src/pages/all-products.astro`)
3. `/category/[category]` — صفحات الأقسام الأربعة:
   - `/category/skin-care`
   - `/category/hair-care`
   - `/category/body-care`
   - `/category/fragrance`
4. `/special-offers` — صفحة العروض الخاصة والخصومات (`src/pages/special-offers.astro`)
5. `/pink-friday` — حملة ومجموعات Pink Friday (`src/pages/pink-friday.astro`)
6. `/product/[...slug]` — صفحة تفاصيل المنتج PDP (`src/pages/product/[...slug].astro`)
7. `/product` و`/product?id=...` — إعادة التوجيه التراثية للمنتج 301 / 404 (`src/pages/product.astro`)
8. `/cart` — السلة ومراحل الشحن وإتمام الطلب للضيف والمسجّل (`src/pages/cart.astro`)
9. `/invoice` — عرض وطباعة الفاتورة والجدول الزمني (`src/pages/invoice.astro`)
10. `/track-order` — تتبع حالة الطلب بكود الفاتورة ورقم الهاتف (`src/pages/track-order.astro`)
11. `/account-login` — تسجيل دخول العميلات (`src/pages/account-login.astro`)
12. `/account-signup` — إنشاء حساب جديد وربط الطلبات (`src/pages/account-signup.astro`)
13. `/account` — لوحة حساب العميلة الشخصية (`src/pages/account.astro`)
14. `/about-us` — عن داندي وقصة العلامة (`src/pages/about-us.astro`)
15. `/blog` — المدونة وفهرس المقالات (`src/pages/blog.astro`)
16. `/blog/[...slug]` — صفحة عرض المقال مع المنتجات المرتبطة (`src/pages/blog/[...slug].astro`)
17. `/post` و`/post?id=...` — إعادة التوجيه التراثية للمقالات 301 / 404 (`src/pages/post.astro`)
18. `/client-reviews` — آراء وتجارب العملاء المصورة والمرئية (`src/pages/client-reviews.astro`)
19. `/help` — مركز المساعدة والأسئلة الشائعة ودليل الهدايا (`src/pages/help.astro`)
20. `/contact-us` — قنوات التواصل وخدمة العملاء (`src/pages/contact-us.astro`)
21. `/privacy-policy` — سياسة الخصوصية (`src/pages/privacy-policy.astro`)
22. `/terms` — الشروط والأحكام (`src/pages/terms.astro`)
23. `/404` واختبار مسار غير موجود — صفحة الخطأ الموحدة (`src/pages/404.astro`)
24. `/?studio_preview=1` — معاينة Admin Studio الحية داخل الصفحة الرئيسية (`iframe` bridge)
25. مسارات تقنية متعلقة بالمتجر: `/sitemap.xml` و`/merchant-feed.xml`

### ب. مسارات الإدارة والواجهات الخلفية (خارج نطاق إعادة التصميم — تم التحقق من بقائها سليمة)
- لوحات الإدارة: `/login`، `/dashboard`، `/dashboard-index`، `/dashboard-product`، `/dashboard-order`، `/dashboard-blog`، `/dashboard-pink-friday`، `/statues`.
- واجهات API: `/api/create-order`، `/api/public-invoice`، `/api/order-status`، `/api/submit-review`، `/api/link-customer-orders`، `/api/product`، `/api/verify-turnstile`، `/api/send-telegram`، `/api/health`، إضافةً إلى `/api/admin/*` و`/api/pink-friday/*`.
- **ملحوظة هيكلية مكتشفة:** وجود ملف مكرر قديم باسم `src/pages/category/%5Bcategory%5D.astro` (413 سطراً) بجانب الملف الفعلي النشط `src/pages/category/[category].astro` (352 سطراً).

---

## 3. الشاشات وأحجام العرض التي تم فحصها (Viewports & Screens)

تم فحص الصفحات الأساسية والالتقاط البصري وفحص التمدد الأفقي (`scrollWidth - clientWidth`) عبر **الأبعاد الخمسة المطلوبة بالكامل**:
1. **`390×844`** (Mobile Standard): جميع مسارات العملاء الـ 25 — نسبة التمدد الأفقي = **0**، صور مكسورة = **0**.
2. **`430×932`** (Large Mobile): 12 مسار تسوق وتنقل أساسي — نسبة التمدد الأفقي = **0**، صور مكسورة = **0**.
3. **`768×1024`** (Tablet Portrait): 12 مساراً — نسبة التمدد الأفقي = **0**، صور مكسورة = **0**.
4. **`1024×768`** (Small Desktop / Tablet Landscape): 12 مساراً — نسبة التمدد الأفقي = **0**، صور مكسورة = **0**.
5. **`1440×900`** (Desktop Widescreen): جميع المسارات الـ 26 — نسبة التمدد الأفقي = **0**، صور مكسورة = **0**، معرّفات DOM مكررة (`dupIdRoutes`) = **0**، أخطاء JS غير معالجة (`pageErrors`) = **0**.

كما تم فحص لقطات الشاشة الفعلية بصرياً لـ: الصفحة الرئيسية (سطح المكتب والتابلت والموبايل)، الكتالوج بالموبايل، صفحة المنتج PDP (سطح المكتب والموبايل)، السلة بالموبايل، تتبع الطلب بالموبايل، تسجيل الدخول بالموبايل، المدونة بالموبايل، آراء العميلات بالموبايل، من نحن على سطح المكتب، مركز المساعدة بالموبايل، وصفحة 404 للمنتج التراثي.

---

## 4. نتائج فحص الرحلات الأساسية (Main Customer Journeys Findings)

| الرحلة | النتيجة الأولية | الملاحظات التفصيلية |
| --- | --- | --- |
| شريط الخصوصية والموافقة (`ConsentBanner`) | نجاح وظيفي مع ملاحظات UI/A11y | القبول يخفي الشريط ويُحفظ، لكنه يحمل أيقونات FA و`outline: none` وألوان وردية قديمة. |
| القائمة والبحث على سطح المكتب والموبايل | خلل متوسط في Dropdown سطح المكتب | Search Drawer وMobile Drawer (`#menubar.active`) يعملان ويستجيبان لـ `Escape`، لكن Hover + Click على أزرار القوائم المنسدلة يُغلق القائمة فور النقر! |
| رابط «تصفحي العروض» في الرئيسية | **خلل مرتفع (404)** | قسم العروض في `homepage-studio.ts` وبعض بيانات Studio يشير إلى `/offers` الذي يعيد HTTP 404 لأن الصفحة الحقيقية هي `/special-offers`. |
| الكتالوج والفلاتر وصفحات الأقسام | نجاح تام | إجمالي 32 منتجاً، البحث النصي (`غسول` = 2)، الفرز، ودرج الفلاتر `#dandyFilterDrawer` تعمل بسلاسة دون تجاوز أفقي. |
| صفحة المنتج PDP والمتغيرات والمفضلة | نجاح تام | تبديل المتغيرات (4 خيارات لـ Body & Hair Mist)، الإضافة إلى السلة، وظهور توست الضيف للمفضلة باللغة العربية يعمل بدقة. |
| Pink Friday والعروض الخاصة | نجاح تام | 16 كوليكشن نشط، مودال `#storefrontColModal` يفتح ويضيف الباقة للسلة بنجاح. |
| السلة ومراحل الشحن والدفع (باعتراض الشبكة) | نجاح تام | التحقق من الحقول الفارغة عند الخطوة 2، حساب شحن القاهرة `85 ج.م`، والتقاط `POST /api/create-order` بمكونين دون إنشاء طلب إنتاج حقيقي. |
| تتبع الطلب والفاتورة (مع بيانات محاكاة) | نجاح تام | التحقق من المدخلات الفارغة، إظهار حالة عدم وجود طلب، وعرض نتيجة التتبع والفاتورة (`DNY-P9INV` / `485 ج.م`) مع طباعة وتنسيق سليم. |
| نماذج الدخول وإنشاء الحساب | نجاح وظيفي (دون كتابة حساب حقيقي) | أزرار إظهار/إخفاء كلمة المرور ورسائل التحقق العربية تعمل بالكامل؛ لوحة `/account` محمية وتعيد التوجيه تلقائياً للزائر. |
| تكامل معاينة Admin Studio (`?studio_preview=1`) | نجاح تام | وجود `#dandy-home-studio-bootstrap` واستجابة `STUDIO_UPDATE_STATE` (`data.state`) بتحديث `<h1>` فوراً في المعاينة، وعمل `/dashboard-index` بـ HTTP 200. |
| آراء العميلات (`/client-reviews`) | خلل مرتفع | `object-fit: cover` يقتطع أطراف النصوص في صور المحادثات (`reviews-mobile.png`)، وغياب error/timeout fallback لـ Firebase RTDB. |

---

## 5. نتائج فحص الأداء وإتاحة الوصول (Performance & Accessibility Findings)

### أ. مؤشرات الأداء المعملية المحلية (Local Lab Measurements @ 1440×900)
| المسار | TTFB | DOM Ready | LCP (معملي) | CLS |
| --- | --- | --- | --- | --- |
| `/` | 180 ms | 1098 ms | 680 ms | 0.0303 |
| `/all-products` | 29 ms | 475 ms | 1064 ms | 0.0153 |
| `/product/facial-serum-3x1-30ml` | 55 ms | 472 ms | 364 ms | 0.0069 |
| `/cart` | 28 ms | 274 ms | 448 ms | 0.0260 |

*التقييم:* جميع القيم ضمن الحدود الممتازة (`LCP < 2500ms` و`CLS < 0.1`)، ولا توجد عوائق تحميل أو حركات ثقيلة.

### ب. إتاحة الوصول وحركات المرحلة السابعة (Accessibility & Phase 7 Motion)
- `prefers-reduced-motion: reduce`: العنوان الرئيسي وباقي العناصر تظهر فوراً بـ `opacity: 1` دون تأخير.
- اختبارات اتجاه العرض العكسي (`dir="ltr"`): تجاوز أفقي = `0` على المسارات الرئيسية الأربعة (`/`، `/all-products`، `/product/...`، `/cart`).
- التصفح بلوحة المفاتيح (`Tab`): حلقة التركيز `:focus-visible` تعمل وتظهر (`outlineStyle: solid`) على الروابط العامة، **باستثناء أزرار `ConsentBanner`** التي ألغت `outline: none`.
- تسرّب رموز PUA الخاصة بـ Font Awesome في شجرة الإتاحة ضمن `ConsentBanner.astro` (``، ``) وفي `product.astro` (`fa-search`، `fa-th-large`).

---

## 6. قائمة المشاكل المكتشفة وتصنيف الخطورة (Issues & Severity Classification)

| المعرف | المشكلة | الملف / المسار | الخطورة | التصحيح المقترح المحدود |
| --- | --- | --- | --- | --- |
| `P9-01` | رابط «تصفحي العروض» وروابط `/offers` تؤدي إلى HTTP 404 | `src/pages/offers.astro` (مفقود)، `homepage-studio.ts` | **High** | إنشاء `src/pages/offers.astro` لإعادة توجيه 301 آمنة إلى `/special-offers` مع تمرير معاملات التتبع دون كسر بيانات Studio أو اختبارات الوحدة. |
| `P9-02` | اقتطاع نصوص لقطات العملاء في `/client-reviews` وتعليق التحميل عند فشل Firebase | `src/pages/client-reviews.astro` | **High** | استخدام `object-fit: contain` مع `--dandy-bg-stage` مثل `ReviewsHomeSection.astro`، وإضافة معالج أخطاء ومهلة زمنية `6.5s` مع زر إعادة المحاولة. |
| `P9-03` | تعارض `mouseenter` و`click` في القوائم المنسدلة للهيدر يغلق القائمة فور النقر | `src/components/layout/SiteHeader.astro` | **Medium** | تتبع فتح التمرير عبر `hoverOpenedAt` لمنع النقر المباشر فور التمرير (`< 450ms`) من إغلاق القائمة، مع حفظ جميع سلوكيات الفتح/الإغلاق الأخرى. |
| `P9-04` | أيقونات FA وإزالة `outline` وتدرجات وردية قديمة وخصائص `left/right` في شريط الموافقة | `src/components/ConsentBanner.astro` | **Medium** | التحول إلى Lucide `<Icon />` ورموز Botanical Editorial و`inset-inline` واستعادة `:focus-visible` بالكامل دون المساس بمنطق الموافقة أو `Meta Pixel`. |
| `P9-05` | واجهة 404 تراثية غير متسقة وتمرير `hideFooterTop` غير المستخدمة في `/product` | `src/pages/product.astro` | **Medium** | مواءمة واجهة 404 مع `.dandy-error-wrap` التحريرية واستبدال أيقونات FA بـ `<Icon />` وإزالة `hideFooterTop` مع الحفاظ التام على توجيه 301 وحالة 404. |
| `P9-06` | وجود ملف مسار قديم مكرر مشفّر بالاسم `src/pages/category/%5Bcategory%5D.astro` | `src/pages/category/%5Bcategory%5D.astro` | **Low** | حذف النسخة المكررة القديمة والاحتفاظ فقط بالملف النشط `src/pages/category/[category].astro`. |

---

## 7. خطة التنفيذ الآمنة (Prioritized Minimal Fix Plan)

1. معالجة المشاكل ذات الخطورة العالية أولاً (`P9-01` إنشاء إعادة التوجيه `/offers -> /special-offers`، ثم `P9-02` إصلاح عرض وصمود `/client-reviews`).
2. معالجة المشاكل المتوسطة الموضعية (`P9-03` تفاعل قوائم `SiteHeader`، `P9-04` شريط `ConsentBanner`، `P9-05` اتساق 404 في `product.astro`).
3. إزالة الملف المكرر المهجور `src/pages/category/%5Bcategory%5D.astro` (`P9-06`).
4. التحقق عبر اختبارات الوحدة، `npm run lint`، `npm run build`، إعادة تشغيل الخادم، واختبار التراجع البصري والوظيفي عبر المتصفح على كافة الأبعاد الخمسة، ثم مطابقة بصمات SHA-256 للملفات المحمية، وكتابة التقرير النهائي.
