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

/**
 * Donation Record
 * 
 * Represents a single donation submission from a member.
 * 
 * Workflow states:
 * - pending: Awaiting admin review
 * - approved: Admin approved, money added to coffer
 * - denied: Admin rejected, reason provided
 * 
 * Triggers on approval:
 * 1. Creates coffer_movement (type: donation)
 * 2. Updates members.total_donated
 * 3. Updates members.donation_count
 * 
 * Discord integration:
 * - message_id: Link to Discord message for review
 * - channel_id: Channel where donation was submitted
 * - reviewed_by: Discord ID of admin who reviewed
 */
export interface Donation {
  id: number
  player_discord_id: string        // FK to members (CASCADE DELETE)
  amount: number                   // Donation amount in GP

  // Evidence
  screenshot_url: string | null    // Screenshot of trade/drop

  // Workflow state
  status: 'pending' | 'approved' | 'denied'
  submitted_at: Date
  reviewed_at: Date | null
  reviewed_by: string | null       // Discord ID of reviewer
  denial_reason: string | null     // Why was it denied?

  // Discord integration
  message_id: string | null        // Discord message ID
  channel_id: string | null        // Discord channel ID

  // Additional info
  note: string | null              // Optional note from submitter
  category_id?: number | null      // FK to donation_categories(id) - Added in migration 044
}

/**
 * Donation Category
 * 
 * Categories for organizing donations (e.g., "General", "Event Prize Pool", etc.)
 * Created in migration 044.
 */
export interface DonationCategory {
  id: number
  name: string                     // Unique category name
  description: string | null
  is_active: boolean
  created_at: Date
}




