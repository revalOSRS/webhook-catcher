export interface Event {
  id: string
  event_type: string
  name: string
  description: string | null
  status: 'upcoming' | 'active' | 'paused' | 'completed' | 'cancelled'
  start_time: Date
  end_time: Date
  created_by_discord_id: string
  created_at: Date
  updated_at: Date
  metadata: any
}

export interface BattleshipBingoEvent {
  id: string
  event_id: string
  board_config: any
  rules_config: any
  winning_team_id: string | null
  total_tiles: number
  completed_tiles: number
}

export interface Team {
  id: string
  event_id: string
  name: string
  color: string
  score: number
  ships_remaining: number
  tiles_completed: number
  bombs_remaining: number
  last_bomb_reset: Date | null
  created_at: Date
}

export interface TeamMember {
  id: string
  team_id: string
  discord_id: string
  member_code: string | null
  role: 'captain' | 'member'
  individual_score: number
  tiles_completed: number
  joined_at: Date
}

export interface BattleshipBingoShip {
  id: string
  event_id: string
  team_id: string
  ship_name: string | null
  size: number
  coordinates: string[]
  segments_destroyed: number
  is_sunk: boolean
  is_hidden: boolean
  placed_at: Date
  destroyed_at: Date | null
}

export interface BattleshipBingoTile {
  id: string
  event_id: string
  coordinate: string
  task_id: string
  status: 'unclaimed' | 'claimed' | 'in_progress' | 'pending_review' | 'completed' | 'bombed'
  claimed_by_team_id: string | null
  completed_by_discord_id: string | null
  contributors: any
  buff_debuff_id: string | null
  base_points: number
  bonus_tier_achieved: string | null
  completion_value: number | null
  total_points_awarded: number
  is_ship_segment: boolean
  ship_id: string | null
  is_bombed: boolean
  bombed_by_team_id: string | null
  proof_url: string | null
  claimed_at: Date | null
  completed_at: Date | null
  bombed_at: Date | null
  metadata: any
}

export interface BattleshipBingoTileProgress {
  id: string
  tile_id: string
  discord_id: string
  progress_amount: number
  progress_percentage: number
  contribution_type: string | null
  current_best_value: number | null
  proof_url: string | null
  notes: string | null
  last_updated: Date
}

export interface BattleshipBingoActiveEffect {
  id: string
  event_id: string
  effect_id: string
  type: 'buff' | 'debuff'
  applied_to_type: 'team' | 'tile' | 'player'
  applied_to_id: string
  triggered_by_tile_id: string | null
  triggered_by_discord_id: string | null
  is_active: boolean
  expires_at: Date | null
  activated_at: Date
  deactivated_at: Date | null
  metadata: any
}

export interface BattleshipBingoBombAction {
  id: string
  event_id: string
  bombing_team_id: string
  target_coordinate: string
  bombed_by_discord_id: string
  result: 'hit' | 'miss' | 'sunk_ship' | 'blocked'
  ship_id: string | null
  points_awarded: number
  bombed_at: Date
  metadata: any
}

export interface EventLog {
  id: string
  event_id: string
  action_type: string
  actor_discord_id: string | null
  team_id: string | null
  details: any
  created_at: Date
}


