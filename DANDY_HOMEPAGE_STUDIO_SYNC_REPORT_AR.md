# تقرير مزامنة الصفحة الرئيسية مع استوديو الإدارة (Admin Studio)
**المشروع:** DANDY Cosmetics  
**التاريخ:** 2026-11-17  
**المسارات المعنية:** `/` (`src/pages/index.astro`) ↔ `/dashboard-index` (`src/pages/dashboard-index.astro`)  

---

## 1. ملخص تنفيذي

تم ربط ومزامنة التصميم التحريري الجديد للصفحة الرئيسية (**Botanical Editorial Commerce**) بالكامل مع نظام إدارة الصفحة الرئيسية الحالي في لوحة التحكم (`/dashboard-index` — Homepage Studio)، بحيث تظل الصفحة الرئيسية ديناميكية وقابلة للتخصيص بالكامل من الإدارة مع الحفاظ التام على عقود بيانات Firebase Realtime Database الحالية دون إضافة أي حقول أو قواعد جديدة أو تعديل أي من ملفات البناء والنشر المحمية.

---

## 2. العقود البرمجية وهيكل البيانات المتوافق (Firebase RTDB Contracts)

تقرأ الصفحة الرئيسية (`src/utils/homepage.ts`) نفس المسارات التي يحفظ إليها استوديو الإدارة في `src/pages/dashboard-index.astro`:

| مسار Firebase RTDB | الاستخدام في الاستوديو | المكوّن المتزامن في الصفحة الرئيسية |
| :--- | :--- | :--- |
| `homepage/dynamicHero` | مصفوفة شرائح البانر (Desktop + Mobile + العنوان + الوصف + الزر + الرابط + المدة) | `HeroEditorial.astro` (`data-studio-section="hero"`) |
| `homepage/trust` | `item1` / `item2` / `item3` (أيقونة، عنوان، وصف) | `TrustStripSection.astro` (`data-studio-section="trust"`) |
| `categories` | التصنيفات الـ 4 (`name`, `tagline`, `count`, `layoutVariant`, `desktopImage`, `mobileImage`) | `CategoryDiscovery.astro` (`data-studio-section="categories"`) |
| `homepage/dynamicSections` | قسم العروض (`offers`) وقسم المنتجات الثانوي (`newArrivals` بنمط `offers`/`bestsellers`/`manual`) | `FeaturedProducts.astro` (`data-studio-section="offers"` و `newArrivals`) |
| `homepage/promoBanner` | البانر الترويجي التحريري (`eyebrow`, `title`, `desc`, `ctaText`, `ctaLink`, `image`) | `EditorialBrandStory.astro` (`data-studio-section="promo"`) |
| `homepage/dynamicReviews` | لقطات تجارب العميلات ونصوص التقييم (`image`, `text`, `author`) | `ReviewsHomeSection.astro` (`data-studio-section="reviews"`) |
| `homepage/customSections` | الأقسام المخصصة بأنواعها السبعة (`products`, `banner`, `faq`, `story`, `video`, `gallery`, `trust`) | `CustomStudioSection.astro` (`data-studio-section="<sec.id>"`) |
| `homepage/sectionOrder` | ترتيب ظهور كافة الأقسام (الافتراضية + المخصصة) | `resolveOrderedHomepageEntries()` في `src/pages/index.astro` |
| `homepage/sectionsVisibility` | إظهار/إخفاء كل قسم بشكل مستقل عبر `[hidden]` | `resolveSectionVisibility()` في `src/pages/index.astro` |

---

## 3. خريطة المكوّنات والربط بالمعرفات (`data-studio-section`)

1. **`hero` → `HeroEditorial.astro`**: يدعم الشرائح المتعددة، والصور المتجاوبة `<picture>` بمقاس سطح المكتب (`16:9` `object-fit: contain`) والموبايل (`3:4` `object-fit: contain`) لتفادي قص النصوص المصممة داخل البنرات، وأزرار التنقل والنقاط والدوران التلقائي.
2. **`trust` → `TrustStripSection.astro`**: يربط أسماء أيقونات الاستوديو القديمة (`fa-leaf`, `fa-truck-fast`, `fa-hand-holding-heart`, `fa-shield-alt`, إلخ) بأيقونات Lucide SVG نظيفة موحّدة عبر `mapStudioIconToLucide()`.
3. **`categories` → `CategoryDiscovery.astro`**: يعرض التصنيفات المحفوظة ويربطها بمسارات SEO القانونية (`/category/skin-care`, `/category/body-care`, `/category/hair-care`, `/category/fragrance`) مع احترام `layoutVariant` (`normal`, `wide`, `large`, `tall`).
4. **`offers` و `newArrivals` → `FeaturedProducts.astro`**: يستخدمان بطاقة المنتج الموحدة (`ProductCard.astro`) مع دعم التسعير الفوري لحملات Pink Friday والترشيح التلقائي حسب `offers` / `bestsellers` / `manual` مع استبعاد المنتجات المخفية.
5. **`promo` → `EditorialBrandStory.astro`**: يقرأ حقول `promoBanner` (`eyebrow`, `title`, `desc`, `ctaText`, `ctaLink`, `image`) مع الاحتفاظ بالمحتوى الصيدلاني المؤسسي الافتراضي عند غياب التخصيص.
6. **`pink-friday` → `PinkFridayHomeSection.astro`**: يظهر مشروطاً بنشاط حملة Pink Friday المنشورة من لوحة `/dashboard-pink-friday`.
7. **`reviews` → `ReviewsHomeSection.astro`**: يعرض لقطات وتجارب العميلات بنسبة عرض تحفظ وضوح النصوص داخل اللقطات (`object-fit: contain`).
8. **`blog` → `BlogHomeSection.astro`**: يعرض أحدث 3 مقالات منشورة من Firestore ويدعم الإخفاء وإعادة الترتيب من الاستوديو.
9. **الأقسام المخصصة (`customSections`) → `CustomStudioSection.astro`**: يدعم الأنواع السبعة كاملة (`products`, `banner`, `faq`, `story`, `video`, `gallery`, `trust`) مع دعم تضمين YouTube/Vimeo/MP4 بأمان، وأكورديون الأسئلة الشائعة.
10. **دعم الاتجاهات المختلطة (`dir="auto"`)**: تم تطبيق `dir="auto"` على العناوين والأوصاف القابلة للتعديل في الاستوديو لمنع انعكاس علامات الترقيم والأرقام عند كتابة عناوين إنجليزية (مثل `100% Organic Ingredients` أو `Don't Miss Out`) داخل الصفحة العربية RTL.

---

## 4. المعاينة الحية وتزامن Iframe (`postMessage` Bridge)

عند فتح الصفحة الرئيسية داخل الاستوديو عبر `?studio_preview=1`:
- تتجاوز `getHomepageStudioData({ forceFresh: true })` ذاكرة التخزين المؤقت (TTL) لضمان قراءة أحدث حالة فوراً.
- يُخفي المسار إشعار الكوكيز والودجت العائم لصفاء مساحة المعاينة.
- يرسل العميل (`src/scripts/homepage-studio-client.ts`) رسالة `STUDIO_PREVIEW_READY` عند الجاهزية.
- يستجيب العميل لحظياً لكافة رسائل الاستوديو:
  - **`STUDIO_UPDATE_STATE`**: يحدّث نصوص وصور الهيرو، Trust، التصنيفات، المنتجات، البانر الترويجي، التقييمات، إضافة/تعديل/حذف الأقسام المخصصة السبعة، الترتيب، والإظهار/الإخفاء دون إعادة تحميل الصفحة.
  - **`STUDIO_SELECT_SECTION`**: يبرز القسم المحدد ويمرر إليه بسلاسة.
  - **`STUDIO_SECTION_CLICKED`**: النقر على أي قسم داخل إطار المعاينة في وضع التحرير يفتح محرره مباشرة في الشريط الجانبي للاستوديو.
  - **`STUDIO_SET_MODE`** (`edit` | `preview`): يبدّل أطر التحديد والتفاعل مع الروابط داخل المعاينة.
  - **`STUDIO_RELOAD`**: يعيد تحميل الإطار عند الطلب.

---

## 5. المزايا غير المدعومة في الاستوديو الحالي (توثيق أمين دون اختراع حقول)

التزاماً بقواعد العمل، لم يتم اختراع أي واجهات لوحة تحكم أو حقول Firebase جديدة لما لا يدعمه `/dashboard-index` حالياً:

1. **مفاتيح `header` و `footer` في `dispatchPreviewStateUpdate()`**: تشير الدالة في `dashboard-index.astro` إلى `studioState.header` و `studioState.footer` لكن لا توجد لوحات تحرير أو حقول حفظ لهما في الاستوديو؛ ويظل الهيدر والفوتر موحّدين عبر `Header.astro` و `Footer.astro`.
2. **الحقول الجانبية في الهيرو (`kicker`، زر `فلسفة داندي` الثانوي، وشريط الحقائق الثلاثي)**: عناصر هوية تصميمية غير مدرجة في محرر شرائح الهيرو بالاستوديو.
3. **تفاصيل مقالات المدونة داخل `/dashboard-index`**: قسم `blog` يدعم الإخفاء وإعادة الترتيب من الاستوديو، بينما تُدار المقالات نفسها من `/dashboard-blog`.
4. **حملة `pink-friday`**: لا تُعدّل أو تُرتّب من `sectionOrder` في `/dashboard-index`، بل تخضع لإعدادات النشر في `/dashboard-pink-friday`.
5. **النص الوصفي الطويل داخل بطاقات التصنيفات (`introText`)**: يُجلب من خريطة `CATEGORY_TAXONOMY` لأن عقد `/categories` في الاستوديو لا يحتوي إلا على `name`, `tagline`, `count`, `layoutVariant`, `desktopImage`, `mobileImage`.
6. **عنصر `bestsellers` الثانوي في `dynamicSections`**: محرر الاستوديو لـ `newArrivals` يربط بأول عنصر `type !== 'offers'` في المصفوفة بينما يظل العنصر الثالث غير مستخدم في واجهة الاستوديو الحالية.

---

## 6. نتائج التحقق والاختبارات

- **اختبارات الوحدة (`npx --yes tsx --test src/scripts/*.test.ts`):** نجاح **50 / 50** اختبار (منها 12 اختباراً مخصصة لمنطق مزامنة الاستوديو وترشيح المنتجات وتحليل الفيديو وتنظيف الروابط).
- **البناء والتدقيق (`compile_applet` & `lint_applet`):** نجاح البناء وتدقيق الكود دون أخطاء.
- **اختبار المتصفح الحي (Playwright على `http://localhost:3000`):**
  - الصفحة الرئيسية على سطح المكتب (`1440×900`) والموبايل (`390×844`): **0px** انزياح أفقي، **0** أخطاء Console/Page، اكتمال جميع الصور بدون قص للنصوص، تبديل شرائح الهيرو، عمل الأكورديون، وإضافة منتج للسلة.
  - استوديو الإدارة (`/dashboard-index` مع مصادقة محاكاة وحظر أي كتابة على Firebase الفعلي): التحقق من النقر داخل Iframe لفتح محرر القسم، التحديث الحي لعنوان الهيرو، إخفاء قسم التقييمات مباشرة، إضافة قسم قصة مخصص وظهوره فوراً في المعاينة، تبديل وضع `Preview/Edit`، وحفظ جميع المسارات التسعة محلياً بدون أي أخطاء.
- **التحقق من سلامة الملفات المحمية:** مطابقة بصمات SHA-256 الأصلية بنسبة 100% لجميع ملفات البناء والنشر (`astro.config.mjs`, `vercel.json`, `package.json`, `tsconfig.json`, `patch-env.cjs`, `.env.example`).
