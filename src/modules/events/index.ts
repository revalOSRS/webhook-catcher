/**
 * Events Module
 * Central export for all event-related functionality
 */

// Types
export type * from './types/index.js'

// Entity types
export type { Event } from './events.entity.js'

// Service
export { EventsService } from './events.service.js'

// Entity (for direct database access if needed)
export { EventsEntity } from './events.entity.js'

// Submodules
export * as Bingo from './bingo/index.js'
