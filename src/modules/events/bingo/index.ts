/**
 * Bingo Module
 * Nested within Events module for bingo tile matching and progress tracking
 */

// Types
export type * from './types/index.js'

// Service
export * from './bingo.service.js'

// Legacy exports for backward compatibility
export {
  processRuneLiteEventForBingo,
  getTileProgress,
  getPlayerProgress,
  getTeamProgress
} from './bingo.service.js'
