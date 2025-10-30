import { query, queryOne } from '../connection.js'
import type {
  Event,
  BattleshipBingoEvent,
  Team,
  TeamMember,
  BattleshipBingoShip,
  BattleshipBingoTile,
  BattleshipBingoTileProgress,
  BattleshipBingoActiveEffect,
  BattleshipBingoBombAction,
  EventLog
} from '../types/battleship.types.js'

// ==================== EVENT MANAGEMENT ====================

/**
 * Create a new event
 */
export async function createEvent(data: {
  event_type: string
  name: string
  description?: string
  status?: string
  start_time: Date
  end_time: Date
  created_by_discord_id: string
  metadata?: any
}): Promise<Event> {
  const result = await queryOne<Event>(
    `INSERT INTO events (event_type, name, description, status, start_time, end_time, created_by_discord_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.event_type,
      data.name,
      data.description || null,
      data.status || 'upcoming',
      data.start_time,
      data.end_time,
      data.created_by_discord_id,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]
  )
  
  if (!result) throw new Error('Failed to create event')
  return result
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  return queryOne<Event>('SELECT * FROM events WHERE id = $1', [eventId])
}

/**
 * Get all events
 */
export async function getAllEvents(filters?: { status?: string; event_type?: string }): Promise<Event[]> {
  let sql = 'SELECT * FROM events WHERE 1=1'
  const params: any[] = []
  
  if (filters?.status) {
    params.push(filters.status)
    sql += ` AND status = $${params.length}`
  }
  
  if (filters?.event_type) {
    params.push(filters.event_type)
    sql += ` AND event_type = $${params.length}`
  }
  
  sql += ' ORDER BY start_time DESC'
  
  return query<Event>(sql, params)
}

/**
 * Update event status
 */
export async function updateEventStatus(eventId: string, status: string): Promise<Event | null> {
  return queryOne<Event>(
    'UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [status, eventId]
  )
}

// ==================== BATTLESHIP BINGO EVENT ====================

/**
 * Create Battleship Bingo event
 */
export async function createBattleshipBingoEvent(data: {
  event_id: string
  board_config: any
  rules_config: any
  total_tiles: number
}): Promise<BattleshipBingoEvent> {
  const result = await queryOne<BattleshipBingoEvent>(
    `INSERT INTO battleship_bingo_events (event_id, board_config, rules_config, total_tiles)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.event_id,
      JSON.stringify(data.board_config),
      JSON.stringify(data.rules_config),
      data.total_tiles
    ]
  )
  
  if (!result) throw new Error('Failed to create battleship bingo event')
  return result
}

/**
 * Get Battleship Bingo event by event ID
 */
export async function getBattleshipBingoEvent(eventId: string): Promise<BattleshipBingoEvent | null> {
  return queryOne<BattleshipBingoEvent>(
    'SELECT * FROM battleship_bingo_events WHERE event_id = $1',
    [eventId]
  )
}

// ==================== TEAM MANAGEMENT ====================

/**
 * Create a team
 */
export async function createTeam(data: {
  event_id: string
  name: string
  color: string
}): Promise<Team> {
  const result = await queryOne<Team>(
    `INSERT INTO teams (event_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.event_id, data.name, data.color]
  )
  
  if (!result) throw new Error('Failed to create team')
  return result
}

/**
 * Get teams for an event
 */
export async function getTeamsByEventId(eventId: string): Promise<Team[]> {
  return query<Team>(
    'SELECT * FROM teams WHERE event_id = $1 ORDER BY score DESC',
    [eventId]
  )
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  return queryOne<Team>('SELECT * FROM teams WHERE id = $1', [teamId])
}

/**
 * Add member to team
 */
export async function addTeamMember(data: {
  team_id: string
  discord_id: string
  member_code?: string
  role?: 'captain' | 'member'
}): Promise<TeamMember> {
  const result = await queryOne<TeamMember>(
    `INSERT INTO team_members (team_id, discord_id, member_code, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.team_id, data.discord_id, data.member_code || null, data.role || 'member']
  )
  
  if (!result) throw new Error('Failed to add team member')
  return result
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return query<TeamMember>(
    'SELECT * FROM team_members WHERE team_id = $1 ORDER BY individual_score DESC',
    [teamId]
  )
}

/**
 * Update team score
 */
export async function updateTeamScore(teamId: string, points: number): Promise<Team | null> {
  return queryOne<Team>(
    'UPDATE teams SET score = score + $1 WHERE id = $2 RETURNING *',
    [points, teamId]
  )
}

// ==================== SHIPS ====================

/**
 * Place a ship
 */
export async function placeShip(data: {
  event_id: string
  team_id: string
  ship_name?: string
  size: number
  coordinates: string[]
}): Promise<BattleshipBingoShip> {
  const result = await queryOne<BattleshipBingoShip>(
    `INSERT INTO battleship_bingo_ships (event_id, team_id, ship_name, size, coordinates)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.event_id, data.team_id, data.ship_name || null, data.size, JSON.stringify(data.coordinates)]
  )
  
  if (!result) throw new Error('Failed to place ship')
  return result
}

/**
 * Get ships for a team
 */
export async function getTeamShips(teamId: string): Promise<BattleshipBingoShip[]> {
  return query<BattleshipBingoShip>(
    'SELECT * FROM battleship_bingo_ships WHERE team_id = $1',
    [teamId]
  )
}

/**
 * Check if coordinate has a ship
 */
export async function checkShipAtCoordinate(eventId: string, coordinate: string): Promise<BattleshipBingoShip | null> {
  return queryOne<BattleshipBingoShip>(
    `SELECT * FROM battleship_bingo_ships 
     WHERE event_id = $1 
     AND coordinates @> $2::jsonb 
     AND is_sunk = FALSE`,
    [eventId, JSON.stringify([coordinate])]
  )
}

// ==================== TILES ====================

/**
 * Initialize board tiles
 */
export async function initializeBoardTiles(eventId: string, tiles: Array<{
  coordinate: string
  task_id: string
  buff_debuff_id?: string
  base_points?: number
}>): Promise<void> {
  const values = tiles.map((tile, idx) => {
    const offset = idx * 5
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
  }).join(', ')
  
  const params = tiles.flatMap(tile => [
    eventId,
    tile.coordinate,
    tile.task_id,
    tile.buff_debuff_id || null,
    tile.base_points || 100
  ])
  
  await query(
    `INSERT INTO battleship_bingo_tiles (event_id, coordinate, task_id, buff_debuff_id, base_points)
     VALUES ${values}`,
    params
  )
}

/**
 * Get all tiles for an event
 */
export async function getTilesByEventId(eventId: string): Promise<BattleshipBingoTile[]> {
  return query<BattleshipBingoTile>(
    'SELECT * FROM battleship_bingo_tiles WHERE event_id = $1 ORDER BY coordinate',
    [eventId]
  )
}

/**
 * Get tile by coordinate
 */
export async function getTileByCoordinate(eventId: string, coordinate: string): Promise<BattleshipBingoTile | null> {
  return queryOne<BattleshipBingoTile>(
    'SELECT * FROM battleship_bingo_tiles WHERE event_id = $1 AND coordinate = $2',
    [eventId, coordinate]
  )
}

/**
 * Claim a tile
 */
export async function claimTile(tileId: string, teamId: string): Promise<BattleshipBingoTile | null> {
  return queryOne<BattleshipBingoTile>(
    `UPDATE battleship_bingo_tiles 
     SET status = 'claimed', claimed_by_team_id = $1, claimed_at = CURRENT_TIMESTAMP 
     WHERE id = $2 AND status = 'unclaimed'
     RETURNING *`,
    [teamId, tileId]
  )
}

/**
 * Complete a tile
 */
export async function completeTile(data: {
  tile_id: string
  completed_by_discord_id: string
  contributors?: any
  bonus_tier_achieved?: string
  completion_value?: number
  total_points_awarded: number
  proof_url?: string
}): Promise<BattleshipBingoTile | null> {
  return queryOne<BattleshipBingoTile>(
    `UPDATE battleship_bingo_tiles 
     SET status = 'completed',
         completed_by_discord_id = $1,
         contributors = $2,
         bonus_tier_achieved = $3,
         completion_value = $4,
         total_points_awarded = $5,
         proof_url = $6,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      data.completed_by_discord_id,
      data.contributors ? JSON.stringify(data.contributors) : null,
      data.bonus_tier_achieved || null,
      data.completion_value || null,
      data.total_points_awarded,
      data.proof_url || null,
      data.tile_id
    ]
  )
}

// ==================== TILE PROGRESS ====================

/**
 * Update tile progress
 */
export async function updateTileProgress(data: {
  tile_id: string
  discord_id: string
  progress_amount: number
  progress_percentage: number
  contribution_type?: string
  current_best_value?: number
  proof_url?: string
  notes?: string
}): Promise<BattleshipBingoTileProgress> {
  const result = await queryOne<BattleshipBingoTileProgress>(
    `INSERT INTO battleship_bingo_tile_progress 
     (tile_id, discord_id, progress_amount, progress_percentage, contribution_type, current_best_value, proof_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tile_id, discord_id) 
     DO UPDATE SET
       progress_amount = $3,
       progress_percentage = $4,
       contribution_type = $5,
       current_best_value = $6,
       proof_url = $7,
       notes = $8,
       last_updated = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      data.tile_id,
      data.discord_id,
      data.progress_amount,
      data.progress_percentage,
      data.contribution_type || null,
      data.current_best_value || null,
      data.proof_url || null,
      data.notes || null
    ]
  )
  
  if (!result) throw new Error('Failed to update tile progress')
  return result
}

/**
 * Get tile progress
 */
export async function getTileProgress(tileId: string): Promise<BattleshipBingoTileProgress[]> {
  return query<BattleshipBingoTileProgress>(
    'SELECT * FROM battleship_bingo_tile_progress WHERE tile_id = $1 ORDER BY last_updated DESC',
    [tileId]
  )
}

// ==================== BOMBING ====================

/**
 * Execute bomb action
 */
export async function executeBombAction(data: {
  event_id: string
  bombing_team_id: string
  target_coordinate: string
  bombed_by_discord_id: string
  result: 'hit' | 'miss' | 'sunk_ship' | 'blocked'
  ship_id?: string
  points_awarded: number
  metadata?: any
}): Promise<BattleshipBingoBombAction> {
  const result = await queryOne<BattleshipBingoBombAction>(
    `INSERT INTO battleship_bingo_bomb_actions 
     (event_id, bombing_team_id, target_coordinate, bombed_by_discord_id, result, ship_id, points_awarded, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.event_id,
      data.bombing_team_id,
      data.target_coordinate,
      data.bombed_by_discord_id,
      data.result,
      data.ship_id || null,
      data.points_awarded,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]
  )
  
  if (!result) throw new Error('Failed to execute bomb action')
  return result
}

/**
 * Mark tile as bombed
 */
export async function markTileBombed(tileId: string, teamId: string): Promise<BattleshipBingoTile | null> {
  return queryOne<BattleshipBingoTile>(
    `UPDATE battleship_bingo_tiles 
     SET is_bombed = TRUE, bombed_by_team_id = $1, bombed_at = CURRENT_TIMESTAMP 
     WHERE id = $2
     RETURNING *`,
    [teamId, tileId]
  )
}

/**
 * Update ship damage
 */
export async function damageShip(shipId: string): Promise<BattleshipBingoShip | null> {
  return queryOne<BattleshipBingoShip>(
    `UPDATE battleship_bingo_ships 
     SET segments_destroyed = segments_destroyed + 1,
         is_sunk = (segments_destroyed + 1 >= size),
         destroyed_at = CASE WHEN (segments_destroyed + 1 >= size) THEN CURRENT_TIMESTAMP ELSE destroyed_at END
     WHERE id = $1
     RETURNING *`,
    [shipId]
  )
}

// ==================== EVENT LOG ====================

/**
 * Log event action
 */
export async function logEventAction(data: {
  event_id: string
  action_type: string
  actor_discord_id?: string
  team_id?: string
  details: any
}): Promise<EventLog> {
  const result = await queryOne<EventLog>(
    `INSERT INTO event_log (event_id, action_type, actor_discord_id, team_id, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.event_id,
      data.action_type,
      data.actor_discord_id || null,
      data.team_id || null,
      JSON.stringify(data.details)
    ]
  )
  
  if (!result) throw new Error('Failed to log event action')
  return result
}

/**
 * Get event logs
 */
export async function getEventLogs(eventId: string, limit: number = 100): Promise<EventLog[]> {
  return query<EventLog>(
    'SELECT * FROM event_log WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2',
    [eventId, limit]
  )
}

// ==================== LEADERBOARDS & STATS ====================

/**
 * Get team leaderboard
 */
export async function getTeamLeaderboard(eventId: string) {
  return query(
    `SELECT t.*, 
            COUNT(tm.id) as member_count,
            COUNT(DISTINCT bt.id) FILTER (WHERE bt.status = 'completed') as completed_tiles_count
     FROM teams t
     LEFT JOIN team_members tm ON tm.team_id = t.id
     LEFT JOIN battleship_bingo_tiles bt ON bt.claimed_by_team_id = t.id
     WHERE t.event_id = $1
     GROUP BY t.id
     ORDER BY t.score DESC, t.tiles_completed DESC`,
    [eventId]
  )
}

/**
 * Get player leaderboard for an event
 */
export async function getPlayerLeaderboard(eventId: string) {
  return query(
    `SELECT tm.discord_id, tm.individual_score, tm.tiles_completed, tm.role, t.name as team_name, t.color as team_color
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE t.event_id = $1
     ORDER BY tm.individual_score DESC, tm.tiles_completed DESC
     LIMIT 50`,
    [eventId]
  )
}


