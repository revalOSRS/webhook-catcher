/**
 * Members API Types
 *
 * API-specific types for member-related endpoints
 * These types define request/response structures for member routes
 */

import type { Member } from '../../../modules/members/types/index.js'

/**
 * Member Profile API Response
 *
 * Used by:
 * - GET /api/members/profile/:memberId
 * - Member detail pages
 */
export interface MemberProfileApiResponse {
  status: 'success' | 'error'
  data?: {
    member: Member & {
      discord_avatar?: string
    }
    osrs_accounts: any[]         // TODO: Type this properly as OsrsAccount[]
    donations: {
      total_approved: number     // Sum of approved donations
      total_pending: number      // Sum of pending donations
      all: any[]                 // TODO: Type this properly as Donation[]
    }
  }
  message?: string
}
