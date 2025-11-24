/**
 * Donations Module
 * Central export for all donation-related functionality
 */

// Types
export type * from './types/index.js'

// Entity types
export type { Donation, DonationCategory } from './donations.entity.js'

// Service
export { DonationsService } from './donations.service.js'

// Entity (for direct database access if needed)
export { DonationsEntity, DonationCategoriesEntity } from './donations.entity.js'

