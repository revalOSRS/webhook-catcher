/**
 * Bingo Module
 * Nested within Events module for bingo tile matching and progress tracking
 */
// Service
export * from './bingo.service.js';
// Legacy exports for backward compatibility
export { processRuneLiteEventForBingo, getTileProgress, getPlayerProgress, getTeamProgress } from './bingo.service.js';
