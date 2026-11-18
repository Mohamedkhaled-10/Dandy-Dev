# تدقيق ما قبل التنفيذ — المرحلة السابعة (Phase 7): نظام الظهور التدريجي وحركة الصفحات العام
**المشروع:** متجر داندي كوزمتكس (Dandy Cosmetics) — Botanical Editorial Commerce  
**النطاق:** تدقيق البنية الحالية للحركة، تحديد المشكلات، توثيق البصمات المحمية، ووضع خطة التكامل الموحّدة  

---

## 1. ملخص التدقيق الميداني
تم فحص ملفات بيئة العمل الفعلية لمتجر **Dandy Cosmetics** بعد اكتمال المراحل 1–6، شاملةً:
- وثيقة التصميم الشاملة (`DANDY_COMPLETE_UI_UX_BLUEPRINT_AR.md`).
- التقارير النهائية للمراحل الأولى حتى السادسة (`DANDY_PHASE_1_FINAL_REPORT_AR.md` إلى `DANDY_PHASE_6_FINAL_REPORT_AR.md`).
- نظام التصميم والأنماط (`src/styles/tokens.css`، `src/styles/base.css`، `src/styles/components.css`، `src/styles/animations.css`).
- وحدة الحركة الحالية (`src/utils/animations.ts`) والملفات التراثية (`public/assets/css/layout.css`، `public/assets/js/layout.js`، `public/assets/js/loading.js`).
- القالب الرئيسي (`src/layouts/BaseLayout.astro`) وجميع صفحات العميلات والمكونات في `src/pages/` و`src/components/`.

---

## 2. الإجابة على أسئلة التدقيق الإلزامية الثمانية

1. **هل يقوم المشروع حالياً بتحريك أقسام الصفحة الرئيسية؟**  
   **لا.** رغم وجود الملف `src/utils/animations.ts` الذي يعرّف `DandyAnimationController`، فإنه غير مستورد أو مستدعى في `BaseLayout.astro` أو `index.astro` أو أي ملف آخر، وبالتالي لا تعمل حالياً أي حركات دخول على أقسام الصفحة الرئيسية بعد إعادة بنائها في المرحلة الثالثة.

2. **هل توفّر مكتبة GSAP حالياً وظائف كشف قابلة لإعادة الاستخدام؟**  
   حزمة `gsap` (`^3.15.0`) مثبّتة في المشروع وملف `src/utils/animations.ts` يحتوي على نمط Singleton (`DandyAnimationController`) مع فحص `prefersReducedMotion()`، غير أن جميع دواله الحالية (`initHeroSection`, `initTrustStrip`, `initSpecialOffers`, `animateCategories`, إلخ) مرتبطة بمعرّفات وفئات HTML قديمة أُزيلت في المرحلة الثالثة (`#cinematicCurtain`، `#hero-editorial-section`، `.modern-product-card`، `.scroll-reveal-up`)، كما تعتمد مسافات حركة كبيرة (`y: 35px`، `x: ±50px`) وفترات زمنية طويلة نسبياً (`0.75s–0.9s`).

3. **هل توجد أي أقسام مخفية حالياً بانتظار تنفيذ JavaScript؟**  
   - **الصفحات المبنية بـ SSR:** لا؛ جميع الصفحات الرئيسية (`/`, `/all-products`, `/category/[category]`, `/product/[...slug]`, `/special-offers`, `/pink-friday`, `/cart`, `/about-us`, `/blog`, `/blog/[...slug]`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`, `/404`) تعرض محتواها فورياً من الخادم (`opacity: 1`).  
   - **صفحات ذات حالات جلب/مصادقة ديناميكية:** `/account` (ينتظر التحقق من جلسة Firebase Auth)، `/invoice` و`/track-order` (ينتظران نتيجة الاستعلام مع حالات تحميل صريحة)، و`/client-reviews` (يجلب الشهادات عبر RTDB). يجب ألا يتدخل نظام الحركة في منطق إظهار/إخفاء هذه الحالات.  
   - **ملاحظة تراثية:** يحتوي `public/assets/css/layout.css` (المُحمَّل في `BaseLayout.astro`) على الفئة القديمة `.reveal-item { opacity: 0; }` دون تحميل `layout.js`. لن نعتمد على هذه الفئة إطلاقاً لضمان عدم اختفاء أي عنصر أبداً.

4. **هل توجد حركات حالية يُعاد تشغيلها دون داعٍ؟**  
   لا توجد حلقات إعادة تشغيل حالية في الصفحات المفحوصة؛ الحركات الوحيدة الفعّالة حالياً هي انتقالات تفاعلية منضبطة (`dandyStepFade` عند التبديل بين خطوات `/cart`، انتقال شرائح `HeroEditorial`، حركات `DandyToast`، و`ConsentBanner`). إلا أن دالة `refresh()` في `src/utils/animations.ts` كانت تعيد استدعاء `animateCategories()` دون حارس منع تكرار، مما قد ينشئ `ScrollTrigger` مكرراً لو تم تشغيلها.

5. **هل تتحكم عدة حركات في العناصر نفسها؟**  
   حالياً لا، ولكن عند تفعيل نظام المرحلة السابعة يجب الفصل التام بين حركات الظهور الأولي وبين التفاعلات الحية في:
   - `homepage-studio-client.ts` (تحديثات المعاينة الحية وتبديل شرائح الهيرو).
   - `catalog-client.ts` (إعادة ترتيب/فلترة بطاقات `ProductCard` في `/all-products` و`/category/*` و`/special-offers`).
   - `pdp-client.ts` و`cart-client.ts` (تحديث السعر والخطوات والكمية).

6. **هل تؤثر أي حركات حالية على سرعة رسم أكبر عنصر محتوى (LCP) أو العرض الأولي؟**  
   حالياً لا (أُزيل ستار التحميل `#cinematicCurtain` نهائياً في المرحلة الثالثة، وتُحمل صورة الهيرو الرئيسية بـ `fetchpriority="high"` و`loading="eager"`). عند تطبيق المرحلة السابعة يجب الحفاظ على بقاء صورة الـ LCP ظاهرة فوراً (`opacity: 1`) وعدم حجبها خلف تلاشي يبدأ من الصفر.

7. **هل تستخدم بعض الصفحات أنظمة حركة مختلفة تماماً؟**  
   نعم؛ تغيب منظومة الدخول التدريجي الموحدة عن كافة الصفحات باستثناء `dandyStepFade` المحلية في `/cart` وحركة `DandyToast` في `animations.css`، بينما بقي `src/utils/animations.ts` معزولاً وغير متصل بأي صفحة.

8. **هل يمكن دمج السلوك الجديد داخل البنية الحالية للحركة؟**  
   **نعم.** يمكن تمديد وتحديث `src/styles/tokens.css` و`src/styles/animations.css` و`src/utils/animations.ts` (مع وحدة منطق نقي قابلة للاختبار في `src/scripts/page-entrance.ts`) وتهيئته مركزياً مرة واحدة عبر `BaseLayout.astro`.

---

## 3. المشكلات المكتشفة في البنية الحالية
1. **انقطاع التكامل:** `DandyAnimationController` في `src/utils/animations.ts` غير مستدعى ويستهدف محددات HTML ملغاة.
2. **غياب آلية التحسين التدريجي الآمن (Progressive Enhancement):** غياب فئة تمهيدية على `<html>` تضمن بقاء كل المحتوى مرئياً (`opacity: 1`) في حال فشل JS أو تعطله أو استعادة الصفحة من ذاكرة المتصفح (`bfcache`).
3. **إزاحات اتجاهية صلبة (`x: ±50px`):** غير متوافقة مستقبلاً مع التبديل بين `dir="rtl"` و`dir="ltr"`.
4. **غياب دعم التجميع للبطاقات الكثيرة (Batching):** إسناد تأخير متراكم على 32 منتجاً في `/all-products` يبطئ ظهور الصفوف السفلية.
5. **غياب الكشف التلقائي عند التركيز بلوحة المفاتيح (`focusin`):** قد يتنقل المستخدم بالـ Tab إلى قسم أسفل الطي قبل وصول التمرير إليه.

---

## 4. خطة التنفيذ المقترحة (CSS Compositor + IntersectionObserver + توحيد `DandyAnimationController`)

وفق مبدأ التبسيط والكفاءة في المرحلة السابعة (*"If CSS and IntersectionObserver are sufficient, prefer the simpler implementation"*):

1. **متغيرات الحركة في `src/styles/tokens.css`:**
   - `--dandy-motion-duration-fast: 280ms;`
   - `--dandy-motion-duration-normal: 420ms;`
   - `--dandy-motion-duration-slow: 540ms;`
   - `--dandy-motion-distance: 10px;`
   - `--dandy-motion-stagger: 50ms;`
   - `--dandy-motion-ease: cubic-bezier(0.22, 1, 0.36, 1);`

2. **السمات الدلالية الموحدة (Language- & Text-Agnostic Markers):**
   - `data-dandy-entrance`: عناصر الظهور الأولي في الـ Viewport العلوي (يتبع تسلسل: ترويسة/بطل ← عنوان ← وصف ← أزرار ← محتوى رئيسي)، دون حجب صور LCP الرئيسية.
   - `data-dandy-reveal`: الأقسام والمجموعات خارج نافذة العرض الأولية (تُكشف مرة واحدة عبر `IntersectionObserver`).
   - `data-dandy-stagger`: حاوية لشبكة بطاقات أو عناصر مترابطة (تطبّق تأخيراً قصيراً محدوداً بحد أقصى `maxDelay` أو دفعات صفوف حتى لا يتأخر ظهور البطاقات الـ 32).
   - `data-dandy-reveal-child`: عنصر فرعي داخل حاوية `data-dandy-stagger`.
   - `data-dandy-media-settle`: انتقال `scale(0.985) -> scale(1)` لطيف للصور التحريرية المحددة (دون المساس بـ `opacity` صور LCP أو قصها).
   - `data-dandy-motion="calm"`: نمط أهدأ وأسرع لمسارات الشراء الحساسة (`/cart`, `/invoice`, `/track-order`, `/account*`).

3. **ضمان عدم اختفاء المحتوى وحماية LCP و`bfcache`:**
   - القاعدة الافتراضية في CSS: **جميع العناصر مرئية (`opacity: 1; transform: none;`)**.
   - تفعيل الحالة الابتدائية للإزاحة والشفافية **فقط** عندما يضيف المتحكم فئة `html.dandy-motion-ready` قبل تحريك العناصر القابلة للحركة، **وفقط** للعناصر التي يربطها فعلياً بـ `data-dandy-motion-state="pending"` (وليس عشوائياً لكل الصفحة)، وبمجرد الانتهاء تتحول إلى `data-dandy-motion-state="revealed"` وتُزال أي خصائص مؤقتة.
   - في الحالات التالية لا تُضاف حالة `pending` أصلاً (أو تُحسم فوراً إلى `revealed`):
     - `prefers-reduced-motion: reduce`
     - عدم توفر `IntersectionObserver` أو فشل السكريبت
     - الاستعادة من ذاكرة المتصفح (`pageshow` مع `event.persisted === true`)
     - عند وضع معاينة الأستوديو الحية (`/?studio_preview=1`) أو فشل تحميل صورة/عنصر.
   - مستمع `focusin` واحد على `document` يكشف فوراً أي عنصر مخفي مؤقتاً إذا انتقل إليه تركيز لوحة المفاتيح.
   - استخدام `IntersectionObserver` واحد مُعاد استخدامه (`threshold: 0.08`, `rootMargin: '0px 0px -32px 0px'`) مع `unobserve` فور الظهور، ومؤقت أمان احتياطي للظهور التلقائي، دون إعادة التشغيل عند `resize` أو الفلترة في `catalog-client.ts`.

4. **تحديث `src/utils/animations.ts` + `src/scripts/page-entrance.ts` + `src/scripts/page-entrance.test.ts`:**
   - عزل المنطق النقي (حساب دفعات التدرج، قرار الأهلية، أولوية الظهور الأولي vs التمرير، فحص `bfcache`/`reduced-motion`) في `src/scripts/page-entrance.ts` وتغطيته باختبارات `node:test`.
   - دمج `DandyAnimationController` في `src/utils/animations.ts` ليعمل كواجهة موحّدة متوافقة تُشغّل عبر `BaseLayout.astro` لصفحات المتجر فقط (مع استبعاد مسارات الإدارة `/dashboard*` و`/statues` و`/login`).

---

## 5. المسارات المستهدفة بالتكامل
- **المتجر الأساسي:** `/`، `/all-products`، `/category/[category]`، `/product/[...slug]`، `/special-offers`، `/pink-friday`.
- **رحلة الشراء (بنمط هادئ `calm`):** `/cart`، `/invoice`، `/track-order`.
- **المحتوى والدعم:** `/about-us`، `/blog`، `/blog/[...slug]`، `/post` (404/redirect)، `/client-reviews`، `/contact-us`، `/help`، `/privacy-policy`، `/terms`، `/404`.
- **حساب العميلة (توافق بدون إعادة تصميم):** `/account`، `/account-login`، `/account-signup`.
- **مستبعد بالكامل:** `/dashboard*`، `/statues`، `/login`، وجميع `/api/*`.

---

## 6. توثيق بصمات الملفات المحمية (Baseline SHA-256)
تم التحقق قبل البدء من مطابقة جميع ملفات الإعدادات والنشر المحمية لبصماتها الأصلية:
- `astro.config.mjs`: `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc`
- `vercel.json`: `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05`
- `package.json`: `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3`
- `tsconfig.json`: `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046`
- `patch-env.cjs`: `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623`
- `server.js`: `537fc4723fd9b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667`
- `.env.example`: `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0`
