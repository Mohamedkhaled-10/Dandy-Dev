/**
 * ============================================================================
 * DANDY COSMETICS — PHASE 8 PURE ACCOUNT & EDITORIAL LOGIC
 * Decoupled, unit-tested helpers for:
 *   - Customer auth validation & Arabic Firebase error localization
 *   - Customer profile display & saved address normalization/validation
 *   - Customer order history formatting & verified review eligibility
 *   - Customer wishlist ProductCard view-model resolution
 *   - Editorial blog <-> product reverse mapping from canonical PDP bindings
 * ============================================================================
 */

import {
  GOVERNORATE_LABELS_AR,
  formatOrderLineItem,
  normalizeOrderStatusMeta,
  type CartItemInput,
  type FormattedOrderLineItem,
  type NormalizedOrderStatusMeta,
} from './purchase-flow';
import {
  FALLBACK_PRODUCT_IMAGE,
  resolveProductCardViewModel,
  type ProductCardViewModel,
} from './product-card';
import type { Product } from '../utils/products';

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface CustomerAddressInput {
  id?: string;
  label?: string;
  phone?: string;
  governorate?: string;
  city?: string;
  street?: string;
  address?: string;
  isDefault?: boolean;
  createdAt?: number;
}

export interface NormalizedCustomerAddress {
  id: string;
  label: string;
  phone: string;
  governorate: string;
  governorateAr: string;
  city: string;
  street: string;
  isDefault: boolean;
  createdAt: number;
}

export interface CustomerOrderRecord {
  id?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  invoiceCode?: string;
  status?: string;
  governorate?: string;
  city?: string;
  date?: string;
  createdAt?: number | string;
  timestamp?: number | string;
  subtotal?: number | string;
  shippingFee?: number | string;
  shippingCost?: number | string;
  total?: number | string;
  totalAmount?: number | string;
  items?: CartItemInput[] | Record<string, CartItemInput>;
  products?: CartItemInput[] | Record<string, CartItemInput>;
}

export interface CustomerOrderLineItem extends FormattedOrderLineItem {
  productId: string;
}

export interface CustomerOrderViewModel {
  id: string;
  code: string;
  dateLabel: string;
  createdAtMs: number;
  statusMeta: NormalizedOrderStatusMeta;
  isDelivered: boolean;
  governorateAr: string;
  city: string;
  items: CustomerOrderLineItem[];
  totalAmount: number;
  invoiceHref: string;
  trackHref: string;
}

export interface CustomerStats {
  ordersCount: number;
  wishlistCount: number;
  addressesCount: number;
}

const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RATING_LABELS_AR: Record<number, string> = {
  1: 'غير راضية',
  2: 'أقل من المتوقع',
  3: 'تجربة جيدة',
  4: 'رائع ومناسب',
  5: 'ممتاز، أنصح به بشدة!',
};

/**
 * Canonical mapping between product slugs (PDP) and their routine article slug on /blog.
 * Reversed cleanly to render "المنتجات المذكورة في الروتين" without invented claims.
 */
export const ARTICLE_TO_PRODUCT_SLUGS: Record<string, readonly string[]> = {
  'daily-hair-care-routine-dry-damaged-hair': [
    'hair-repair-collection',
    'hair-mask-repair-250ml',
  ],
  'daily-skincare-routine-healthy-skin': [
    'skin-care-collection',
    'facial-cleanser-150ml',
    'facial-serum-3x1-30ml',
  ],
  'daily-beauty-routine-hair-skin-body': [
    'hand-cream-60gm',
  ],
  'anti-dandruff-routine': [
    'anti-dandruff-collection',
    'anti-dandruff-shampoo-250ml',
    'anti-dandruff-spray-60ml',
  ],
  'hair-loss-routine': [
    'anti-hair-loss-collection',
    'anti-hair-loss-shampoo-250ml',
    'anti-hair-loss-spray',
    'hair-booster-oils-mix',
  ],
  'daily-fragrance-body-splash-routine': [
    'body-splash-250ml',
    'body-splash-100ml',
    'body-splash-25ml',
    'solid-perfume-30gm',
    'dandy-musk-6ml',
    'musk-collection-3-tola-3ml',
    'body-and-hair-mist',
  ],
  'post-hair-removal-skincare-routine': [
    'laser-replacement-cream-60gm',
  ],
};

export function normalizeEgyptianPhone(rawPhone?: string | null): string {
  const digits = String(rawPhone ?? '').trim().replace(/\s+/g, '');
  if (/^\+?20(1[0125]\d{8})$/.test(digits)) {
    return '0' + digits.replace(/^\+?20/, '');
  }
  return digits;
}

export function validateLoginInput(input: Partial<LoginInput>): {
  valid: boolean;
  error: string | null;
  email: string;
  password: string;
} {
  const email = String(input.email ?? '').trim();
  const password = String(input.password ?? '');

  if (!email) {
    return { valid: false, error: 'يرجى إدخال البريد الإلكتروني.', email, password };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'يرجى إدخال بريد إلكتروني صحيح.', email, password };
  }
  if (!password) {
    return { valid: false, error: 'يرجى إدخال كلمة المرور.', email, password };
  }
  return { valid: true, error: null, email, password };
}

export function validateSignupInput(input: Partial<SignupInput>): {
  valid: boolean;
  error: string | null;
  field: keyof SignupInput | null;
  sanitized: SignupInput;
} {
  const name = String(input.name ?? '').trim();
  const phone = normalizeEgyptianPhone(input.phone);
  const email = String(input.email ?? '').trim();
  const password = String(input.password ?? '');

  if (name.length < 3) {
    return {
      valid: false,
      error: 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل).',
      field: 'name',
      sanitized: { name, phone, email, password },
    };
  }
  if (!EGYPT_PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      error: 'يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً يبدأ بـ 01.',
      field: 'phone',
      sanitized: { name, phone, email, password },
    };
  }
  if (!EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      error: 'يرجى إدخال بريد إلكتروني صحيح.',
      field: 'email',
      sanitized: { name, phone, email, password },
    };
  }
  if (password.length < 6) {
    return {
      valid: false,
      error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
      field: 'password',
      sanitized: { name, phone, email, password },
    };
  }

  return {
    valid: true,
    error: null,
    field: null,
    sanitized: { name, phone, email, password },
  };
}

export function mapFirebaseAuthErrorAr(code?: string | null, context: 'login' | 'signup' | 'reset' = 'login'): string {
  const cleanCode = String(code ?? '').trim();
  switch (cleanCode) {
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غير صحيح.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً لكثرة الطلبات. يرجى الانتظار والمحاولة لاحقاً.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل بالفعل. يمكنكِ تسجيل الدخول أو استعادة كلمة المرور.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً، يرجى اختيار 6 أحرف أو أكثر.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.';
    default:
      if (context === 'signup') return 'تعذر إنشاء الحساب الآن. يرجى المحاولة مرة أخرى.';
      if (context === 'reset') return 'تعذر إرسال رابط إعادة تعيين كلمة المرور.';
      return 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
  }
}

/**
 * Fixes historical mismatch where legacy account.astro saved 'Asyut' while
 * cart/checkout & create-order.js require 'Assiut'.
 */
export function normalizeGovernorateCode(rawGov?: string | null): string {
  const clean = String(rawGov ?? '').trim();
  if (!clean) return '';
  if (clean.toLowerCase() === 'asyut') return 'Assiut';
  return clean;
}

export function normalizeCustomerAddress(
  id: string,
  raw: CustomerAddressInput | null | undefined
): NormalizedCustomerAddress {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const gov = normalizeGovernorateCode(safe.governorate);
  const govAr = gov ? GOVERNORATE_LABELS_AR[gov] || gov : '—';
  return {
    id,
    label: String(safe.label ?? '').trim() || 'عنوان',
    phone: String(safe.phone ?? '').trim(),
    governorate: gov,
    governorateAr: govAr,
    city: String(safe.city ?? '').trim(),
    street: String(safe.street ?? safe.address ?? '').trim(),
    isDefault: Boolean(safe.isDefault),
    createdAt: Number(safe.createdAt) || 0,
  };
}

export function sortAddressesDefaultFirst(
  addresses: NormalizedCustomerAddress[]
): NormalizedCustomerAddress[] {
  return [...addresses].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export function validateAddressInput(input: CustomerAddressInput): {
  valid: boolean;
  error: string | null;
  field: 'label' | 'phone' | 'governorate' | 'city' | 'street' | null;
  sanitized: {
    label: string;
    phone: string;
    governorate: string;
    city: string;
    street: string;
    isDefault: boolean;
  };
} {
  const label = String(input.label ?? '').trim();
  const phone = normalizeEgyptianPhone(input.phone);
  const governorate = normalizeGovernorateCode(input.governorate);
  const city = String(input.city ?? '').trim();
  const street = String(input.street ?? input.address ?? '').trim();
  const isDefault = Boolean(input.isDefault);

  if (label.length < 2) {
    return {
      valid: false,
      error: 'يرجى إدخال وصف مختصر للعنوان (مثل: المنزل أو العمل).',
      field: 'label',
      sanitized: { label, phone, governorate, city, street, isDefault },
    };
  }
  if (phone && !EGYPT_PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      error: 'يرجى إدخال رقم هاتف استلام صحيح (11 رقماً يبدأ بـ 01).',
      field: 'phone',
      sanitized: { label, phone, governorate, city, street, isDefault },
    };
  }
  if (!governorate || !GOVERNORATE_LABELS_AR[governorate]) {
    return {
      valid: false,
      error: 'يرجى اختيار المحافظة.',
      field: 'governorate',
      sanitized: { label, phone, governorate, city, street, isDefault },
    };
  }
  if (city.length < 2) {
    return {
      valid: false,
      error: 'يرجى إدخال اسم المدينة أو الحي.',
      field: 'city',
      sanitized: { label, phone, governorate, city, street, isDefault },
    };
  }
  if (street.length < 6) {
    return {
      valid: false,
      error: 'يرجى كتابة العنوان التفصيلي (اسم الشارع ورقم العمارة/الشقة).',
      field: 'street',
      sanitized: { label, phone, governorate, city, street, isDefault },
    };
  }

  return {
    valid: true,
    error: null,
    field: null,
    sanitized: { label, phone, governorate, city, street, isDefault },
  };
}

export function extractCustomerInitial(name?: string | null, email?: string | null): string {
  const cleanName = String(name ?? '').trim();
  if (cleanName) return cleanName.charAt(0).toUpperCase();
  const cleanEmail = String(email ?? '').trim();
  if (cleanEmail) return cleanEmail.charAt(0).toUpperCase();
  return 'D';
}

export function ratingDescriptionLabel(rating: number): string {
  return RATING_LABELS_AR[rating] || '';
}

function normalizeItemsArray(rawItems: unknown): CartItemInput[] {
  if (Array.isArray(rawItems)) {
    return rawItems.filter((item): item is CartItemInput => Boolean(item && typeof item === 'object'));
  }
  if (rawItems && typeof rawItems === 'object') {
    return Object.values(rawItems).filter(
      (item): item is CartItemInput => Boolean(item && typeof item === 'object')
    );
  }
  return [];
}

export function isOrderStatusDelivered(status?: string | null): boolean {
  const clean = String(status ?? '').trim();
  return normalizeOrderStatusMeta(clean).key === 'delivered' || clean === 'تم التسليم';
}

export function formatCustomerOrderViewModel(
  orderId: string,
  order: CustomerOrderRecord
): CustomerOrderViewModel {
  const delivered = isOrderStatusDelivered(order?.status);
  const rawMeta = normalizeOrderStatusMeta(order?.status);
  const statusMeta =
    delivered && rawMeta.key !== 'delivered'
      ? {
          key: 'delivered' as const,
          isCancelled: false,
          label: 'تم التوصيل',
          badgeTone: 'delivered' as const,
          progressPercent: 100,
          activeStepIndex: 3,
        }
      : rawMeta;
  const rawItems = normalizeItemsArray(order?.products ?? order?.items);
  const items: CustomerOrderLineItem[] = rawItems.map((item) => ({
    ...formatOrderLineItem(item),
    productId: String(item.productId || item.id || '').trim(),
  }));

  const parsedCreated =
    typeof order?.createdAt === 'number'
      ? order.createdAt
      : typeof order?.timestamp === 'number'
        ? order.timestamp
        : Date.parse(String(order?.createdAt || order?.timestamp || order?.date || '')) || 0;

  const dateLabel =
    parsedCreated > 0
      ? new Date(parsedCreated).toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : order?.date
        ? String(order.date)
        : '—';

  const code = String(
    order?.invoiceCode || order?.orderNumber || order?.invoiceNumber || orderId || ''
  ).trim();
  const totalAmount = Number(order?.totalAmount ?? order?.total ?? order?.subtotal ?? 0) || 0;
  const normGov = normalizeGovernorateCode(order?.governorate);
  const governorateAr = normGov ? GOVERNORATE_LABELS_AR[normGov] || normGov : '';
  const city = String(order?.city ?? '').trim();

  return {
    id: orderId,
    code,
    dateLabel,
    createdAtMs: parsedCreated,
    statusMeta,
    isDelivered: delivered,
    governorateAr,
    city,
    items,
    totalAmount,
    invoiceHref: `/invoice?invoice=${encodeURIComponent(code)}`,
    trackHref: `/track-order?invoice=${encodeURIComponent(code)}`,
  };
}

export function collectDeliveredProductIds(
  orders: Array<{ status?: string | null; items?: unknown; products?: unknown }>
): Set<string> {
  const delivered = new Set<string>();
  for (const order of orders) {
    if (!isOrderStatusDelivered(order?.status)) continue;
    const rawItems = normalizeItemsArray(order?.items ?? order?.products);
    for (const item of rawItems) {
      const pid = String(item.productId || item.id || '').trim();
      if (pid) delivered.add(pid);
    }
  }
  return delivered;
}

export function computeAccountStats(counts: {
  orders: number;
  wishlist: number;
  addresses: number;
}): CustomerStats {
  return {
    ordersCount: Math.max(0, Math.floor(counts.orders || 0)),
    wishlistCount: Math.max(0, Math.floor(counts.wishlist || 0)),
    addressesCount: Math.max(0, Math.floor(counts.addresses || 0)),
  };
}

export function resolveWishlistCardModel(
  productId: string,
  rawProduct: Partial<Product>
): ProductCardViewModel | null {
  if (!rawProduct || typeof rawProduct !== 'object' || !rawProduct.name) return null;
  if (rawProduct.isHidden === true) return null;

  const product: Product = {
    id: productId,
    name: String(rawProduct.name),
    slug: rawProduct.slug,
    resolvedSlug: rawProduct.resolvedSlug || rawProduct.slug || productId,
    description: rawProduct.description,
    price: Number(rawProduct.price) || 0,
    originalPrice: rawProduct.originalPrice,
    discount: rawProduct.discount,
    category: rawProduct.category,
    image:
      typeof rawProduct.image === 'string' && !rawProduct.image.includes('images.unsplash.com')
        ? rawProduct.image
        : '',
    rating: rawProduct.rating,
    avgRating: rawProduct.avgRating,
    reviewCount: rawProduct.reviewCount,
    bestSeller: rawProduct.bestSeller,
    onSale: rawProduct.onSale,
    isSoldOut: rawProduct.isSoldOut,
    inStock: rawProduct.inStock,
    isHidden: rawProduct.isHidden,
    stockQuantity: rawProduct.stockQuantity,
    hasVariants: rawProduct.hasVariants,
    variantType: rawProduct.variantType,
    variants: rawProduct.variants,
  };

  return resolveProductCardViewModel(product, null);
}

/**
 * Returns visible non-hidden catalog products genuinely mapped to an article slug.
 */
export function getRelatedProductsForArticle(
  articleSlug: string,
  allProducts: Product[],
  limit = 4
): Product[] {
  const targetSlugs = ARTICLE_TO_PRODUCT_SLUGS[String(articleSlug || '').trim()];
  if (!targetSlugs || targetSlugs.length === 0 || !Array.isArray(allProducts)) {
    return [];
  }

  const bySlug = new Map<string, Product>();
  for (const prod of allProducts) {
    if (!prod || prod.isHidden) continue;
    const key = (prod.resolvedSlug || '').trim();
    if (key) bySlug.set(key, prod);
  }

  const matched: Product[] = [];
  for (const slug of targetSlugs) {
    const found = bySlug.get(slug);
    if (found) {
      matched.push(found);
      if (matched.length >= limit) break;
    }
  }
  return matched;
}
