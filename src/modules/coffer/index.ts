/**
 * Coffer Module
 * Central export for all coffer-related functionality
 */

// Types
export type * from './types/index.js'

// Entity types
export type { CofferMovement } from './coffer-movements.entity.js'
export type { CofferBalance } from './coffer-balance.entity.js'

// Service
export { CofferService } from './coffer.service.js'

// Entities (for direct database access if needed)
export { CofferMovementsEntity } from './coffer-movements.entity.js'
export { CofferBalanceEntity } from './coffer-balance.entity.js'
