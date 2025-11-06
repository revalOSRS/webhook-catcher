/**
 * Member-related type definitions
 */

export interface Member {
  id: number
  discord_id: string
  discord_tag: string | null
  member_code: number
  token_balance: number
  is_active: boolean
  in_discord: boolean
  notes: string | null
  created_at: Date
  updated_at: Date
  last_seen: Date
}

export interface MemberMovement {
  id: number
  member_id: number | null
  discord_id: string
  event_type: 'joined' | 'left'
  previous_rank: string | null
  notes: string | null
  timestamp: Date
}

export interface MemberProfile {
  member: Member
  osrs_accounts: any[]
  recent_movements: MemberMovement[]
  donations: {
    total_approved: number
    total_pending: number
    recent_donations: any[]
  }
  coffer_movements: any[]
  stats: {
    total_ehp: number
    total_ehb: number
    days_as_member: number
  }
}

