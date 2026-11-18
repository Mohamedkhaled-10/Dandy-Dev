# تدقيق ما قبل التنفيذ — تفعيل النقر على كامل بطاقة المنتج
## DANDY COSMETICS — Product Card Full-Surface Clickability Pre-Implementation Audit

**التاريخ:** 18 نوفمبر 2026  
**النطاق:** تحسين سلوك التفاعل والوصولية لجميع بطاقات المنتجات (`.dandy-pcard`) عبر المتجرين العربي (`ar-EG` / RTL) والإنجليزي (`en` / LTR) على الحاسوب والأجهزة اللوحية والهواتف دون تغيير الهوية البصرية أو إعادة تصميم البطاقة.

---

## 1. جرد شامل لجميع مواقع عرض بطاقات المنتجات في المشروع

تم فحص الشيفرة المصدرية كاملة في `src/`، وتبين أن المتجر يعتمد على **3 نقاط توليد موحدة** لهيكل `.dandy-pcard`، و**9 أسطح عرض رئيسية** في الصفحات:

| السطح / المسار | المكوّن / الملف المصدر | آلية التوليد |
|---|---|---|
| 1. الصفحة الرئيسية — المنتجات المختارة (`offers` / `newArrivals`) | `src/components/home/FeaturedProducts.astro` ← `ProductCard.astro` | SSR (عربي `/` وإنجليزي `/en/`) |
| 2. الصفحة الرئيسية — أقسام الاستوديو المخصصة من نوع `products` | `src/components/home/CustomStudioSection.astro` ← `ProductCard.astro` | SSR |
| 3. الصفحة الرئيسية — المزامنة الحية مع Firebase RTDB (`Studio Client`) | `src/scripts/homepage-studio-client.ts` (`renderProductCardHtml`) | Client DOM |
| 4. كتالوج كل المنتجات (`/all-products` و `/en/all-products`) | `src/components/views/AllProductsView.astro` ← `ProductCard.astro` | SSR + تصفية لحظية |
| 5. صفحات الأقسام (`/category/*` و `/en/category/*`) | `src/components/views/CategoryView.astro` و `src/pages/category/[category].astro` ← `ProductCard.astro` | SSR + تصفية لحظية |
| 6. صفحة العروض الخاصة (`/special-offers` و `/en/special-offers`) | `src/components/views/SpecialOffersView.astro` ← `ProductCard.astro` | SSR |
| 7. صفحة Pink Friday — العروض الفردية (`/pink-friday` و `/en/pink-friday`) | `src/components/views/PinkFridayView.astro` ← `ProductCard.astro` | SSR |
| 8. المنتجات المقترحة داخل صفحة تفاصيل المنتج PDP | `src/components/views/ProductDetailView.astro` (`#related-products-grid`) ← `ProductCard.astro` | SSR |
| 9. المنتجات المرتبطة بالروتين داخل مقالات المدونة | `src/components/views/BlogArticleView.astro` (`#routineProductsHeading`) ← `ProductCard.astro` | SSR |
| 10. قائمة المفضلة في لوحة الحساب (`/account` و `/en/account`) | `src/scripts/account-client.ts` (`renderWishlistList`) + أنماط `AccountDashboardView.astro` | Client DOM |

> **ملاحظة تصنيفية مهمة (Pink Friday Bundle Collections):**  
> تحتوي صفحة Pink Friday أيضاً على بطاقات الباقات المجمعة (`.dandy-pf-col-card` في `PinkFridayView.astro`). هذه البطاقات ليست منتجات فردية ولا تملك مسار PDP مستقل، بل تفتح نافذة منبثقة لاختيار الروائح وإضافة الباقة كاملة للسلة عبر الزر `.dandy-pf-col-btn`. تم إبقاؤها منفصلة عمداً حفاظاً على تدفق الباقات المجمعة دون أي تغيير غير مطلوب.

---

## 2. تحليل البنية الحالية وآلية النقر المطبّقة

حالياً، تستخدم جميع البطاقات في `ProductCard.astro` و `homepage-studio-client.ts` و `account-client.ts` نفس الهيكل:

```html
<article class="dandy-pcard">
  <a href="vm.href" class="dandy-pcard-stage" aria-label="vm.name">
    <span class="dandy-pcard-tag">...</span>
    <img class="dandy-pcard-img" ... />
  </a>
  <div class="dandy-pcard-body">
    <div class="dandy-pcard-meta">
      <a href="categoryHref" class="dandy-pcard-category">...</a>
      <span class="dandy-pcard-rating">...</span>
    </div>
    <h3 class="dandy-pcard-title">
      <a href="vm.href">vm.name</a>
    </h3>
    <div class="dandy-pcard-price-row">...</div>
    <div class="dandy-pcard-actions">
      <!-- button.dandy-pcard-btn.is-add | a.dandy-pcard-btn.is-variant | button.is-soldout[disabled] -->
      <!-- + button.dandy-wish-remove-btn في المفضلة -->
    </div>
  </div>
</article>
```

كما يعتمد النقر على زر الإضافة للسلة على تفويض واحد نظيف على مستوى المستند في `src/scripts/product-card-client.ts` (`[data-dandy-add-to-cart]`) مع `event.preventDefault()` و `event.stopPropagation()`، بينما تعتمد قائمة المفضلة في `account-client.ts` على تفويض `#wishlistContainer` لأزرار `data-wishlist-add` و `data-wishlist-remove`.

---

## 3. المشكلات التفاعلية والوصولية المكتشفة

1. **مناطق ميتة غير قابلة للنقر داخل البطاقة:**  
   يقتصر النقر حالياً على منطقة الصورة (`.dandy-pcard-stage`) ونص العنوان (`.dandy-pcard-title a`) فقط. وبالتالي فإن النقر أو اللمس على هوامش جسم البطاقة (`.dandy-pcard-body` بـ `padding: 16px`)، والفراغات العمودية المولدة عبر `margin-top: auto` قبل السعر، ومنطقة السعر والتقييم (`.dandy-pcard-price-row`, `.dandy-pcard-rating`)، وإطار/خلفية البطاقة لا يؤدي إلى أي تنقل.
2. **ازدواجية نقاط التبويب بلوحة المفاتيح (Duplicate Tab Stops):**  
   وجود وسمي `<a>` منفصلين يشيران إلى نفس رابط المنتج (`vm.href`) — الأول على `.dandy-pcard-stage` والثاني داخل `h3.dandy-pcard-title` — يُجبر مستخدم لوحة المفاتيح وقارئ الشاشة على الضغط على `Tab` مرتين لنفس المنتج داخل كل بطاقة.
3. **غياب مؤشر التركيز الموحد للبطاقة (`:focus-visible`):**  
   تُظهر البطاقة حالة تحويم موحدة عبر `:hover` (`translateY(-2px)` وظل خفيف)، لكن عند تنقل المستخدم بلوحة المفاتيح يفتقد الإطار الخارجي للبطاقة مؤشر `:focus-visible` موحد وواضح.
4. **ازدواجية تعريف أنماط `.dandy-pcard` في لوحة الحساب:**  
   صفحة الحساب (`/account` و `/en/account`) لا تستورد `ProductCard.astro`، لذا تُعرّف نسخة موازية من أنماط `.dandy-pcard` داخل `AccountDashboardView.astro`؛ وعليه يجب أن تكون طبقة الرابط الممتد (`Stretched Anchor`) متزامنة تماماً في CSS المشترك وفي `AccountDashboardView.astro`.

---

## 4. خطة التنفيذ التقنية (Stretched Semantic Anchor Pattern)

1. **تحويل البطاقة إلى رابط أساسي دلالي واحد ممتد على كامل البطاقة:**
   - تحويل `.dandy-pcard-stage` من `<a>` إلى `<div>` في `ProductCard.astro` و `homepage-studio-client.ts` و `account-client.ts` مع الحفاظ التام على جميع الفئات والأبعاد وصور الـ fallback والشارات وتأثير التكبير عند التحويم.
   - الإبقاء على رابط المنتج الدلالي الوحيد داخل العنوان `<h3 class="dandy-pcard-title"><a href={vm.href} class="dandy-pcard-link">{vm.name}</a></h3>`.
   - جعل `.dandy-pcard` حاوية نسبية (`position: relative;`) وتمديد `.dandy-pcard-link::after` ليغطي البطاقة بالكامل (`content: ''; position: absolute; inset: 0; z-index: 1; cursor: pointer;`).
   - التحقق من أن `.dandy-pcard-title` (`position: static` + `-webkit-line-clamp: 2`) لا يقص `::after` في Chromium أو اختباره مباشرة بإحداثيات النقر الحقيقية على أعلى الصورة وحواف البطاقة ومنطقة السعر.
2. **رفع عناصر التفاعل المستقلة فوق طبقة الرابط الممتد (`z-index: 2`):**
   - رفع `.dandy-pcard-category` (`position: relative; z-index: 2;`) ليبقى رابط الفئة مستقلاً تماماً.
   - رفع أزرار الإجراءات داخل `.dandy-pcard-actions > *` (تشمل `button.is-add`، و `a.is-variant`، و `button.is-soldout` المعطّل، و `.dandy-wish-remove-btn`) إلى `position: relative; z-index: 2;`.
   - ترك الفراغات المحيطة برابط الفئة أو داخل `.dandy-pcard-body` قابلة للنقر لفتح صفحة المنتج.
   - في `account-client.ts`، إضافة `e.preventDefault()` و `e.stopPropagation()` داخل معالجات `data-wishlist-add` و `data-wishlist-remove` لضمان عدم تسرب أي حدث نقر غير مرغوب.
3. **الوصولية وحالات التحويم والتركيز:**
   - إظهار مؤشر `:focus-visible` واضح ومحيط بالبطاقة عند التركيز على `.dandy-pcard-link` عبر `:has(.dandy-pcard-link:focus-visible)` مع دعم بديل تلقائي للمتصفحات الأقدم.
   - الحفاظ على الهوية البصرية لـ DANDY دون أي تغيير في الألوان أو الخطوط أو الأحجام أو المسافات أو منطق الأسعار والسلة.
4. **الحفاظ التام على ملفات البناء والنشر المحمية:**
   - لن يتم تعديل أي ملف محمي (`astro.config.mjs`, `vercel.json`, `package.json`, `tsconfig.json`, `patch-env.cjs`, `server.js`, `.env.example`, `firebase.json`, `bun.lock`) ولن يتم تثبيت أي حزم أو تنفيذ `git commit` / `git push`.
