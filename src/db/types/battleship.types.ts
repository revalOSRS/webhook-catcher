/**
 * Battleship Bingo Game System Types
 * 
 * Comprehensive event management system for Battleship Bingo competitions.
 * This is a complex, well-designed system that combines:
 * - Traditional bingo (completing tiles on a board)
 * - Battleship (placing ships, bombing enemy tiles)
 * - OSRS tasks (tiles contain OSRS challenges)
 * 
 * Key features:
 * - Team-based competition
 * - Task progression tracking
 * - Buffs/debuffs system
 * - Comprehensive audit logging
 * - Ship placement and bombing mechanics
 * 
 * Related tables:
 * - game_events (parent table for all events)
 * - battleship_bingo_events (specific battleship config)
 * - teams (competing teams)
 * - team_members (players in each team)
 * - battleship_bingo_ships (ship placements)
 * - battleship_bingo_tiles (board tiles/tasks)
 * - battleship_bingo_tile_progress (player progress on tiles)
 * - battleship_bingo_active_effects (active buffs/debuffs)
 * - battleship_bingo_bomb_actions (bombing history)
 * - event_log (audit trail)
 * 
 * Design: ✅ Excellent - Very well thought out, comprehensive state tracking
 */

/**
 * Game Event (Generic)
 * 
 * Parent table for all types of clan events (not just battleship bingo).
 * Provides common fields and state management for any event type.
 * 
 * Event lifecycle:
 * 1. upcoming → Event created, not started
 * 2. active → Event is currently running
 * 3. paused → Event temporarily paused
 * 4. completed → Event finished successfully
 * 5. cancelled → Event was cancelled
 * 
 * Uses UUID for distributed system compatibility and to avoid conflicts.
 */
export interface Event {
  id: string                       // UUID (not SERIAL - for distributed systems)
  event_type: string               // e.g., 'battleship_bingo', 'drop_party', 'tournament'
  name: string                     // Event display name
  description: string | null       // Event details
  status: 'upcoming' | 'active' | 'paused' | 'completed' | 'cancelled'
  start_time: Date
  end_time: Date
  created_by_discord_id: string    // Discord ID of event creator
  created_at: Date
  updated_at: Date                 // Auto-updated via trigger
  metadata: any                    // JSONB - flexible event-specific data
}

/**
 * Battleship Bingo Event Configuration
 * 
 * Specific configuration for a Battleship Bingo event.
 * References a parent game_event record.
 * 
 * Board configuration (JSONB):
 * - Grid size (e.g., 10x10)
 * - Tile layouts
 * - Task definitions
 * 
 * Rules configuration (JSONB):
 * - Scoring rules
 * - Bomb regeneration rate
 * - Ship placement rules
 * - Buff/debuff definitions
 */
export interface BattleshipBingoEvent {
  id: string                       // UUID
  event_id: string                 // FK to game_events (CASCADE DELETE, UNIQUE)
  board_config: any                // JSONB - Board layout and tasks
  rules_config: any                // JSONB - Game rules
  winning_team_id: string | null   // FK to teams (NULL until winner determined)
  total_tiles: number              // Total tiles on the board
  completed_tiles: number          // Tiles completed so far
}

/**
 * Team
 * 
 * A competing team in an event.
 * Multiple teams compete to complete tiles and sink enemy ships.
 * 
 * Score tracking:
 * - score: Total points earned
 * - ships_remaining: Ships not yet sunk
 * - tiles_completed: Tiles this team completed
 * - bombs_remaining: Bombs available to use
 */
export interface Team {
  id: string                       // UUID
  event_id: string                 // FK to game_events (CASCADE DELETE)
  name: string                     // Team name
  color: string                    // Hex color code (e.g., '#FF0000')
  score: number                    // Total points
  ships_remaining: number          // Ships not sunk
  tiles_completed: number          // Tiles completed by this team
  bombs_remaining: number          // Available bombs
  last_bomb_reset: Date | null     // When bombs were last regenerated
  created_at: Date
}

/**
 * Team Member
 * 
 * Links Discord members to teams for an event.
 * 
 * Roles:
 * - captain: Team leader (extra permissions)
 * - member: Regular team member
 * 
 * Individual tracking:
 * - individual_score: Player's contribution to team score
 * - tiles_completed: Tiles this player completed
 */
export interface TeamMember {
  id: string                       // UUID
  team_id: string                  // FK to teams (CASCADE DELETE)
  discord_id: string               // Discord member ID
  member_code: string | null       // Quick identification code
  role: 'captain' | 'member'
  individual_score: number         // Player's personal score
  tiles_completed: number          // Tiles player completed
  joined_at: Date
}

/**
 * Battleship Bingo Ship
 * 
 * Ships placed by teams on their tiles.
 * Enemy teams try to bomb and sink these ships.
 * 
 * Ship lifecycle:
 * 1. Placed (is_hidden=true, is_sunk=false)
 * 2. Being bombed (segments_destroyed increases)
 * 3. Fully sunk (is_sunk=true, destroyed_at set)
 * 
 * Coordinates (JSONB array):
 * - e.g., ['A1', 'A2', 'A3'] for a 3-segment ship
 */
export interface BattleshipBingoShip {
  id: string                       // UUID
  event_id: string                 // FK to battleship_bingo_events (CASCADE DELETE)
  team_id: string                  // FK to teams (CASCADE DELETE)
  ship_name: string | null         // e.g., 'Carrier', 'Destroyer'
  size: number                     // Number of tiles this ship occupies
  coordinates: string[]            // Array of board coordinates (JSONB)
  segments_destroyed: number       // How many segments have been hit
  is_sunk: boolean                 // Has ship been completely destroyed?
  is_hidden: boolean               // Is ship location hidden from enemies?
  placed_at: Date
  destroyed_at: Date | null        // When ship was fully sunk
}

/**
 * Battleship Bingo Tile
 * 
 * Individual tile on the board containing an OSRS task.
 * 
 * Tile lifecycle:
 * 1. unclaimed → No team has claimed it
 * 2. claimed → Team claimed, not started
 * 3. in_progress → Team working on it
 * 4. pending_review → Submitted, awaiting admin review
 * 5. completed → Task verified and completed
 * 6. bombed → Enemy team bombed it
 * 
 * Scoring:
 * - base_points: Base points for completion
 * - bonus_tier_achieved: If task has bonus tiers
 * - completion_value: Actual value achieved (for metric tasks)
 * - total_points_awarded: Final points awarded
 * 
 * Ship integration:
 * - is_ship_segment: Is this tile part of a ship?
 * - ship_id: Which ship (if any)
 * 
 * Bombing:
 * - is_bombed: Has it been bombed?
 * - bombed_by_team_id: Which team bombed it
 * - bombed_at: When it was bombed
 */
export interface BattleshipBingoTile {
  id: string                       // UUID
  event_id: string                 // FK to battleship_bingo_events (CASCADE DELETE)
  coordinate: string               // e.g., 'A1', 'B5', 'J10'
  task_id: string                  // Reference to task definition in board_config
  status: 'unclaimed' | 'claimed' | 'in_progress' | 'pending_review' | 'completed' | 'bombed'
  
  // Ownership
  claimed_by_team_id: string | null // FK to teams
  completed_by_discord_id: string | null // Player who completed it
  contributors: any                 // JSONB - All players who contributed
  
  // Buff/Debuff
  buff_debuff_id: string | null    // Active buff/debuff on this tile
  
  // Scoring
  base_points: number              // Base points for completion
  bonus_tier_achieved: string | null // Bonus tier reached (if applicable)
  completion_value: number | null  // Actual value achieved (for metric tasks)
  total_points_awarded: number     // Total points given
  
  // Ship integration
  is_ship_segment: boolean         // Is this part of a ship?
  ship_id: string | null           // FK to battleship_bingo_ships
  
  // Bombing
  is_bombed: boolean               // Has been bombed?
  bombed_by_team_id: string | null // FK to teams
  
  // Evidence and metadata
  proof_url: string | null         // Screenshot/proof of completion
  claimed_at: Date | null
  completed_at: Date | null
  bombed_at: Date | null
  metadata: any                    // JSONB - Task-specific data
}

/**
 * Battleship Bingo Tile Progress
 * 
 * Tracks individual player progress on tiles.
 * Useful for tasks that require multiple players or incremental progress.
 * 
 * Example use cases:
 * - "Collect 1000 items" - Track each player's contribution
 * - "Kill boss 50 times" - Track team's total kills
 * - "Get best time" - Track each player's best attempt
 */
export interface BattleshipBingoTileProgress {
  id: string                       // UUID
  tile_id: string                  // FK to battleship_bingo_tiles (CASCADE DELETE)
  discord_id: string               // Player making progress
  progress_amount: number          // Absolute progress (e.g., 50 kills)
  progress_percentage: number      // Percentage complete (0-100)
  contribution_type: string | null // Type of contribution
  current_best_value: number | null // Best value achieved (for PB tasks)
  proof_url: string | null         // Screenshot of progress
  notes: string | null             // Additional notes
  last_updated: Date
}

/**
 * Battleship Bingo Active Effect
 * 
 * Active buffs and debuffs in the game.
 * 
 * Effect types:
 * - buff: Positive effect (e.g., "2x points", "Extra bomb")
 * - debuff: Negative effect (e.g., "Half points", "Can't claim tiles")
 * 
 * Application targets:
 * - team: Affects entire team
 * - tile: Affects specific tile
 * - player: Affects specific player
 * 
 * Expiration:
 * - expires_at: NULL = permanent, otherwise auto-deactivate at time
 * - is_active: Manual toggle
 */
export interface BattleshipBingoActiveEffect {
  id: string                       // UUID
  event_id: string                 // FK to battleship_bingo_events (CASCADE DELETE)
  effect_id: string                // Reference to effect definition in rules_config
  type: 'buff' | 'debuff'
  applied_to_type: 'team' | 'tile' | 'player'
  applied_to_id: string            // ID of target (team_id, tile_id, or discord_id)
  triggered_by_tile_id: string | null // FK to battleship_bingo_tiles
  triggered_by_discord_id: string | null
  is_active: boolean               // Is effect currently active?
  expires_at: Date | null          // NULL = permanent
  activated_at: Date
  deactivated_at: Date | null
  metadata: any                    // JSONB - Effect-specific data
}

/**
 * Battleship Bingo Bomb Action
 * 
 * Audit trail of all bombing attempts.
 * 
 * Results:
 * - hit: Hit an enemy ship segment
 * - miss: No ship at that location
 * - sunk_ship: Hit the last segment, ship sunk
 * - blocked: Bomb was blocked (e.g., by shield buff)
 * 
 * Points awarded:
 * - Depends on result and game rules
 * - e.g., 100 points for hit, 500 for sink
 */
export interface BattleshipBingoBombAction {
  id: string                       // UUID
  event_id: string                 // FK to battleship_bingo_events (CASCADE DELETE)
  bombing_team_id: string          // FK to teams (CASCADE DELETE)
  target_coordinate: string        // Where bomb was dropped
  bombed_by_discord_id: string     // Player who dropped bomb
  result: 'hit' | 'miss' | 'sunk_ship' | 'blocked'
  ship_id: string | null           // FK to battleship_bingo_ships (if hit)
  points_awarded: number           // Points earned from bomb
  bombed_at: Date
  metadata: any                    // JSONB - Additional bomb data
}

/**
 * Event Log (Audit Trail)
 * 
 * Comprehensive audit trail for all event actions.
 * Essential for debugging, dispute resolution, and analysis.
 * 
 * Action types (examples):
 * - 'tile_claimed'
 * - 'tile_completed'
 * - 'tile_bombed'
 * - 'ship_placed'
 * - 'ship_sunk'
 * - 'buff_activated'
 * - 'team_created'
 * - etc.
 * 
 * Details (JSONB):
 * - Flexible structure containing all relevant data
 * - e.g., { tile_id, previous_status, new_status, points_awarded }
 */
export interface EventLog {
  id: string                       // UUID
  event_id: string                 // FK to game_events (CASCADE DELETE)
  action_type: string              // Type of action
  actor_discord_id: string | null  // Who performed the action
  team_id: string | null           // FK to teams (if team action)
  details: any                     // JSONB - Full action details
  created_at: Date
}


