/**
 * Token movement type definitions
 * 
 * Tokens are in-game tokens for each player
 */

export interface TokenMovement {
  id: number
  member_id: number
  discord_id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  event_id: number | null
  description: string | null
  note: string | null
  created_at: Date
  created_by: string
}
