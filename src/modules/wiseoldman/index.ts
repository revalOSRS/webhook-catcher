/**
 * Wise Old Man Module
 * Wise Old Man API integration and clan statistics
 */

// Types
export type * from './types/index.js'

// WOM Client Types
export type {
  WOMPlayer,
  WOMSnapshot,
  WOMAchievement,
  WOMRecord,
  WOMGroup,
  WOMGroupMembership
} from './wiseoldman.service.js'

// Service
export { WiseOldManService } from './wiseoldman.service.js'

