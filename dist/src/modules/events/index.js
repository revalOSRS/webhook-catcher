/**
 * Events Module
 * Central export for all event-related functionality
 */
// Service
export { EventsService } from './events.service.js';
// Entity (for direct database access if needed)
export { EventsEntity } from './events.entity.js';
// Submodules
export * as Bingo from './bingo/index.js';
