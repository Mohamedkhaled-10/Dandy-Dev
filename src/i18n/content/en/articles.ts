/**
 * ============================================================================
 * DANDY COSMETICS — ENGLISH ARTICLE LOCALIZATION REGISTRY (PHASE 10)
 *
 * Keyed by stable Firestore document ID (`article.id`) or canonical article slug.
 * Intentionally empty in Phase 10; articles lacking an English entry with
 * `publishedInLocale: true` safely fall back via `resolveRouteCounterpart`
 * to `/en/blog` without exposing broken 404 routes or premature hreflang tags.
 * ============================================================================
 */

import type { ArticleLocalizedContent } from '../../types';

export const EN_ARTICLE_CONTENT: Readonly<Record<string, ArticleLocalizedContent>> = Object.freeze({});
