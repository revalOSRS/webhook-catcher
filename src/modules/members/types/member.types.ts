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

