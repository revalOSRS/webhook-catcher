/**
 * Token System Types
 * 
 * Tokens are an in-clan currency system for members.
 * Similar to coffer system but for individual member balances.
 * 
 * Related tables:
 * - token_movements (all transactions)
 * - members (token_balance denormalized)
 * 
 * Use cases:
 * - Reward participation in events
 * - Redeem for in-game items/services
 * - Entry fees for competitions
 * 
 * Design: ✅ Good - Proper audit trail, balance tracking
 */

/**
 * Token Movement (Transaction)
 * 
 * Every transaction affecting a member's token balance.
 * Immutable audit trail - records are never edited, only inserted.
 * 
 * Balance tracking:
 * - balance_before: Member's token balance before this transaction
 * - balance_after: Member's token balance after this transaction
 * - These are auto-populated by database trigger
 * 
 * Common transaction types:
 * - 'earn': Member earned tokens (event participation, achievement)
 * - 'spend': Member spent tokens (redemption)
 * - 'transfer': Transfer between members
 * - 'admin_adjustment': Admin correction
 * - 'event_reward': Reward from event
 * - 'event_entry': Entry fee for event
 */
export interface TokenMovement {
  id: number
  member_id: number                // FK to members (CASCADE DELETE)
  discord_id: string               // Discord ID (for reference)
  type: string                     // Transaction type (earn, spend, transfer, etc.)
  amount: number                   // Token amount (positive for earn, negative for spend)
  
  // Balance tracking
  balance_before: number           // Auto-populated by trigger
  balance_after: number            // Auto-populated by trigger
  
  // Context
  event_id: number | null          // FK to events if related to event
  description: string | null       // Human-readable description
  note: string | null              // Admin notes
  
  // Audit
  created_at: Date
  created_by: string               // Discord ID of who created this movement
}
