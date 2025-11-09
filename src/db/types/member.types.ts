/**
 * Core Member Types
 * 
 * Represents Discord clan members and their movements (join/leave history).
 * Members can have multiple OSRS accounts linked to them.
 * 
 * Related tables:
 * - members (core member data)
 * - member_movements (join/leave audit trail)
 * - osrs_accounts (linked OSRS accounts)
 */

/**
 * Discord Member
 * 
 * Represents a Discord server member who may or may not have linked OSRS accounts.
 * The member_code is used for quick identification in-game.
 * 
 * Relationships:
 * - Has many: osrs_accounts (via discord_id)
 * - Has many: member_movements (via member_id)
 * - Has many: donations (via discord_id)
 * - Has many: token_movements (via member_id)
 * 
 * Denormalized fields:
 * - token_balance: Frequently accessed, justified denormalization
 */
export interface Member {
  id: number
  discord_id: string           // Discord user ID (unique, indexed)
  discord_tag: string | null   // Discord username for display
  member_code: number          // Unique numeric code for quick identification
  token_balance: number        // Current token balance (denormalized from token_movements)
  is_active: boolean           // Whether member is currently in clan
  in_discord: boolean          // Whether member is currently in Discord server
  notes: string | null         // Admin notes
  created_at: Date
  updated_at: Date
  last_seen: Date              // Last activity timestamp
}

/**
 * Member Movement (Join/Leave History)
 * 
 * Audit trail of member join/leave events. Useful for tracking:
 * - Who left and when
 * - Who rejoined
 * - Rank history
 * 
 * Note: member_id can be null if member record was deleted but we keep history
 */
export interface MemberMovement {
  id: number
  member_id: number | null     // FK to members (ON DELETE SET NULL)
  discord_id: string           // Discord ID (kept even if member deleted)
  event_type: 'joined' | 'left'
  previous_rank: string | null // Rank before the event
  notes: string | null         // Context for the movement
  timestamp: Date
}

/**
 * Member Profile (Aggregate View)
 * 
 * Combined view of all member data for profile pages.
 * This is NOT a database table - it's assembled from multiple tables.
 * 
 * Used by:
 * - GET /api/members/:discordId/profile
 * - Member detail pages
 */
export interface MemberProfile {
  member: Member
  osrs_accounts: any[]         // TODO: Type this properly as OsrsAccount[]
  recent_movements: MemberMovement[]
  donations: {
    total_approved: number     // Sum of approved donations
    total_pending: number      // Sum of pending donations
    recent_donations: any[]    // TODO: Type this properly as Donation[]
  }
  coffer_movements: any[]      // TODO: Type this properly as CofferMovement[]
  stats: {
    total_ehp: number          // Sum of EHP across all OSRS accounts
    total_ehb: number          // Sum of EHB across all OSRS accounts
    days_as_member: number     // Days since joined
  }
}



