/**
 * Points Module
 * Central export for all points-related functionality
 */

// Types
export type * from './types/index.js'

// Entity types
export type { PointRule, PointBreakdown } from './points.entity.js'

// Service
export { PointsService } from './points.service.js'

// Entity (for direct database access if needed)
export { PointRulesEntity, PointBreakdownsEntity } from './points.entity.js'

