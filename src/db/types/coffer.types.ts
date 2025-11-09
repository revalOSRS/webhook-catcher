/**
 * Coffer System Types
 * 
 * The "coffer" is the clan's treasury that holds all donations from members.
 * 
 * Key features:
 * - Tracks all money movements (donations, withdrawals, event costs)
 * - Maintains current balance
 * - Provides complete audit trail
 * - Auto-updates via database triggers
 * 
 * Related tables:
 * - coffer_balance (current balance - single row)
 * - coffer_movements (all transactions - audit trail)
 * - donations (pending/approved/denied donations)
 * - events (events that spend coffer funds)
 * 
 * How it works:
 * 1. Player submits donation → creates `donation` record (status: pending)
 * 2. Admin approves → creates `coffer_movement` record (type: donation)
 * 3. Trigger auto-updates `coffer_balance` and `members.total_donated`
 * 
 * Design: ✅ Excellent - Good separation of concerns, proper audit trail
 */

/**
 * Coffer Movement (Transaction)
 * 
 * Every single transaction that affects the coffer balance.
 * Immutable audit trail - records are never edited, only inserted.
 * 
 * Balance tracking:
 * - balance_before: Balance before this transaction
 * - balance_after: Balance after this transaction
 * - These are auto-populated by database trigger
 * 
 * Transaction types:
 * - donation: Member adds money (increases balance)
 * - withdrawal: Admin removes money (decreases balance)
 * - event_expenditure: Money spent on clan event (decreases balance)
 * - manual_adjustment: Admin correction (can increase or decrease)
 */
export interface CofferMovement {
  id: number
  type: 'donation' | 'withdrawal' | 'event_expenditure' | 'manual_adjustment'
  amount: number                   // Always positive (type determines +/-)
  
  // Foreign key relationships (all nullable to preserve audit trail)
  player_discord_id: string | null // FK to members (ON DELETE SET NULL)
  event_id: number | null          // FK to events (ON DELETE SET NULL)
  donation_id: number | null       // FK to donations (ON DELETE SET NULL)
  
  // Audit fields
  description: string | null       // Human-readable description
  note: string | null              // Admin notes
  balance_before: number           // Auto-populated by trigger
  balance_after: number            // Auto-populated by trigger
  created_at: Date
  created_by: string | null        // Discord ID of who created this movement
}

/**
 * Current Coffer Balance
 * 
 * Single-row table holding the current balance.
 * Updated automatically by trigger when coffer_movements are inserted.
 * 
 * ⚠️ NEVER update this table directly - always insert into coffer_movements
 * and let the trigger handle updating the balance.
 * 
 * Query: SELECT balance FROM coffer_balance WHERE id = 1
 */
export interface CofferBalance {
  id: number                       // Always 1 (single row table)
  balance: number                  // Current coffer balance in GP
  last_updated: Date               // Last time balance changed
  updated_by: string               // Discord ID of last updater
}

/**
 * Clan Event
 * 
 * Events that spend coffer funds (e.g., drop parties, tournaments).
 * 
 * When an event is created:
 * 1. Event record is created with funds_used
 * 2. Coffer movement is created (type: event_expenditure)
 * 3. Trigger decreases coffer balance
 * 
 * Related tables:
 * - game_events (battleship bingo events - different concept)
 * - coffer_movements (WHERE type = 'event_expenditure')
 */
export interface Event {
  id: number
  name: string                     // Event name
  description: string | null       // Event details
  funds_used: number               // GP spent from coffer
  created_at: Date
  created_by: string               // Discord ID of event creator
}



