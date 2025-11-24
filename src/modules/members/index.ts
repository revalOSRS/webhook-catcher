/**
 * Members Module
 * Central export for all member-related functionality
 */

// Types
export type * from './types/index.js'

// Service types (complex aggregated types)
export type { MemberProfile } from './members.service.js'

// Entity types
export type { MemberMovements } from './member-movements.entity.js'

// Service
export { MembersService } from './members.service.js'

// Entity (for direct database access if needed)
export { MembersEntity } from './members.entity.js'
export { MemberMovementsEntity } from './member-movements.entity.js'
