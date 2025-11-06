/**
 * Donation-related type definitions
 */

export interface Donation {
  id: number
  player_discord_id: string
  amount: number
  category_id: number
  screenshot_url: string | null
  status: 'pending' | 'approved' | 'denied'
  submitted_at: Date
  reviewed_at: Date | null
  reviewed_by: string | null
  denial_reason: string | null
  message_id: string | null
  channel_id: string | null
  note: string | null
}

export interface DonationCategory {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: Date
}

