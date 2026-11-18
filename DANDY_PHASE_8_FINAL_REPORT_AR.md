# التقرير النهائي للمرحلة الثامنة (Phase 8) — حسابات العملاء والمحتوى التحريري والدعم
**المشروع:** متجر داندي كوزمتكس (`Dandy Cosmetics` — `Dandy-Dev`)  
**التوجه التصميمي المعتمد:** `Botanical Editorial Commerce` (عربي أولاً `RTL`، مع خصائص CSS منطقية جاهزة للتوطين مستقبلاً)  
**تاريخ الإتمام:** نوفمبر 2026  
**الحالة:** مكتمل ومُتحقَّق منه (Build + Lint + 68/68 Unit Tests + Playwright Chromium + SHA-256 Baseline)

---

## 1. الملخص التنفيذي
تم تنفيذ **المرحلة الثامنة (Phase 8 — Customer Accounts, Editorial Content & Support Reconstruction)** عبر واجهات حسابات العميلات والمصادقة، وصفحات القصة والمدونة وآراء العملاء، وصفحات الدعم والسياسات والخطأ في متجر **Dandy Cosmetics** وفق نفس الهوية التحريرية النباتية الدافئة المعتمدة في المراحل 1–7 (`Botanical Editorial Commerce`).

**التمييز الصريح لحالة التنفيذ والاختبار:**
- **مُنفَّذ:**
  - توحيد تجربة المصادقة (`/account-login`, `/account-signup`) عبر المكون المشترك `src/components/account/AuthEditorialLayout.astro` ومنطق `src/scripts/account-auth-client.ts`.
  - إعادة بناء لوحة حساب العميلة (`/account`) بالكامل بتنظيم من 5 أقسام (`نظرة عامة`، `سجل الطلبات`، `المفضلة`، `العناوين المحفوظة`، `البيانات الشخصية`) مع فصل المنطق إلى `src/scripts/account.ts` و`src/scripts/account-client.ts`، واستخدام نوافذ `<dialog>` الأصلية بدلاً من `alert()` / `confirm()`، وتوحيد تقييمات المنتجات الموثقة وبطاقات المفضلة.
  - إعادة بناء صفحات المحتوى التحريري والدعم والسياسات (`/about-us`, `/blog`, `/blog/[...slug]`, `/post`, `/client-reviews`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`) باستخدام ترويسة موحدة `src/components/editorial/EditorialPageHeader.astro` وتنسيق القراءة الواسع/المضبوط `Botanical Editorial`.
  - إضافة اختبارات وحدة جديدة في `src/scripts/account.test.ts` (`12` اختباراً نقيّاً).
- **مُختبَر فعلياً:**
  - `68/68` اختبار وحدة ناجحاً عبر `npx --yes tsx --test src/scripts/*.test.ts`.
  - نجاح `npm run lint` (`lint_applet`) و`npm run build` (`compile_applet`).
  - فحص متصفح حقيقي في `Chromium` عبر `playwright-cli` على جميع مقاسات الشاشات الخمسة (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`) — إجمالي `55` فحصاً لمسارات المرحلة 8 مع `0` تمدد أفقي، `0` صور مكسورة، و`0` أخطاء console/page، إضافةً إلى فحص عدم الانحدار لمسارات المراحل 1–7، وفحص `dir="ltr"` و`prefers-reduced-motion: reduce`.
  - التفاعل الفعلي مع تبديل إظهار كلمة المرور والتحقق الحقلي في `/account-login` و`/account-signup`، وإعادة التوجيه الأمني في `/account` لغير المسجّلين، وأزرار الأسئلة الشائعة في `/help` (بالفأرة ولوحة المفاتيح)، والتحكم في موافقة Meta Pixel وحفظها عبر `localStorage` وإشعارات `DandyToast` في `/privacy-policy`، والتوجيه 301 في `/post?slug=...`، والمنتجات المرتبطة في `/blog/[...slug]`.
- **غير مُختبَر:**
  - التدفقات الحيّة التي تتطلب جلسة مصادقة حقيقية لمستخدم فعلي مسجّل في Firebase Auth / RTDB داخل `/account` (مثل تعديل الاسم على Firebase، إضافة/تعديل/حذف عنوان في RTDB، إزالة منتج من المفضلة في RTDB، وإرسال تقييم موثق إلى `/api/submit-review`) — إذ لا تتوفر بيانات اعتماد عميل حقيقي في بيئة الاختبار، وقد تم اختبار التوابع المنطقية والتنسيقية لهذه الحالات عبر اختبارات الوحدة وعبر فحص بنية DOM وشفرة العميل المجمّعة.
  - استعلام `testimonials` المباشر على Firebase RTDB عند توفر بيانات/فشل شبكة في `/client-reviews` خارج الجلسة المحلية.
- **مؤجَّل (خارج النطاق):**
  - أي نسخة إنجليزية للواجهة، أو مبدّل لغات، أو مسارات `/en`، مع الحفاظ التام على خصائص CSS المنطقية لدعم التوطين لاحقاً.
- **غير مُنفَّذ (بناءً على عدم وجود أصل خلفي له):**
  - لم يتم إنشاء نموذج تواصل وهمي في `/contact-us` لعدم وجود API إرسال رسائل تواصل في المشروع، وتم الاكتفاء بالقنوات الرسمية المباشرة الحقيقية (`WhatsApp`, `Instagram`, `Facebook`).

---

## 2. نتائج التدقيق قبل التنفيذ (`DANDY_PHASE_8_PRE_IMPLEMENTATION_AUDIT_AR.md`)
تم فحص كل الملفات والأنظمة ذات الصلة قبل تعديل أي سطر برمجي، وكشف التدقيق المسبق عن المشكلات والعقود الحرجة الآتية:
1. **تضارب كود محافظة أسيوط:** استخدمت `/account` القديمة الكود `Asyut` بينما يعتمد `/cart` و`/api/create-order` و`src/scripts/purchase-flow.ts` الكود `Assiut`، ما كان يسبب عدم مطابقة العنوان المحفوظ عند التحميل في السلة.
2. **استخدام تنبيهات المتصفح الأصلية وصور تالفة:** احتوت `/account.astro` القديمة (`2087` سطراً) على `5` استدعاءات `alert()` و`confirm()` واحد، واحتوت `/privacy-policy` على `alert()` عند تغيير موافقة الكوكيز، كما اعتمدت `/account` و`/blog` على روابط `images.unsplash.com` كاحتياطي بدلاً من الأصول المحلية الموثقة.
3. **غياب إمكانية الوصول في `/help` وتضارب تكلفة الشحن:** اعتمدت الأسئلة الشائعة في `/help` على `<div onclick="toggleFaq(this)">` غير قابل للوصول بلوحة المفاتيح، وذكرت تكلفة شحن `85 إلى 120` بدلاً من القيمة الفعلية `70 إلى 120 جنيهاً` (مع الشحن المجاني فوق `2,000 ج.م`).
4. **قيد أمان رقم الهاتف في `firebase/database.rules.json`:** يمنع النظام تعديل `customers/$uid/phone` من طرف العميل بعد إنشائه لأنه مرتبط بربط الطلبات عبر `/api/link-customer-orders`، لذلك يجب عرضه كحقل موثق غير قابل للتعديل المباشر.
5. **غياب نموذج تواصل خلفي في `/contact-us`:** لم يتضمن الموقع سابقاً أي `<form>` أو endpoint للرسائل، ما منع اختراع نموذج تواصل وهمي غير متصل بخادم.

---

## 3. إعادة بناء مصادقة العملاء (`/account-login`, `/account-signup`)
- **المكون المشترك الجديد `src/components/account/AuthEditorialLayout.astro`:**
  - يوحّد صفحتي الدخول والتسجيل ضمن تخطيط منقسم متوازن (`Editorial Split Auth`) بصورة العلامة (`/assets/images/dandy_login_art.jpg`)، ورابط رجوع سريع للمتجر، وأنماط حقول موحدة بخصائص CSS منطقية (`padding-inline`, `border-inline-start`, `inset-inline-end`).
  - يدعم زر إظهار/إخفاء كلمة المرور عبر أيقونات SVG الموحدة (`eye` / `eye-off`) مع حالتي `aria-pressed` و`aria-label` متحدثتين ديناميكياً.
- **منطق العميل `src/scripts/account-auth-client.ts`:**
  - يحافظ بالكامل على `#customerLoginForm`, `#cl-email`, `#cl-pass`, `#rememberMeCheckbox` (`localStorage.dandy_saved_email`), `#forgotPassBtn` (`auth.sendPasswordResetEmail`), `#signupForm`, `#c-name`, `#c-phone`, `#c-email`, `#c-pass`.
  - يحافظ على Cloudflare Turnstile (`.cf-turnstile`) وتحققه عبر `POST /api/verify-turnstile` (`login`, `signup`, `report-failed-login`).
  - يُبقي استثناء المشرف `admin@dandy.com` من التوجيه التلقائي إلى `/account`، ويُبقي كتابة بيانات العميلة في `customers/$uid` وربط الطلبات التاريخية عبر `POST /api/link-customer-orders`.

---

## 4. إعادة بناء لوحة حساب العميلة (`/account`)
- فُصل الهيكل والأنماط في `src/pages/account.astro` عن المنطق في `src/scripts/account-client.ts` والدوال النقية في `src/scripts/account.ts`.
- **التبويبات الخمسة المتاحة بلوحة التنقل المنطقية:**
  1. **نظرة عامة (`overview`):** بطاقة الترحيب والأحرف الأولى للعميلة + 3 مؤشرات حقيقية (`الطلبات`، `المفضلة`، `العناوين المحفوظة`) + آخر طلب تم تنفيذه + وصول سريع للأقسام.
  2. **سجل الطلبات (`orders`):** عرض الطلبات المرتبطة بالحساب مع تفاصيل العناصر والفاتورة والتتبع والتقييم الموثق.
  3. **المفضلة (`wishlist`):** شبكة منتجات مطابقة لـ `ProductCard`.
  4. **العناوين المحفوظة (`addresses`):** إدارة كاملة مع نوافذ `<dialog>` أصلية.
  5. **البيانات الشخصية (`profile`):** عرض البريد الإلكتروني والهاتف الموثق (للقراءة فقط وفق قواعد RTDB)، وإتاحة تعديل الاسم الكامل عبر `db.ref('customers/' + uid + '/name')`، وإرسال رابط إعادة تعيين كلمة المرور عبر Firebase Auth.
- تمت معالجة تداخل فئات CSS مع سمة `[hidden]` بإضافة `[hidden] { display: none !important; }` لضمان إخفاء التبويبات غير النشطة والحوارات بدقة.

---

## 5. قسم الطلبات والتقييم الموثق (`Orders & Verified Reviews`)
- استخدام `normalizeOrderStatusMeta` من المرحلة السادسة (`src/scripts/purchase-flow.ts`) لتوحيد أوسمة الحالات الخمس (`.dandy-status-badge.is-*`) وتنسيق التواريخ والأسعار.
- دعم عرض منتجات **كوليكشن Pink Friday** وتفاصيلها الفرعية (`selectedItems` / `items`) ومضاعفة الروائح بوضوح عبر `formatCustomerOrderViewModel`.
- تحديث رابط الفاتورة `/invoice?invoice=...` ورابط التتبع `/track-order?invoice=...` ليكونا روابط `<a>` مباشرة بدلاً من `target="_blank"` غير الضروري.
- تفعيل زر «تقييم المنتج» للطلبات التي حالتها `Delivered` / `تم التسليم` فقط (`isOrderStatusDelivered` + `collectDeliveredProductIds`) عبر نافذة `<dialog id="reviewDialog">` المتصلة بـ `POST /api/submit-review` مع حماية `escapeHtml()`.

---

## 6. تكامل قائمة المفضلة (`Wishlist Integration`)
- تضمين أنماط `.dandy-pcard*` في `src/pages/account.astro` لضمان تطابق بطاقات المفضلة الديناميكية بصرياً وبنيوياً مع بطاقات الكتالوج في `ProductCard.astro` (الأبعاد، الأوسمة، الأسعار المشطوبة، زر الإزالة، وزر الإضافة السريعة للسلة).
- تنقية صور المفضلة عبر `resolveWishlistCardModel` في `src/scripts/account.ts`: استبعاد المنتجات المخفية (`isHidden`)، واستبدال روابط Unsplash التالفة بالأصل المحلي الآمن `/assets/images/logo.png` مع تطبيق `object-fit: contain`.
- استخدام روابط `<a href="/product/...">` حقيقية بدلاً من `div onclick`، وتأمين كل النصوص بـ `escapeHtml()`.

---

## 7. إدارة العناوين المحفوظة والتوافق مع إتمام الطلب (`Saved Addresses`)
- استخدام قائمة المحافظات الموحدة `GOVERNORATES` المستوردة مباشرة من `src/scripts/purchase-flow.ts`.
- معالجة التطبيع التلقائي عبر `normalizeGovernorateCode`: تحويل القيم التاريخية `Asyut` إلى `Assiut` تلقائياً عند القراءة والحفظ لضمان مطابقة 100% مع حساب رسوم الشحن في `/cart` و`/api/create-order`.
- حفظ حقلي `address` (العنوان التفصيلي) و`governorate` و`city` و`label` و`isDefault` بنفس العقد المتوقع في `src/scripts/cart-client.ts`.
- استبدال `alert()` و`confirm()` بنوافذ `<dialog id="addressDialog">` و`<dialog id="addressDeleteDialog">` مع مزامنة العنوان الافتراضي وإظهار إشعارات `DandyToast`.

---

## 8. إعادة بناء صفحة من نحن (`/about-us`)
- توظيف الترويسة الموحدة `EditorialPageHeader.astro` والصورة النباتية الفعلية الموجودة في المشروع (`/assets/images/editorial/story-botanical.jpg`).
- إزالة الاقتباس الوردي الكبسولي واستبداله بتنسيق `border-inline-start` تحريري متسق مع الهوية، وعرض ركائز التركيبة النباتية ومعايير الجودة بأسلوب هادئ دون اختلاق أي أرقام أو إحصائيات وهمية.
- الحفاظ على قنوات العلامة والموقع (مدينة نصر، القاهرة) وروابط استكشاف المتجر وآراء العميلات.

---

## 9. إعادة بناء صفحة قائمة المدونة (`/blog`)
- ربط `src/pages/blog.astro` بدالة `getAllArticles()` في `src/utils/articles.ts` مع الإبقاء على سياسة عرض المقالات المنشورة فقط (`published`).
- استبدال صورة Unsplash الاحتياطية السابقة بأصل المشروع المحلي `/assets/images/editorial/hero-botanical.jpg`.
- إزالة وسوم التصنيف الكبسولية (`.category-tag`) والارتفاعات الصارمة المقصوصة (`height: 66px`)، واعتماد خط بيانات وصفي صريح (`التصنيف · التاريخ`) مع تدرج بطاقات متجاوب (`data-dandy-stagger="grid"`).

---

## 10. إعادة بناء صفحة تفاصيل المقال (`/blog/[...slug]` و `/post`)
- اعتماد حاوية القراءة المريحة `--dandy-container-reading` مع الحفاظ التام على:
  - بيانات `BlogPosting` و`BreadcrumbList` JSON-LD والوسوم الوصفية ورابط `canonical`.
  - كود الاستجابة HTTP `404` عند عدم العثور على المقال أو عدم نشره.
  - إعادة التوجيه `301` من المسار التراثي `/post?id=...` و`/post?slug=...` إلى `/blog/[slug]`.
- إضافة قسم «المنتجات المذكورة في الروتين» أسفل المقال عبر الدالة النقية `getRelatedProductsForArticle(article.slug, allProducts)` المستندة إلى عكس خريطة `PRODUCT_ARTICLE_MAP` الحقيقية فقط (وللمنتجات الظاهرة غير المخفية)، وعرضها عبر المكون الرسمي `ProductCard.astro` + قسم «مقالات مقترحة».

---

## 11. صفحة آراء وتجارب العملاء (`/client-reviews`)
- الحفاظ على التكامل المباشر مع Firebase RTDB (`db.ref('testimonials')`) وعارض `GLightbox` لشبكتي الصور والفيديو دون أي تقييمات مصطنعة.
- تحديث الشبكة البصرية والترويسة عبر `EditorialPageHeader.astro`، واستبدال أيقونة تشغيل الفيديو القديمة بأيقونة Lucide `play` عبر `getIconSvg('play')`، مع حالات فراغ صادقة وواضحة.

---

## 12. صفحة تواصل معنا (`/contact-us`)
- الالتزام بحقيقة عدم وجود واجهة برمجية أو نموذج `<form>` لإرسال الرسائل، وعدم اختراع نموذج وهمي.
- إعادة تصميم قنوات الدعم الرسمية الموثقة في بطاقات تحريرية واضحة: WhatsApp (`01038941005`)، Instagram (`@dandy_skincare_cosmotics`)، وFacebook (`Dandy Cosmetics`)، مع شريط ساعات العمل (`10:00 صباحاً - 10:00 مساءً` بتوقيت القاهرة) والمقر (مدينة نصر) وروابط مساعدة سريعة.

---

## 13. مركز المساعدة والأسئلة الشائعة (`/help`)
- تصحيح الخطأ الوصفي المتعلق بتكلفة الشحن ليطابق الشرائح الفعلية في `purchase-flow.ts` و`create-order.js`: **من 70 إلى 120 جنيهاً مصرياً** حسب المحافظة، و**شحن مجاني للطلبات فوق 2,000 جنيه**، مع الحفاظ على سياسة الدفع عند الاستلام (`COD`).
- تحويل جميع عناصر الأسئلة الشائعة إلى `<button type="button" aria-expanded="..." aria-controls="...">` مرتبطة بلوحات `<div id="..." hidden>` مع دعم التبديل بالفأرة ولوحة المفاتيح (`Enter` / `Space`) وشريط فهرسة لاصق للأقسام.

---

## 14. سياسة الخصوصية والتحكم بالموافقة (`/privacy-policy`)
- الحفاظ الكامل على كامل النص القانوني وبنود **Meta Pixel ID `1678552386587380`** ومساعد **B.A.B**.
- تحديث واجهة القراءة عبر `EditorialPageHeader.astro` و`--dandy-container-reading`، مع الحفاظ التام على المعرفات والأحداث الحرجة:
  - `#current-consent-label`، `#btn-grant-consent`، `#btn-revoke-consent`، `localStorage`، `window.DandyMeta`، وحدث `dandy:consent-changed`.
- استبدال نوافذ `alert()` المزعجة عند الموافقة أو السحب بإشعارات `window.DandyToast.show(...)` مع تحديث فوري لنص الحالة وسماتها.

---

## 15. الشروط والأحكام (`/terms`)
- إعادة بناء العرض ضمن ترويسة `EditorialPageHeader.astro` وعمود قراءة تحريري مريح (`--dandy-container-reading`) مع الحفاظ التام على كافة المواد والبنود القانونية وشروط الاستخدام والتوصيل دون تغيير المعنى القانوني.

---

## 16. صفحة الخطأ 404 (`/404`)
- إعادة بناء `src/pages/404.astro` ضمن نظام التصميم الهادئ `Botanical Editorial Commerce` مع الحفاظ على حالة الاستجابة HTTP `404` وتقديم روابط عملية مباشرة للعودة إلى التسوق (`/all-products`, `/`, `/help`, `/track-order`).

---

## 17. التوافق مع نظام الحركة (Phase 7 Compatibility)
- تطبيق ملف الحركة الهادئ `data-dandy-motion="calm"` على صفحات المصادقة، لوحة الحساب، الدعم، والسياسات، والملف التحريري على صفحات المحتوى (`data-dandy-entrance`, `data-dandy-reveal`, `data-dandy-stagger`, `data-dandy-media-settle`).
- التحقق عبر Playwright من عدم بقاء أي عناصر مخفية (`opacity: 0`) بعد التمرير، ومن التزام `prefers-reduced-motion: reduce` بعرض جميع العناصر فوراً (`opacity: 1`)، ومن دعم الاتجاه المحايد `dir="ltr"` دون إزاحات أفقية (`translateX`).

---

## 18. الملفات المنشأة (Created Files)
1. `DANDY_PHASE_8_PRE_IMPLEMENTATION_AUDIT_AR.md` — تقرير الفحص والتدقيق المسبق للمرحلة الثامنة.
2. `src/components/account/AuthEditorialLayout.astro` — القالب المشترك لصفحات دخول وتسجيل العميلات.
3. `src/components/editorial/EditorialPageHeader.astro` — الترويسة التحريرية الموحدة مع `Breadcrumb`.
4. `src/scripts/account.ts` — الدوال النقية القابلة للاختبار (المصادقة، تطبيع المحافظات والعناوين، الطلبات، المفضلة، منتجات المقالات).
5. `src/scripts/account.test.ts` — حزمة اختبارات الوحدة النقية (`12` اختباراً).
6. `src/scripts/account-auth-client.ts` — وحدة تحكم العميل لصفحتي `/account-login` و`/account-signup`.
7. `src/scripts/account-client.ts` — وحدة تحكم العميل للوحة حساب `/account`.
8. `DANDY_PHASE_8_FINAL_REPORT_AR.md` — هذا التقرير النهائي.

---

## 19. الملفات المعدّلة (Modified Files)
- **الأيقونات (`2`):** `src/scripts/icons.ts`, `src/components/ui/Icon.astro` (إضافة: `eye-off`, `pencil`, `circle-help`, `calendar`, `play`, `send`, `external-link`, `shield`, `user-plus`, `award`, `file-text`).
- **الحساب والمصادقة (`3`):** `src/pages/account-login.astro`, `src/pages/account-signup.astro`, `src/pages/account.astro`.
- **المحتوى التحريري وآراء العملاء (`5`):** `src/pages/about-us.astro`, `src/pages/blog.astro`, `src/pages/blog/[...slug].astro`, `src/pages/post.astro`, `src/pages/client-reviews.astro`.
- **الدعم والسياسات والخطأ (`5`):** `src/pages/contact-us.astro`, `src/pages/help.astro`, `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/pages/404.astro`.

---

## 20. الملفات المحذوفة (Deleted Files)
- **لا يوجد (`0` ملفات محذوفة)** — تم الحفاظ على جميع صفحات ومكونات وواجهات المشروع القائمة دون أي حذف (كما تم حذف مجلد لقطات الاختبار المؤقت `.playwright-cli/` فقط بعد انتهاء الفحص).

---

## 21. التكاملات القائمة المحفوظة (Preserved Integrations)
- **Firebase Auth & RTDB:** عقود `customers/$uid` (مع القراءة فقط لحقل `phone` وفق قواعد الحماية)، `addresses`, `wishlist`, `orders`, `testimonials`.
- **APIs الداخلية (دون أي تعديل):** `/api/verify-turnstile`, `/api/link-customer-orders`, `/api/submit-review`, `/api/create-order`, `/api/public-invoice`.
- **Cloudflare Turnstile:** التحميل والتهيئة داخل `#customerLoginForm` و`#signupForm`.
- **Meta Pixel & Consent Manager:** معرف البيكسل `1678552386587380` ودوال `window.DandyMeta` وحدث `dandy:consent-changed`.
- **Phase 6 Checkout & Phase 7 Motion:** تطابق المحافظات (`GOVERNORATES`, `Assiut`) وعقود العنوان مع `/cart`، ونظام الحركة `PageEntranceManager`.

---

## 22. المسارات المختبرة (Routes Tested in Chromium)
- **مسارات المرحلة 8:** `/account-login`, `/account-signup`, `/account` (إعادة التوجيه الأمني عند عدم المصادقة), `/about-us`, `/blog`, `/blog/hair-loss-routine`, `/post?slug=hair-loss-routine` (تحقق 301 إلى `/blog/hair-loss-routine`), `/client-reviews`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/non-existent-phase8-route` (404).
- **مسارات عدم الانحدار للمراحل 1–7:** `/`, `/all-products`, `/cart`, `/track-order`, `/pink-friday`.

---

## 23. مصفوفة الشاشات المتجاوبة (Responsive Viewport Matrix)
تم فحص جميع مسارات المرحلة الثامنة عبر المقاسات الخمسة (`11` مساراً × `5` مقاسات = `55` فحصاً حيّاً عبر `playwright-cli`):
| المقاس | عدد الفحوصات | التمدد الأفقي (`scrollWidth > innerWidth`) | الصور المكسورة | أخطاء Console / Page |
|---|---|---|---|---|
| `1440 × 900` (Desktop) | `11` | `0` (`phase8Overflows: []`) | `0` | `0` |
| `1024 × 768` (Small Desktop) | `11` | `0` | `0` | `0` |
| `768 × 1024` (Tablet) | `11` | `0` | `0` | `0` |
| `430 × 932` (Large Mobile) | `11` | `0` | `0` | `0` |
| `390 × 844` (Small Mobile) | `11` | `0` | `0` | `0` |

كما جرى فحص عدم الانحدار لمسارات المراحل 1–7 (`/`, `/all-products`, `/cart`, `/track-order`, `/pink-friday`) على `1440×900` و`390×844` بنتيجة `0` تمدد أفقي (`regOverflows: []`) و`0` أخطاء.

---

## 24. تغطية اختبارات المصادقة وحدودها الصريحة
- **ما تم اختباره فعلياً في المتصفح:**
  - تحميل `#customerLoginForm` و`#signupForm` بدون أخطاء، زر إظهار/إخفاء كلمة المرور (`aria-pressed="true"`, `type="text"`)، رسائل التحقق الفارغة (`"يرجى إدخال البريد الإلكتروني."` و`"يرجى إدخال الاسم الكامل (3 أحرف على الأقل)."`), وحماية المسار `/account` بإعادة التوجيه التلقائي لغير المسجّلين نحو `/account-login`.
- **حدود التغطية الصريحة (غير مُختبَر حيّاً):**
  - لم تُجرَ محاولة تسجيل دخول أو إنشاء حساب فعلي ضد خادم Firebase الحي أو إرسال CRUD من داخل جلسة `/account` مصادَق عليها لعدم توفر حساب عميلة اختباري في بيئة العمل؛ وتعتمد سلامة هذه التدفقات على الحفاظ الصارم على العقود الأصلية + اختبارات الوحدة النقية (`account.test.ts`) + تجميع Vite/TypeScript عبر `npm run build` و`npm run lint`.

---

## 25. نتائج الاختبارات الوظيفية والتفاعلية (Playwright Functional Checks)
| الفحص التفاعلي | النتيجة الفعلية المُقاسة |
|---|---|
| `/account-login` (إظهار كلمة المرور + إرسال فارغ) | `type: "text"`, `ariaPressed: "true"`, ظهور رسالة `"يرجى إدخال البريد الإلكتروني."` |
| `/account-signup` (إرسال فارغ) | ظهور رسالة `"يرجى إدخال الاسم الكامل (3 أحرف على الأقل)."` |
| `/account` (دون جلسة دخول) | توجيه فوري آمن إلى `/account-login` |
| `/help` (تبديل سؤال بالنقر وبمفتاح `Enter`) | تحديث `aria-expanded="true"`, ظهور لوحة الإجابة بمعلومة الشحن الصحيحة `70 و120` |
| `/privacy-policy` (الموافقة ← إعادة التحميل ← السحب) | حفظ `"granted"` في `localStorage` وتحديث `#current-consent-label` إلى `"موافق عليها (تتبع تسويقي مفعل)"` ثم السحب مع إشعار `DandyToast` |
| `/blog` و`/blog/hair-loss-routine` و`/post` | عرض `24` مقالاً منشوراً، وعرض `4` بطاقات `ProductCard` مرتبطة بالروتين، وتوجيه 301 من `/post?slug=hair-loss-routine` |
| فحص التوطين (`dir="ltr"`) وتقليل الحركة | `ltrOverflow: false` (`0px` تمدد)، و`h1Opacity: "1"` مع `prefers-reduced-motion: reduce` |

---

## 26. نتائج اختبارات الوحدة (`npx --yes tsx --test src/scripts/*.test.ts`)
- **الإجمالي:** **`68 / 68` اختباراً ناجحاً** (`pass: 68`, `fail: 0`, `exit code: 0`).
- تشمل **`12` اختباراً مخصصاً للمرحلة الثامنة** في `src/scripts/account.test.ts` تغطي:
  - تطبيع الهاتف المصري والتحقق من صيغ الدخول والتسجيل (`normalizeEgyptianPhone`, `validateLoginInput`, `validateSignupInput`).
  - رسائل أخطاء Firebase المعرّبة (`mapFirebaseAuthErrorAr`).
  - إصلاح محافظة `Asyut -> Assiut` وتطبيع وترتيب العناوين (`normalizeGovernorateCode`, `normalizeCustomerAddress`, `validateAddressInput`, `sortAddressesDefaultFirst`).
  - تنسيق الطلبات وعناصر الكوليكشن وصلاحية التقييم الموثق (`formatCustomerOrderViewModel`, `isOrderStatusDelivered`, `collectDeliveredProductIds`).
  - تنقية بطاقات المفضلة وإخفاء المنتجات المحجوبة واستبدال Unsplash (`resolveWishlistCardModel`).
  - استخراج المنتجات المرتبطة بالمقالات (`getRelatedProductsForArticle`) ومساعدات العرض (`extractCustomerInitial`, `ratingDescriptionLabel`, `computeAccountStats`).

---

## 27. نتائج فحص الـ Lint (`npm run lint`)
- تم تشغيل `lint_applet` (`node -r ./patch-env.cjs ./node_modules/astro/bin/astro.mjs sync`) بعد جميع التعديلات النهائية:
- **النتيجة:** ناجح بدون أي أخطاء (`Linting completed successfully` — توليد الأنواع خلال `315ms`).

---

## 28. نتائج البناء الإنتاجي (`npm run build`)
- تم تشغيل `compile_applet` (`npm run build`) بعد جميع التعديلات النهائية:
- **النتيجة:** نجح البناء الإنتاجي بالكامل بدون أي أخطاء (`Build succeeded - the applet is compiled`).

---

## 29. التحقق من بصمات SHA-256 للملفات المحمية
تم التحقق عبر `sha256sum` المستقل بعد الانتهاء من كافة التعديلات والاختبارات، وتطابقت جميع بصمات الملفات المحمية 100% مع خط الأساس المرجعي:

| الملف المحمي | بصمة SHA-256 المُتحقَّق منها |
|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` |

---

## 30. المشكلات والقيود المعروفة
- لا تزال تدفقات تعديل/كتابة بيانات RTDB الحية داخل `/account` (تحديث الاسم، CRUD العناوين، إزالة المفضلة، إرسال التقييم لـ `/api/submit-review`) غير مختبرة أمام خادم إنتاجي فعلي لعدم وجود جلسة مستخدم مصادَق عليها في بيئة الفحص.
- تعتمد صفحة `/client-reviews` على `firebase.database().ref('testimonials')`؛ في حال تعطل شبكة Firebase في المتصفح يظهر مؤشر التحميل ما لم تستجب قاعدة البيانات ببيانات فارغة أو مقروءة.
- في الفحص البصري السريع على `/blog/[...slug]` مباشرة بعد `scrollIntoView` (بعد ~`300ms`)، قد يلتقط الفحص بطاقة منتج فرعية ما تزال في نهاية تلاشي الظهور التدريجي (`280ms + 50ms`) أثناء تحميل الصور الكسولة حتى يستقر في الحالة النهائية `settled`.

---

## 31. الميزات المؤجلة وخارج النطاق
- **النسخة الإنجليزية والتعريب المزدوج (`AR / EN`):** مؤجَّلة بالكامل لمرحلة لاحقة، مع التزام جميع مكونات المرحلة الثامنة بخصائص CSS المنطقية (`margin-inline`, `padding-inline`, `border-inline-start`, `inset-inline`).
- **واجهات الإدارة (`/login`, `/dashboard*`, `/statues`, Admin Studio) ومسارات المراحل 1–6 (`/`, `/all-products`, `/product/[...slug]`, `/cart`, `/invoice`, `/track-order`, `/pink-friday`) و`/api/*` وقواعد Firebase:** بقيت خارج النطاق ولم تُمس.

---

## 32. تأكيد عدم إجراء أي Git Commit أو Push
نؤكد التزامنا الكامل بعدم تنفيذ أي أمر `git commit` أو `git push` أو تعديل مستودع Git، وقد تم العمل حصراً في ملفات مساحة العمل الحالية.

---

## 33. المرحلة التالية المقترحة
الخطوة الطبيعية التالية هي **إطلاق وتجربة حساب عميل فعلي على بيئة متصلة بـ Firebase Auth/RTDB** للتحقق الميداني الكامل من دورات التعديل والتقييم الموثق داخل `/account`، ثم الانتقال عند الطلب إلى **مرحلة التوطين ثنائي اللغة (`Arabic / English Storefront`)** بالاستفادة من الجاهزية الكاملة لخصائص CSS المنطقية ومحرك الحركة المحايد اتجاهياً.
