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

export interface OsrsAccount {
  id: number
  discord_id: string
  osrs_nickname: string
  dink_hash: string | null
  wom_player_id: number | null
  wom_rank: string | null
  ehp: number
  ehb: number
  is_primary: boolean
  last_synced_at: Date | null
  created_at: Date
  updated_at: Date
}

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

export interface MemberProfile {
  member: Member
  osrs_accounts: OsrsAccount[]
  recent_movements: MemberMovement[]
  donations: {
    total_approved: number
    total_pending: number
    recent_donations: Donation[]
  }
  coffer_movements: CofferMovement[]
  stats: {
    total_ehp: number
    total_ehb: number
    days_as_member: number
  }
}

export interface ClanStatisticsSnapshot {
  id: number
  snapshot_date: Date
  group_id: number
  group_name: string
  total_members: number
  average_level: number
  average_xp: number
  maxed_count: number
  maxed_percentage: number
  total_clues: number
  total_boss_kills: number
  total_cox: number
  total_toa: number
  total_tob: number
  total_ehp: number
  total_ehb: number
  failed_members: number
  created_at: Date
}

export interface SnapshotFailedMember {
  id: number
  snapshot_id: number
  player_id: number
  player_username: string
  error_message: string | null
  created_at: Date
}

export interface PlayerSnapshot {
  id: number
  player_id: number
  username: string
  display_name: string | null
  snapshot_date: Date
  player_type: string | null
  player_build: string | null
  country: string | null
  status: string | null
  patron: boolean
  total_exp: number
  total_level: number
  combat_level: number
  ehp: number
  ehb: number
  ttm: number
  tt200m: number
  registered_at: Date | null
  updated_at: Date | null
  last_changed_at: Date | null
  last_imported_at: Date | null
  created_at: Date
  clan_snapshot_id: number | null
}

export interface PlayerSkillSnapshot {
  id: number
  player_snapshot_id: number
  skill: string
  experience: number
  level: number
  rank: number
  ehp: number
}

export interface PlayerBossSnapshot {
  id: number
  player_snapshot_id: number
  boss: string
  kills: number
  rank: number
  ehb: number
}

export interface PlayerActivitySnapshot {
  id: number
  player_snapshot_id: number
  activity: string
  score: number
  rank: number
}

export interface PlayerComputedSnapshot {
  id: number
  player_snapshot_id: number
  metric: string
  value: number
  rank: number
}

