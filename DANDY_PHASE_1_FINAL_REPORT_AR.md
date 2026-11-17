# التقرير النهائي للمرحلة الأولى (Phase 1) — تأسيس نظام التصميم
## مشروع إعادة بناء واجهة وتجربة مستخدم متجر DANDY Cosmetics
**التوجه التصميمي المعتمد:** Botanical Editorial Commerce  
**المرجع الأساسي:** `DANDY_COMPLETE_UI_UX_BLUEPRINT_AR.md`  
**المستودع:** `Mohamedkhaled-10/Dandy`

---

## 1. الملخص التنفيذي
تم إنجاز **المرحلة الأولى (Phase 1 — Design System Foundation)** بنجاح كامل ضمن الحدود الصارمة المصرح بها، دون المساس بهيكل صفحات المتجر، أو منطق Firebase/APIs، أو إعدادات Astro والنشر.  
ركزت هذه المرحلة على تأسيس البنية البصرية والتقنية الموحدة التي ستُبنى عليها جميع المراحل القادمة:
- إنشاء طبقة متغيرات التصميم الموحدة (`--dandy-*`) وفق هوية **Botanical Editorial Commerce** (ألوان هادئة دافئة مستوحاة من ELIXIR مع وضوح تجاري متزن مستوحى من PureBelle).
- معالجة تعارضات الجذر التاريخية في CSS (خصوصاً انكسار `--color-primary` الذي كان يحوّل العناوين والنصوص إلى اللون الوردي `#fe5d9f`، وتعريف المتغيرات التي كانت مفقودة مثل `--color-dust-grey-*` و`--color-rose-kiss-*` و`--surface-warm`).
- توحيد الخطوط المعتمدة مركزياً في `BaseLayout.astro` (`Alexandria`، `Amiri`، `Playfair Display`، `Plus Jakarta Sans`) وإزالة طلبات الخطوط القديمة (`Cairo`، `Tajawal`، `Inter`، `Space Grotesk`) وطلبات Font Awesome المكررة من صفحات المتجر.
- تثبيت حزمة `@lucide/astro` (الإصدار `1.74.0`) وإنشاء منظومة أيقونات موحدة للمكونات الساكنة (`Icon.astro`) وللإدراج البرمجي الآمن عبر JavaScript (`icons.ts`).
- بناء وإطلاق نظام الإشعارات العالمي **`DandyToast`** (`ToastHost.astro` + `toast.ts` + `window.DandyToast.show(...)`) مع دعم كامل لإمكانية الوصول (Accessibility)، وRTL/LTR، وحماية الخيوط المتداخلة مع ويدجت المساعد `<dandy-bab-widget>` وشريط الجوال السفلي.
- التحقق الفعلي من التعديلات عبر اختبارات الوحدة (`tsx --test`)، والمزامنة والترجمة (`npm run lint` و`npm run build`)، والفحص البصري والحاسوبي داخل متصفح Chromium الحقيقي عبر `playwright-cli`.

---

## 2. قائمة الملفات المنشأة والمعدّلة مع مبرراتها

### أولاً: الملفات المنشأة حديثاً
1. **`src/styles/tokens.css`**: المصدر الوحيد المعتمد لجميع متغيرات الألوان، الخطوط، التدرجات الطباعية المرنة، المسافات (نظام `8px`)، حدود الحاويات، أنصاف الأقطار، الظلال، الانتقالات، سلم `z-index`، بالإضافة إلى طبقة التوافق الآمن للمتغيرات القديمة (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`).
2. **`src/styles/base.css`**: إعدادات الأساس المنضبطة على مستوى الوثيقة (`html`, `body`)، وقواعد الخطوط ثنائية اللغة (`ar`/`en`)، وضمان `letter-spacing: 0` لنصوص العربية RTL داخل `.dandy-prose`، وعزل الاتجاه `.dandy-bidi-ltr`، ومؤشر التركيز `:focus-visible` عالي التباين.
3. **`src/styles/components.css`**: الأنماط المشتركة بنطاق معزول `.dandy-*` (`.dandy-container`، `.dandy-container-reading`، `.dandy-icon`، أزرار `.dandy-btn` بأشكالها، وأنماط حاوية وعناصر `DandyToast` على سطح المكتب والجوال).
4. **`src/styles/animations.css`**: حركات دخول وخروج `DandyToast` المعتمدة حصراً على خصائص الـ Compositor (`transform` و`opacity`) مع احترام كامل لتفضيل `prefers-reduced-motion: reduce`.
5. **`src/components/ui/Icon.astro`**: مكون Astro موحد يغلف استيرادات `@lucide/astro/icons/*` الساكنة بسمك خط افتراضي `1.75` ودعم عكس الاتجاه في RTL وإمكانية الوصول (`aria-hidden` أو `role="img"` + `aria-label`).
6. **`src/scripts/icons.ts`**: سجل أيقونات صارم ومغلق (`getIconSvg`, `createIconElement`, `isSupportedIcon`) للاستخدام داخل النصوص البرمجية الديناميكية في المتصفح دون قبول HTML غير موثوق.
7. **`src/scripts/toast.ts`**: منطق التحكم في `DandyToast` (`normalizeToastOptions`, `sanitizeActionUrl`, `createDandyToastController`, `initDandyToast`) مع إتاحة `window.DandyToast` عالمياً.
8. **`src/components/ui/ToastHost.astro`**: المضيف العالمي لحاوية الإشعارات ومناطق القراءة الفورية لذوي الإعاقة البصرية (`aria-live="polite"` و`aria-live="assertive"`).
9. **`src/scripts/foundation.test.ts`**: اختبارات وحدة عبر `node:test` للتحقق من منطق `icons.ts` و`toast.ts` (معالجة الروابط الخطرة، تطبيع الخيارات، ترميز الخصائص، والأسماء غير المعروفة).

### ثانياً: الملفات المعدّلة ضمن نطاق المرحلة الأولى
1. **`package.json` و`package-lock.json`**: إضافة الاعتماد `@lucide/astro@^1.74.0` بعد التحقق من توافقه الرسمي مع `astro@^7.3.1` (`peerDependencies: "^4 || ^5 || ^6 || ^7"`).
2. **`src/layouts/BaseLayout.astro`**:
   - استيراد ملفات الأساس الأربعة (`tokens.css`, `base.css`, `components.css`, `animations.css`) ومكون `<ToastHost />` قبل `<ConsentBanner />`.
   - تحديث `<meta name="theme-color" content="#FAF8F6" />`.
   - توحيد طلب Google Fonts ليحمل فقط الحزمة المعتمدة (`Alexandria`، `Amiri`، `Playfair Display`، `Plus Jakarta Sans`).
   - الإبقاء الكامل على Font Awesome 6.4.0 CDN المركزي، وFirebase، و`ConsentBanner`، و`<dandy-bab-widget>`، والسكريبتات التشغيلية كما هي.
3. **`public/assets/css/foundation.css`**: إزالة كتلة `:root` المكررة والمختلطة، وتوحيد ترويسات `h1–h6` لاستخدام `var(--dandy-ink-primary)` و`var(--dandy-font-ar-sans)` و`letter-spacing: 0`.
4. **`public/assets/css/style.css`**: إزالة `@import` الخاص بخطوط `Inter`/`Playfair`/`Space Grotesk` وإزالة كتلة `:root` المتعارضة؛ ترحيل `body` و`h1–h4` إلى `--dandy-ink-primary` و`--dandy-font-ar-sans`، وترحيل محددات أزرار الشراء الصريحة إلى `--dandy-accent-primary` و`--dandy-accent-hover` وتحديث `.cat-card-title` إلى `--dandy-font-en-display`.
5. **`public/assets/css/layout.css`**: إزالة كتلة `:root` المتعارضة، وتحديث الخطوط إلى `--dandy-font-ar-sans` و`--dandy-font-en-display`، وترحيل شريط الإعلان والأزرار التفاعلية إلى `--dandy-accent-*`، وتصحيح `:focus-visible` إلى `var(--dandy-ink-primary)`.
6. **`public/assets/bab/widget/bab-widget.css`**: ربط متغيرات `:host` داخل Shadow DOM (`--bab-primary`, `--bab-accent`, `--bab-bg`, `--bab-font`, إلخ) بمتغيرات `--dandy-*` مع قيم احتياطية (fallbacks) وإزالة `'Cairo'` دون تعديل منطق JS أو إعادة تصميم الويدجت.
7. **`src/pages/product/[...slug].astro`**: إزالة روابط Google Fonts (`Tajawal`) وFont Awesome 6.4.0 المكررة وإزالة `:root` المحلي المتعارض، وتوجيه `body` إلى `var(--dandy-font-ar-sans)` و`var(--dandy-ink-primary)`.
8. **`src/pages/category/[category].astro`**: إزالة روابط Google Fonts (`Cairo` + `Playfair Display`) وFont Awesome 6.4.0 المكررة وإزالة `:root` المحلي المتعارض الذي كان يطغى على ألوان الترويسة والفئات.
9. **تنظيف مراجع الخطوط المتقادمة في الصفحات والمكونات**:
   - `src/pages/product.astro` (`'Tajawal'` ← `var(--dandy-font-ar-sans)`)
   - `src/pages/post.astro`، `src/pages/blog/[...slug].astro`، `src/pages/404.astro` (`'Space Grotesk'` على أرقام الخطأ ← `var(--dandy-font-en-display)`)
   - `src/pages/invoice.astro` (`'Space Grotesk'` على عنوان الفاتورة العربي ← `var(--dandy-font-ar-sans)`)
   - `src/pages/index.astro` و`src/components/Header.astro` (إزالة `'Cairo'` و`--font-editorial` وتوجيهها إلى `--dandy-font-ar-sans` و`--dandy-font-en-display`).

---

## 3. نظام المتغيرات التصميمية الجديد (`src/styles/tokens.css`)
تم بناء النظام وفق فئات دلالية واضحة مع الحفاظ على نسبة تباين WCAG AA:
- **الخلفيات والأسطح:**
  - `--dandy-bg-page: #FFFFFF` (خلفية الصفحات التجارية)
  - `--dandy-bg-editorial: #FAF8F6` (خلفية تحريرية دافئة — Porcelain Warm)
  - `--dandy-bg-stage: #F5F4F1` (مسرح عرض المنتجات والبطاقات)
  - `--dandy-bg-dark: #1A1715` (التباين الداكن / الفوتر)
- **الحبر والنصوص (النص الافتراضي المقروء):**
  - `--dandy-ink-primary: #1A1715` (Espresso Ink للعناوين والنصوص الأساسية)
  - `--dandy-ink-secondary: #4A4540` (للنصوص التحريرية والوصف)
  - `--dandy-ink-muted: #7A736C` (للبيانات الثانوية والتاريخ والمواصفات)
  - `--dandy-ink-inverse: #FAF8F6`
- **الهوية النباتية والتحريرية:**
  - `--dandy-botanical-deep: #2B3A2C` و`--dandy-botanical-soft: #EFF3EE` و`--dandy-plum-ink: #3D242C`
- **اللون التجاري المميز (Selective Commercial Accent):**
  - `--dandy-accent-primary: #C83269`، `--dandy-accent-hover: #A92455`، `--dandy-accent-soft: #FDF2F6`، `--dandy-accent-text: #9D1B4D`
- **الذهبي التحريري:** `--dandy-gold-editorial: #9E7B3B` و`--dandy-gold-soft: #FAF5EB`
- **الحدود والخطوط الفاصلة:** `#EDE9E3` (`subtle`)، `#D9D2C9` (`default`)، `#1A1715` (`strong`)، `#F3C4D7` (`accent`)
- **الألوان الوظيفية:** نجاح `#15803D`، تحذير `#B45309`، خطر/خطأ `#BE123C`، معلومات `#2B3A2C`
- **المسافات، الأقطار، الظلال، والطبقات:** سلم مسافات مضاعف لـ `8px` (`4px` إلى `96px`)، حاويات `1320px` و`760px`، أنصاف أقطار منضبطة (`2px`, `6px`, `10px`, `16px`, `9999px`)، 4 مستويات ظل فقط، وسُلّم `z-index` منظم يضمن بقاء `DandyToast` (`--dandy-z-toast: 2147483500`) فوق كل العناصر الأخرى.

---

## 4. نظام الخطوط والطباعة (`BaseLayout.astro` + `base.css`)
- **الخطوط المعتمدة والمحمّلة مركزياً:**
  - العربية للواجهات والنصوص: **`Alexandria`** (`400, 500, 600, 700`) عبر `--dandy-font-ar-sans`
  - العربية التحريرية/العرض الفاخر: **`Amiri`** (`700`) عبر `--dandy-font-ar-display`
  - الإنجليزية التحريرية: **`Playfair Display`** (`600, 700, 600 italic`) عبر `--dandy-font-en-display`
  - الإنجليزية للواجهات والأرقام: **`Plus Jakarta Sans`** (`400, 500, 600`) عبر `--dandy-font-en-sans`
- **حماية الطباعة العربية وثنائية اللغة:**
  - تطبيق `letter-spacing: 0` صراحةً في سياقات `html[dir="rtl"]` لحماية اتصال الحروف العربية.
  - إضافة فئة `.dandy-tabular` (`font-variant-numeric: tabular-nums lining-nums`) لتنسيق الأسعار وأرقام الطلبات.
  - إضافة فئة `.dandy-bidi-ltr` (`direction: ltr; unicode-bidi: isolate;`) لعزل العملات والمقاسات الإنجليزية داخل السياق العربي.
- تم إزالة طلبات `Cairo` و`Tajawal` و`Inter` و`Space Grotesk` من الواجهات الموجهة للعملاء بعد ترحيل كافة استخداماتها في `src/pages/` و`src/components/` و`public/assets/css/`. *(ملاحظة: لوحات الإدارة الداخلية مثل `statues.astro` و`DashboardNav.astro` لم يتم تعديلها لالتزامها بحدود نطاق المرحلة).*

---

## 5. قرارات التوافق مع ملفات CSS القديمة ومعالجة التعارضات
كشفت المراجعة قبل التعديل وجود 3 مشكلات جوهرية في `foundation.css` و`style.css` و`layout.css`:
1. **تعارض `--color-primary`:** عرّف `foundation.css` المتغير `#38121d` كلون حبر داكن، ثم قام `style.css` و`layout.css` (اللذان يُحمّلان بعده) بإعادة تعريفه إلى `#fe5d9f` (وردي فاقع)، مما أدى لتلون عناوين وفقرات صفحات مثل `about-us` و`blog` و`help` و`contact-us` بالوردي.
   - **الحل المعتمد:** استعادة `--color-primary` في `tokens.css` ليشير إلى `var(--dandy-ink-primary)` (`#1A1715`) و`--color-primary-hover` إلى `var(--dandy-plum-ink)` (`#3D242C`)، بينما جرى ترحيل أزرار الدعوة للشراء الصريحة داخل `style.css` و`layout.css` إلى `--dandy-accent-primary` و`--dandy-accent-hover`.
2. **متغيرات مفقودة بلا تعريف:** كانت صفحات المتجر و`Header.astro` و`index.astro` تستخدم `--color-dust-grey-*` و`--color-rose-kiss-*` و`--surface-warm` التي لم تكن معرفة في أي `:root` عالمي. تم تعريفها جميعاً في القسم 13 من `tokens.css`.
3. **كتل `:root` محلية في الصفحات:** أزيلت من `product/[...slug].astro` و`category/[category].astro` لمنع طغيانها على `Header`/`Footer` في تلك المسارات، مع الحفاظ على التوافق الكامل مع `foundation.css` و`style.css` و`layout.css` دون حذف أي منها.

---

## 6. منظومة الأيقونات (`@lucide/astro` + `Icon.astro` + `icons.ts`)
- تم التحقق من توافق `@lucide/astro@1.74.0` مع `astro@^7.3.1`، وتبين أن الحزمة تستخدم أسماء `circle-x` و`trash` بدلاً من `circle-alert` و`trash-2`، لذا رُبطت خريطة `Icon.astro` بالوحدات الصحيحة مباشرةً.
- **`src/components/ui/Icon.astro`**: يدعم 26 أيقونة أساسية للتجارة الإلكترونية والواجهة (الحقيبة، القلب، البحث، المستخدم، القائمة، الأسهم، الشارات النباتية والأمان والشحن، السلة، الفلاتر، مؤشرات الحالة)، بسمك موحد `1.75` وحجم افتراضي `18px`، مع فئة `.dandy-icon-directional` لعكس اتجاه الأسهم في RTL.
- **`src/scripts/icons.ts`**: يوفر `getIconSvg` و`createIconElement` من سجل مسارات SVG ثابت ومُتحقق منه (`ICON_PATHS`) للاستخدام في JavaScript دون حقن HTML عشوائي.
- **Font Awesome:** بقيت مكتبة Font Awesome 6.4.0 محملةً مركزياً في `BaseLayout.astro` لعدم كسر أي صفحة قائمة، وأُزيل فقط الطلب المكرر لها من `product/[...slug].astro` و`category/[category].astro`.

---

## 7. نظام الإشعارات `DandyToast` (الواجهة البرمجية والتصميم)
- **الواجهة العالمية:** `window.DandyToast` تحتوي على:
  - `show(input: string | DandyToastOptions): string | null`
    - الأنواع: `'success' | 'error' | 'info'`
    - الخيارات: `message`، `type`، `duration` (افتراضي `4200ms` و`6000ms` للأخطاء، و`0` للثابت)، `actionLabel`، `actionUrl` (مفلترة عبر `sanitizeActionUrl` لقبول المسارات النسبية و`http/https` فقط)، `dismissible`
  - `dismiss(id: string, immediate?: boolean): void`
  - `clear(): void`
- **الانضباط البصري والتموضع:**
  - على سطح المكتب (`>= 768px`): يظهر في أسفل `inset-inline-start` (`right: 24px` في RTL)، وهو الجانب المقابل تماماً لويدجت المساعد (`BAB`) المثبت على اليسار (`left: 24px`).
  - على الجوال (`< 768px`): يظهر كشريط علوي أنيق عند `top: calc(72px + env(safe-area-inset-top))` لضمان عدم التداخل مع شريط التنقل السفلي أو أيقونة BAB.
- **الاستقرار والأمان وإمكانية الوصول:**
  - إنشاء عناصر DOM بأمان عبر `textContent` (حماية كاملة ضد XSS).
  - الحد الأقصى للتراكم: `3` إشعارات (`MAX_VISIBLE_TOASTS = 3`) مع طرد فوري للإشعار الأقدم عند تجاوز الحد.
  - مناطق حية منفصلة: `aria-live="polite"` + `role="status"` للنجاح والمعلومات، و`aria-live="assertive"` + `role="alert"` للأخطاء.
  - إيقاف مؤقت للإخفاء التلقائي عند `mouseenter` أو `focusin`، ودعم الإغلاق بزر `×` أو مفتاح `Escape`.

---

## 8. التكامل مع `BaseLayout.astro`
- يحمّل `BaseLayout.astro` ملفات `tokens.css` و`base.css` و`components.css` و`animations.css` قبل الروابط الخارجية في `<head>`، متبوعة بملفات CSS القديمة (التي لم تعد تحتوي على `:root` متعارض) مما يضمن سيادة توكنات المرحلة الأولى في كافة الصفحات.
- تم تحميل Google Fonts وFont Awesome عبر `<link>` مركزي واحد في `<head>`.
- تم تركيب `<ToastHost />` مباشرةً قبل `<ConsentBanner />` داخل `<body>` ليصبح `window.DandyToast` متاحاً تلقائياً في كل صفحات الموقع.

---

## 9. توافق ويدجت المساعد `<dandy-bab-widget>`
- يعمل الويدجت داخل Shadow DOM (`open`) ويعتمد على متغيرات `--bab-*` المعرّفة في `public/assets/bab/widget/bab-widget.css`.
- تم ربط متغيرات `:host` بمتغيرات النظام الجديدة مع قيم احتياطية آمنة:
  - `--bab-primary: var(--dandy-plum-ink, #3D242C)`
  - `--bab-accent: var(--dandy-accent-primary, #C83269)`
  - `--bab-bg: var(--dandy-bg-page, #FFFFFF)`
  - `--bab-surface: var(--dandy-bg-editorial, #FAF8F6)`
  - `--bab-text: var(--dandy-ink-primary, #1A1715)`
  - `--bab-font: var(--dandy-font-ar-sans)`
- في اختبار Chromium الحي: فتح وإغلاق لوحة المساعد تم بدون أخطاء، مع عدم وجود أي تداخل هندسي بين زر BAB (`left: 24..76`) وحاوية `DandyToast` (`left: 1026..1416`).

---

## 10. نتائج التحقق البصري والوظيفي في المتصفح (`playwright-cli`)
تم تشغيل الخادم على `http://localhost:3000` وفحص الصفحات فعلياً على عرضين (`1440×900` لسطح المكتب و`390×844` للجوال):
- **صفحات تم التحقق منها حياً:**
  `/`, `/about-us`, `/category/skin-care`, `/all-products`, `/product/facial-serum-3x1-30ml`, `/blog`, `/contact-us`, `/help`, `/client-reviews`, `/track-order`, `/cart`, `/account-login`, `/account-signup`, `/pink-friday`.
- **النتائج الحاسوبية (Computed Styles):**
  - `dir="rtl"` و`lang="ar"`.
  - الخط المحسوب على `body`: `Alexandria, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` مع تحميل أوزان `Alexandria` (`400, 500, 600, 700`) بنجاح (`document.fonts.status === "loaded"`).
  - لون العناوين والنصوص في `/about-us` و`/all-products` و`/category/skin-care` و`/product/facial-serum-3x1-30ml` وبقية الصفحات القياسية: `rgb(26, 23, 21)` (`#1A1715`) بدلاً من الوردي المكسور سابقاً.
  - عدد روابط Font Awesome في `category` و`product/[...slug]` انخفض من `2` إلى `1`.
- **اختبار `DandyToast` التفاعلي في المتصفح (بعد إصلاح الطرد الفوري للتراكم):**
  - عند إطلاق 4 إشعارات متتالية: بقي العدد المرئي في DOM يساوي `3` بالضبط (`إشعار 2`، `إشعار 3`، `إشعار 4`).
  - مناطق القراءة الحية سجلت النصوص بدقة: `livePolite === "إشعار 4"` و`liveAssertive === "إشعار 3"`.
  - نجح الإغلاق بزر `×` وبمفتاح `Escape`.
  - على الجوال `390×844`: عرض التمرير الأفقي `scrollWidth === 390` (دون أي فائض أفقي)، وتموضع الإشعار في الأعلى (`top: 72..144`) بعيداً تماماً عن أيقونة BAB (`top: 716..764`) والشريط السفلي.
- **الأخطاء والشبكة:** `0` أخطاء أو تحذيرات في Console (`Errors: 0, Warnings: 0`).

---

## 11. نتائج الاختبارات والبناء والفحص (`lint` / `build` / `unit tests`)
تم تنفيذ كافة الفحوصات بعد آخر تعديل كودي:
1. **اختبارات الوحدة (`npx --yes tsx --test src/scripts/foundation.test.ts`):** `4/4` ناجحة (`0` فشل).
2. **فحص المزامنة والأنواع (`npm run lint` / `astro sync`):** مكتمل بنجاح (`Generated 416ms`).
3. **البناء الكامل للإنتاج (`npm run build`):** مكتمل بنجاح دون أي أخطاء ترجمة.

---

## 12. التحقق من عدم التراجع (Regression Verification)
- الهيدر، الفوتر، لافتة الخصوصية (`ConsentBanner`)، سلايدر الصفحة الرئيسية، صفحة الفئة، صفحة المنتج مع التنوعات والأسعار والخصومات، وسلة التسوق جميعها تحمّل وتعمل دون أي تراجع وظيفي أو بصري أو تعارض في التخطيط.
- لم يتم تعديل أي استعلام Firebase أو API أو قواعد حماية أو إعدادات Astro/Vercel.

---

## 13. القيود المعروفة والملاحظات الفنية
- **مكون `Icon.astro`:** تم التحقق من استيراداته وتطابقه التام مع تعريفات TypeScript داخل `@lucide/astro/src/types.ts` و`createLucideIcon.ts`، لكنه لم يُستدعَ بعد داخل صفحات الواجهة لأن استبدال أيقونات الهيدر والفوتر والبطاقات يدخل في المراحل اللاحقة لإعادة بناء المكونات.
- **صفحات لوحة التحكم الإدارية:** (`statues.astro`, `dashboard*.astro`, `DashboardNav.astro`) احتفظت باستعلام `'Cairo'` الاحتياطي لأنها خارج نطاق المرحلة الأولى، وتعتمد على خطوط النظام بسلاسة دون أخطاء.
- **مجلد `/assets/` الجذري القديم:** لم يتم تعديله في هذه المرحلة لأن Astro يخدم الأصول الثابتة من `/public/assets/` فقط.

---

## 14. التوصيف الصادق للحالة (مُنفذ ومُختبر مقابل المؤجّل)
| العنصر | الحالة | التفاصيل |
| :--- | :---: | :--- |
| نظام المتغيرات `tokens.css` وطبقة التوافق | **مُنفذ ومُختبر** | تم فحص قيم CSS الحية على المتصفح عبر 14 مساراً |
| نظام الخطوط المركزية وإزالة المكررات | **مُنفذ ومُختبر** | تم التحقق من `document.fonts` وعدم تحميل `Cairo`/`Tajawal`/`Space Grotesk` |
| إصلاح تعارض `--color-primary` وألوان النصوص | **مُنفذ ومُختبر** | تم التحقق من لون `rgb(26, 23, 21)` في الصفحات واللقطات الحية |
| منظومة `DandyToast` (`window.DandyToast`) | **مُنفذ ومُختبر** | اختُبر بالوحدات وبمتصفح Chromium على سطح المكتب والجوال (الحد الأقصى 3، ARIA، Escape، زر الإغلاق) |
| توافق `<dandy-bab-widget>` Shadow DOM | **مُنفذ ومُختبر** | فُحص الفتح والألوان والتموضع بلا تداخل |
| سجل أيقونات JS (`icons.ts`) | **مُنفذ ومُختبر** | اختُبر بالوحدات وبداخل `DandyToast` في Chromium |
| مكون `<Icon />` (`Icon.astro`) | **مُنفذ (غير مستهلك بعد في الصفحات)** | جاهز ومطابق لعقود `@lucide/astro@1.74.0`؛ سيُختبر عملياً عند استبدال أيقونات الواجهة في المرحلة الثانية |
| استبدال `window.alert()` وبناء الهيدر والفوتر والصفحات | **مؤجّل للمراحل القادمة** | مستبعد عمداً التزاماً بحدود المرحلة الأولى |

---

## 15. التوصية الدقيقة للمرحلة الثانية (Phase 2)
استناداً إلى المخطط المعتمد `DANDY_COMPLETE_UI_UX_BLUEPRINT_AR.md`، يجب أن تركز **المرحلة الثانية (Phase 2 — Navigation Shell & Core Commerce Primitives)** حصرياً على:
1. **إعادة بناء الغلاف التجاري والتنقلي (`Header.astro`, `Footer.astro`, وMobile Bottom Navigation)** باستخدام توكنات `--dandy-*` وأيقونات `<Icon />` الجديدة، ومعالجة تكدس الروابط وحل تعارض ارتفاع الهيدر وشريط الإعلان وتوحيد تجربة البحث وسلة التسوق الجانبية.
2. **بناء مكون بطاقة المنتج الموحد (`ProductCard.astro`)** وفق هوية Botanical Editorial Commerce (نسبة صورة منضبطة، شارات خصم/نفاد واضحة، أزرار الإضافة للسلة والمفضلة الموصولة بـ `window.DandyToast`، ودعم التمرير/التقييمات) ليصبح الأساس المشترك للصفحة الرئيسية وصفحات الفئات وجميع المنتجات.
3. **الترحيل التدريجي للتنبيهات التفاعلية** في الهيدر والسلة وبطاقات المنتجات من `window.alert()` وملصقات Toast المحلية المبعثرة إلى `window.DandyToast.show(...)`.
