# تقرير الفحص المسبق قبل التنفيذ — المرحلة الثامنة (DANDY Phase 8 Pre-Implementation Audit)
**تاريخ الإعداد:** 2026-11-18  
**المشروع:** Dandy Cosmetics (`Dandy-Dev`)  
**التوجه التصميمي:** Botanical Editorial Commerce (عربي أولاً RTL، معمارية متجاوبة جاهزة للتوطين LTR/RTL)  
**النطاق:** حسابات العملاء (`/account-login`, `/account-signup`, `/account`)، المحتوى التحريري وآراء العملاء (`/about-us`, `/blog`, `/blog/[...slug]`, `/post`, `/client-reviews`)، الدعم والسياسات والخطأ (`/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`)

---

## 1. ملخص الفحص المسبق ونطاق العمل

تم إجراء فحص كامل للملفات المستهدفة وعقود الواجهات البرمجية وقواعد الأمان قبل الشروع في أي تعديل برمجي:

### 1.1 خط أساس ملفات التهيئة المحمية (Protected Baseline SHA-256)
تم التحقق من بصمة `SHA-256` الفعلية لجميع الملفات المحمية في بيئة التشغيل، وهي مطابقة 100% للمرحلة السابعة:
- `astro.config.mjs`: `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc`
- `vercel.json`: `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05`
- `package.json`: `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3`
- `tsconfig.json`: `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046`
- `patch-env.cjs`: `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623`
- `server.js`: `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667`
- `.env.example`: `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0`

### 1.2 حدود النطاق الصارمة (Scope Boundaries)
- **المسارات المشمولة في المرحلة الثامنة فقط:**
  1. المصادقة: `/account-login` (`src/pages/account-login.astro`), `/account-signup` (`src/pages/account-signup.astro`)
  2. لوحة حساب العميلة: `/account` (`src/pages/account.astro`)
  3. القصة والمدونة وآراء العملاء: `/about-us`, `/blog`, `/blog/[...slug]`, `/post` (التوافق مع التوجيه 301), `/client-reviews`
  4. الدعم والسياسات والخطأ: `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`
- **المسارات والأنظمة الخارجة عن النطاق (لا تُمس):**
  - `/login`, `/dashboard*`, `/statues`, Admin Studio sync, الصفحة الرئيسية (`src/pages/index.astro` و`src/components/home/*`), صفحات الكتالوج والتصنيفات، صفحات المنتجات PDP، السلة وإتمام الطلب (`/cart`)، الفاتورة (`/invoice`)، تتبع الطلب (`/track-order`)، `/pink-friday`، جميع مسارات `/api/*`، وقواعد Firebase.
  - لا يُضاف أي إصدار إنجليزي أو مبدّل لغات أو مسارات ترجمة في المرحلة الثامنة، مع الالتزام الكامل بخصائص CSS المنطقية (`margin-inline`, `padding-inline`, `inset-inline`, `border-inline-start`) لدعم التوطين مستقبلاً.

---

## 2. جرد الحالة الراهنة وملاحظات الفحص لكل مسار

### 2.1 مسارا المصادقة: `/account-login` و `/account-signup`
- **الحالة الحالية:**
  - `/account-login` مصمم كبطاقة منقسمة (Split Card) بتصميم داكن للصورة الجانبية (`/assets/images/dandy_login_art.jpg`) وحقول رمادية (`#ededed`) وأيقونات Font Awesome، ولا يوجد زر إظهار/إخفاء كلمة المرور.
  - `/account-signup` معزول في صندوق ضيق (440px) بزر وردي كبسولي (`#fe5d9f`, `border-radius: 99px`) غير متسق بصرياً مع صفحة تسجيل الدخول أو نظام التصميم الموحد (Phase 1).
- **العقود والأدوات الواجب الحفاظ عليها:**
  - المعرفات والعناصر الحرجة: `#customerLoginForm`, `#cl-email`, `#cl-pass`, `#rememberMeCheckbox` (`localStorage.dandy_saved_email`), `#forgotPassBtn` (`auth.sendPasswordResetEmail`), `#signupForm`, `#c-name`, `#c-phone`, `#c-email`, `#c-pass`.
  - أداة الحماية **Cloudflare Turnstile**: تضمين `https://challenges.cloudflare.com/turnstile/v0/api.js` مرة واحدة، والحفاظ على `.cf-turnstile` (`data-sitekey={turnstileSiteKey}`) وعدم تفريغها عبر `innerHTML`.
  - مسار التحقق السيرفري: `POST /api/verify-turnstile` (`action: 'login' | 'signup' | 'report-failed-login'`).
  - Firebase Auth + RTDB write إلى `customers/$uid` (`{ name, email, phone, createdAt }`) + `POST /api/link-customer-orders` (`{ idToken, phone }`).
  - استثناء حساب المشرف `admin@dandy.com` من التوجيه التلقائي إلى `/account`.

### 2.2 لوحة حساب العميلة: `/account` (`src/pages/account.astro`)
- **الحالة الحالية والخلل المرصود:**
  1. ملف متضخم (2087 سطراً) يخلط CSS مع HTML مع منطق JS مضمن.
  2. يستخدم 5 استدعاءات `alert()` و1 استدعاء `confirm()` لحذف العنوان.
  3. يعيد استخدام صورة `images.unsplash.com` التالفة كاحتياطي في المفضلة.
  4. بطاقة المفضلة (`.wishlist-product-card`) تخالف تصميم `ProductCard.astro` الموحد وتستخدم عناصر `<div>`/`<h3>` قابلة للنقر عبر `onclick` بدلاً من روابط `<a>` صالحة، ولا تحقن `escapeHtml` في كل الحقول.
  5. قائمة المحافظات في نموذج العناوين تستخدم `Asyut` بينما يعتمد `/cart` و`create-order.js` و`purchase-flow.ts` القيمة `Assiut` — مما يسبب عدم تطابق عند تحميل العنوان في سلة التسوق!
  6. لا يوجد تبويب أو قسم واضح لعرض/تنظيم **البيانات الشخصية (Personal Info)** أو **نظرة عامة (Account Overview)**.
  7. لا يعالج منتجات **كوليكشن Pink Friday** بشكل مفصل (عناصر الكوليكشن الفرعية `items`/`selectedItems`) ولا يعرّف الحالات القياسية عبر `normalizeOrderStatusMeta` من Phase 6.
  8. رابط الفاتورة يستخدم `target="_blank"` بلا ضرورة ويعيق التنقل المباشر.
  9. استخدام أيقونات Font Awesome وأزرار كبسولية مفرطة (`border-radius: 99px`) وتفادي مكونات `<dialog>`.
- **ملاحظة أمنية حرجة في قواعد Firebase (`firebase/database.rules.json` سطر 76):**
  - حقل `customers/$uid/phone` محمي بقاعدة تمنع تعديله من طرف العميل بعد التسجيل (`.validate: ... !data.exists() || admin || newData.val() == data.val()`). لذلك يجب عرض الهاتف كحقل موثق غير قابل للتعديل من العميل (مع توضيح السبب وأنه مرتبط بربط الطلبات)، مع إتاحة تعديل الاسم (`customers/$uid/name`) وإرسال رابط تغيير كلمة المرور (`auth.sendPasswordResetEmail`).
- **التكامل مع `/cart` (Phase 6 Checkout Compatibility):**
  - قراءة `customers/$uid/addresses` في `src/scripts/cart-client.ts` تعتمد على الحقول: `{ label, governorate, city, address, isDefault }`. استخدام `GOVERNORATES` من `src/scripts/purchase-flow.ts` يضمن تطابقاً 100% لأسماء المحافظات بين `/account` و`/cart`.

### 2.3 المحتوى التحريري وآراء العملاء: `/about-us`, `/blog`, `/blog/[...slug]`, `/post`, `/client-reviews`
- **`/about-us` (`src/pages/about-us.astro`):**
  - يعتمد فقط على الشعار `/assets/images/logo.png` دون استغلال الأصول التحريرية النباتية الحقيقية الموجودة (`/assets/images/editorial/story-botanical.jpg` و`/assets/images/editorial/hero-botanical.jpg`).
  - يستخدم الصندوق المقتبس ذو الحد الجانبي السميك والخلفية البنفسجية (`border-right: 3px solid #fe5d9f; background: #f3e8f5`).
  - يلتزم التحديث بعدم اختلاق أي أرقام أو شهادات أو إحصائيات غير حقيقية.
- **`/blog` (`src/pages/blog.astro`):**
  - سطر 234 يستخدم صورة خارجية من `images.unsplash.com` كاحتياطي عند غياب صورة المقال؛ يجب استبدالها بأصل محلي موثق (`/assets/images/editorial/hero-botanical.jpg`).
  - يستخدم `.category-tag` الكبسولي وارتفاعاً ثابتاً `height: 66px` للملخص قد يقص النصوص بشكل غير نظيف.
  - يجب استغلال `src/utils/articles.ts` بالكامل دون المساس بسياسة `published` فقط.
- **`/blog/[...slug]` و `/post`:**
  - يحافظ على `BlogPosting` و`BreadcrumbList` JSON-LD والبيانات الوصفية وبيانات النشر الحقيقية ورابط الـ canonical وحالة HTTP 404 عند عدم وجود المقال، وإعادة التوجيه 301 من `/post?id=...` و`/post?slug=...`.
  - يمكن عرض منتجات مرتبطة حقيقية أسفل المقال عبر عكس خريطة `PRODUCT_ARTICLE_MAP` الموجودة فعلياً في `src/pages/product/[...slug].astro` فقط للمنتجات الظاهرة الموجودة في الكتالوج، دون أي ربط وهمي.
  - إزالة `border-right: 3px solid #fe5d9f` والـ `.article-category-badge` الكبسولي واستبدالها بأسلوب تحريري نباتي منظم.
- **`/client-reviews` (`src/pages/client-reviews.astro`):**
  - يجلب السجلات الحقيقية من `testimonials` في Firebase RTDB ويعرضها عبر GLightbox في شبكتين (صور / فيديو) مع حالات فراغ صادقة. يجب تحسين البنية البصرية والأيقونات وإزالة الاعتماد على Font Awesome مع الحفاظ على GLightbox وتفاعله في الهاتف والحاسوب.

### 2.4 الدعم والسياسات والخطأ: `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`
- **`/contact-us` (`src/pages/contact-us.astro`):**
  - **ملاحظة محورية:** الفحص أثبت عدم وجود أي نموذج تواصل (`<form>`) أو API أو Turnstile في الصفحة الحالية؛ بل تحتوي حصراً على قنوات التواصل المباشرة (WhatsApp `01038941005`، Instagram `@dandy_skincare_cosmotics`، Facebook `Dandy Cosmetics`) ومعلومات ساعات العمل (`10:00 AM - 10:00 PM` بتوقيت القاهرة) والمقر (مدينة نصر، القاهرة). لذا **يُمنع اختراع نموذج تواصل وهمي**؛ سنعيد تنظيم القنوات وساعات الدعم والمقر بأسلوب تحريري راقٍ مع روابط مساعدة سريعة.
- **`/help` (`src/pages/help.astro`):**
  - **مشكلة وصولية (Accessibility):** عناصر الأسئلة الشائعة تستخدم `<div class="faq-question" onclick="toggleFaq(this)">` — غير قابلة للوصول بلوحة المفاتيح وتفتقر إلى `<button>` و`aria-expanded` و`aria-controls`.
  - **تضارب معلومات الشحن المكتشف:** يجيب السؤال الثالث حالياً بأن تكلفة الشحن «من 85 إلى 120 جنيهاً»، بينما القيمة الحقيقية في `purchase-flow.ts` و`create-order.js` تبدأ من **70 جنيهاً (الغربية)** وتصل إلى **120 جنيهاً** (ومجانية للطلبات التي تتجاوز 2000 ج.م). سيتم تصحيح النص ليعكس الحقيقة الفعلية (70 إلى 120 جنيهاً مصرياً).
- **`/privacy-policy` و `/terms`:**
  - يجب الحفاظ على كامل البنود القانونية بما فيها قسم Meta Pixel (`1678552386587380`) وبنود المساعد الآلي B.A.B كاملة.
  - استبدال `alert()` في أزرار التحكم بالموافقة (`#btn-grant-consent` و`#btn-revoke-consent`) بإشعار `window.DandyToast` وحالة فورية في الواجهة مع الحفاظ التام على المعرفات (`#current-consent-label`, `#btn-grant-consent`, `#btn-revoke-consent`) وحدث `dandy:consent-changed` ودوال `window.DandyMeta`.
- **`/404` (`src/pages/404.astro`):**
  - إعادة بناء تحريرية دافئة تحافظ على كود HTTP 404 وتعرض روابط عملية (`/all-products`, `/`, `/help`, `/track-order`).

---

## 3. معمارية التنفيذ وملفات المرحلة الثامنة المخططة

1. **الوحدة النقية القابلة للاختبار (`src/scripts/account.ts` + `src/scripts/account.test.ts`):**
   - دوال نقية للمصادقة والتحقق (التحقق من البريد/كلمة المرور/الهاتف والاسم)، تطبيع المحافظات (`Asyut -> Assiut` والتوافق مع `GOVERNORATES`)، تنسيق عناصر الطلب والكوليكشن في سجل الطلبات، تحديد إمكانية التقييم للطلبات المستلمة، تطبيع بطاقات المفضلة من RTDB بشكل مطابق لـ `ProductCard`، حساب إحصاءات لوحة الحساب من البيانات الحقيقية، والتنقية ضد XSS (`escapeHtml` و`sanitizeImageUrl`).
   - مساعد مدونة نقي (`resolveRelatedProductsForArticle` المستند على `PRODUCT_ARTICLE_MAP` الحقيقي ومعدل وقت القراءة والتاريخ).
2. **الأيقونات الموحدة (`src/scripts/icons.ts` و`src/components/ui/Icon.astro`):**
   - إضافة الأيقونات اللازمة دون أي حزم خارجية (`eye`, `eye-off`, `edit-2`, `help-circle`, `shield`, `calendar`, `play-circle`, `send`, `external-link`).
3. **المكونات المشتركة الجديدة:**
   - `src/components/account/AuthEditorialLayout.astro` لتوحيد تجربة `/account-login` و`/account-signup` بسمات Botanical Editorial وصورة `dandy_login_art.jpg` مع دعم كامل للانتقال بين الحاسوب والهاتف.
   - `src/components/editorial/EditorialPageHeader.astro` لرأس تحريري موحد يدعم `Breadcrumb` لصفحات المحتوى والدعم والسياسات.
4. **متحكم لوحة الحساب النظيف (`src/scripts/account-client.ts`):**
   - يفصل منطق العميل في `/account` بالكامل عن ملف `.astro`، ويستخدم `<dialog>` أصيلاً لإضافة/تعديل العنوان، وحوار `<dialog>` لتأكيد الحذف (بدلاً من `confirm()`)، وحوار `<dialog>` للتقييم الموثق عبر `/api/submit-review`، و`window.DandyToast` بدلاً من `alert()`، مع أقسام واضحة: نظرة عامة (`overview`)، سجل الطلبات (`orders`)، قائمة المفضلة (`wishlist`)، العناوين المحفوظة (`addresses`)، والبيانات الشخصية (`profile`).
5. **الحفاظ على نظام الحركة (Phase 7):**
   - تطبيق `data-dandy-motion="calm"` على صفحات المصادقة والحساب والسياسات والدعم و`data-dandy-entrance` / `data-dandy-reveal` بهدوء تام مع احترام `prefers-reduced-motion` ووضع RTL/LTR المنطقي.
6. **مصفوفة التحقق والتشغيل النهائي:**
   - اختبارات الوحدة عبر `npx --yes tsx --test src/scripts/*.test.ts`.
   - فحص الترجمة والتدقيق عبر `compile_applet` و`lint_applet`.
   - التحقق الفعلي عبر Playwright على `http://localhost:3000` عبر المقاسات الخمسة (`390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`) لكافة مسارات المرحلة 8 + التحقق التراجعي لمسارات المراحل 1–7 + التحقق من تطابق SHA-256 للملفات المحمية قبل كتابة `DANDY_PHASE_8_FINAL_REPORT_AR.md`.
