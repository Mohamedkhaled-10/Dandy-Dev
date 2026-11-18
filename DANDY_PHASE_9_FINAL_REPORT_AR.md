# التقرير النهائي للمرحلة التاسعة — المراجعة النهائية لتجربة المستخدم وصقل الإطلاق (DANDY Phase 9 Final Report)

**المشروع:** متجر داندي لمستحضرات التجميل الطبيعية (**Dandy Cosmetics**)  
**المرحلة:** Phase 9 — Final UI/UX Audit & Production Polish Only  
**الهوية البصرية المعتمدة:** Botanical Editorial Commerce (عربي RTL أولاً)  
**تاريخ الاعتماد المحلي:** 2026-11-18  

---

## 1. الملخص التنفيذي (Executive Summary)

أُنجزت المرحلة التاسعة بوصفها مرحلة تدقيق نهائي وتلميع إنتاجي دون أي إعادة تصميم شاملة أو تعديل في البنية البرمجية الأساسية أو الإعدادات المحمية أو عقود الخلفية. شمل التدقيق جميع مسارات العملاء الـ 25، وجميع الأبعاد الخمسة المعتمدة (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`)، إلى جانب فحص رحلات التسوق، وتزامن **Admin Studio**، وحركات المرحلة السابعة، وإتاحة الوصول، وجودة الصور، والأداء المعملي.

أسفر التدقيق عن معالجة **6 قضايا فعلية مؤكدة** شملت إصلاح خطأ 404 عند التوجه إلى `/offers` عبر مسار إعادة توجيه دائم آمن `301 -> /special-offers`، ومعالجة تعارض التمرير والنقر في القوائم المنسدلة بالهيدر، وحل اقتطاع نصوص لقطات العملاء في `/client-reviews` وإضافة معالج أخطاء ومهلة زمنية احتياطية مع إعادة المحاولة، ومواءمة `ConsentBanner` وصفحة `/product` التراثية مع نظام التصميم التحريري وأيقونات `Lucide` وحلقات التركيز، وإزالة ملف المسار المكرر المهجور `src/pages/category/%5Bcategory%5D.astro`.

---

## 2. الجرد الكامل لمسارات التطبيق (Complete Route Inventory)

### أ. مسارات العملاء والمحتوى (25 مساراً فُحصت كلها)
| # | المسار | الملف المصدري | النوع / الحالة |
| --- | --- | --- | --- |
| 1 | `/` | `src/pages/index.astro` | الصفحة الرئيسية المتزامنة مع Studio |
| 2 | `/all-products` | `src/pages/all-products.astro` | الكتالوج الكامل (32 منتجاً) |
| 3 | `/category/skin-care` | `src/pages/category/[category].astro` | قسم العناية بالبشرة |
| 4 | `/category/hair-care` | `src/pages/category/[category].astro` | قسم العناية بالشعر |
| 5 | `/category/body-care` | `src/pages/category/[category].astro` | قسم العناية بالجسم |
| 6 | `/category/fragrance` | `src/pages/category/[category].astro` | قسم العطور والمعطرات |
| 7 | `/special-offers` | `src/pages/special-offers.astro` | العروض الخاصة والتخفيضات |
| 8 | `/offers` | `src/pages/offers.astro` (جديد) | إعادة توجيه `301` دائمة إلى `/special-offers` مع حفظ UTM |
| 9 | `/pink-friday` | `src/pages/pink-friday.astro` | حملة وباقات Pink Friday (16 كوليكشن) |
| 10 | `/product/[...slug]` | `src/pages/product/[...slug].astro` | صفحة تفاصيل المنتج PDP |
| 11 | `/product` / `?id=...` | `src/pages/product.astro` | إعادة توجيه 301 للمنتج الصالح / صفحة 404 |
| 12 | `/cart` | `src/pages/cart.astro` | السلة + الشحن + إتمام الطلب |
| 13 | `/invoice` | `src/pages/invoice.astro` | عرض وطباعة الفاتورة والجدول الزمني |
| 14 | `/track-order` | `src/pages/track-order.astro` | تتبع حالة الطلب |
| 15 | `/account-login` | `src/pages/account-login.astro` | تسجيل دخول العميلة |
| 16 | `/account-signup` | `src/pages/account-signup.astro` | إنشاء حساب جديد |
| 17 | `/account` | `src/pages/account.astro` | لوحة حساب العميلة (محمية بالمصادقة) |
| 18 | `/about-us` | `src/pages/about-us.astro` | عن داندي |
| 19 | `/blog` | `src/pages/blog.astro` | مدونة الجمال والعناية |
| 20 | `/blog/[...slug]` | `src/pages/blog/[...slug].astro` | تفاصيل المقال والمنتجات المرتبطة |
| 21 | `/post` / `?id=...` | `src/pages/post.astro` | إعادة توجيه 301 للمقال / صفحة 404 |
| 22 | `/client-reviews` | `src/pages/client-reviews.astro` | آراء وتجارب العملاء المصورة والمرئية |
| 23 | `/help` | `src/pages/help.astro` | مركز المساعدة والأسئلة الشائعة |
| 24 | `/contact-us` | `src/pages/contact-us.astro` | تواصل معنا وخدمة العملاء |
| 25 | `/privacy-policy`, `/terms`, `/404`, `/?studio_preview=1` | صفحات السياسات والخطأ ومعاينة Studio | سياسات الخصوصية والشروط و404 ومعاينة الاستوديو |

### ب. مسارات الإدارة، الخلفية، والتكامل التقني (محفوظة دون تغيير)
- المسارات الإدارية: `/dashboard`، `/dashboard-index`، `/dashboard-product`، `/dashboard-order`، `/dashboard-blog`، `/dashboard-pink-friday`، `/statues`، `/login`.
- الخرائط والتغذية: `/sitemap.xml`، `/merchant-feed.xml`.
- واجهات API: `/api/create-order`، `/api/public-invoice`، `/api/order-status`، `/api/submit-review`، `/api/link-customer-orders`، `/api/product`، `/api/verify-turnstile`، `/api/send-telegram`، `/api/health`، `/api/admin/*`، `/api/pink-friday/*`.

---

## 3. المشاكل المكتشفة (Issues Discovered)

1. **`P9-01` (High):** رابط «تصفحي العروض» في الرئيسية وبعض إعدادات Studio يقود إلى `/offers` الذي كان يرجع `HTTP 404`.
2. **`P9-02` (High):** صفحة `/client-reviews` كانت تستخدم `object-fit: cover` مما يقصّ حواف نصوص المحادثات العربية على الموبايل، كما خلت من معالج أخطاء Firebase والمهلة الاحتياطية (تظل على رسالة «جاري التحميل...» عند انقطاع RTDB).
3. **`P9-03` (Medium):** تعارض أحداث `mouseenter` و`click` في أزرار القوائم المنسدلة في `SiteHeader.astro` كان يغلق القائمة فور النقر عليها بالماوس.
4. **`P9-04` (Medium):** شريط الخصوصية `ConsentBanner.astro` كان يعتمد على أيقونات Font Awesome (تسرب رموز PUA)، و`outline: none` لإزالة حلقة التركيز، وتدرجات لونية وردية قديمة وخصائص `left/right`.
5. **`P9-05` (Medium):** صفحة 404 للمنتج التراثي (`src/pages/product.astro`) كانت تمرر خاصية مهجورة `hideFooterTop={false}` وتستخدم أيقونات FA وأزرار `#db2777` مختلفة عن نمط `.dandy-error-wrap` الموحد في `404.astro` و`post.astro`.
6. **`P9-06` (Low):** وجود ملف مسار قديم مكرر ومشفّر بالاسم (`src/pages/category/%5Bcategory%5D.astro`، 413 سطراً) بجانب المسار الفعلي النشط (`src/pages/category/[category].astro`).

---

## 4. المشاكل التي تم إصلاحها (Issues Fixed)

- **`P9-01`:** إنشاء `src/pages/offers.astro` كمسار SSR يقوم بإعادة توجيه دائم `301 Redirect` إلى `/special-offers` مع الحفاظ التام على معاملات التتبع (`utm_*`، `fbclid`، `gclid`). التحقق: `/offers?utm_source=p9` أعاد `/special-offers?utm_source=p9` بحالة `200 OK`.
- **`P9-02`:** تحديث `src/pages/client-reviews.astro` لاستخدام `object-fit: contain` مع حاشية `8px` على خلفية `--dandy-bg-stage` (مطابقة تامة لـ `ReviewsHomeSection.astro`)، وإضافة التحقق الآمن من الروابط، ومعالج خطأ Firebase، ومهلة `7000ms` مع زر «إعادة المحاولة». التحقق البصري أكد وضوح كامل نصوص المحادثات دون اقتصاص.
- **`P9-03`:** تحديث `initHeaderDropdowns()` في `src/components/layout/SiteHeader.astro` بتتبع `hoverOpenedAt` لمنع إغلاق القائمة عند النقر الفوري بعد الفتح بالتمرير (`< 500ms`) مع بقاء التبديل عند النقر المتعمد وإغلاق `Escape` والنقر الخارجي.
- **`P9-04`:** مواءمة `src/components/ConsentBanner.astro` مع رموز **Botanical Editorial** و`inset-inline`، واستبدال أيقونات FA بأيقونات `<Icon name="shield-check" />` و`<Icon name="check" />` من `Icon.astro`، واستعادة `:focus-visible` (`outline: 2px solid`), ودعم `prefers-reduced-motion`.
- **`P9-05`:** تحديث `src/pages/product.astro` لإزالة `hideFooterTop`، وتوحيد تصميم 404 مع `.dandy-error-wrap` التحريري وأزرار `dandy-btn--editorial` / `dandy-btn--outline` وأيقونات `Lucide`، مع الحفاظ التام على توجيه 301 للمنتجات الصالحة وحالة HTTP 404.
- **`P9-06`:** حذف الملف المكرر المهجور `src/pages/category/%5Bcategory%5D.astro` دون المساس بالملف النشط `src/pages/category/[category].astro`.

---

## 5. المشاكل المتروكة عمداً دون تغيير (Issues Intentionally Left Unchanged)

- بنية **Hero** وتخطيطه الاستجابي وتزامن **Admin Studio** في الرئيسية و`/dashboard-index`: محفوظة 100% وفق قرار التجميد التصميمي.
- منطق التسعير والشحن (عتبة الشحن المجاني فوق 2000 ج.م، تسعيرة المحافظات، عروض Pink Friday): محفوظة دون أي تعديل.
- صفحات لوحة الإدارة الداخلية (`/dashboard*`، `/statues`) وخلفية `/api/*` وقواعد Firebase: خارج نطاق التعديل في المرحلة التاسعة.
- عرض الصورة الواحدة في الكتالوج الحالي: جميع المنتجات الحالية في قاعدة البيانات تملك صورة رئيسية واحدة (`primaryImage`) دون صور معرض إضافية؛ وقد اختُبر منطق تعدد الصور عبر اختبارات الوحدة.
- المتجر الإنجليزي ومبدّل اللغة: مؤجل بالكامل للمشروع المستقل اللاحق.

---

## 6. الملفات التي تم إنشاؤها (Files Created)

1. `src/pages/offers.astro` — مسار إعادة توجيه دائم `301` من `/offers` إلى `/special-offers` مع الحفاظ على معاملات الحملة الإعلانية.
2. `DANDY_PHASE_9_PRE_RELEASE_AUDIT_AR.md` — تقرير التدقيق السابق للتنفيذ (تم كتابته قبل أي تعديل برمجي).
3. `DANDY_PHASE_9_FINAL_REPORT_AR.md` — هذا التقرير النهائي الشامل.

---

## 7. الملفات التي تم تعديلها (Files Modified)

1. `src/components/layout/SiteHeader.astro` — معالجة تفاعل التمرير والنقر في قوائم التصنيفات والعروض على سطح المكتب.
2. `src/pages/client-reviews.astro` — إصلاح اقتطاع لقطات التجارب (`object-fit: contain`) وإضافة معالجة أخطاء RTDB/المهلة وزر إعادة المحاولة.
3. `src/components/ConsentBanner.astro` — التحول إلى رموز Botanical Editorial، استخدام `<Icon />`، logical `inset-inline`، واستعادة `:focus-visible`.
4. `src/pages/product.astro` — توحيد واجهة 404 مع `.dandy-error-wrap` التحريرية وإزالة `hideFooterTop` وأيقونات FA.

---

## 8. الملفات المحذوفة مع التبرير (Files Deleted with Justification)

- `src/pages/category/%5Bcategory%5D.astro` — **المبرر:** نسخة مكررة قديمة ومهجورة (413 سطراً، ترجع لما قبل تحديث المرحلة 5) ناتجة عن ترميز اسمي مزدوج، وكانت تتجاور دون فائدة مع المسار الديناميكي الفعلي النشط `src/pages/category/[category].astro` (352 سطراً). لم يؤثر حذفها إطلاقاً على عمل أي رابط قسم (`/category/skin-care`, `hair-care`, `body-care`, `fragrance`).

---

## 9. نتائج اتساق التصميم العام (Global Design Consistency)

- **الحالة:** *Tested successfully (تم اختباره بنجاح)*.
- توحيد الألوان (`--dandy-bg-page`, `--dandy-bg-editorial`, `--dandy-bg-stage`, `--dandy-ink-primary`, `--dandy-accent-primary`) والخطوط (`Alexandria`, `Amiri`, `Playfair Display`) عبر جميع الصفحات بعد إصلاح `ConsentBanner` و`/product` 404 و`/client-reviews`.
- جميع أيقونات واجهة العميل أصبحت موحدة عبر `Icon.astro` و`icons.ts` دون تسرب PUA من Font Awesome.

---

## 10. نتائج التدقيق التجاوبي (Responsive Audit Results)

- **الحالة:** *Tested successfully (تم اختباره بنجاح)*.
- فُحصت الأبعاد الخمسة (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`) على المسارات الأساسية والصفحات المعدّلة، وظهر انسياب الشبكات والبطاقات والنماذج والأشرطة السفلية بدقة وبدون تداخل نصي أو قصّ عناصر.

---

## 11. نتائج التمدد الأفقي (Horizontal Overflow Results)

- **الحالة:** *Tested successfully (تم اختباره بنجاح)*.
- قياس `document.documentElement.scrollWidth - document.documentElement.clientWidth` أعاد **0px** تجاوز أفقي:
  - قبل الإصلاح: 26 مساراً على `1440×900` = `0` مشاكل، 25 مساراً على `390×844` = `0` مشاكل، 12 مساراً على `430×932` و`768×1024` و`1024×768` = `0` مشاكل.
  - بعد الإصلاح (اختبار التراجع الكامل): 7 مسارات محورية × 5 أبعاد (35 فحصاً) = `overflowIssues: []`.
  - اختبار الاتجاه العكسي `dir="ltr"` على 4 مسارات أساسية = `0` مشاكل.

---

## 12. اختبارات الهيدر والتنقل (Header & Navigation Tests)

- **قوائم سطح المكتب المنسدلة (`#nav-categories-trigger`, `#nav-offers-trigger`):** *Tested successfully* — التمرير يفتح القائمة (`hidden: false`)، النقر الفوري بعدها يبقيها مفتوحة (`hidden: false`)، والنقر المتعمد اللاحق يغلقها (`hidden: true`)، و`Escape` يغلقها ويعيد التركيز.
- **درج التنقل للموبايل (`#mobile-menu-trigger` / `#menubar`):** *Tested successfully* — يفتح (`#menubar.active`) ويغلق بـ `Escape`.
- **درج البحث (`SearchDrawer`):** *Tested successfully* — البحث عن `'سيروم'` أرجع `2` نتائج مطابقة، وإغلاق `Escape` أعاد التركيز لزر البحث.

---

## 13. اختبارات المنتجات والكتالوج والأقسام والحملات (Product & Catalog Tests)

- **الكتالوج (`/all-products`):** *Tested successfully* — 32 بطاقة منتج، والبحث الفوري عن `'غسول'` يظهر `2` منتجات مطابقة (`[data-catalog-item]:not([hidden])`). درج الفلترة بالموبايل `#dandyFilterDrawer` يفتح ويغلق عبر `Escape`.
- **صفحات الأقسام (`/category/*`) والعروض (`/special-offers`, `/offers`):** *Tested successfully* — تحميل سليم وتوجيه `/offers -> /special-offers` بـ 301 مع حفظ معاملات التتبع.
- **حملة Pink Friday (`/pink-friday`):** *Tested successfully* — 16 بطاقة كوليكشن نشطة، ونافذة `#storefrontColModal` تفتح وتؤكد الإضافة للسلة.

---

## 14. اختبارات صفحة تفاصيل المنتج (Product Detail Tests)

- **اختيار المتغيرات والإضافة للسلة (`/product/body-and-hair-mist`):** *Tested successfully* — عرض 4 خيارات للمتغير، التبديل السليم، والإضافة للسلة مع تحديث شارة السلة.
- **المفضلة للزائر (`/product/facial-serum-3x1-30ml`):** *Tested successfully* — يظهر تنبيه تسجيل الدخول المخصص بالعربية دون أخطاء.
- **معرض متعدد الصور في PDP:** *Tested with limitations* — جميع المنتجات الحية الحالية تملك صورة رئيسية واحدة فقط؛ التحقق الفعلي للعرض أُجري على المنتجات أحادية الصورة بينما غُطي سلوك التعددية عبر اختبارات الوحدة.

---

## 15. اختبارات السلة وإتمام الطلب للضيف (Cart & Guest Checkout Tests)

- **الخطوة 1 إلى 3 (`/cart`):** *Tested successfully (باستخدام اعتراض الشبكة لعدم إنشاء طلب إنتاج)* — تحديث الكمية والمجاميع، التحقق من الحقول الفارغة عند الخطوة 2، حساب شحن القاهرة `85 ج.م`، والتقاط حمولة `POST /api/create-order` (`interceptedItemCount: 2`) والانتقال لمسار الفاتورة دون إنشاء أي طلب فعلي في قاعدة البيانات.

---

## 16. اختبارات الفاتورة وتتبع الطلب (Invoice & Tracking Tests)

- **تتبع الطلب (`/track-order`):** *Tested successfully (مع محاكاة استعلام الطلب الناجح)* — التحقق من الحقول الفارغة (`#err-trackCode`), فحص حالة عدم العثور على الطلب من RTDB الحي (`#trackErrorBanner`), وعرض تفاصيل الطلب (`#resInvoiceCode: DNY-202699`, `#resTotal: 385 ج.م`) عبر محاكاة الاستعلام محلياً.
- **الفاتورة (`/invoice#access=...`):** *Tested successfully (مع محاكاة `POST /api/public-invoice`)* — إظهار البطاقة (`DNY-P9INV`, `485 ج.م`, الحالة `تم الشحن`) بنجاح دون أخطاء.

---

## 17. تغطية اختبارات الحساب والمصادقة (Account & Authentication Coverage)

- **صفحتا الدخول وإنشاء الحساب (`/account-login`, `/account-signup`):** *Tested successfully* — التحقق من حقول الإدخال الفارغة وإظهار رسائل الخطأ العربية (`#loginAlert`, `#signupAlert`) وتبديل إظهار/إخفاء كلمة المرور (`password <-> text`).
- **حماية `/account` وكتابة قاعدة البيانات بحساب مصادق:** *Tested with limitations* — جرى التحقق من إعادة توجيه الزائر غير المصادق إلى `/account-login`؛ أما قراءة/كتابة العناوين وتحديث الملف الشخصي للمستخدم المسجل فلم تُختبر مباشرةً لعدم توفر حساب اختباري حي، مع استيفاء التحقق من منطق الحساب عبر اختبارات الوحدة.

---

## 18. تغطية تكامل Admin Studio (Admin Studio Integration Coverage)

- **مسار الإدارة `/dashboard-index`:** *Tested successfully (تحقق جاهزية)* — استجاب المسار بحالة `HTTP 200 OK`.
- **معاينة البث الحي `/?studio_preview=1`:** *Tested successfully* — وُجد سكريبت التهيئة `#dandy-home-studio-bootstrap`، واستقبل الجسر رسالة `STUDIO_UPDATE_STATE` (`data.state`) وحدّث عنوان البانر الرئيسي `main h1` فوراً بالنص الجديد (`عنوان معاينة الاستوديو`)، بينما لم يجرِ نشر تغييرات إلى RTDB الحي التزاماً بقاعدة عدم تعديل البيانات الحية.

---

## 19. التحقق من حركات المرحلة السابعة (Phase 7 Animation Verification)

- **الحالة:** *Tested successfully*.
- مع `prefers-reduced-motion: reduce`: العنوان الرئيسي يبدأ بوضوح كامل `opacity: "1"` فور تحميل DOM، وتُلغى حركة دخول شريط الموافقة.
- مع الإعداد القياسي: تظهر العناصر العلوية ولا توجد أي أقسام عالقة على `opacity: 0` عبر جميع لقطات المتصفح.

---

## 20. نتائج إتاحة الوصول (Accessibility Findings)

- **الحالة:** *Tested successfully (مع تصحيح التباين والتركيز والأيقونات)*.
- استعادة `:focus-visible` لروابط وأزرار `ConsentBanner` (`acceptOutline: "solid"` عند التركيز).
- إزالة أيقونات FA الصامتة/الرمزية (PUA) في `ConsentBanner` و`product.astro` واستبدالها بأيقونات SVG متوافقة دلالياً (`aria-hidden="true"` للرموز التزيينية وتسميات عربية واضحة للروابط والأزرار).
- استخدام `<a>` و`<button>` الأصلية وعلامات `role="dialog"` و`aria-expanded` و`aria-live` بدقة في الأدراج والنوافذ المنبثقة.

---

## 21. نتائج الصور والأصول (Image & Asset Findings)

- **الحالة:** *Tested successfully*.
- صور مكسورة (`naturalWidth === 0`) = **0** عبر كافة مسارات العملاء على الأبعاد الخمسة.
- بعد إصلاح `/client-reviews`، باتت صور شهادات العملاء تستخدم `object-fit: contain` داخل حاوية `4/5` مع خلفية `--dandy-bg-stage` وآلية تراجع آمنة إلى شعار المتجر عند تعذر التحميل.

---

## 22. نتائج الأداء (Performance Findings)

- **الحالة:** *Tested successfully (قياسات معملية محلية عبر Chromium PerformanceObserver @ 1440×900)*:

| المسار | TTFB | DOM Ready | LCP (معملي) | CLS |
| --- | --- | --- | --- | --- |
| `/` | 180 ms | 1098 ms | 680 ms | 0.0303 |
| `/all-products` | 29 ms | 475 ms | 1064 ms | 0.0153 |
| `/product/facial-serum-3x1-30ml` | 55 ms | 472 ms | 364 ms | 0.0069 |
| `/cart` | 28 ms | 274 ms | 448 ms | 0.0260 |

*ملحوظة:* تمثل هذه الأرقام قياسات معملية محلية للتحقق من غياب أي تراجع في الأداء وليست قياسات حقول مستخدمين (RUM / CrUX).

---

## 23. نتائج الكونسول والشبكة (Console & Network Results)

- **الحالة:** *Tested successfully*.
- أخطاء JavaScript غير معالجة (`pageerror`) قبل وبعد الإصلاح = **0**.
- الطلبات غير المتوقعة ذات حالة `4xx/5xx` على مسارات العملاء الصالحة بعد الإصلاح = **0** (بما فيها إصلاح `/offers` الذي بات يعيد `301 -> /special-offers` بحالة `200`).
- اختبارات 404 المقصودة (`/non-existent-route-p9`, `/product?id=invalid-p9`) أرجعت `HTTP 404` رسمياً كما هو مطلوب.

---

## 24. نتائج اختبارات الوحدة (Unit Test Results)

- **الحالة:** *Tested successfully*.
- الأمر المنفذ بعد آخر تعديل: `npx --yes tsx --test src/scripts/*.test.ts`.
- النتيجة: **68 / 68** اختباراً ناجحاً (`pass 68`, `fail 0`, `skipped 0`).

---

## 25. نتائج التدقيق الساكن (Lint Results)

- **الحالة:** *Tested successfully*.
- تم تنفيذ التحقق (`npm run lint` / `astro sync` والفحص التابع لأداة `lint_applet`) بعد آخر تعديل على الشيفرة، وأنهى الفحص بنجاح تام (`[types] Generated 251ms` دون أي أخطاء).

---

## 26. نتائج البناء الإنتاجي (Build Results)

- **الحالة:** *Tested successfully*.
- تم تنفيذ البناء الكامل للمشروع (`npm run build` عبر أداة `compile_applet`) بعد آخر تعديل على الشيفرة، ونجح البناء الإنتاجي بالكامل دون أخطاء أو أعطال في الحزم أو المسارات.

---

## 27. التحقق من بصمات SHA-256 للملفات المحمية (Protected Config SHA-256 Verification)

تم التحقق الفعلي بعد انتهاء كافة التعديلات من تطابق جميع البصمات 100% مع القيم المرجعية:

| الملف المحمي | الحالة | SHA-256 المسجل والنهائي |
| --- | --- | --- |
| `astro.config.mjs` | مطابق تماماً (Unchanged) | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` |
| `vercel.json` | مطابق تماماً (Unchanged) | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` |
| `package.json` | مطابق تماماً (Unchanged) | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` |
| `tsconfig.json` | مطابق تماماً (Unchanged) | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` |
| `patch-env.cjs` | مطابق تماماً (Unchanged) | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` |
| `server.js` | مطابق تماماً (Unchanged) | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` |
| `.env.example` | مطابق تماماً (Unchanged) | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` |

---

## 28. القيود المعروفة (Known Limitations)

1. إرسال الطلب الفعلي (`POST /api/create-order`) اختُبر باعتراض الشبكة (Mocked response) لتفادي إنشاء طلبات وهمية في قاعدة البيانات الحية والتحقق الفعلي من خدمة Cloudflare Turnstile الخلفية يظل معتمداً على مفتاح الإنتاج.
2. المسارات المعتمدة على مستخدم مصادق (`/account` لإضافة العناوين والتقييمات وتحديث البيانات) اختُبرت على مستوى حماية الضيف واختبارات الوحدة المنطقية دون تسجيل دخول فعلي بحساب عميل.
3. صور المعرض متعدد الصور في PDP: لا يوجد منتج حي بأكثر من صورة حالياً، لذا اُختبر السلوك بصرياً على المنتجات أحادية الصورة وبرمجياً عبر اختبارات الوحدة.
4. قراءة `/api/public-invoice` وتحديث نتائج `/track-order` في الجلسة الختامية اختُبرت بمحاكاة حمولة استجابة نموذجية لتعذر الوصول إلى طلب إنتاج حقيقي بكود سري في البيئة المحلية.

---

## 29. البنود المؤجلة إلى مشروع تعدد اللغات (Deferred to Multilingual Project)

تُؤجل البنود التالية التزاماً صارماً بنطاق المرحلة التاسعة ولا تُنفذ حالياً:
- إنشاء المتجر الإنجليزي الكامل وتوجيهاته اللغوية (`EN / AR`).
- مبدّل اللغة في الهيدر أو الفوتر.
- ترجمة بيانات المنتجات والأقسام والمقالات ووصف SEO ثنائي اللغة و`hreflang`.
- تزامن السلة والحساب بين مسارات اللغة العربية والإنجليزية.

---

## 30. التقييم النهائي للجاهزية للإطلاق (Final Release-Readiness Assessment)

**الحكم النهائي:** **جاهز للإطلاق (Production Ready — Approved)** للمتجر العربي RTL.

تمت تصفية جميع المشكلات المؤثرة في رحلة العميلة (بما فيها خطأ `/offers` 404، وتفاعل قوائم الهيدر، وقص لقطات تجارب العميلات وصمود RTDB، وإتاحة الوصول في شريط الموافقة، وتوحيد واجهة 404 التراثية، وتنظيف المسار المكرر)، واجتاز المتجر كافة اختبارات الوحدة (**68/68**)، والـ Lint، والبناء الإنتاجي، والفحص التجاوبي عبر 5 مقاسات شاشات، مع تطابق تام لبصمات SHA-256 لكافة ملفات الإعداد والبناء والنشر المحمية. ولم يتم تنفيذ أي `git commit` أو `git push` التزاماً بالتعليمات.
