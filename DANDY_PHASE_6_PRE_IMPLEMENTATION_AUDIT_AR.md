# تقرير الفحص المسبق قبل التنفيذ — المرحلة السادسة (DANDY Phase 6 Pre-Implementation Audit)
**تاريخ الإعداد:** 2026-11-17  
**المشروع:** Dandy Cosmetics (`Dandy-Dev`)  
**التوجه التصميمي:** Botanical Editorial Commerce (عربي أولاً RTL، متوافق مع LTR)  
**النطاق:** سلة التسوق وإتمام الطلب (`/cart`)، تأكيد الطلب والفاتورة (`/invoice`)، وتتبع الطلب (`/track-order`)

---

## 1. نطاق الفحص والمنهجية والالتزامات التعاقدية

تم فحص الشيفرة المصدرية الفعلية في مساحة العمل قبل إجراء أي تعديل برمجي لضمان الحفاظ الكامل على منطق الأعمال، وعقود الـ API، وبنية Firebase، والتكاملات التسويقية والأمنية القائمة.

### 1.1 ملفات البناء والتهيئة المحمية (Protected Baseline)
تم التحقق من سلامة ومطابقة بصمة `SHA-256` لجميع ملفات البناء والنشر المحمية ضد مرجع المرحلة الخامسة (`DANDY_PHASE_5_FINAL_REPORT_AR.md`) دون أي تعديل:
- `astro.config.mjs`: `dbe03ebc4a9a5de19e4881c3c336fdf1abc0c935cbf9981e3b17549f11bdbccc`
- `vercel.json`: `19dc1d6e399c3b521dbfe33a77371db49fd8d500c02e3f7307d83dec3deaec05`
- `package.json`: `946d161f84f00ea855276cd9aad612def99d7624fc50db408821fcd222bfe7b3`
- `tsconfig.json`: `a2e95f489fdec9b40494b5391bd707c3217ce7e779301ded9b477112d90de046`
- `patch-env.cjs`: `63ab67417e588ec3fbc73839fa71aece1990d2d53b3a0e41908b06e20a996623`
- `server.js`: `537fc4723fd31b0ce546b26e24bfae27eb90753c2cffad4aa709765ec30cc667`
- `.env.example`: `5e20f4357b48ab55455538608577772959a755505e664484a740ad1a7c1a65f0`

### 1.2 حدود النطاق الصارمة
- **يشمل التنفيذ:** `/cart` (السلة + مسار إتمام الطلب ثلاثي المراحل)، `/invoice` (تأكيد الطلب والفاتورة القابلة للطباعة)، `/track-order` (تتبع الطلب)، بالإضافة إلى المكونات المشتركة والوحدات المنفصلة للاختبار تحت `src/components/commerce/` و`src/scripts/`.
- **خارج النطاق (لا يُمس):** صفحات الحساب وتسجيل الدخول (`/account`, `/account-login`, `/account-signup`, `/login`) ولوحات الإدارة (`/dashboard*`) ومجلد `/src/pages/api/*` بالكامل، وقواعد Firebase، وبيانات المنتجات.
- **الطلب كضيف (Guest Checkout):** يستمر العمل الكامل للضيف دون أي اشتراط للتسجيل أو تسجيل الدخول قبل إتمام الشراء.

---

## 2. جرد البنية الحالية عبر نقاط التفتيش الإثنتي عشرة (1–12)

### 2.1 هيكل صفحة السلة والسكربتات المتحكمة بها (`/cart` — `src/pages/cart.astro`)
- لا يوجد مسار منفصل باسم `/checkout` في `src/pages/`؛ بل يجمع مسار `/cart` بين مراجعة حقيبة التسوق ومسار إتمام الطلب من 3 خطوات داخل حاوية `#cartCheckoutContainer`:
  - **الخطوة 1 (`#step-panel-1`):** مراجعة المنتجات وتعديل الكميات والحذف وملخص تقديري.
  - **الخطوة 2 (`#step-panel-2`):** إدخال بيانات المستلم والشحن (مع خيار العناوين المحفوظة للمستخدمين المسجلين اختيارياً عبر `#savedAddressesSection`).
  - **الخطوة 3 (`#step-panel-3`):** المراجعة النهائية، أداة الحماية Cloudflare Turnstile (`.cf-turnstile`)، طريقة الدفع (COD)، وزر إرسال الطلب النهائي (`#finalPlaceOrderBtn`).
- يعتمد التنفيذ الحالي كلياً على `<script is:inline>` مضمّن بطول ~680 سطراً مع دوال عالمية على `window` (`goToStep`, `validateAndGoToReview`, `submitFinalOrder`, `changeQty`, `removeItemFromCart`, `handleGovChange`, `toggleAddressMode`, `applySavedAddress`).

### 2.2 هيكلة عناصر السلة والتوافق مع `localStorage`
- **مفتاح التخزين الرئيسي:** `localStorage.cart` (مصفوفة JSON).
- **التعارض المكتشف:** تضيف صفحة حملة `pink-friday.astro` إلى كلا المفتاحين `localStorage.cart` و`localStorage.dandy_cart`، بينما تقرأ وتكتب `cart.astro` و`SiteHeader.astro` و`product-card-client.ts` في `localStorage.cart` فقط وتزيل `cart` فقط عند نجاح الطلب (`localStorage.removeItem('cart')`).
- **التوافق المطلوب:** الحفاظ على `localStorage.cart` كمصدر أساسي مع قراءة احتياطية من `dandy_cart` عند خلو `cart`، ومزامنة الكتابة والمسح إلى كلا المفتاحين (`cart` و`dandy_cart`) وإطلاق حدث `cart-updated` وتحديث `window.updateSharedCartCount()`.

### 2.3 الفروق بين عنصر المنتج الفردي وعنصر الكوليكشن
1. **المنتج القياسي (من `ProductCard` / `product-card-client.ts`):**
   `{ id, productId, name, price, image, discount, onSale, quantity }`
2. **المنتج ذو الروائح/المتغيرات (من PDP عبر `product-pdp.ts`):**
   `{ id: "<productId>::<sortedIds>", productId, name, price, image, discount, onSale, quantity, hasVariants: true, variantType: 'scent', selectedVariants: [{ id, name }], selectedVariant?, variantId?, variantName, isPinkFriday?, campaignPrice?, regularPrice?, badgeText? }`
3. **كوليكشن Pink Friday (من `pink-friday.astro`):**
   `{ type: 'collection', isCollection: true, isPinkFriday: true, collectionId, name, price: calculatedPrice, regularPrice: totalRegularPrice, image: coverImage, quantity: 1, selectedItems: [{ collectionItemId, productId, productName, selectedVariant: { id, name } | null }] }`

### 2.4 بيانات المتغيرات والروائح (`public/assets/js/variants.js`)
- تعتمد السلة والفاتورة والتتبع على دوال `variants.js` العالمية:
  - `getVariantsDisplayInfo(item)` لاستخراج `{ count, label ('الرائحة' | 'الروائح'), text, list }`.
  - `getEffectiveUnitPrice(item)` التي تحسب `Number(item.price) * countOfSelectedVariants`.
  - `getCartItemKey(item)` التي توحّد مفتاح المنتج مع الروائح المرتبة أبجدياً.
- يجب عدم كسر التوافق مع هذه الدوال والاستمرار في استهلاكها في حساب العرض والمجموع داخل الواجهة.

### 2.5 آليات تعديل الكمية والحذف الحالية
- الزيادة والنقصان: عبر `changeQty(index, delta)` مع حد أدنى `1`. حالياً لا يوجد تعطيل بصري/وصولي (`disabled`) لزر `−` عند الكمية `1`، ولا تتضمن الأزرار اسم المنتج في `aria-label`.
- الحذف: عبر `removeItemFromCart(index)` التي تحذف العنصر فوراً عبر `cart.splice(index, 1)` دون أي تأكيد أو إشعار تراجع. سيتم استبدال ذلك بتأكيد حواري أصيل للمشروع (`<dialog>`) أو تأكيد ضمني واضح دون استخدام `window.confirm()`.

### 2.6 دوال حساب المجموع الفرعي والشحن والإجمالي
- **المجموع الفرعي:** `sum(getEffectiveUnitPrice(item) * quantity)`.
- **أسعار الشحن حسب المحافظة (مطابقة حرفياً بين `cart.astro` و`create-order.js`):**
  - `Gharbia`: `70 ج.م`
  - `Cairo`, `Giza`, `Alexandria`, `Dakahlia`, `Sharqia`, `Kafr El Sheikh`, `Qalyubia`, `Port Said`, `Damietta`, `Suez`, `Ismailia`, `Beheira`, `Monufia`: `85 ج.م`
  - `Fayoum`, `Beni Suef`, `Minya`: `100 ج.م`
  - `Luxor`, `Aswan`, `Assiut`, `Sohag`, `North Sinai`, `South Sinai`, `Qena`, `New Valley`, `Red Sea`, `Matrouh` (والقيمة الافتراضية): `120 ج.م`
- **قاعدة الشحن المجاني الفعلية:** إذا كان `subtotal > 2000` (أكبر قطعياً من 2000 ج.م)، تصبح تكلفة الشحن `0 ج.م`.
- **الإجمالي الكلي:** `subtotal + shippingFee`.

### 2.7 سلوك الكوبونات والخصومات الترويجية الحالي
- **لا يوجد نظام كوبونات خصم (Promo/Coupon Codes)** لا في واجهة `cart.astro` ولا في الخادم `src/pages/api/create-order.js`.
- **الخصومات الفعلية المدعومة فقط هي:**
  1. خصومات المنتجات الفردية (`onSale` / `discount`).
  2. تسعير حملة **Pink Friday** المحسوب والمطابق عبر `window.DandyPinkFriday` في المتصفح وعبر `calculatePinkFridayPricing` في السيرفر (بما يشمل كوليكشنات الباقات وخصومات المنتجات المحددة).
- **الالتزام:** وفق قاعدة الحفاظ الصارم على منطق الأعمال، **لن نبتكر حقلاً وهمياً للكوبونات أو قواعد خصم غير مدعومة في الخادم**.

### 2.8 مسار إتمام الطلب وإرسال البيانات (`/api/create-order`)
- **التحقق من المدخلات قبل الانتقال للخطوة 3:**
  - الاسم الكامل: لا يقل عن `5` أحرف.
  - رقم الهاتف المصري: مطابق للنمط `/^01[0125][0-9]{8}$/`.
  - المحافظة، المدينة/المنطقة، والعنوان التفصيلي: حقول إلزامية غير فارغة.
  - البريد الإلكتروني: اختياري (يتحقق من صيغته عند إدخاله).
- **تتبع Meta Pixel (`DandyMeta`):**
  - استدعاء `window.DandyMeta.trackInitiateCheckout(cart, cartVal)` مرة واحدة عند الانتقال إلى الخطوة 2 (مع سقوط احتياطي لـ `fbq('track', 'InitiateCheckout', ...)`).
- **طلب `POST /api/create-order`:**
  - `customer`: `{ name, phone, email: email || 'N/A', governorate, city, address }`
  - `items`:
    - للمنتج: `{ productId, name, image, quantity, selectedVariants: [{ id, name }] }`
    - للكوليكشن: `{ type: 'collection', isCollection: true, isPinkFriday: true, collectionId, name, image, quantity, selectedItems }`
  - `idToken`: رمز Firebase Auth ID Token إن كان العميل مسجلاً الدخول (`null` للضيف).
  - `turnstileToken`: رمز `.cf-turnstile` (`turnstile.getResponse()` أو `[name="cf-turnstile-response"]`).
- **عند النجاح:** مسح السلة (`cart` و`dandy_cart`)، حفظ `{ code: invoiceCode, phone, time }` في `localStorage.dandy_recent_lookups`، والانتقال إلى `/invoice?id=<orderId>&invoice=<invoiceCode>`.

### 2.9 مسار تأكيد الطلب والفاتورة (`/invoice` — `src/pages/invoice.astro`)
- يدعم 3 طرق لجلب الطلب:
  1. عبر Hash Fragment المشفّر `#access={token}` أو `#token={token}`: يُزيل التوكن فوراً عبر `history.replaceState` ويرسل `POST /api/public-invoice` ويعرض الكائن المفلتر الآمن (`resolvePublicInvoiceByToken`).
  2. عبر معامل الاستعلام `?id={orderId}` من Firebase RTDB (`db.ref('orders/' + idParam).on('value', ...)`).
  3. عبر معامل الاستعلام `?invoice={invoiceCode}` من Firebase RTDB (`db.ref('orders').orderByChild('invoiceCode').equalTo(invoiceParam).on('value', ...)`).
- يستدعي `window.DandyMeta.trackPurchase(order)` عند عرض الطلب.
- **طرق الدفع الفعلية:** الدفع عند الاستلام (`الدفع عند الاستلام (COD)`) فقط.

### 2.10 مسار تتبع الطلب والحالات المعتمدة (`/track-order` — `src/pages/track-order.astro`)
- يستقبل `#trackCode` و`#trackPhone` (أو معاملات URL `?code=...&phone=...`).
- يستعلم عبر `db.ref('orders').orderByChild('invoiceCode').equalTo(code).once('value')` ثم يطابق الأرقام فقط من الهاتف (`replace(/[^0-9]/g, '')`).
- يحفظ آخر 4 عمليات بحث ناجحة في `localStorage.dandy_recent_lookups`.
- **خريطة الحالات الفعلية في النظام (من `email-service.ts` و`invoice.astro` و`track-order.astro`):**
  1. `جديد` / `قيد الانتظار` / `New` / `Pending` → مرحلة 1 (`قيد المراجعة` / `تم الاستلام`)
  2. `قيد التجهيز` / `تم التواصل` / `قيد التحضير` / `قيد المعالجة` / `Processing` → مرحلة 2 (`قيد التجهيز`)
  3. `تم الشحن` / `جاري الشحن` / `جاري التوصيل` / `شحن` / `Shipped` → مرحلة 3 (`تم الشحن`)
  4. `تم التوصيل` / `مكتمل` / `واصل` / `Delivered` → مرحلة 4 (`تم التوصيل`)
  5. `ملغي` / `Cancelled` → حالة إلغاء خاصة (`تم الإلغاء`) مع إخفاء الخط الزمني.

### 2.11 المكونات المشتركة والأنماط والأيقونات والإشعارات
- يستخدم النظام الموحد:
  - التخطيط العام `BaseLayout.astro` (المحتوي على `SiteHeader`, `SiteFooter`, `BottomMobileNav`, `dandy-bab-widget`, `ToastHost`, `ConsentBanner`).
  - متغيرات التصميم في `src/styles/tokens.css` و`base.css` و`components.css` (`--dandy-bg-editorial: #FAF8F6`, `--dandy-bg-stage: #F5F4F1`, `--dandy-ink-primary: #1A1715`, `--dandy-botanical-deep: #2B3A2C`, `--dandy-accent-primary: #C83269`, `--dandy-accent-text: #9D1B4D`).
  - مكون `Icon.astro` وسجل `src/scripts/icons.ts` (أيقونات SVG موحدة بدون الاعتماد على Font Awesome).
  - نظام الإشعارات `window.DandyToast.show(...)` (`src/scripts/toast.ts`).

### 2.12 تنبيهات المتصفح الإرثية ومشكلات التوافق داخل النطاق المستهدف
تم رصد الاستدعاءات الإرثية التالية التي يجب إزالتها واستبدالها كلياً:
- **`cart.astro`:** 5 استدعاءات `alert(...)` (أخطاء التحقق في الخطوة 2، فقدان كابتشا Turnstile، أخطاء إرسال الطلب). كما تستخدم `cart.astro` أيقونات Font Awesome منها أيقونة غير موجودة في النسخة المجانية (`fa-sparkles`)، وتستخدم صور fallback من `images.unsplash.com` غير الموثوقة.
- **`track-order.astro`:** 4 استدعاءات `alert(...)` (الحقول الفارغة، الطلب غير موجود، عدم تطابق الهاتف، خطأ الشبكة) + صور fallback من `images.unsplash.com`.
- **`invoice.astro`:** استدعاء `window.open(...)` في زر مشاركة واتساب (`#share-whatsapp`) + غياب تام لقواعد `@media print` مما يؤدي لطباعة الهيدر والفوتر وشريط الموبايل وودجت الدردشة + خلل `colspan="2"` في صف السلة الفارغة داخل جدول من 3 أعمدة + صور fallback من `images.unsplash.com` + عدم وجود callback لمعالجة أخطاء RTDB (`permission_denied`) مما يبقي الشاشة معلقة على `...جاري التحميل`.

---

## 3. التدقيق التفصيلي لكل مسار وخطة إعادة البناء

### 3.1 المسار الأول: `/cart` (`src/pages/cart.astro`)
- **الغرض:** مراجعة سلة التسوق وإتمام الطلب كضيف أو كعميل مسجل عبر 3 خطوات واضحة.
- **الملفات الحالية:** `src/pages/cart.astro`، يعتمد على `/assets/js/variants.js` و`BaseLayout.astro`.
- **المشكلات المرصودة:**
  1. عنوان `<title>` ووصف `<meta description>` و`og:*` مكتوبة بالإنجليزية في واجهة عربية.
  2. عدم وجود مسار ملاحة (`Breadcrumb`) أو عنوان صفحة تحريري متسق مع `CategoryEditorialHeader`.
  3. استهلاك مفرط للأزرار الكبسولية (`border-radius: 99px`)، وبطاقات وردية زاهية (`#fdf2f8` / `#fe5d9f`) مخالفة لتدرج 60-30-10 الهادئ في الهوية النباتية.
  4. غياب مؤشر التقدم المرئي نحو الشحن المجاني (`> 2000 ج.م`).
  5. اعتماد `alert()` بدلاً من رسائل الأخطاء الحقلية (`inline errors`) و`DandyToast`، وغياب تأكيد الحذف من السلة، وغياب حالة `disabled` للكمية `1`.
  6. عدم مزامنة `localStorage.dandy_cart` عند التعديل أو التفريغ.
- **العقود الواجب الحفاظ عليها:** جميع المعرفات الحرجة (`#cartCheckoutContainer`, `#savedAddressesSection`, `#addrModeSaved`, `#addrModeNew`, `#savedSelectWrap`, `#savedAddressSelect`, `#f-name`, `#f-phone`, `#f-email`, `#f-gov`, `#f-city`, `#f-address`, `#finalPlaceOrderBtn`, `.cf-turnstile`)، ودوال `variants.js`، وقواعد الشحن، وحمولة `/api/create-order`، وحدث `DandyMeta.trackInitiateCheckout`.
- **إعادة البناء المقترحة:**
  - تعريب كامل للميتا والعنوان والمحتوى مع دعم خصائص CSS المنطقية للاتجاهين.
  - مكونات معيارية نظيفة: رأس صفحة تحريري مع `Breadcrumb`، ومؤشر خطوات `CheckoutStepper` هادئ، وقائمة منتجات تدعم الفردي والمتعدد الروائح وكوليكشن Pink Friday، وشريط تقدم حقيقي لعتبة `> 2000 ج.م`، وحوار `<dialog>` أنيق لتأكيد إزالة عنصر دون `window.confirm()`.
  - التحقق الحقلي الفوري مع إظهار أخطاء تحت كل حقل والتركيز التلقائي على أول حقل خاطئ، مع إشعار `DandyToast`، وقفل الإرسال المزدوج (`double-submit lock`).

### 3.2 المسار الثاني: `/invoice` (`src/pages/invoice.astro`)
- **الغرض:** تأكيد إتمام الطلب وعرض الفاتورة الرقمية الكاملة وحالتها المباشرة وإمكانية طباعتها.
- **الملفات الحالية:** `src/pages/invoice.astro`.
- **المشكلات المرصودة:**
  1. عنوان `<title>` بالإنجليزية (`Invoice Details & Tracking | Dandy`).
  2. غياب قواعد `@media print`: عند الطباعة تظهر عناصر الهيدر والفوتر وشريط التنقل السفلي وودجت BAB وإشعار الخصوصية والظلال الثقيلة والأزرار التفاعلية.
  3. استخدام `window.open` في زر الواتساب بدلاً من رابط `<a href="..." target="_blank" rel="noopener noreferrer">`.
  4. أخطاء عرضية: `colspan="2"` بدلاً من `3`، وعدم إظهار تفاصيل عناصر الكوليكشن (`p.items` / `p.selectedItems`) داخل جدول الفاتورة، وتنسيق التاريخ بالإنجليزية `en-US` فقط، وغياب معالجة أخطاء قراءة RTDB.
  5. ألوان وردية صارخة في الأسعار وكود الفاتورة وتضارب في تباين الشارات.
- **العقود الواجب الحفاظ عليها:** مسارات التحميل الثلاثة (`#access=` / `#token=` إلى `/api/public-invoice` مع حذف الهاش فوراً عبر `history.replaceState`، و`?id=`, و`?invoice=`)، وخريطة الحالات الخمس، وبنود الفاتورة الآمنة، وحدث `DandyMeta.trackPurchase`.
- **إعادة البناء المقترحة:**
  - تصميم وثيقة فاتورة تحريرية نظيفة بأرقام مجدولة (`tabular-nums`) تدعم المنتجات والكوليكشنات والروائح، مع زر نسخ الكود الموصول بـ `DandyToast`، ومكون `OrderStatusTimeline` الموحّد، وتنبيه Gmail Spam منظم بهدوء، وأزرار إجراءات واضحة: `طباعة الفاتورة / PDF`، `تتبع الطلب` (`/track-order?code=...&phone=...`)، `تواصل عبر واتساب` (`<a>`)، و`متابعة التسوق` (`/all-products`).
  - ورقة أنماط `@media print` متقنة تخفي كل عناصر القشرة العامة والأزرار التفاعلية وتطبع الفاتورة بوضوح على ورقة A4 بيضاء.

### 3.3 المسار الثالث: `/track-order` (`src/pages/track-order.astro`)
- **الغرض:** استعلام العميلة عن حالة الطلب باستخدام كود الفاتورة ورقم الهاتف المسجل.
- **الملفات الحالية:** `src/pages/track-order.astro`.
- **المشكلات المرصودة:**
  1. استخدام 4 نوافذ `alert()` للأخطاء بدلاً من رسائل الخطأ المضمّنة و`DandyToast`.
  2. غياب `Breadcrumb`، وبناء الخط الزمني يعتمد على Font Awesome ويعاني من احتمال تداخل النصوص على الشاشات الضيقة (`390px`).
  3. جدول النتائج يفتقد عرض عناصر الكوليكشن وتفصيل المجموع الفرعي والشحن قبل الإجمالي النهائي.
  4. غياب قواعد `@media print` عند الضغط على `طباعة الفاتورة`، وعدم وجود رابط سريع لعرض صفحة الفاتورة التفصيلية.
- **العقود الواجب الحفاظ عليها:** استعلام `db.ref('orders').orderByChild('invoiceCode').equalTo(code)`، ومطابقة الهاتف بالأرقام فقط، وتخزين `dandy_recent_lookups` (بحد أقصى 4 عناصر)، وقراءة معاملات URL (`?code=&phone=`).
- **إعادة البناء المقترحة:**
  - نموذج بحث تحريري منظم بحقول معنونة واضحة والتحقق المضمن (Inline validation) مع حالة تحميل وحالات خطأ واضحة ومميزة (كود غير موجود / هاتف غير مطابق / تعذر الاتصال).
  - إعادة استخدام مكون `OrderStatusTimeline` نفسه المستخدم في الفاتورة لتوحيد تجربة الحالات الخمس عبر الجوال والحاسوب دون أي تمرير أفقي.
  - عرض ملخص الفاتورة الكامل (المجموع الفرعي، الشحن، الإجمالي، طريقة الدفع COD، عناصر الكوليكشن والروائح) مع إمكانية الطباعة النظيفة أو الانتقال لمسار الفاتورة عند توفر المعرّف.

---

## 4. خطة الهندسة المعيارية والتحقق المقررة
1. **فصل المنطق البحت (`src/scripts/purchase-flow.ts` + `src/scripts/purchase-flow.test.ts`):**
   - دوال نقية ومختبرة لوحدات: توحيد ومزامنة `cart`/`dandy_cart`، حساب المجموع الفرعي والشحن وعتبة الشحن المجاني (`> 2000`)، التحقق من نموذج الخطوة 2 بأخطاء حقلية، بناء حمولة `/api/create-order`، تطبيع الحالات الخمس ومراحل الخط الزمني، وتنسيق سطور الطلب ومطابقة هاتف التتبع.
2. **مكونات Astro المعيارية الجديدة تحت `src/components/commerce/`:**
   - `CheckoutPageHeader.astro`
   - `CheckoutStepper.astro`
   - `CartRemoveDialog.astro`
   - `OrderStatusTimeline.astro`
3. **إعادة بناء الصفحات مع وحدة تحكم عميل TypeScript نظيفة:**
   - `src/pages/cart.astro` + `src/scripts/cart-client.ts`
   - `src/pages/invoice.astro` + `src/scripts/invoice-client.ts`
   - `src/pages/track-order.astro` + `src/scripts/track-order-client.ts`
4. **بوابة الجودة قبل التسليم:**
   - اجتياز كافة اختبارات الوحدة (`npx --yes tsx --test src/scripts/*.test.ts`).
   - اجتياز `compile_applet` و`lint_applet`.
   - التحقق بالمتصفح الحقيقي (Playwright Chromium على `http://localhost:3000`) عبر المقاسات الخمسة (`390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`) مع اعتراض طلبات الشبكة لحماية بيانات الإنتاج، والتأكد من تطابق بصمات الملفات المحمية بنسبة 100%.
