/**
 * Donation System Types
 *
 * Handles the donation approval workflow:
 * 1. Member submits donation with screenshot
 * 2. Admin reviews and approves/denies
 * 3. On approval, triggers update member stats and coffer balance
 *
 * Related tables:
 * - donations (individual donation records)
 * - coffer_movements (created on approval)
 * - members (total_donated updated on approval)
 *
 * Design: ✅ Good - Clear workflow, proper state management
 */
export {};
