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
export {};
