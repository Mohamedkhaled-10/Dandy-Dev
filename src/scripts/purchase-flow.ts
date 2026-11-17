/**
 * ============================================================================
 * DANDY COSMETICS — PURCHASE FLOW PURE LOGIC (PHASE 6)
 * Decoupled, unit-tested business & presentation helpers for:
 *   - Shopping Cart & Multi-step Checkout (/cart)
 *   - Order Confirmation & Printable Invoice (/invoice)
 *   - Order Tracking (/track-order)
 * Strictly preserves existing pricing, shipping, payload, variant, and status
 * contracts without inventing fees, coupons, delivery dates, or payment methods.
 * ============================================================================
 */

export const FREE_SHIPPING_THRESHOLD = 2000; // Strictly > 2000 EGP matches create-order.js & cart.astro
export const FALLBACK_CART_IMAGE = '/assets/images/logo.png';

export const GOVERNORATES: ReadonlyArray<{ value: string; labelAr: string; shippingFee: number }> = [
  { value: 'Cairo', labelAr: 'القاهرة', shippingFee: 85 },
  { value: 'Giza', labelAr: 'الجيزة', shippingFee: 85 },
  { value: 'Alexandria', labelAr: 'الإسكندرية', shippingFee: 85 },
  { value: 'Gharbia', labelAr: 'الغربية', shippingFee: 70 },
  { value: 'Dakahlia', labelAr: 'الدقهلية', shippingFee: 85 },
  { value: 'Sharqia', labelAr: 'الشرقية', shippingFee: 85 },
  { value: 'Kafr El Sheikh', labelAr: 'كفر الشيخ', shippingFee: 85 },
  { value: 'Qalyubia', labelAr: 'القليوبية', shippingFee: 85 },
  { value: 'Port Said', labelAr: 'بورسعيد', shippingFee: 85 },
  { value: 'Damietta', labelAr: 'دمياط', shippingFee: 85 },
  { value: 'Suez', labelAr: 'السويس', shippingFee: 85 },
  { value: 'Ismailia', labelAr: 'الإسماعيلية', shippingFee: 85 },
  { value: 'Beheira', labelAr: 'البحيرة', shippingFee: 85 },
  { value: 'Monufia', labelAr: 'المنوفية', shippingFee: 85 },
  { value: 'Fayoum', labelAr: 'الفيوم', shippingFee: 100 },
  { value: 'Beni Suef', labelAr: 'بني سويف', shippingFee: 100 },
  { value: 'Minya', labelAr: 'المنيا', shippingFee: 100 },
  { value: 'Luxor', labelAr: 'الأقصر', shippingFee: 120 },
  { value: 'Aswan', labelAr: 'أسوان', shippingFee: 120 },
  { value: 'Assiut', labelAr: 'أسيوط', shippingFee: 120 },
  { value: 'Sohag', labelAr: 'سوهاج', shippingFee: 120 },
  { value: 'Qena', labelAr: 'قنا', shippingFee: 120 },
  { value: 'North Sinai', labelAr: 'شمال سيناء', shippingFee: 120 },
  { value: 'South Sinai', labelAr: 'جنوب سيناء', shippingFee: 120 },
  { value: 'New Valley', labelAr: 'الوادي الجديد', shippingFee: 120 },
  { value: 'Red Sea', labelAr: 'البحر الأحمر', shippingFee: 120 },
  { value: 'Matrouh', labelAr: 'مطروح', shippingFee: 120 },
];

export const SHIPPING_RATES: Record<string, number> = Object.fromEntries(
  GOVERNORATES.map((g) => [g.value, g.shippingFee])
);

export const GOVERNORATE_LABELS_AR: Record<string, string> = Object.fromEntries(
  GOVERNORATES.map((g) => [g.value, g.labelAr])
);

export interface VariantSelection {
  id?: string;
  name?: string;
}

export interface CollectionSubItemInput {
  collectionItemId?: string;
  productId?: string;
  productName?: string;
  name?: string;
  variantName?: string;
  selectedVariant?: VariantSelection | null;
  variant?: VariantSelection | string | null;
}

export interface CartItemInput {
  id?: string;
  productId?: string;
  collectionId?: string;
  type?: string;
  isCollection?: boolean;
  isPinkFriday?: boolean;
  name?: string;
  price?: number | string;
  regularPrice?: number | string;
  campaignPrice?: number | string;
  discount?: number | string | null;
  onSale?: boolean;
  badgeText?: string;
  image?: string;
  quantity?: number | string;
  hasVariants?: boolean;
  variantType?: string;
  selectedVariants?: Array<VariantSelection | string>;
  selectedVariant?: VariantSelection | null;
  variantId?: string;
  variantName?: string;
  selectedItems?: CollectionSubItemInput[];
  items?: CollectionSubItemInput[];
}

export interface VariantsDisplayInfo {
  count: number;
  label: string;
  text: string;
  list: string[];
}

export interface FreeShippingProgress {
  qualifies: boolean;
  remainingForFree: number;
  percentComplete: number;
  thresholdExclusive: number;
}

export interface ShippingQuote {
  governorate: string;
  hasGovernorate: boolean;
  isFreeShipping: boolean;
  baseRate: number | null;
  shippingFee: number | null;
  totalAmount: number;
}

export interface CheckoutFormInput {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
}

export type CheckoutFieldKey = 'name' | 'phone' | 'email' | 'governorate' | 'city' | 'address';

export interface CheckoutValidationResult {
  valid: boolean;
  errors: Partial<Record<CheckoutFieldKey, string>>;
  firstErrorField: CheckoutFieldKey | null;
  firstErrorMessage: string | null;
  sanitized: CheckoutFormInput;
}

export type CanonicalStepKey = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface NormalizedOrderStatusMeta {
  key: CanonicalStepKey;
  isCancelled: boolean;
  label: string;
  badgeTone: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  progressPercent: number;
  activeStepIndex: number; // 0..3 for non-cancelled, -1 for cancelled
}

export interface DisplaySubItem {
  productName: string;
  variantName: string;
}

export interface FormattedOrderLineItem {
  name: string;
  image: string;
  quantity: number;
  isCollection: boolean;
  isPinkFriday: boolean;
  badgeText: string;
  variants: VariantsDisplayInfo | null;
  collectionItems: DisplaySubItem[];
  unitPrice: number;
  lineTotal: number;
  crossedTotal: number | null;
}

export interface RecentLookupEntry {
  code: string;
  phone: string;
  time: number;
}

export function sanitizeImageUrl(url?: string | null): string {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return FALLBACK_CART_IMAGE;
  if (trimmed.includes('images.unsplash.com')) return FALLBACK_CART_IMAGE;
  return trimmed;
}

export function isCollectionCartItem(item: Partial<CartItemInput> | null | undefined): boolean {
  if (!item) return false;
  return Boolean(item.type === 'collection' || item.isCollection || item.collectionId);
}

export function parseCartArrayFromStrings(
  primaryCartJson: string | null | undefined,
  legacyCartJson?: string | null | undefined
): CartItemInput[] {
  const tryParse = (raw: string | null | undefined): CartItemInput[] | null => {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((entry) => entry && typeof entry === 'object')
        : null;
    } catch {
      return null;
    }
  };

  const primary = tryParse(primaryCartJson);
  if (primary && primary.length > 0) return primary;

  const fallback = tryParse(legacyCartJson);
  if (fallback && fallback.length > 0) return fallback;

  return primary ?? [];
}

/**
 * Mirrors /public/assets/js/variants.js getVariantsDisplayInfo exactly
 * so server/unit-tested logic and client runtime agree 100%.
 */
export function resolveVariantsDisplayInfo(
  item: Partial<CartItemInput> | null | undefined
): VariantsDisplayInfo | null {
  if (!item) return null;

  if (Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0) {
    const list = item.selectedVariants
      .map((v) => (v && typeof v === 'object' ? v.name || v.id : String(v)))
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s && s !== 'undefined' && s !== 'null');

    if (list.length === 0) return null;
    if (list.length === 1) {
      return { count: 1, label: 'الرائحة', text: list[0], list };
    }
    return { count: list.length, label: 'الروائح', text: list.join('، '), list };
  }

  if (item.selectedVariant && item.selectedVariant.name) {
    const name = String(item.selectedVariant.name).trim();
    if (name && name !== 'undefined' && name !== 'null') {
      return { count: 1, label: 'الرائحة', text: name, list: [name] };
    }
  }

  if (item.variantName) {
    const name = String(item.variantName).trim();
    if (name && name !== 'undefined' && name !== 'null') {
      return { count: 1, label: 'الرائحة', text: name, list: [name] };
    }
  }

  return null;
}

/**
 * Mirrors /public/assets/js/variants.js getEffectiveUnitPrice exactly.
 */
export function resolveEffectiveUnitPrice(item: Partial<CartItemInput> | null | undefined): number {
  if (!item) return 0;
  const basePrice = Number(item.price) || 0;
  const info = resolveVariantsDisplayInfo(item);
  const multiplier = info && info.count > 0 ? info.count : 1;
  return basePrice * multiplier;
}

export function resolveItemQuantity(qty: unknown): number {
  const parsed = Number.parseInt(String(qty ?? 1), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(99, parsed);
}

export function calculateCartSubtotal(cart: CartItemInput[]): number {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => {
    const unitPrice = resolveEffectiveUnitPrice(item);
    const qty = resolveItemQuantity(item?.quantity);
    return sum + unitPrice * qty;
  }, 0);
}

export function calculateCartItemCount(cart: CartItemInput[]): number {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    return sum + resolveItemQuantity(item.quantity);
  }, 0);
}

/**
 * Preserves the exact rule in cart.astro and api/create-order.js:
 * shippingFee is 0 when subtotal > 2000 (strictly greater than 2000 EGP).
 */
export function getShippingFeeForGovernorate(governorate?: string | null): number | null {
  const clean = typeof governorate === 'string' ? governorate.trim() : '';
  if (!clean) return null;
  return SHIPPING_RATES[clean] !== undefined ? SHIPPING_RATES[clean] : 120;
}

export function getGovernorateArabicLabel(governorate?: string | null): string {
  const clean = typeof governorate === 'string' ? governorate.trim() : '';
  if (!clean) return '—';
  return GOVERNORATE_LABELS_AR[clean] || clean;
}

export function computeFreeShippingProgress(subtotal: number): FreeShippingProgress {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const qualifies = safeSubtotal > FREE_SHIPPING_THRESHOLD;
  // Minimum amount needed to cross > 2000 (if exactly 2000, +1 EGP is needed)
  const targetMinimumToQualify = FREE_SHIPPING_THRESHOLD + 1;
  const remainingForFree = qualifies ? 0 : Math.max(1, Math.ceil(targetMinimumToQualify - safeSubtotal));
  const percentComplete = qualifies
    ? 100
    : Math.min(99, Math.max(0, Math.round((safeSubtotal / targetMinimumToQualify) * 100)));

  return {
    qualifies,
    remainingForFree,
    percentComplete,
    thresholdExclusive: FREE_SHIPPING_THRESHOLD,
  };
}

export function calculateShippingQuote(subtotal: number, governorate?: string | null): ShippingQuote {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const cleanGov = typeof governorate === 'string' ? governorate.trim() : '';
  const baseRate = getShippingFeeForGovernorate(cleanGov);
  const qualifiesFree = safeSubtotal > FREE_SHIPPING_THRESHOLD;

  if (!cleanGov) {
    return {
      governorate: '',
      hasGovernorate: false,
      isFreeShipping: qualifiesFree,
      baseRate: null,
      shippingFee: qualifiesFree ? 0 : null,
      totalAmount: safeSubtotal,
    };
  }

  const fee = qualifiesFree ? 0 : (baseRate ?? 120);
  return {
    governorate: cleanGov,
    hasGovernorate: true,
    isFreeShipping: fee === 0,
    baseRate,
    shippingFee: fee,
    totalAmount: safeSubtotal + fee,
  };
}

export function validateCheckoutForm(input: Partial<CheckoutFormInput>): CheckoutValidationResult {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const governorate = typeof input.governorate === 'string' ? input.governorate.trim() : '';
  const city = typeof input.city === 'string' ? input.city.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';

  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  if (!name || name.length < 5) {
    errors.name = 'يرجى إدخال الاسم بالكامل (5 أحرف على الأقل) لضمان دقة التوصيل.';
  }

  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    errors.phone = 'يرجى إدخال رقم هاتف مصري صحيح من 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'صيغة البريد الإلكتروني غير صحيحة (أو اتركيه فارغاً).';
  }

  if (!governorate) {
    errors.governorate = 'يرجى اختيار المحافظة لحساب تكلفة الشحن بدقة.';
  }

  if (!city) {
    errors.city = 'يرجى إدخال اسم المدينة أو المنطقة.';
  }

  if (!address || address.length < 3) {
    errors.address = 'يرجى كتابة العنوان بالتفصيل (الشارع، رقم العقار، الدور أو علامة مميزة).';
  }

  const orderedKeys: CheckoutFieldKey[] = ['name', 'phone', 'email', 'governorate', 'city', 'address'];
  const firstErrorField = orderedKeys.find((k) => Boolean(errors[k])) || null;
  const firstErrorMessage = firstErrorField ? (errors[firstErrorField] || null) : null;

  return {
    valid: firstErrorField === null,
    errors,
    firstErrorField,
    firstErrorMessage,
    sanitized: { name, phone, email, governorate, city, address },
  };
}

/**
 * Builds the exact JSON payload expected by POST /api/create-order.
 */
export function buildCreateOrderPayload(params: {
  form: CheckoutFormInput;
  cart: CartItemInput[];
  idToken?: string | null;
  turnstileToken: string;
}): Record<string, any> {
  const { form, cart, idToken = null, turnstileToken } = params;

  const items = (cart || []).map((item) => {
    if (isCollectionCartItem(item)) {
      return {
        type: 'collection',
        isCollection: true,
        isPinkFriday: true,
        collectionId: item.collectionId || item.id,
        name: item.name,
        image: item.image || '',
        quantity: resolveItemQuantity(item.quantity),
        selectedItems: Array.isArray(item.selectedItems) ? item.selectedItems : [],
      };
    }

    const rawVariants: VariantSelection[] =
      Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0
        ? item.selectedVariants.map((v) =>
            typeof v === 'object' && v !== null
              ? { id: v.id || 'scent-variant', name: v.name || String(v.id || '') }
              : { id: 'scent-variant', name: String(v) }
          )
        : item.selectedVariant
          ? [{ id: item.selectedVariant.id || 'scent-variant', name: item.selectedVariant.name || '' }]
          : item.variantName
            ? [{ id: item.variantId || 'scent-variant', name: item.variantName }]
            : [];

    return {
      productId: item.productId || (item.id ? String(item.id).split('::')[0] : ''),
      name: item.name,
      image: item.image || '',
      quantity: resolveItemQuantity(item.quantity),
      selectedVariants: rawVariants.map((v) => ({
        id: v.id || 'scent-variant',
        name: v.name || String(v),
      })),
    };
  });

  return {
    customer: {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || 'N/A',
      governorate: form.governorate,
      city: form.city.trim(),
      address: form.address.trim(),
    },
    items,
    idToken: idToken || null,
    turnstileToken,
  };
}

/**
 * Maps all historical English & Arabic statuses to the 5 canonical order lifecycle states.
 */
export function normalizeOrderStatusMeta(rawStatus?: string | null): NormalizedOrderStatusMeta {
  const s = typeof rawStatus === 'string' ? rawStatus.trim() : 'New';

  if (s === 'ملغي' || s === 'Cancelled' || s.toLowerCase() === 'cancelled') {
    return {
      key: 'cancelled',
      isCancelled: true,
      label: 'تم الإلغاء',
      badgeTone: 'cancelled',
      progressPercent: 0,
      activeStepIndex: -1,
    };
  }

  if (
    s === 'تم التواصل' ||
    s === 'قيد التجهيز' ||
    s === 'قيد التحضير' ||
    s === 'قيد المعالجة' ||
    s === 'Processing' ||
    s.toLowerCase() === 'processing'
  ) {
    return {
      key: 'processing',
      isCancelled: false,
      label: 'قيد التجهيز',
      badgeTone: 'processing',
      progressPercent: 33,
      activeStepIndex: 1,
    };
  }

  if (
    s === 'تم الشحن' ||
    s === 'جاري الشحن' ||
    s === 'جاري التوصيل' ||
    s === 'شحن' ||
    s === 'Shipped' ||
    s.toLowerCase() === 'shipped'
  ) {
    return {
      key: 'shipped',
      isCancelled: false,
      label: 'تم الشحن',
      badgeTone: 'shipped',
      progressPercent: 66,
      activeStepIndex: 2,
    };
  }

  if (
    s === 'مكتمل' ||
    s === 'تم التوصيل' ||
    s === 'واصل' ||
    s === 'Delivered' ||
    s.toLowerCase() === 'delivered'
  ) {
    return {
      key: 'delivered',
      isCancelled: false,
      label: 'تم التوصيل',
      badgeTone: 'delivered',
      progressPercent: 100,
      activeStepIndex: 3,
    };
  }

  return {
    key: 'new',
    isCancelled: false,
    label: 'قيد المراجعة',
    badgeTone: 'new',
    progressPercent: 0,
    activeStepIndex: 0,
  };
}

export function extractCollectionSubItems(
  item: Partial<CartItemInput> | null | undefined
): DisplaySubItem[] {
  if (!item) return [];
  const rawList = Array.isArray(item.items)
    ? item.items
    : Array.isArray(item.selectedItems)
      ? item.selectedItems
      : [];

  return rawList
    .filter((sub) => sub && typeof sub === 'object')
    .map((sub) => {
      let variantName = '';
      if (typeof sub.variantName === 'string' && sub.variantName.trim()) {
        variantName = sub.variantName.trim();
      } else if (sub.selectedVariant && (sub.selectedVariant.name || sub.selectedVariant.id)) {
        variantName = String(sub.selectedVariant.name || sub.selectedVariant.id).trim();
      } else if (sub.variant) {
        variantName =
          typeof sub.variant === 'object'
            ? String(sub.variant.name || sub.variant.id || '').trim()
            : String(sub.variant).trim();
      }

      return {
        productName: String(sub.productName || sub.name || 'منتج داندي').trim(),
        variantName,
      };
    });
}

export function formatOrderLineItem(rawItem: Record<string, any>): FormattedOrderLineItem {
  const quantity = resolveItemQuantity(rawItem?.quantity);
  const priceNum = Number(rawItem?.price) || 0;
  const hasServerLineTotal = typeof rawItem?.lineTotal === 'number' && Number.isFinite(rawItem.lineTotal);
  const lineTotal = hasServerLineTotal ? Number(rawItem.lineTotal) : priceNum * quantity;

  let crossedTotal: number | null = null;
  if (rawItem?.discount && !hasServerLineTotal) {
    const discPct = Number.parseFloat(String(rawItem.discount)) || 0;
    if (discPct > 0 && discPct < 100 && priceNum > 0) {
      const discountedTotal = (priceNum - (priceNum * discPct) / 100) * quantity;
      crossedTotal = priceNum * quantity;
      return {
        name: String(rawItem?.name || 'منتج داندي').trim(),
        image: sanitizeImageUrl(rawItem?.image),
        quantity,
        isCollection: isCollectionCartItem(rawItem),
        isPinkFriday: Boolean(rawItem?.isPinkFriday),
        badgeText: String(rawItem?.badgeText || '').trim(),
        variants: resolveVariantsDisplayInfo(rawItem),
        collectionItems: extractCollectionSubItems(rawItem),
        unitPrice: priceNum - (priceNum * discPct) / 100,
        lineTotal: discountedTotal,
        crossedTotal,
      };
    }
  }

  const effectiveUnitPrice =
    typeof rawItem?.effectiveUnitPrice === 'number' && Number.isFinite(rawItem.effectiveUnitPrice)
      ? Number(rawItem.effectiveUnitPrice)
      : quantity > 0
        ? lineTotal / quantity
        : priceNum;

  const isCollection = isCollectionCartItem(rawItem);
  if (isCollection && priceNum > effectiveUnitPrice) {
    crossedTotal = priceNum * quantity;
  } else if (rawItem?.regularPrice && Number(rawItem.regularPrice) > effectiveUnitPrice) {
    crossedTotal = Number(rawItem.regularPrice) * quantity;
  }

  return {
    name: String(rawItem?.name || 'منتج داندي').trim(),
    image: sanitizeImageUrl(rawItem?.image),
    quantity,
    isCollection,
    isPinkFriday: Boolean(rawItem?.isPinkFriday),
    badgeText: String(rawItem?.badgeText || '').trim(),
    variants: resolveVariantsDisplayInfo(rawItem),
    collectionItems: extractCollectionSubItems(rawItem),
    unitPrice: effectiveUnitPrice,
    lineTotal,
    crossedTotal,
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizePhoneDigits(phone?: string | null): string {
  return String(phone || '').replace(/[^0-9]/g, '');
}

function toEgyptianLocalDigits(digits: string): string {
  if (/^0020(1[0125]\d{8})$/.test(digits)) {
    return '0' + digits.slice(4);
  }
  if (/^20(1[0125]\d{8})$/.test(digits)) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export function doesOrderPhoneMatch(orderPhone?: string | null, inputPhone?: string | null): boolean {
  const orderDigits = toEgyptianLocalDigits(normalizePhoneDigits(orderPhone));
  const inputDigits = toEgyptianLocalDigits(normalizePhoneDigits(inputPhone));
  if (!orderDigits || inputDigits.length < 8) return false;
  return orderDigits.includes(inputDigits) || inputDigits.includes(orderDigits);
}

export function upsertRecentLookup(
  existing: RecentLookupEntry[],
  code: string,
  phone: string,
  nowMs: number = Date.now(),
  maxItems = 4
): RecentLookupEntry[] {
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanPhone = String(phone || '').trim();
  if (!cleanCode || !cleanPhone) return Array.isArray(existing) ? existing.slice(0, maxItems) : [];

  const filtered = (Array.isArray(existing) ? existing : []).filter(
    (entry) => entry && typeof entry.code === 'string' && entry.code.toUpperCase() !== cleanCode
  );
  filtered.unshift({ code: cleanCode, phone: cleanPhone, time: nowMs });
  return filtered.slice(0, maxItems);
}

export function formatOrderTimestampAr(timestamp?: string | number | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString('en-US');
  }
}

export function buildWhatsappOrderInquiryUrl(params: {
  invoiceCode: string;
  customerName: string;
  statusLabel: string;
  pageUrl: string;
}): string {
  const text = [
    'مرحباً، أود الاستعلام عن حالة شحن طلب Dandy الخاص بي:',
    `- كود الفاتورة: ${params.invoiceCode || '-'}`,
    `- العميل: ${params.customerName || '-'}`,
    `- الحالة الحالية: ${params.statusLabel || 'قيد المراجعة'}`,
    `- رابط التتبع: ${params.pageUrl || ''}`,
  ].join('\n');
  return `https://wa.me/201038941005?text=${encodeURIComponent(text)}`;
}
