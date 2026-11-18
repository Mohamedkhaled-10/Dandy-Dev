# التقرير النهائي للمرحلة السابعة (Phase 7) — نظام الظهور التدريجي وحركة الصفحات العام
**المشروع:** متجر داندي كوزمتكس (`Dandy Cosmetics`) — **Botanical Editorial Commerce**  
**التاريخ:** نوفمبر 2026  
**الحالة:** مكتمل ومُتحقَّق منه (Build + Lint + Unit Tests + Playwright Chromium + Protected SHA-256)

---

## 1. الملخص التنفيذي
تم تنفيذ **المرحلة السابعة: نظام الظهور التدريجي وحركة الصفحات العام (Global Page Entrance & Progressive Content Reveal System)** عبر صفحات واجهة العميلات في متجر **Dandy Cosmetics** بأسلوب بصري تحريري هادئ يتكوّن من تلاشي ناعم وارتفاع طفيف (`Soft Fade + Gentle Rise`) دون أي شاشات تحميل، أو أوقات انتظار مصطنعة، أو حجب لمحتوى العرض الأولي أو صور **LCP**، ودون التأثير على تفاعلية الشراء أو البحث أو الفلاتر.

اعتمد التنفيذ على مبدأ **التحسين التدريجي الآمن (Progressive Enhancement)** عبر محرك خفيف موحّد يدمج **CSS Compositor (`opacity`, `transform`)** مع **`IntersectionObserver` مشترك وحيد** ومتغير تدرج على مستوى الدفعات (`Batched Stagger`) في `src/scripts/page-entrance.ts`، مع توحيد واجهة `DandyAnimationController` في `src/utils/animations.ts` والتهيئة المركزية في `src/layouts/BaseLayout.astro`، واستبعاد مسارات لوحة التحكم والإدارة بالكامل.

**التمييز الصريح للحالة:**
- **مُنفَّذ:** البنية الكاملة للحركة، متغيرات التصميم، قواعد `CSS Compositor`، منطق الأهلية والدفعات القابل للاختبار، التهيئة عبر `BaseLayout.astro`، التكامل مع `catalog-client.ts`، وتغطية صفحات المتجر والرحلة الشرائية والمحتوى وحسابات العميلات (`42` ملفاً مُعدَّلاً + `4` ملفات جديدة تشمل هذا التقرير وتقرير التدقيق والاختبار).
- **مُختبَر فعلياً:** اختبارات الوحدة (`56/56` عبر `tsx --test`)، البناء الإنتاجي (`npm run build`)، فحص الـ Lint (`npm run lint`)، اختبارات المتصفح الحقيقي `Chromium` عبر `playwright-cli` على أحجام الشاشات الخمسة (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`)، التمرير الكامل وتسجيل الفيديو، `prefers-reduced-motion: reduce`، تعطل JavaScript (`javaScriptEnabled: false`)، محاكاة الاستعادة من `bfcache`، اختبار `dir="ltr"`، استبعاد `/login`، والتفاعل مع البحث، القائمة الجانبية للموبايل، الإضافة للسلة، وخطوات `/cart`.
- **غير مُختبَر:** الحالة الداخلية المصادَق عليها لصفحة `/account` (إذ يتطلب المسار جلسة Firebase Auth مسجّلة، وعند عدم تسجيل الدخول أعاد التوجيه بنجاح إلى `/account-login` وتم اختباره)، عرض فاتورة حقيقية عبر `/invoice?code=...` مرتبطة بطلب فعلي في قاعدة البيانات (تم اختبار هيكل الصفحة الفارغ/الافتراضي فقط)، وحالات الخطأ الشبكي الخارجي لتقييمات Firebase RTDB داخل `/client-reviews` (تم اختبار المسار وترويسة الصفحة).
- **مؤجَّل:** أي نسخة إنجليزية للواجهة أو مبدّل لغات أو مسارات ترجمة (`i18n / locale routing`) — خارج نطاق المرحلة السابعة بالكامل، مع ضمان جاهزية المحرك للعمل المحايد مع `dir="ltr"` مستقبلاً.

---

## 2. ملخص تدقيق بنية الحركة الأولي (قبل التنفيذ)
تم توثيق التدقيق الميداني الكامل في `DANDY_PHASE_7_MOTION_AUDIT_AR.md` قبل أي تعديل برمجي، وكشف ما يلي:
- ملف `src/utils/animations.ts` كان يحتوي على `DandyAnimationController` باستخدام GSAP/ScrollTrigger ولكنه **غير مستورد أو مستدعى** في `BaseLayout.astro` أو `index.astro`.
- المحددات المستهدفة داخل `animations.ts` كانت تعود لفترة ما قبل المرحلة الثالثة (`#cinematicCurtain`، `#hero-editorial-section`، `.modern-product-card`، `.scroll-reveal-up`) ولم تعد موجودة في DOM.
- الحركات الفعّالة سابقاً اقتصرت على انتقال خطوات `/cart` (`dandyStepFade`)، انتقال شرائح `HeroEditorial`، ورسائل `DandyToast`.
- احتوى `public/assets/css/layout.css` على فئة قديمة `.reveal-item { opacity: 0; }` لم نعتمد عليها في المرحلة السابعة حفاظاً على ظهور المحتوى.

---

## 3. الوظائف الحالية التي أُعيد استخدامها وتوحيدها
- فحص وتفعيل ملفات التنسيق القائمة في `src/styles/tokens.css` و`src/styles/animations.css` دون إضافة ملفات CSS منفصلة أو مكتبات خارجية.
- الحفاظ على نمط Singleton واسم الكائن العام `window.DandyAnimationController` داخل `src/utils/animations.ts` وتوجيه دواله (`init`, `refresh`, `revealAll`, `destroy`) إلى محرك `PageEntranceManager` الموحّد.
- الحفاظ على حركات التوست `dandyToastEnter` / `dandyToastExit` وحركة خطوات الشراء `dandyStepFade` وتفاعل شرائح الهيرو كما هي دون تضارب.

---

## 4. المشكلات التي اكتُشفت في النظام السابق (وأثناء الفحص الميداني)
1. **انقطاع كامل عن التشغيل:** عدم ارتباط `animations.ts` بالـ Layout العام أو بأي صفحة.
2. **غياب التحسين التدريجي الآمن:** عدم وجود آلية تحمي العناصر من البقاء مخفية إذا فشل JS أو عند الرجوع عبر سجل المتصفح (`bfcache`).
3. **إزاحات اتجاهية صلبة (`x: ±50px`) ومسافات/فترات ثقيلة (`35px`, `0.75s–0.9s`):** غير متوافقة مع حيادية الاتجاه (RTL/LTR) ولا مع إيقاع التجارة التحريرية الهادئ.
4. **تأخر الاستجابة عند التمرير في الشبكات الطويلة (تم رصده أثناء الجولة الأولى في Chromium):** في الاختبار التفاعلي الأول عبر `r1-home-scroll.webm`، تأخر ظهور شبكة `CategoryDiscovery` لحظياً عند استخدام `rootMargin: '0px 0px -36px 0px'` و`threshold: 0.06`؛ وتمت معالجته في الجولة الثانية بتعديل الإعداد إلى `rootMargin: '0px 0px 48px 0px'` و`threshold: 0.01` مع مسح تعويضي مربوط بـ `requestAnimationFrame` يُفكّ تلقائياً فور اكتمال كشف جميع العناصر (`observedTargets.size === 0`)، وتحويل `ReviewsHomeSection` إلى `data-dandy-stagger="grid"`.

---

## 5. بنية الحركة الجديدة (المُنفَّذة)
تعتمد البنية الجديدة على ثلاثة أركان متكاملة دون تحميل GSAP أو إنشاء `ScrollTrigger` مكررة:
1. **طبقة القرارات النقية (`src/scripts/page-entrance.ts`):**
   - `isExcludedMotionRoute`، `shouldEnableMotion`، `getMotionProfile`، `computeStaggerDelayMs`، `computeEntranceDelayMs`، `isRectInInitialViewport`.
2. **مدير التشغيل الوحيد (`PageEntranceManager` Singleton في `src/scripts/page-entrance.ts`):**
   - يتهيأ مرة واحدة عبر `BaseLayout.astro` من خلال `DandyAnimationController.getInstance().init()`.
   - يضيف الفئة `html.dandy-motion-ready` عند السماح بالحركة فقط.
   - يدير `IntersectionObserver` وحيداً يُعيد استخدامه ويفكّ المراقبة (`unobserve`) فور ظهور كل عنصر.
   - يتضمن مستمع `focusin` فورياً على `document`، ومستمع `pageshow` لمعالجة `bfcache`، ومزامنة مع الحدث المخصّص `dandy:catalog-updated` عند فرز/بحث/فلترة المنتجات.
3. **طبقة العرض المركّب (`src/styles/animations.css` + `src/styles/tokens.css`):**
   - الحالة الافتراضية لكل العناصر هي **الظهور الكامل (`opacity: 1; transform: none;`)**.
   - تفعيل الإزاحة والشفافية فقط للعناصر المربوطة بـ `data-dandy-motion-state="pending"` تحت `html.dandy-motion-ready:not(.dandy-motion-reduced):not(.dandy-motion-instant)`.
   - انتقال العنصر إلى `data-dandy-motion-state="revealed"` ثم `data-dandy-motion-state="settled"` مع إزالة `--dandy-stagger-delay` وعدم ترك أي قواعد تعيق `hover` أو `focus` الأصلي.

---

## 6. سلوك الحركة العام (Global Behavior)
- **الحماية الأولية (LCP & No-JS Fallback):** إذا لم يعمل JavaScript أو تعذّر `IntersectionObserver` أو تم استدعاء صفحة مستبعدة، تظل جميع العناصر بـ `opacity: 1` تماماً دون أي وميض إخفاء.
- **عدم إعادة التشغيل:** بعد تحوّل العنصر إلى `settled`، لا تُعاد حركته عند التمرير صعوداً وهبوطاً، ولا عند تغيير حجم النافذة (`resize`)، ولا عند تحديث عداد السلة أو اختيار روائح/أحجام المنتج، ولا عند تعديل نتائج البحث في الكتالوج.
- **معالجة سجل المتصفح (`bfcache`):** عند استعادة الصفحة (`pageshow` مع `event.persisted === true`) تُضاف فئة `html.dandy-motion-instant` وتُحسم كل العناصر فوراً إلى `settled` بدون حركة.
- **اتجاه محايد (RTL / LTR Ready):** الحركة عمودية فقط (`translate3d(0, distance, 0)` و`scale`) دون أي قيم `translateX` أو أسماء نصوص عربية داخل منطق JavaScript.

---

## 7. سلوك الظهور التدريجي والسمات الدلالية (Progressive Reveal Markers)
| السمة الدلالية | الدور والسلوك |
|---|---|
| `data-dandy-motion="expressive" \| "editorial" \| "calm"` | يحدد ملف السرعة والمسافة على مستوى الصفحة/القسم (`expressive` للرئيسية، `editorial` الافتراضي للمحتوى والكتالوج، `calm` لمسارات الشراء والفاتورة والحساب). |
| `data-dandy-entrance="0..N"` | تتابع الظهور في نافذة العرض الأولية (الوسم التعريفي ← العنوان الرئيسي ← الوصف ← الأزرار). |
| `data-dandy-media-settle` | تكبير هادئ للوسائط التحريرية من `scale(0.986)` إلى `scale(1)` مع بقاء `opacity: 1` طوال الوقت لحماية `LCP`. |
| `data-dandy-reveal` | كشف القسم أسفل الطي مرة واحدة عند دخوله نافذة العرض (`IntersectionObserver`). |
| `data-dandy-stagger="group" \| "grid"` | تدرج العناصر الفرعية: `"group"` يكشف المجموعة المترابطة معاً، و`"grid"` يراقب البطاقات بنظام دفعات (`batchSize = 4`) لتفادي التأخير التراكمي في الشبكات الكبيرة. |
| `data-dandy-reveal-child` | عنصر فرعي (بطاقة منتج، مقال، قناة تواصل، فئة) داخل حاوية `data-dandy-stagger`. |

---

## 8. تغطية المسارات (Route Coverage)
- **المتجر الأساسي (مُنفَّذ):** `/`, `/all-products`, `/category/[category]`, `/product/[...slug]`, `/special-offers`, `/pink-friday`.
- **رحلة الشراء بملف `calm` (مُنفَّذ):** `/cart`, `/invoice`, `/track-order`.
- **المحتوى والسياسات والأخطاء (مُنفَّذ):** `/about-us`, `/blog`, `/blog/[...slug]`, `/post`, `/client-reviews`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`, `/product` (مسار التحويل التراثي لـ 404).
- **حساب العميلة بملف `calm` (مُنفَّذ دون إعادة تصميم):** `/account`, `/account-login`, `/account-signup`.
- **المسارات المستبعدة بالكامل (مُتحقَّق من عدم تفعيل الحركة عليها):** `/dashboard*`, `/statues`, `/login`, وجميع `/api/*` ووضع المعاينة `?studio_preview=1`.

---

## 9. المكونات والصفحات المتكاملة
تم دمج السمات الدلالية في جميع المكونات المشتركة ومقاطع الرئيسية والكتالوج وصفحة المنتج ورحلة الشراء وصفحات المحتوى وحسابات العميلات (`42` ملفاً في `src/`):
- **القالب والهيكل:** `src/layouts/BaseLayout.astro`.
- **الصفحة الرئيسية ومقاطعها:** `src/pages/index.astro` (`data-dandy-motion="expressive"`), `HeroEditorial.astro`, `TrustStripSection.astro`, `CategoryDiscovery.astro`, `FeaturedProducts.astro`, `CustomStudioSection.astro`, `PinkFridayHomeSection.astro`, `EditorialBrandStory.astro`, `BlogHomeSection.astro`, `ReviewsHomeSection.astro`.
- **المنتج والكتالوج:** `ProductCard.astro`, `CategoryEditorialHeader.astro`, `ProductInfo.astro`, `ReviewSummaryPanel.astro`, `src/pages/all-products.astro`, `src/pages/category/[category].astro`, `src/pages/special-offers.astro`, `src/pages/pink-friday.astro`, `src/pages/product/[...slug].astro`, `src/scripts/catalog-client.ts`.
- **السلة والطلب والفاتورة والتتبع:** `CheckoutPageHeader.astro`, `src/pages/cart.astro`, `src/pages/invoice.astro`, `src/pages/track-order.astro`.
- **المحتوى والدعم والحساب:** `about-us.astro`, `blog.astro`, `blog/[...slug].astro`, `post.astro`, `client-reviews.astro`, `contact-us.astro`, `help.astro`, `privacy-policy.astro`, `terms.astro`, `404.astro`, `product.astro`, `account.astro`, `account-login.astro`, `account-signup.astro`.

---

## 10. الملفات المنشأة (Created Files)
1. `DANDY_PHASE_7_MOTION_AUDIT_AR.md` — تدقيق ما قبل التنفيذ وبصمات البداية.
2. `src/scripts/page-entrance.ts` — منطق القرار النقي + محرك `PageEntranceManager`.
3. `src/scripts/page-entrance.test.ts` — `6` اختبارات وحدة نقيّة عبر `node:test`.
4. `DANDY_PHASE_7_FINAL_REPORT_AR.md` — التقرير النهائي للمرحلة السابعة.

---

## 11. الملفات المعدّلة (Modified Files)
- **الأنماط والمنطق المركزي (5):** `src/styles/tokens.css`, `src/styles/animations.css`, `src/utils/animations.ts`, `src/layouts/BaseLayout.astro`, `src/scripts/catalog-client.ts`.
- **مكونات الواجهة والتجارة (14):** `ProductCard.astro`, `CategoryEditorialHeader.astro`, `CheckoutPageHeader.astro`, `ProductInfo.astro`, `ReviewSummaryPanel.astro`, `HeroEditorial.astro`, `TrustStripSection.astro`, `CategoryDiscovery.astro`, `FeaturedProducts.astro`, `CustomStudioSection.astro`, `PinkFridayHomeSection.astro`, `EditorialBrandStory.astro`, `BlogHomeSection.astro`, `ReviewsHomeSection.astro`.
- **صفحات المتجر والعميلات (23):** `index.astro`, `all-products.astro`, `category/[category].astro`, `special-offers.astro`, `pink-friday.astro`, `product/[...slug].astro`, `product.astro`, `cart.astro`, `invoice.astro`, `track-order.astro`, `about-us.astro`, `blog.astro`, `blog/[...slug].astro`, `post.astro`, `client-reviews.astro`, `contact-us.astro`, `help.astro`, `privacy-policy.astro`, `terms.astro`, `404.astro`, `account.astro`, `account-login.astro`, `account-signup.astro`.

---

## 12. مواصفات التوقيت والحركة (Timing & Motion Specs)
تم تعريف المتغيرات داخل `src/styles/tokens.css`:
- `--dandy-motion-duration-fast: 280ms` (`calm`)
- `--dandy-motion-duration-normal: 420ms` (`editorial`: `400ms` في المحرك / `420ms` في CSS؛ `expressive`: `450ms`)
- `--dandy-motion-duration-slow: 540ms` (`data-dandy-media-settle`)
- `--dandy-motion-distance: 10px` (`calm`: `6px`)
- `--dandy-motion-stagger: 50ms` (`expressive`: `55ms`, `editorial`: `45ms`, `calm`: `30ms`)
- `--dandy-motion-ease: cubic-bezier(0.22, 1, 0.36, 1)`
- `--dandy-motion-scale-from: 0.986`
- **تجميع الشبكات (Grid Batching):** دفعات من `4` عناصر كحد أقصى وبسقف تأخير `maxDelayMs` (`260ms` للرئيسية، `220ms` للكتالوج، `120ms` للوضع الهادئ) حتى لا تتأخر الصفوف في الشبكات ذات الـ `32+` منتجاً.

---

## 13. سلوك تقليل الحركة والوصول (Reduced Motion & A11y)
- عند تفعيل `prefers-reduced-motion: reduce`:
  - لا يُضيف المحرك `html.dandy-motion-ready`، بل يضيف `html.dandy-motion-reduced` ويثبّت جميع العناصر فوراً على `settled` (`opacity: 1; transform: none;`).
  - يتضمن `src/styles/animations.css` كتلة `@media (prefers-reduced-motion: reduce)` صريحة تلغي جميع الإزاحات والتأخيرات والتحجيم.
  - تم التحقق عملياً في Chromium باستخدام `emulateMedia({ reducedMotion: 'reduce' })` (`ready: false`, `reduced: true`, `zeroOpacityManaged: 0`).
- **دعم التركيز بلوحة المفاتيح (`focusin`):** أي عنصر أو حاوية `pending` يتلقى التركيز عبر Tab ينتقل فوراً إلى `settled` بدون تأخير.

---

## 14. العرض الأولي وحماية LCP (Initial Render & LCP)
- لم تُضف أي ستائر تحميل أو مؤشرات انتظار (`spinners`) أو `skeleton` مزيفة.
- صورة البطل الرئيسية (`HeroEditorial`) وصورة المقال الرئيسية (`blog/[...slug]`) تستخدمان `data-dandy-media-settle` الذي يغيّر `transform: scale(0.986) -> scale(1)` فقط مع إبقاء `opacity: 1` منذ اللحظة الأولى.
- تم قياس صورة البطل على `/` في Chromium على سطح المكتب (`1440×900`) والموبايل (`390×844`) وكانت النتيجة `heroOpacity: "1"`.

---

## 15. نتائج اختبارات المتصفح والوحدة (Actual Test Results)
### أ. اختبارات الوحدة (`npx --yes tsx --test src/scripts/*.test.ts`)
- **النتيجة:** **`56/56` اختباراً ناجحاً** (`0` فشل، شاملةً `6` اختبارات مخصصة في `src/scripts/page-entrance.test.ts` تغطي: استبعاد المسارات الإدارية ومعاينة الأستوديو، تعطيل الحركة عند `reducedMotion`/`bfcache`/غياب `IntersectionObserver`، إعدادات الملفات الثلاثة، حساب التدرج بالدفعات للـ 32 بطاقة، سقف تأخير الدخول، وتحديد عناصر النافذة الأولية).

### ب. اختبارات المتصفح الفعلي (`Chromium` عبر `playwright-cli` بعد التعديل النهائي)
| الاختبار / المسار | النتيجة الفعلية المُقاسة |
|---|---|
| `/` (الجولة الثانية — التمرير الكامل `10650px` + فيديو `r2-home-scroll.webm` + العودة لأعلى وتغيير الحجم إلى `1024×768`) | `settledCount: 63`, `stillPendingReveal: 0`, `stillPendingChildren: 0`, `pendingAfterScrollUpAndResize: 0`, `overflowX: 0`، واختفاء تام للفجوة البيضاء التي رُصدت في الجولة الأولى عند `CategoryDiscovery`. |
| `/`, `/category/skin-care`, `/product/facial-serum-3x1-30ml`, `/cart`, `/account` (تحويل إلى `/account-login`), `/blog/hair-loss-routine` | جميعها حققت `ready: true`, `overflowX: 0`, `hiddenEntrance: 0`, `hiddenRevealAboveFold: 0`. |
| مسارات أخرى تم فحصها على البناء قبل تعديل المراجعة البسيط لـ `ReviewsHomeSection`: `/all-products`, `/special-offers`, `/pink-friday`, `/track-order`, `/invoice`, `/about-us`, `/blog`, `/client-reviews`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/account-signup`, `/non-existent-page-404` | جميعها حققت `booted: true`, `ready: true`, `overflowX: 0`, `entranceHiddenCount: 0`. |
| مسار مُستبعد `/login` | `booted: false`, `ready: false` (غير متأثر بمحرك الحركة). |
| تعطل JavaScript (`javaScriptEnabled: false`) على `/`, `/all-products`, `/product/facial-serum-3x1-30ml`, `/cart` | `readyClass: false`, `zeroOpacityEntrance: 0`, `zeroOpacityReveal: 0`, `zeroOpacityChildren: 0` (جميع العناصر مرئية بالكامل). |
| تفضيل تقليل الحركة (`prefers-reduced-motion: reduce`) | `ready: false`, `reduced: true`, `zeroOpacityManaged: 0`. |
| محاكاة `bfcache` (`pageshow` مع `persisted: true`) | `hasInstantClass: true`, `settledCount: 63`. |
| فحص اتجاه `dir="ltr"` على `<html>` | `overflowX: 0` دون كسر في التخطيط أو الإزاحات. |
| أخطاء الـ Console في الجولة الثانية والاختبارات الختامية | `0` أخطاء (`Errors: 0`). |

---

## 16. نتائج الشاشات المتجاوبة (Responsive Viewports)
تم الفحص بعد التعديل النهائي على الصفحة الرئيسية بالأبعاد الخمسة المطلوبة:
- `390 × 844`: `overflowX: 0`, `hiddenEntrance: 0`, `heroOpacity: "1"` (مع فحص لقطة `r2-mobile-390.png`).
- `430 × 932`: `overflowX: 0`, `hiddenEntrance: 0`.
- `768 × 1024`: `overflowX: 0`, `hiddenEntrance: 0` (مع فحص لقطة `r2-tablet-768.png`).
- `1024 × 768`: `overflowX: 0`, `pendingAfterScrollUpAndResize: 0`.
- `1440 × 900`: `overflowX: 0`, `pendingEntrance: 0` (مع فحص لقطة `r2-home-desktop.png`).

---

## 17. نتائج التفاعل أثناء الحركات (Interaction Availability)
- **البحث (`SearchDrawer`):** فتح نافذة البحث والإغلاق بـ `Escape` يعمل فوراً (`searchOpen: true`).
- **قائمة الموبايل (`MobileNavDrawer`):** الضغط على `#mobile-menu-trigger` في `390×844` بعد `150ms` من فتح الصفحة فتح القائمة (`ariaExpanded: "true"`, `menuVisible: true`) وأُغلقت عبر `Escape` (`ariaExpanded: "false"`).
- **الفلترة والبحث في `/all-products`:** البحث بكلمة `سيروم` عرض `3` بطاقات جميعها بـ `opacity: "1"` وحالة `settled`.
- **الإضافة للسلة من صفحة المنتج `/product/facial-serum-3x1-30ml`:** النقر على `#add-to-cart-btn` زاد شارة السلة إلى `1` دون أي تعطيل.
- **خطوات `/cart`:** الانتقال بالضغط على `#btnProceedToShipping` فعّل الخطوة الثانية بظهور كامل (`opacity: "1"`).

---

## 18. مؤشرات الأداء والمراقبة (Performance Findings)
- قياسات الملاحة الحية على `/` (`1440×900`، خادم محلي): `domContentLoadedEventEnd: 377ms`، `loadEventEnd: 530ms`.
- عدد مراقبي التمرير: **`IntersectionObserver` واحد فقط** (`setupObserver`)، مع مستمع `scroll` خامل مربوط بـ `requestAnimationFrame` يُزال أوتوماتيكياً عند فراغ قائمة المراقبة (`observedTargets.size === 0`).
- **صفر حلقات حركة متكررة**، و**صفر استخدام لـ GSAP/ScrollTrigger المكرر**، والاعتماد الكامل على خصائص المركّب الرسومي (`opacity`, `transform`).

---

## 19. نتائج فحص الـ Lint (`npm run lint`)
تم تشغيل `npm run lint` (`astro sync`) بعد جميع التعديلات البرمجية:
- **النتيجة:** ناجح بدون أي أخطاء (`Linting completed successfully` — توليد الأنواع في `254ms`).

---

## 20. نتائج البناء الإنتاجي (`npm run build`)
تم تشغيل البناء الإنتاجي الكامل (`compile_applet` / `npm run build`) بعد جميع التعديلات البرمجية:
- **النتيجة:** نجح البناء بنجاح تام (`Build succeeded - the applet is compiled`).

---

## 21. التحقق من سلامة ملفات الإعدادات والنشر المحمية (SHA-256 Verification)
تطابقت جميع البصمات قبل البدء وبعد الانتهاء بايتاً لبايت، ولم يتم تعديل أو إنشاء أي ملف محمي:

| الملف المحمي | بصمة SHA-256 الأولية والختامية (مطابقة 100%) |
|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` |

*(تم التحقق كذلك من عدم وجود `package-lock.json` أو `vite.config.*` أو `.env` أو `.npmrc` أو `.nvmrc` قبل وبعد التنفيذ).*

---

## 22. القيود والملاحظات المعروفة
- التواجد المتزامن للملف الأقدم `src/pages/category/%5Bcategory%5D.astro` بجانب `src/pages/category/[category].astro`؛ استجاب المسار الحي `/category/skin-care` من القالب المحدّث بنجاح، لكن يُفضَّل في مرحلة صيانة لاحقة تنظيف أي نسخة مكررة غير مستخدمة بعد التحقق من التوجيه.
- بعض مسارات الحالة المصادَق عليها (`/account` عند تسجيل الدخول) أو مسار الفاتورة المرتبط برقم طلب حقيقي (`/invoice?code=...`) لم تُختبر ببيانات مستخدم حيّة في هذا النطاق، واكتُفي بالتحقق من سلوك الحاوية الجذرية `calm` وحالاتها الافتراضية دون كسر.

---

## 23. تأكيد الالتزام بنطاق اللغة العربية فقط
نؤكد التزامنا الكامل بعدم تنفيذ أي نسخة إنجليزية للواجهة، وعدم إضافة مبدّل لغات، وعدم إنشاء مسارات لغوية (`en/` أو `hreflang`)، وعدم ترجمة أو تعديل أي نصوص عربية قائمة في المتجر، مع الحفاظ على جاهزية محرك الحركة للاتجاهين (`RTL` و`LTR`) للمراحل المستقبلية.

---

## 24. المرحلة التالية المقترحة
الانتقال إلى **المرحلة الثامنة (أو مراجعة التهيئة ثنائية اللغة / التوسيع المستقبلي)** عند الطلب، مثل: إعداد طبقة التعريب المزدوج (`AR / EN`) بالاستفادة من جاهزية السمات الدلالية في المرحلة السابعة، أو تطوير صفحات الحسابات وتجربة الطلبات الحية، مع الإبقاء على نظام `PageEntranceManager` كمرجع وحيد للحركة.
