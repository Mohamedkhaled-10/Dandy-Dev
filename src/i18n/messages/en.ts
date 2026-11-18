/**
 * ============================================================================
 * DANDY COSMETICS — ENGLISH UI DICTIONARY CONTRACT (PHASE 10 FOUNDATION ONLY)
 *
 * Intentionally partial during Phase 10:
 *  - Prepares the typed structure and core shared primitives/navigation labels.
 *  - Leaves domain/page-specific copy absent so the Phase 11 completeness
 *    validator explicitly reports untranslated keys instead of masking gaps with
 *    placeholder or mixed-language text.
 * ============================================================================
 */

import type { DeepPartial, TranslationCatalog } from '../types';

export const EN_MESSAGES: DeepPartial<TranslationCatalog> = {
  common: {
    brandName: 'Dandy Cosmetics',
    brandNameAr: 'Dandy',
    currencyEgp: 'EGP',
    loading: 'Loading...',
    retry: 'Try again',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    backToStore: 'Back to store',
    viewAll: 'View all',
    viewCart: 'View bag',
    addToCart: 'Add to bag',
    addedToCart: 'Added',
    selectOption: 'Select option',
    outOfStock: 'Sold out',
    inStock: 'In stock',
    discountBadge: '{percent}% OFF',
    saleBadge: 'Sale',
    bestSellerBadge: 'Best seller',
    freeShippingLabel: 'Free shipping',
  },
  navigation: {
    home: 'Home',
    shop: 'Shop',
    allProducts: 'All Products',
    categories: 'Categories',
    offers: 'Offers',
    specialOffers: 'Special Offers',
    pinkFriday: 'Pink Friday',
    aboutUs: 'Our Story',
    trackOrder: 'Track Order',
    cart: 'Shopping Bag',
    account: 'My Account',
    login: 'Sign In',
    signup: 'Create Account',
    blog: 'Journal',
    reviews: 'Customer Reviews',
    help: 'Help & FAQs',
    contactUs: 'Contact Us',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms & Conditions',
  },
  categories: {
    skinCare: 'Skin Care',
    hairCare: 'Hair Care',
    bodyCare: 'Body Care',
    fragrance: 'Fragrance',
    naturalCareFallback: 'Natural Care',
  },
  // Remaining namespaces (header, footer, home, catalog, product, cart, checkout,
  // orders, account, auth, blog, reviews, support, forms, errors, legal, consent)
  // are intentionally deferred to Phase 11 localization authoring.
};
