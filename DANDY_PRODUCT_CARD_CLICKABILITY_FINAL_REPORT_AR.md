# التقرير النهائي — تفعيل النقر على كامل بطاقة المنتج (DANDY Cosmetics)
## DANDY COSMETICS — Full Product Card Clickability Final Report

**التاريخ:** 18 نوفمبر 2026  
**المشروع:** Dandy Cosmetics (`DANDY`)  
**التوجيه البصري:** Botanical Editorial Commerce  
**الحالة النهائية:** **جاهز للإطلاق**

---

## 1. الملخص التنفيذي (Executive Summary)

تم تنفيذ وتحقق تحسين التفاعل والوصولية لبطاقات المنتجات (`.dandy-pcard`) عبر متجر **Dandy Cosmetics** بالكامل، بحيث أصبحت كامل المساحة المرئية للبطاقة (صورة المنتج، خلفية منصة العرض، الهوامش والمساحات البيضاء، جسم البطاقة، صف السعر، وعنوان المنتج) تعمل كرابط تنقل طبيعي إلى صفحة تفاصيل المنتج (PDP) وفق مسار اللغة الصحيح (`/product/<slug>` للعربية RTL و `/en/product/<slug>` للإنجليزية LTR)، مع الحفاظ التام على استقلالية وأولوية جميع عناصر التفاعل الفرعية (زر الإضافة للسلة، زر اختاري الخيار، رابط التصنيف، الزر المعطّل عند نفاد المخزون، وأزرار المفضلة).

لم يتضمن هذا التحسين أي إعادة تصميم للبطاقة أو تعديل على الألوان أو الخطوط أو الأحجام أو منطق الأسعار والسلة أو ملفات البناء والنشر المحمية.

---

## 2. تأكيد عدم تعديل ملفات البناء / Astro / Vercel / الحزم المحمية (SHA-256)

تمت مطابقة البصمات الرقمية (`sha256sum`) لجميع ملفات الإعداد والبناء والنشر والبيئة وقواعد Firebase المحمية، وثبت عدم مساسها بنسبة **100%**:

| الملف المحمي | بصمة SHA-256 المتحققة | الحالة |
|---|---|---|
| `astro.config.mjs` | `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` | غير معدل (مطابق 100%) |
| `vercel.json` | `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` | غير معدل (مطابق 100%) |
| `package.json` | `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` | غير معدل (مطابق 100%) |
| `tsconfig.json` | `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` | غير معدل (مطابق 100%) |
| `patch-env.cjs` | `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` | غير معدل (مطابق 100%) |
| `server.js` | `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` | غير معدل (مطابق 100%) |
| `.env.example` | `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` | غير معدل (مطابق 100%) |
| `firebase.json` | `a75107328c6d0e1e3ae7e16bc79e469cd5acfc50c75aa52f3ac0ba7fc2110de0` | غير معدل (مطابق 100%) |
| `firebase/database.rules.json` | `95ce07641125abf8a4459cc3f2312a1369c67048b54736e5d9e5120bf243f1fb` | غير معدل (مطابق 100%) |
| `firebase/firestore.rules` | `2a2a44b4ca12946969c0caa3006abbe25a2b4d40508ae128fa2710093c140e65` | غير معدل (مطابق 100%) |
| `bun.lock` | `9d46d81649b24eb4c41bb41ddec04b40d070bf20d347383e235c64781b55b364` | غير معدل (مطابق 100%) |

كما لم يتم تثبيت أو ترقية أو إزالة أي حزمة عبر مدير الحزم.

---

## 3. ملخص تدقيق ما قبل التنفيذ (Pre-Implementation Audit)

تم توثيق التدقيق الكامل مسبقاً في `DANDY_PRODUCT_CARD_CLICKABILITY_AUDIT_AR.md` قبل تعديل أي ملف برمجي، وكشف عن 4 ملاحظات رئيسية:
1. اقتصار النقر سابقاً على منطقة الصورة (`.dandy-pcard-stage`) ورابط العنوان (`.dandy-pcard-title a`) فقط، مع بقاء الهوامش الداخلية (`padding: 16px`) والفراغات العمودية وصف السعر غير قابلة للنقر.
2. وجود رابطي `<a>` منفصلين لنفس المسار داخل كل بطاقة، ما سبّب تكرار نقاط التبويب (`Duplicate Tab Stops`) لمستخدمي لوحة المفاتيح وقارئات الشاشة.
3. غياب إطار التركيز الموحد (`:focus-visible`) على مستوى حاوية `.dandy-pcard`.
4. وجود نسخة أنماط موازية للبطاقة داخل `AccountDashboardView.astro` تستدعي المزامنة مع `src/styles/components.css` و `ProductCard.astro`.

---

## 4. مواقع عرض بطاقات المنتجات المشمولة (AR & EN) وتمييز باقات Pink Friday

شمل التنفيذ جميع نقاط توليد `.dandy-pcard` الثلاث وجميع أسطح العرض العشرة في المتجر العربي والإنجليزي:
- **الصفحة الرئيسية** (`/` و `/en/`): المنتجات المختارة (`FeaturedProducts.astro`) + أقسام الاستوديو المخصصة (`CustomStudioSection.astro`) + التحديث الحي عبر العميل (`homepage-studio-client.ts`).
- **كتالوج جميع المنتجات** (`/all-products` و `/en/all-products` عبر `AllProductsView.astro`).
- **صفحات الأقسام** (`/category/*` و `/en/category/*` عبر `CategoryView.astro`).
- **صفحة العروض الخاصة** (`/special-offers` و `/en/special-offers` عبر `SpecialOffersView.astro`).
- **صفحة Pink Friday — العروض الفردية** (`/pink-friday` و `/en/pink-friday` عبر `PinkFridayView.astro`).
- **المنتجات المقترحة في صفحة المنتج PDP** (`#related-products-grid` في `ProductDetailView.astro`).
- **المنتجات المرتبطة بالروتين داخل مقالات المدونة** (`BlogArticleView.astro`).
- **بطاقات المفضلة في لوحة الحساب** (`/account` و `/en/account` عبر `account-client.ts` + `AccountDashboardView.astro`).

**تمييز باقات Pink Friday المجمعة (`.dandy-pf-col-card`):**  
تم التحقق في `/en/pink-friday` من وجود 16 بطاقة باقة مجمعة (`.dandy-pf-col-card`) تفتح نافذة اختيار الروائح وإضافة الباقة للسلة، ولا تمثل منتجات فردية ذات صفحة PDP مستقلة؛ لذا أُبقيت منفصلة ومستقرة دون تغيير تدفقها.

---

## 5. منهجية التنفيذ المختارة ولماذا (Stretched Semantic Anchor Pattern)

تم اعتماد نمط **الرابط الدلالي الممتد (`Stretched Semantic Anchor` عبر CSS `::after`)** بدلاً من لف البطاقة كاملة بوسم `<a>` أو الاعتماد على مستمعات النقر بـ JavaScript:
- **الامتثال الدلالي لـ HTML:** يمنع تداخل عناصر `<a>` أو `<button>` داخل `<a>` (وهو غير صالح معيارياً ويكسر قارئات الشاشة).
- **تحسين التنقل بالكيبورد:** رابط `<a href={vm.href} class="dandy-pcard-link">` داخل `<h3>` يصبح الرابط الوحيد للمنتج، ما يزيل تكرار التبويب.
- **الدعم الأصيل للمتصفح:** يدعم النقر بالزر الأوسط/فتح تبويب جديد (`Ctrl/Cmd + Click`) ومعاينة الرابط في شريط المتصفح واللمس دون أي تعارض مع الفلاتر اللحظية أو مزامنة الاستوديو.
- **معالجة التعارض الإرثي:** أثناء الاختبار البصري الأول تبيّن أن ملف `assets/css/layout.css` يفرض قاعدة `a:focus-visible { outline: 2px solid ... !important; }` مما أظهر إطاراً داخلياً مزدوجاً على نص العنوان، فتم إلغاؤه بـ `outline: none !important; outline-offset: 0 !important;` داخل قاعدة `@supports selector(:has(*))` للإبقاء على إطار تركيز واحد أنيق حول البطاقة بالكامل.

---

## 6. الملفات التي تم إنشاؤها أو تعديلها

### ملفات جديدة:
- `DANDY_PRODUCT_CARD_CLICKABILITY_AUDIT_AR.md` — تدقيق ما قبل التنفيذ.
- `DANDY_PRODUCT_CARD_CLICKABILITY_FINAL_REPORT_AR.md` — التقرير النهائي الحالي.

### ملفات معدلة:
- `src/components/product/ProductCard.astro` — تحويل `.dandy-pcard-stage` من `<a>` إلى `<div>`، إضافة `class="dandy-pcard-link"` للرابط الدلالي الوحيد في العنوان، وإضافة أنماط `position: relative` و `::after` و `z-index: 2` و `:focus-visible`.
- `src/styles/components.css` — إضافة القواعد العامة للرابط الممتد وطبقات التفاعل وحالات التركيز الموحدة لـ `.dandy-pcard` على مستوى المتجر.
- `src/components/views/AccountDashboardView.astro` — مزامنة أنماط `.dandy-pcard` و `.dandy-pcard-category` (`z-index: 2`) و `.dandy-wish-card-actions > *` (`z-index: 2`) و `.dandy-pcard-link:hover`.
- `src/scripts/homepage-studio-client.ts` — تحديث `renderProductCardHtml` لتحويل `.dandy-pcard-stage` إلى `<div>` واعتماد `class="dandy-pcard-link"`.
- `src/scripts/account-client.ts` — تحديث `renderWishlistList` لتحويل `.dandy-pcard-stage` إلى `<div>` واعتماد `class="dandy-pcard-link"`، مع تأكيد `e.preventDefault(); e.stopPropagation();` في معالجات `[data-wishlist-add]` و `[data-wishlist-remove]`.

---

## 7. كيفية الحفاظ على استقلالية عناصر التفاعل الفرعية

تم بناء تسلسل طبقات (`Stacking Context`) صريح داخل `.dandy-pcard`:
- **حاوية البطاقة:** `.dandy-pcard { position: relative; }`
- **طبقة الرابط الممتد (`z-index: 1`):** `.dandy-pcard-link::after { content: ''; position: absolute; inset: 0; z-index: 1; cursor: pointer; }` — تغطي الصورة وخلفية المنصة والفراغات والهوامش وصف السعر.
- **العناصر المستقلة فوق الطبقة (`z-index: 2`):**
  - `.dandy-pcard-category { position: relative; z-index: 2; }` لفتح صفحة القسم مباشرة.
  - `.dandy-pcard-actions > * { position: relative; z-index: 2; }` و `.dandy-wish-card-actions > * { position: relative; z-index: 2; }` لأزرار الإضافة للسلة واختيار الخيار والزر المعطّل وإزالة المفضلة.
  - `.dandy-pcard-tag` مع `pointer-events: none` لئلا تعيق شارات الخصم النقر في زاوية الصورة.

---

## 8. التحسينات المحققة في الوصولية (Accessibility)

- **تقليص نقاط `Tab`:** تم التحقق في شجرة الوصولية (`Accessibility Snapshot`) من احتواء كل بطاقة `<article>` على 3 عناصر تفاعلية فقط بدون أي تكرار: رابط التصنيف + رابط المنتج الأساسي في `<h3>` + زر الإجراء.
- **مؤشر التركيز الموحد (`:focus-visible`):** تم التحقق عبر `getComputedStyle` واللقطات البصرية (`r2-en-desktop-focus.png`) من ظهور إطار تركيز موحد بلون العلامة (`--dandy-accent-primary`, `solid 2px`) حول `.dandy-pcard` فقط، مع تعطيل الإطار الداخلي المزدوج على النص (`outlineStyle: none`).
- **تفاعل لوحة المفاتيح الفعلي:**
  - الضغط على `Enter` أثناء التركيز على `.dandy-pcard-link` في `/en/all-products` نقل المتصفح بنجاح إلى `/en/product/laser-replacement-cream-60gm`.
  - الضغط على `Space` أثناء التركيز على زر `Add to Bag` أضاف المنتج للسلة وبقي المستخدم في نفس الصفحة.

---

## 9. اتساق السلوك بين العربية (RTL) والإنجليزية (LTR)

تم التحقق عبر اختبارات `elementFromPoint` بالإحداثيات الحقيقية على `/all-products` (RTL) و `/en/all-products` (LTR) على حد سواء:
- في الاتجاهين: نقاط `imgCenter` و `stageCorner` و `bodyPaddingEdge` و `priceRowEmpty` التقطت جميعها `a.dandy-pcard-link` (`isLink: true`).
- نقاط `catCenter` التقطت `a.dandy-pcard-category` (`isCat: true`) ونقاط `btnCenter` التقطت زر `.dandy-pcard-btn` (`isBtn: true`).
- شارات الخصم بقيت متموضعـة في `inset-inline-start` (أعلى اليمين في العربية وأعلى اليسار في الإنجليزية) مع تمرير النقر للبطاقة.

---

## 10. نتائج الاختبار عبر الحاسوب والأجهزة اللوحية والهواتف (5 دقات شاشة)

تم تشغيل مصفوفة اختبار شاملة عبر متصفح Chromium حقيقي شملت **14 مساراً عربياً وإنجليزياً** عبر **5 مقاسات شاشة** (`390×844`، `430×932`، `768×1024`، `1024×768`، `1440×900`) بإجمالي **70 فحصاً**:
- **النتيجة:** `70/70` نجاح، **0 فشل** (`failures: []`)، **0 تجاوز أفقي** (`scrollWidth <= innerWidth` في كل المسارات والدقات).
- **اختبار اللمس/الجوال الفعلي (`390×844`):**
  - النقر على زر الإضافة للسلة أبقى المستخدم في `/all-products` وزاد عداد السلة إلى `1`.
  - النقر على مساحة الصورة في البطاقة نقل المتصفح إلى `/product/laser-replacement-cream-60gm`.
- **الفحص البصري:** تم فحص لقطات الجوال العربي (`390×844`) وسطح المكتب الإنجليزي (`1440×900`) والتركيز بالكيبورد بصرياً دون أي تداخل أو قص أو تشويه.

---

## 11. التحقق من السلة، الخيارات المتعددة، نفاد المخزون، والشارات

- **الإضافة المباشرة للسلة (`Add to Bag` / `أضيفي للسلة`):** عند النقر في `/en/all-products` و `/all-products` بقي المستخدم في الصفحة نفسها وارتفع مؤشر السلة (`1` ثم `2`).
- **المنتجات ذات الخيارات المتعددة (`Choose Option` / `اختاري الخيار`):** تم رصد 9 بطاقات في الكتالوج، والنقر على أولها نقل المتصفح مباشرة إلى `/en/product/body-and-hair-mist`.
- **الشارات (`Save X%` / `خصم X%`):** النقر فوق الشارة أو زاوية الصورة ينفّذ الانتقال لصفحة المنتج بفضل `pointer-events: none` على `.dandy-pcard-tag`.
- **حالة نفاد المخزون (`is-soldout`):** في الكتالوج الحي وقت الاختبار كان عدد المنتجات النافدة `0` (`soldOut: 0`)، ولكن على مستوى الشيفرة والأنماط تم التحقق من بقاء زر `button.is-soldout[disabled]` ضمن `.dandy-pcard-actions > *` فوق طبقة الرابط (`z-index: 2`) مع `cursor: not-allowed`، مع بقاء بقية سطح البطاقة قابلاً للنقر للانتقال إلى صفحة المنتج.

---

## 12. التحقق من قائمة المفضلة في الحساب وبطاقات المدونة

- **المنتجات داخل مقالات المدونة:** تم اختبار `/en/blog/hair-loss-routine` عبر جميع مقاسات الشاشة الخمسة بنجاح ودون تجاوز أفقي أو أخطاء.
- **قائمة المفضلة في الحساب (`/account` و `/en/account`):**
  - **إفصاح شفاف:** عند زيارة `/account` و `/en/account` بدون جلسة Firebase مسجلة يقوم المتجر بإعادة التوجيه التلقائي إلى `/account-login` و `/en/account-login`؛ لذا لم تُختبر بطاقات المفضلة الحية بجلسة مصادقة حقيقية داخل المتصفح.
  - مع ذلك تم التحقق الكامل في الشيفرة المصدرية من: تحديث `renderWishlistList` في `src/scripts/account-client.ts` ليعيد نفس بنية `<div class="dandy-pcard-stage">` + `<a class="dandy-pcard-link">`, وإضافة `e.preventDefault(); e.stopPropagation();` لأزرار `data-wishlist-add` و `data-wishlist-remove`، ومزامنة أنماط `z-index: 2` و `::after` في كل من `src/styles/components.css` و `src/components/views/AccountDashboardView.astro` واجتياز البناء والـ lint دون أخطاء.

---

## 13. التحقق من وحدة التحكم والوقت الحقيقي والشبكة (Console & Runtime)

- **أخطاء وقت التشغيل (`pageerror`):** `0` عبر جميع المسارات والمقاسات.
- **أخطاء وحدة التحكم (`console.error`):** `0` عبر مصفوفة الفحص الكاملة (70 اختبار مسار×دقة).
- **بيئة التطوير والملفات المؤقتة:** تم إيقاف جلسات المتصفح المؤقتة وحذف مجلد `.playwright-cli/` بالكامل بعد إتمام التحقق.

---

## 14. التحقق من الحفاظ على الهوية البصرية (Non-Redesign Proof)

أكد الفحص البصري للقطات الحية في الجوال العربي (`390×844`) وسطح المكتب الإنجليزي (`1440×900`) وحالة التركيز (`1440×900`) ثبات:
- نسب الصور (`1:1`) وإطار البطاقة (`border-radius: var(--dandy-radius-md)`).
- الخطوط والأوزان والتباعد الداخلي (`16px` سطح مكتب، `12px` جوال).
- مواضع الشارات والأسعار الحالية والسابقة وأزرار `Add to Bag` و `أضيفي للسلة` وفق هوية **Botanical Editorial Commerce** دون أي تغيير تصميمي.

---

## 15. ملخص فحص الانحدار (Regression Verification)

| الفحص | الأمر / الأداة | النتيجة |
|---|---|---|
| اختبارات الوحدة (Unit Tests) | `npx --yes tsx --test src/scripts/*.test.ts` | **77/77 ناجح** (`0` فشل) |
| بناء الإنتاج (Production Build) | `compile_applet` | **Build succeeded** |
| التدقيق البرمجي (Lint / Types) | `lint_applet` (`astro sync`) | **Linting completed successfully** |
| فحص التفاعل والدقات الخمس | `playwright-cli` عبر 14 مساراً × 5 دقات | **70/70 ناجح** (`0` أخطاء) |

---

## 16. تأكيد أمان Git

لم يتم تنفيذ `git commit` أو `git push` أو أي تعديل على سجل المستودع أو فروعه.

---

## 17. المخاطر المتبقية والحالات الحدية (Edge Cases)

1. **بطاقات المفضلة بجلسة مستخدم مصدّقة:** لم تُشغّل جلسة تسجيل دخول حقيقية على Firebase Auth أثناء اختبار المتصفح؛ تغطي المراجعة الشيفرة المصدرية والأنماط المزامنة بالكامل.
2. **بطاقة منتج نافد المخزون حياً:** الكتالوج النشط لا يحتوي حالياً على منتج `soldOut: true` لاختبار النقر على زر معطّل فعلياً في الواجهة، غير أن الترتيب الطبقي `z-index: 2` في CSS يضع الزر المعطّل فوق `::after`.
3. **إخفاء مؤشر التركيز المزدوج (`:has()`):** المتصفحات الحديثة تدعم `:has(.dandy-pcard-link:focus-visible)` لعرض الإطار الموحد حول البطاقة؛ وفي المتصفحات القديمة جداً التي لا تدعم `:has()` يوجد fallback تلقائي يظهر إطار التركيز الواضح على رابط العنوان نفسه.

---

## 18. التوصية النهائية للإطلاق

بناءً على نتائج التدقيق المسبق، والتنفيذ النظيف عبر جميع نقاط التوليد الثلاث، واجتياز 77 اختبار وحدة، ونجاح البناء والـ lint، والتحقق العملي عبر 5 مقاسات شاشة والاتجاهين RTL و LTR دون أي أخطاء وحدة تحكم أو تعديل للملفات المحمية:

**التوصية النهائية: جاهز للإطلاق**
