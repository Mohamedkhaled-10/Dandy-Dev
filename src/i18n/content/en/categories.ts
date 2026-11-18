/**
 * ============================================================================
 * DANDY COSMETICS — ENGLISH CATEGORY LOCALIZATION CONTRACT (PHASE 10)
 *
 * Prepared structure keyed by canonical category slugs (`hair-care`, `body-care`,
 * `fragrance`, `skin-care`). Only canonical category names verified in
 * `CATEGORY_TAXONOMY` are populated; full English SEO titles, intros, and
 * descriptions are intentionally deferred to Phase 11 so the translation
 * completeness checker accurately flags remaining editorial authoring tasks.
 * ============================================================================
 */

import { CATEGORY_TAXONOMY } from '../../../utils/categories';
import type { CategoryLocalizedContent } from '../../types';

export const EN_CATEGORY_CONTENT: Readonly<Record<string, Partial<CategoryLocalizedContent>>> = Object.freeze({
  'hair-care': {
    slug: 'hair-care',
    name: CATEGORY_TAXONOMY['hair-care'].name,
  },
  'body-care': {
    slug: 'body-care',
    name: CATEGORY_TAXONOMY['body-care'].name,
  },
  fragrance: {
    slug: 'fragrance',
    name: CATEGORY_TAXONOMY['fragrance'].name,
  },
  'skin-care': {
    slug: 'skin-care',
    name: CATEGORY_TAXONOMY['skin-care'].name,
  },
});
