/**
 * Coffer movement type definitions
 * 
 * Coffer is the clan coffer that holds donations
 */

export interface CofferMovement {
  id: number
  type: 'donation' | 'withdrawal' | 'event_expenditure' | 'manual_adjustment'
  amount: number
  player_discord_id: string | null
  event_id: number | null
  donation_id: number | null
  description: string | null
  note: string | null
  balance_before: number
  balance_after: number
  created_at: Date
  created_by: string | null
}

