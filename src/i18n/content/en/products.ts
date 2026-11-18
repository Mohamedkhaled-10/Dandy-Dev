/**
 * ============================================================================
 * DANDY COSMETICS — ENGLISH PRODUCT LOCALIZATION REGISTRY (PHASE 10)
 *
 * Keyed strictly by stable Firebase RTDB `product.id` (e.g. `-OvPo-cuVeLHWSU8KQ22`).
 * Intentionally empty during Phase 10 so Phase 11 populates verified English
 * titles, descriptions, highlights, usage steps, and scent labels without
 * fabricating placeholder copy or altering RTDB product pricing/stock/IDs.
 * ============================================================================
 */

import { EXISTING_PRODUCT_SLUG_MAP } from '../../../utils/products';
import type { ProductLocalizedContent } from '../../types';

export const CANONICAL_PRODUCT_IDS: readonly string[] = Object.freeze(
  Object.keys(EXISTING_PRODUCT_SLUG_MAP)
);

export const EN_PRODUCT_CONTENT: Readonly<Record<string, ProductLocalizedContent>> = Object.freeze({});
