/**
 * DANDY COSMETICS — CLIENT CART INTERACTION HANDLER FOR UNIFIED PRODUCT CARD
 * Single idempotent document-level click delegation so direct Add-to-Cart never double-fires.
 */
import { addDirectProductToCartArray, type CartAddPayload } from './product-card';

declare global {
  interface Window {
    __dandyProductCardDelegated?: boolean;
    updateSharedCartCount?: () => void;
    updateCartCount?: () => void;
    DandyMeta?: {
      trackAddToCart?: (item: Record<string, any>) => void;
    };
    fbq?: (...args: any[]) => void;
  }
}

function showCartToast(type: 'success' | 'error', message: string): void {
  if (typeof window !== 'undefined' && window.DandyToast && typeof window.DandyToast.show === 'function') {
    window.DandyToast.show({
      type,
      message,
      actionLabel: type === 'success' ? 'عرض السلة' : undefined,
      actionUrl: type === 'success' ? '/cart' : undefined,
      duration: type === 'success' ? 4200 : 5000,
    });
  }
}

export function handleDirectAddButton(button: HTMLElement): boolean {
  if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const rawPayload = button.getAttribute('data-cart-payload');
  if (!rawPayload) {
    showCartToast('error', 'تعذر قراءة بيانات المنتج، يرجى فتح صفحة المنتج.');
    return false;
  }

  let payload: CartAddPayload;
  try {
    payload = JSON.parse(rawPayload) as CartAddPayload;
  } catch {
    showCartToast('error', 'حدث خطأ أثناء قراءة بيانات المنتج.');
    return false;
  }

  if (!payload || !payload.id || !payload.name) {
    showCartToast('error', 'بيانات المنتج غير مكتملة.');
    return false;
  }

  try {
    const rawCart = window.localStorage.getItem('cart');
    const existingCart = rawCart ? JSON.parse(rawCart) : [];
    const nextCart = addDirectProductToCartArray(Array.isArray(existingCart) ? existingCart : [], payload);
    window.localStorage.setItem('cart', JSON.stringify(nextCart));

    // Meta Pixel tracking (preserved DandyMeta contract)
    if (window.DandyMeta && typeof window.DandyMeta.trackAddToCart === 'function') {
      window.DandyMeta.trackAddToCart(payload);
    } else if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: payload.name,
        content_ids: [payload.id],
        content_type: 'product',
        value: Number(payload.price) || 0,
        currency: 'EGP',
      });
    }

    // Update header + bottom nav cart counts
    if (typeof window.updateSharedCartCount === 'function') {
      window.updateSharedCartCount();
    }
    if (typeof window.updateCartCount === 'function') {
      window.updateCartCount();
    }
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { productId: payload.id } }));

    // Visual brief settled state on button
    const labelEl = button.querySelector('[data-btn-label]');
    const originalText = labelEl?.textContent || 'أضيفي للسلة';
    button.classList.add('is-added');
    if (labelEl) {
      labelEl.textContent = 'تمت الإضافة';
    }
    window.setTimeout(() => {
      button.classList.remove('is-added');
      if (labelEl) {
        labelEl.textContent = originalText;
      }
    }, 1200);

    showCartToast('success', `تمت إضافة «${payload.name}» إلى سلة التسوق.`);
    return true;
  } catch {
    showCartToast('error', 'تعذر حفظ المنتج في السلة، تأكدي من إعدادات المتصفح.');
    return false;
  }
}

export function initProductCardActions(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__dandyProductCardDelegated) return;
  window.__dandyProductCardDelegated = true;

  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const button = target.closest<HTMLElement>('[data-dandy-add-to-cart]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    handleDirectAddButton(button);
  });
}
