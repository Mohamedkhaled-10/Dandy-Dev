# التقرير النهائي للمرحلة الخامسة — إعادة بناء صفحات الكتالوج والتصنيفات والحملات الترويجية (Phase 5)
**العلامة التجارية:** داندي كوزمتكس — Dandy Cosmetics  
**التوجه التصميمي المعتمد:** Botanical Editorial Commerce  
**نطاق التنفيذ:** `all-products` · `category/[category]` · `special-offers` · `pink-friday` · مكونات الكتالوج المشتركة  

---

## 1. الملخص التنفيذي
تمت إعادة بناء تجربة تصفح الكتالوج والأقسام والحملات الترويجية في متجر **Dandy Cosmetics** ضمن نطاق **المرحلة الخامسة (Phase 5)** فقط، مع الالتزام الكامل بنظام التصميم المعتمد في المراحل 1–4 (`Botanical Editorial Commerce`).  
أصبحت الصفحات الأربع المستهدفة (`/all-products` و`/category/[category]` و`/special-offers` و`/pink-friday`) تعتمد على العرض من الخادم (SSR) بدون وميض تحميل أو شاشات انتظار وهمية، وتستخدم المكون الموحّد لبطاقة المنتج (`ProductCard.astro`) ومنطق التسعير والخصومات الموثق (`resolveProductPricing` و`calculatePinkFridayPricing`)، كما تم القضاء التام على التمدد الأفقي التاريخي على الجوال في صفحات التصنيفات، واجتياز 30 اختبار وحدة واختبارات المتصفح الفعلية في Chromium عبر 5 مقاسات شاشة بدون أخطاء Console أو تعديل أي ملف محمي.

---

## 2. نتائج التدقيق الأولي (Pre-Implementation Audit)
أظهر الفحص الميداني لملفات المشروع وقاعدة بيانات Firebase RTDB الحية (`dandy-562fc-default-rtdb.europe-west1.firebasedatabase.app/products.json`) المعطيات التالية:
1. **إجمالي المنتجات المرئية:** 32 منتجاً غير مخفي (`!isHidden`)؛ جميعها متوفرة حالياً (`soldOut: 0`)، منها 9 منتجات تحمل علامة `bestSeller: true`، و5 منتجات فقط مؤهلة للعروض الفردية (`onSale === true`).
2. **توزيع الأسعار:** 13 منتجاً تحت 150 ج.م، و13 منتجاً بين 150–300 ج.م، و6 منتجات فوق 300 ج.م؛ ما يثبت واقعية نطاقات التصفية السعرية دون فئات فارغة مضللة.
3. **توزيع الأقسام بعد التجاوزات (`PRODUCT_CATEGORY_OVERRIDES`):**
   - `skin-care`: 6 منتجات (3 مصنفة مباشرة + 3 منقولة برمجياً من `Body care`: `Tint` و`Treatment Mascara` و`Lip Balm`).
   - `hair-care`: 12 منتجاً.
   - `body-care`: 7 منتجات (تشمل `Body Butter` المنقول من `Perfume` و`Nail Serum`).
   - `fragrance`: 7 منتجات.
4. **مشكلة التضليل التاريخي في `/special-offers`:** 27 منتجاً غير مشمول بعرض (`onSale: false`) يحمل حقول `originalPrice` ثابتة؛ ولذلك حُصر عرض `/special-offers` في المنتجات المؤهلة فعلياً (`onSale === true` أو خصم Pink Friday نشط).
5. **حالة حملة Pink Friday المنشورة:** الحملة في حالة `active` بتوقيت القاهرة (`+02:00`)، تضم 16 باقة نشطة (`validCollections`)، ولا تضم حالياً عروضاً فردية نشطة (`validCampaignItems = 0`)، ما يعني أن الصفحة يجب أن تبرز الباقات بشكل مقصود دون إظهار قسم منتجات فردية فارغ.

---

## 3. بنية الكتالوج والتصنيفات الحالية
- **مصدر المنتجات (`src/utils/products.ts`):** يجلب المنتجات من Firebase RTDB ويحسّن روابط Cloudinary ويحل الروابط الصديقة لمحركات البحث (`resolvedSlug`) ويدير قواعد السلة والتسعير.
- **مصدر التصنيفات (`src/utils/categories.ts`):** يضم `CATEGORY_TAXONOMY` للأقسام الأربعة المعتمدة (`hair-care`، `body-care`، `fragrance`، `skin-care`) شاملةً `h1Title` و`introText` و`seoTitle` و`seoDescription` و`image` (مقاس `1200×630` على Cloudinary) و`generateCategoryJsonLd()` لتوليد `CollectionPage` و`ItemList` و`BreadcrumbList`.
- **مصدر الحملات (`src/utils/pink-friday-server.ts` و`public/assets/js/pink-friday.js`):** يتولى التحقق من صلاحية الحملة (`getCampaignStatus`)، وأهلية العروض (`validateOffer`)، وحساب أسعار الحملة (`calculatePinkFridayPricing`)، وتهيئة `window.__PINK_FRIDAY_CONFIG`.

---

## 4. توحيد بطاقة المنتج (`ProductCard.astro`)
تم استخدام `src/components/product/ProductCard.astro` دون إنشاء أي مكون بطاقة منافس عبر جميع صفحات المرحلة الخامسة:
- **صفحة جميع المنتجات (`/all-products`):** 32 بطاقة.
- **صفحات التصنيفات (`/category/[category]`):** جميع منتجات القسم المعني (6، 12، 7، 7).
- **صفحة العروض الخاصة (`/special-offers`):** البطاقات الخمس المؤهلة فعلياً.
- **صفحة Pink Friday (`/pink-friday`):** جاهزة لعرض `validCampaignItems` عبر `ProductCard` مع تمرير `pinkFridayPricing` عند تفعيل عروض فردية بالحملة.
- تم الحفاظ بالكامل على تدرّج الشارات (`خصم %`، `Pink Friday`، `الأكثر مبيعاً`، `نفذت الكمية`)، وتوجيه المنتجات متعددة الروائح لصفحة المنتج (`اختاري الرائحة / اختاري النوع`)، والإضافة الفورية للمنتجات الفردية مع `DandyToast` وتحديث شارة السلة ومزامنة `localStorage` و`DandyMeta`.

---

## 5. إعادة بناء صفحة جميع المنتجات (`src/pages/all-products.astro`)
- **الترويسة التحريرية:** تقديم موجز واضح بالعربية يحافظ على دخول شبكة المنتجات في المساحة المرئية الأولى (Above the fold).
- **شريط البحث والتصفية والترتيب (`CatalogToolbar`):**
  - بحث فوري بالاسم أو الفئة أو الوصف مع زر مسح البحث.
  - تبويبات الأقسام الأربعة + `جميع الأقسام`.
  - فلترة السعر (`أقل من 150 ج.م`، `150 – 300 ج.م`، `أكثر من 300 ج.م`) + فلاتر (`العروض`، `الأكثر مبيعاً`) مع إظهار فلتر التوفر (`المتوفر فقط`) ديناميكياً فقط عند وجود منتجات نافذة الكمية (`hasSoldOutItems`).
  - ترتيب (`الترتيب الافتراضي`، `السعر: من الأقل للأعلى`، `السعر: من الأعلى للأقل`، `الاسم: أبجدياً`) دون اختراع خيار "الأحدث" غير مدعوم بتواريخ إنشاء مكتملة.
  - مزامنة كاملة مع معاملات الرابط (URL Query Sync) وعرض شرائط الفلاتر المطبّقة مع إمكانية إزالة كل فلتر على حدة أو إعادة الضبط.
  - استبدال `Loading` / شريط التقدم القديم بعرض SSR فوري.

---

## 6. إعادة بناء صفحات التصنيفات التحريرية (`src/pages/category/[category].astro`)
- **مكون الترويسة (`CategoryEditorialHeader.astro`):** تصميم مستلهم من `ELIXIR` يجمع مسار التنقل (`الرئيسية > جميع المنتجات > القسم`)، واسم القسم، والعنوان الرئيسي (`h1Title`)، والنص التعريفي (`introText`)، وعداد المنتجات (`tabular-nums`)، والصورة الحقيقية للقسم (`categoryConfig.image`) مع `referrerpolicy="no-referrer"` وبديل آمن عند الفشل.
- **التكامل الموحد:** شريط التصفية والترتيب (`CatalogToolbar` مع إخفاء مبدّل الأقسام لأن القسم مقفول بالمسار) ودرج الجوال (`MobileFilterDrawer`) وشبكة `<ProductCard />`.
- **دليل العناية التحريري:** الإبقاء على بطاقة الدليل التحريري لروتين الشعر (`hair-care`) وروتين البشرة (`skin-care`) بأيقونات Lucide (`book-open` و`arrow-left`) وتنسيق مرن بالكامل.
- **حالة 404 للأقسام غير الصالحة:** الحفاظ على `Astro.response.status = 404` مع `robots="noindex, nofollow"` وحالة استرداد واضحة (`CatalogEmptyState`) دون إعادة توجيه صامتة.

---

## 7. أسباب التمدد الأفقي التاريخي على الجوال وإصلاحها الجذري
- **التشخيص المسجّل في الجولة الأولى على النسخة السابقة لـ `/category/[category]`:**
  - `/category/skin-care` سجل `scrollWidth: 441` عند عرض `390px` و`430px` (فائض `+51px`).
  - `/category/hair-care` سجل `scrollWidth: 414` عند عرض `390px` (فائض `+24px`).
  - الأسباب الجذرية في الكود السابق كانت: ضبط `.category-editorial-body { min-width: 260px; }` إلى جانب أزرار `white-space: nowrap` داخل `.category-editorial-link` (التي يحمل نصها العربي الطويل رابط دليل العناية) مع حشو `.category-editorial-card` وشبكة بطاقات قديمة لا تضبط `min-width: 0` على الأعمدة والأبناء.
- **الإصلاح الجذري (بدون إخفاء التمدد عبر `overflow-x: hidden`):**
  1. ضبط أعمدة الشبكة بصيغة `minmax(0, 1fr)` عبر `.dandy-catalog-grid` ووضع `min-width: 0` على الفتحات والحاويات المرنة.
  2. تعديل بطاقة الدليل التحريري (`.dandy-cat-guide-card`) لتسمح بالالتفاف المرن (`flex-wrap: wrap` + `min-width: 0`) وتتحول عمودياً تحت `640px` مع زر `white-space: normal; max-width: 100%;`.
  3. استبدال البطاقات والشريط القديم بمكونات `ProductCard.astro` و`CatalogToolbar.astro` المبنية بالخصائص المنطقية (`padding-inline`، `margin-inline-start`).
- **إصلاح إضافي اكتُشف في الفحص البصري (الجولة 1 -> الجولة 2):**
  - كان قواعد `foundation.css` الأقدم (`input[type="search"]`) تتفوق في الأولوية (`0,1,1`) على `.dandy-cat-search-input` (`0,1,0`)، مما أظهر إطاراً داخلياً مزدوجاً داخل خانة البحث؛ تم رفعه إلى `.dandy-cat-search input.dandy-cat-search-input` لإزالة الإطار المزدوج تماماً.

---

## 8. تنفيذ البحث والتصفية والترتيب (`catalog.ts` و`catalog-client.ts`)
- فصل المنطق النقي في `src/scripts/catalog.ts`:
  - `normalizeCatalogCategoryParam()` لتوحيد معرفات Firebase القديمة والحديثة.
  - `parseCatalogQueryState()` و`serializeCatalogQueryState()` لحفظ واستعادة حالة البحث/التصنيف/السعر/العروض/الأكثر مبيعاً/التوفر/الترتيب عبر الرابط مع احترام القفل التلقائي للقسم في صفحات `/category/*`.
  - `filterAndSortCatalogItems()` و`buildActiveCatalogChips()` و`countActiveFilters()`.
- وحدة التحكم بالمتصفح `src/scripts/catalog-client.ts` تربط الشريط المكتبي ودرج الجوال ثنائياً، وتعيد ترتيب العقد داخل الشبكة دون إعادة بناء `DOM`، وتحدّث العدادات وحالة الفراغ ورابط المتصفح عبر `history.replaceState`.

---

## 9. درج التصفية للجوال (`MobileFilterDrawer.astro`)
- درج RTL مخصص تحت `900px` ينزلق من البداية المنطقية (`inset-inline-start: 0`) وفق لغة المرحلة الثانية.
- يضم خيارات الترتيب، نطاق السعر، الأقسام (عند التمكين)، وخيارات العروض/الأكثر مبيعاً/المتوفر، مع أزرار `عرض النتائج` و`إعادة ضبط`.
- يدعم الإغلاق بمفتاح `Escape` والنقر على الخلفية، وقفْل التمرير الخلفي، وإدارة التركيز (`focus()` على زر الإغلاق ثم إرجاعه للزر الفاتح)، وشارة بعدد الفلاتر النشطة (`data-mobile-filter-count`).

---

## 10. إعادة بناء صفحة العروض الخاصة (`src/pages/special-offers.astro`)
- فلترة صارمة في الخادم عبر `isSpecialOfferEligible()` بحيث لا يظهر أي منتج غير مخفض فعلياً حتى لو امتلك `originalPrice` ساكناً في قاعدة البيانات (ظهرت المنتجات الـ 5 المؤهلة فقط من أصل 32).
- حصر تبويبات الأقسام داخل شريط التصفية في الأقسام التي تضم عروضاً فعلية فقط عبر `availableCategories` لمنع النقر على تبويب مضلل نتيجته صفر.
- إبراز بطاقة متزنة لباقات `Pink Friday` فقط عندما تكون `shouldDisplayCampaignToCustomers(pinkFridayCampaign)` صحيحة.
- توفير حالتي فراغ صادقتين (`CatalogEmptyState`): حالة عدم تطابق البحث/الفلترة، وحالة خلو المتجر من عروض فردية نشطة دون عدادات وهمية.

---

## 11. إعادة بناء صفحة حملة Pink Friday (`src/pages/pink-friday.astro`)
- **هوية الحملة المتوازنة:** رأس داكن بتدرج `#1A1715` إلى `--dandy-plum-ink` ينسجم مع `Botanical Editorial Commerce`، ويستخدم النصوص الحقيقية للوحة الحملة (`visuals.badgeText`، `visuals.headline`، `visuals.subtitle`، `visuals.ctaText`).
- **سلامة الصور والنصوص داخلها:** عرض بانر الهيرو وبطاقات الكوليكشنز الـ 16 عبر `object-fit: contain` (مع إطار `1:1` للباقات وارتفاع مرن للهيرو في الجولة الثانية لإزالة الفراغ الداكن العلوي والسفلي ومنع قص النصوص الترويجية المدمجة في صور الباقات).
- **العد التنازلي بتوقيت القاهرة:** دوال `normalizeCairoIsoTimestamp()` و`computeCairoCountdown()` تضبط الطوابع الساذجة على `+02:00` وتقيد أي قيم منقضية عند الصفر (`00`) بدون أي أرقام سالبة.
- **حالات الحملة المتعددة (`resolvePinkFridayDisplayMode`):** دعم `active-full` و`active-offers-only` و`active-bundles-only` و`active-empty` و`upcoming` و`ended` و`disabled`.
- **نافذة تخصيص الروائح للباقات (`#storefrontColModal`):** نافذة accessible (`role="dialog"`، `Escape`، خلفية معتمة، إرجاع التركيز) تحافظ 100% على هيكل السلة المتوقع في `/cart` (`type: 'collection'`، `isCollection: true`، `isPinkFriday: true`، `selectedItems`)، وتزامن `localStorage.cart` و`localStorage.dandy_cart` و`DandyMeta.trackAddToCart` وشارة السلة وإشعار `DandyToast`.

---

## 12. تكامل الحملات والتسعير
- لم تُنشأ أي معادلة تسعير جديدة؛ جميع الأسعار تمر عبر:
  - `resolveProductPricing()` و`resolveProductCardViewModel()` من `src/scripts/product-card.ts`.
  - `calculatePinkFridayPricing()` و`validateOffer()` و`getCampaignStatus()` و`shouldDisplayCampaignToCustomers()` من `src/utils/pink-friday-server.ts`.
  - `isSpecialOfferEligible()` في `src/scripts/catalog.ts` المطابق لقاعدة الاستحقاق المعتمدة.

---

## 13. الحفاظ على السيو وإمكانية الوصول (SEO & Accessibility)
- **SEO:**
  - الحفاظ على `title`، و`description`، و`canonical`، ووسوم `OpenGraph` و`Twitter` لكل مسار.
  - الحفاظ على بيانات Schema.org المنظمة في `/all-products`، و`/special-offers`، و`/pink-friday`، والمخططات الثلاثة (`CollectionPage`، `ItemList`، `BreadcrumbList`) في `/category/[category]`.
  - إشارة زحف ذكية `robots="noindex, follow"` عند وجود معاملات التصفية والبحث (`category`, `search`, `sort`, `page`, `price`, `sale`, `availability`, `bestseller`) مع بقاء `canonical` على المسار الأساسي، و`noindex, nofollow` على صفحات 404.
  - التحقق من استمرار تضمين `/category/*` و`/special-offers` و`/pink-friday` في `/sitemap.xml`.
- **إمكانية الوصول (Accessibility):**
  - استبدال جميع أيقونات Font Awesome داخل صفحات المرحلة الخامسة ومكوناتها بمكون `<Icon />` (Lucide SVG مع `aria-hidden="true"`).
  - مساحات لمس `>= 44px` للأزرار والحقول ومحددات الأسعار والترتيب وإغلاق النوافذ، و`aria-pressed`، و`aria-expanded`، و`aria-live="polite"` لعداد النتائج، ودعم لوحة المفاتيح (`Escape`، حلقة التركيز).

---

## 14. الملفات المُنشأة (Created Files)
| الملف | الغرض | الحالة |
|---|---|---|
| `src/scripts/catalog.ts` | منطق التصفية والترتيب ومعاملات الرابط وتوقيت القاهرة وحالات الحملة | منفّذ ومختبَر فعلياً |
| `src/scripts/catalog.test.ts` | اختبارات وحدة شاملة (8 اختبارات) لمنطق الكتالوج والعداد وحالات Pink Friday | منفّذ ومختبَر فعلياً |
| `src/scripts/catalog-client.ts` | وحدة التحكم التفاعلية للبحث والفلاتر والترتيب ودرج الجوال وتحديث الرابط | منفّذ ومختبَر فعلياً |
| `src/components/catalog/CatalogToolbar.astro` | شريط البحث والتصفية والترتيب المكتبي + شرائط الفلاتر النشطة | منفّذ ومختبَر فعلياً |
| `src/components/catalog/MobileFilterDrawer.astro` | درج التصفية والترتيب التفاعلي المتجاوب لـ RTL على الجوال | منفّذ ومختبَر فعلياً |
| `src/components/catalog/CategoryEditorialHeader.astro` | الترويسة التحريرية لصفحات التصنيفات مستلهمة من ELIXIR بالصورة الحقيقية | منفّذ ومختبَر فعلياً |
| `src/components/catalog/CatalogEmptyState.astro` | مكون موحد لحالات الفراغ و404 وإعادة ضبط الفلاتر | منفّذ ومختبَر فعلياً |
| `DANDY_PHASE_5_FINAL_REPORT_AR.md` | التقرير النهائي التفصيلي للمرحلة الخامسة | منفّذ |

---

## 15. الملفات المعدّلة (Modified Files)
| الملف | سبب التعديل | الحالة |
|---|---|---|
| `src/pages/all-products.astro` | إعادة بناء تجربة الكتالوج الكاملة مع SSR و`<ProductCard />` وشريط التصفية والدرج وSEO | منفّذ ومختبَر فعلياً |
| `src/pages/category/[category].astro` | إعادة بناء صفحات التصنيفات مع الترويسة التحريرية و`ProductCard` وإصلاح التمدد الأفقي والـ 404 وJSON-LD | منفّذ ومختبَر فعلياً |
| `src/pages/special-offers.astro` | إعادة بناء صفحة العروض الخاصة بالفلترة الحقيقية الصارمة (5 عروض نشطة) وتقليص تبويبات الأقسام غير المعنية | منفّذ ومختبَر فعلياً |
| `src/pages/pink-friday.astro` | إعادة بناء صفحة الحملة بالهيرو المتوازن وعدّاد القاهرة وحالات الحملة و16 باقة مع نافذة تخصيص الروائح | منفّذ ومختبَر فعلياً |
| `src/components/ui/Icon.astro` | إضافة أيقونات Lucide (`clock`, `gift`, `rotate-ccw`) للاستخدام في العد التنازلي وحالات الفراغ | منفّذ ومختبَر فعلياً |
| `src/scripts/icons.ts` | تسجيل الأيقونات الثلاث المضافة في السجل البرمجي المشترك | منفّذ ومختبَر فعلياً |
| `src/styles/components.css` | إضافة أنماط الحاوية والشبكة الموحدة `.dandy-page-band` و`.dandy-catalog-grid` (4→3→2 أعمدة) | منفّذ ومختبَر فعلياً |

---

## 16. الملفات المحذوفة (Deleted Files)
- **لا توجد أي ملفات محذوفة (0 ملفات)** ضمن المرحلة الخامسة.

---

## 17. جميع المسارات المختبَرة (Tested Routes)
- `/all-products` و`/all-products?search=serum` (HTTP 200).
- `/category/skin-care` و`/category/hair-care` و`/category/body-care` و`/category/fragrance` (HTTP 200).
- `/category/hair-care?price=150-300` (HTTP 200 مع `noindex, follow`).
- `/category/does-not-exist` (HTTP 404 مع `noindex, nofollow`).
- `/special-offers` (HTTP 200).
- `/pink-friday` (HTTP 200).
- `/sitemap.xml` (HTTP 200).
- مسارات فحص عدم الانحدار خارج النطاق: `/`، `/product/facial-serum-3x1-30ml`، `/cart`.

---

## 18. مقاسات العرض المتجاوبة المختبَرة (Viewports Tested)
تم الفحص الفعلي في متصفح Chromium عبر المقاسات الخمسة المعتمدة:
- جوال صغير: `390 × 844`
- جوال كبير: `430 × 932`
- تابلت: `768 × 1024`
- سطح مكتب صغير: `1024 × 768`
- سطح مكتب واسع: `1440 × 900`

---

## 19. نتائج فحص التمدد الأفقي (`scrollWidth === clientWidth`)
بعد تطبيق الإصلاحات النهائية وإعادة تشغيل الخادم في الجولة الثانية:
- `/all-products`: `scrollWidth === clientWidth` (`1440 = 1440` و`390 = 390`) — **0px overflow**.
- `/category/skin-care` و`/category/hair-care` و`/category/body-care` و`/category/fragrance`: اجتازت جميعها الـ 5 مقاسات (`390`، `430`، `768`، `1024`، `1440`) بنتيجة **`overflowOrBroken: []` (0px overflow)** وتمرير بطاقة الدليل التحريري بالكامل داخل الإطار.
- `/special-offers`: `1440 = 1440` — **0px overflow**.
- `/pink-friday`: `1440 = 1440` — **0px overflow**.
- مسارات الانحدار (`/`, `/product/facial-serum-3x1-30ml`, `/cart`): `1440 = 1440` — **0px overflow**.

---

## 20. نتائج الاختبارات الوظيفية (Playwright Chromium)
- **الكتالوج (`/all-products`):** تحميل كل الـ 32 منتجاً والصور بدون صور مكسورة (`broken: []`)؛ البحث بكلمة `"سيروم"` أعاد `3` منتجات وحدّث الرابط إلى `?search=%D8%B3%D9%8A%D8%B1%D9%88%D9%85`؛ التصفية المركبة (`hair-care` + `150-300` + `price-asc`) أعادت `[200, 250, 270, 300]` مرتبة تصاعدياً بعداد `"4 من 32 منتج"` وشريطَي فلاتر؛ حالة البحث الفارغ أظهرت `CatalogEmptyState` وزر إعادة الضبط أعاد الـ 32 منتجاً؛ الإضافة المباشرة للسلة حفظت المنتج في `localStorage` وأظهرت `DandyToast` ("تمت إضافة... عرض السلة")؛ درج الجوال فتح وأُغلق بمفتاح `Escape` والنقر على الخلفية.
- **الأقسام (`/category/*`):** ظهر التوزيع الدقيق (`skin-care: 6`، `hair-care: 12`، `body-care: 7`، `fragrance: 7`)، وتحمّلت صور `categoryConfig.image` بنجاح (`heroImgOk: true`)، وتوفرت 3 مخططات `JSON-LD` بكل قسم، وبطاقة الدليل التحريري في `hair-care` و`skin-care`، وحالة `404` للمسار غير الصالح، وصفر أيقونات Font Awesome (`fa: 0`).
- **العروض الخاصة (`/special-offers`):** عرضت 5 منتجات مؤهلة فقط (`onSaleFlags: ["true","true","true","true","true"]`)، وانحصرت تبويبات الأقسام في الأقسام الثلاثة ذات العروض الفعلية (`skin-care`, `hair-care`, `fragrance`)، وظهر ربط Pink Friday.
- **Pink Friday (`/pink-friday`):** ظهر البانر بخاصية `object-fit: contain`، والعد التنازلي بتوقيت القاهرة قيماً غير سالبة (`[13, 5, 38, 36]`)، و16 بطاقة كوليكشن نشطة؛ اختيار رائحة داخل `#storefrontColModal` والضغط على `#btnConfirmAddColToCart` حفظ الباقة في `localStorage.cart` و`dandy_cart` بنفس هيكل السلة (`type: "collection"`, `isPinkFriday: true`, `selectedItems: 3`) وأظهر `DandyToast` وتحققت قراءتها في `/cart`.
- **الـ Console:** صفر أخطاء JavaScript وأخطاء وقت التشغيل عبر الجلسة النهائية (`Errors: 0, Warnings: 0`)، باستثناء استجابة 404 المتعمدة لاختبار `/category/does-not-exist`.

---

## 21. نتائج اختبارات الوحدة (Unit Tests)
تم تنفيذ جميع ملفات الاختبار عبر `npx --yes tsx --test` بعد التعديل الأخير:
- `src/scripts/catalog.test.ts`: 8/8 ناجحة.
- `src/scripts/foundation.test.ts`: 4/4 ناجحة.
- `src/scripts/product-card.test.ts`: 6/6 ناجحة.
- `src/scripts/product-pdp.test.ts`: 7/7 ناجحة.
- `src/scripts/shell.test.ts`: 5/5 ناجحة.
- **الإجمالي الكلي:** **30 / 30 اختبار ناجح (0 إخفاق)**.

---

## 22. نتائج الفحص اللغوي/البنائي (`lint_applet`)
- نجح تنفيذ `npm run lint` (`astro sync`) بالكامل بدون أخطاء أو تحذيرات معرقلة بعد التعديل الأخير.

---

## 23. نتائج بناء الإنتاج (`compile_applet` / `npm run build`)
- نجح بناء الإنتاج بالكامل عبر `compile_applet` بدون أخطاء في TypeScript أو Astro SSR أو حزم الواجهة.

---

## 24. التحقق من سلامة الملفات المحمية (SHA-256 Checksums)
تمت مطابقة البصمات الرقمية بعد الانتهاء من كافة التعديلات وكانت متطابقة 100% مع اللقطة المرجعية الأولية:
- `astro.config.mjs`: `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc` (مطابق)
- `vercel.json`: `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05` (مطابق)
- `package.json`: `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3` (مطابق)
- `tsconfig.json`: `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046` (مطابق)
- `patch-env.cjs`: `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623` (مطابق)
- `server.js`: `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667` (مطابق)
- `.env.example`: `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0` (مطابق)

---

## 25. المشكلات المعروفة والاختبارات غير المكتملة بصرياً في البيانات الحية
- **حالات `Pink Friday` غير النشطة حالياً (`active-offers-only`, `active-full`, `active-empty`, `upcoming`, `ended`, `disabled`):** نظراً لكون الحملة الحية في وضع `active` مع `validCampaignItems = 0` و`16` كوليكشن نشطاً وبقيمة `endAt` مستقبلية، والتزاماً بعدم تعديل بيانات الإنتاج الحية، تم التحقق من تلك الحالات عبر اختبارات الوحدة المنفصلة في `catalog.test.ts` (`resolvePinkFridayDisplayMode` و`computeCairoCountdown`) وربط قوالب SSR الخاصة بها، ولم تُلتقط بصرياً في المتصفح الحي.
- **حالات الفراغ لعدم وجود منتجات أصلية في قسم أو في العروض الخاصة وفلتر التوفر (`hasSoldOutItems`):** لأن الكتالوج الحي يضم حالياً 32 منتجاً متوفراً (`soldOut: 0`) و5 عروض نشطة، تم التحقق من إظهار حالة الفراغ عند التصفية والبحث في المتصفح، ومنطق `CatalogEmptyState` للأقسام والعروض الفارغة عبر القالب واختبارات الوحدة.
- **بطء إضافي محتمل لحدث `networkidle` في `/cart`:** عند التنقل نحو `/cart` مع وجود مستمعات خارجية، يُنصح باعتماد `domcontentloaded` + انتظار العناصر في الاختبارات الآلية بدلاً من `networkidle`.

---

## 26. العناصر المؤجلة (Deferred Items)
تم ترك العناصر التالية خارج نطاق المرحلة الخامسة عمداً التزاماً بحدود النطاق:
- إعادة بناء صفحة السلة (`/cart`) وإتمام الطلب وتأكيد الفاتورة (`/invoice` و`/track-order`).
- صفحات الحساب والدخول (`/account*` و`/login`).
- صفحات المدونة والمقالات (`/blog` و`/post`) والمحتوى الثابت (`/about-us`, `/contact-us`, `/help`, `/privacy-policy`, `/terms`).
- لوحة التحكم الإدارية (`/dashboard*`) ومخططات Firebase.

---

## 27. المرحلة التالية الموصى بها
**المرحلة السادسة (Phase 6) — السلة وإتمام الطلب وتجربة التتبع والحسابات:** توحيد تصميم `/cart` وتدفق الشراء الكامل، واستبدال تنبيهات المتصفح القديمة وتكامل الروائح والكميات والخصومات الترويجية داخل تجربة موحّدة متوافقة مع `Botanical Editorial Commerce`.
