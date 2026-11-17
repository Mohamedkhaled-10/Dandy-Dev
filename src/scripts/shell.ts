/**
 * ============================================================================
 * DANDY COSMETICS — STOREFRONT SHELL PURE LOGIC (PHASE 2)
 * Decoupled, unit-tested helpers for Navigation state, Announcement Bar resolution,
 * Search product ranking/formatting, Cart counting, and URL sanitization.
 * ============================================================================
 */

export interface AnnouncementBannerData {
  mode: 'pink-friday' | 'shipping';
  headline: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface PinkFridayVisualInput {
  visuals?: {
    headline?: string;
    ctaText?: string;
    badgeText?: string;
  };
}

export interface SearchProductInput {
  id: string;
  name?: string;
  category?: string;
  slug?: string;
  image?: string;
  price?: number | string;
  originalPrice?: number | string;
  onSale?: boolean;
  discount?: number | string;
}

export interface RankedSearchProduct {
  id: string;
  name: string;
  category: string;
  href: string;
  image: string;
  currentPrice: number;
  oldPrice: number | null;
  score: number;
}

export const DEFAULT_SHIPPING_ANNOUNCEMENT = 'الشحن مجاني للطلبات التي تتجاوز 2000 جنيه.';

export function normalizeRoutePath(pathname: string): string {
  const cleaned = String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '');
  return cleaned || '/';
}

export function isNavHrefActive(currentPath: string, href: string, matchPrefixes: string[] = []): boolean {
  const current = normalizeRoutePath(currentPath);
  const target = normalizeRoutePath(href);

  if (target === '/') {
    return current === '/';
  }

  if (current === target || current.startsWith(`${target}/`)) {
    return true;
  }

  return matchPrefixes.some((prefix) => {
    const cleanPrefix = normalizeRoutePath(prefix);
    return current === cleanPrefix || current.startsWith(`${cleanPrefix}/`);
  });
}

export function resolveAnnouncementState(
  showPinkFriday: boolean,
  campaign?: PinkFridayVisualInput | null
): AnnouncementBannerData {
  if (showPinkFriday) {
    const headline =
      campaign?.visuals?.headline?.trim() || 'Pink Friday من داندي — اكتشفي العروض الخاصة الآن';
    const ctaText = campaign?.visuals?.ctaText?.trim() || 'عرض المنتجات';
    return {
      mode: 'pink-friday',
      headline,
      ctaText,
      ctaHref: '/pink-friday',
    };
  }

  return {
    mode: 'shipping',
    headline: DEFAULT_SHIPPING_ANNOUNCEMENT,
  };
}

export function calculateCartQuantity(rawCartJson: string | null | undefined): number {
  if (!rawCartJson) return 0;
  try {
    const parsed = JSON.parse(rawCartJson);
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((sum, item) => {
      if (!item || typeof item !== 'object') return sum;
      const qty = Number((item as { quantity?: unknown }).quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) return sum;
      return sum + Math.floor(qty);
    }, 0);
  } catch {
    return 0;
  }
}

export function scoreAndFilterSearchProducts(
  data: Record<string, Omit<SearchProductInput, 'id'>> | null | undefined,
  rawQuery: string
): RankedSearchProduct[] {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!data || !query) return [];

  const results: RankedSearchProduct[] = [];

  for (const [id, item] of Object.entries(data)) {
    if (!item || typeof item !== 'object' || !item.name) continue;
    const name = String(item.name).trim();
    const category = String(item.category || '').trim();
    const nameLower = name.toLowerCase();
    const catLower = category.toLowerCase();

    let score = 0;
    if (nameLower === query) score = 100;
    else if (nameLower.startsWith(query)) score = 80;
    else if (nameLower.includes(query)) score = 50;

    if (catLower === query) score += 30;
    else if (catLower.includes(query)) score += 10;

    if (score <= 0) continue;

    const currentPrice = Number.parseFloat(String(item.price ?? 0)) || 0;
    let oldPrice: number | null = null;
    const discountPercent = Number.parseFloat(String(item.discount ?? 0)) || 0;

    if (item.onSale && discountPercent > 0 && discountPercent < 100 && currentPrice > 0) {
      oldPrice = Math.round(currentPrice / (1 - discountPercent / 100));
    } else if (item.originalPrice !== undefined && item.originalPrice !== null && item.originalPrice !== '') {
      const parsedOrig = Number.parseFloat(String(item.originalPrice));
      if (Number.isFinite(parsedOrig) && parsedOrig > currentPrice) {
        oldPrice = Math.round(parsedOrig);
      }
    }

    const href = item.slug
      ? `/product/${encodeURIComponent(String(item.slug))}`
      : `/product?id=${encodeURIComponent(id)}`;

    results.push({
      id,
      name,
      category,
      href,
      image: item.image && String(item.image).trim() ? String(item.image).trim() : '/assets/images/logo.png',
      currentPrice,
      oldPrice,
      score,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
