/**
 * Board Initialization Service
 * Handles automatic board creation for teams when events are activated
 */

import { query } from '../../../db/connection.js'

/**
 * Initialize boards for all teams in an event
 * Creates a board for each team based on the event's generic board config
 */
export async function initializeBoardsForEvent(eventId: string): Promise<void> {
  try {
    // Get event config
    const events = await query('SELECT config FROM events WHERE id = $1', [eventId])
    if (events.length === 0) {
      throw new Error(`Event ${eventId} not found`)
    }

    const eventConfig = events[0].config || {}
    const genericBoard = eventConfig.board || {}

    // Get all teams for this event
    const teams = await query('SELECT id FROM event_teams WHERE event_id = $1', [eventId])

    if (teams.length === 0) {
      console.log(`[BoardInitialization] No teams found for event ${eventId}, skipping board creation`)
      return
    }

    console.log(`[BoardInitialization] Creating boards for ${teams.length} teams in event ${eventId}`)

    // Create board for each team
    for (const team of teams) {
      await createBoardForTeam(eventId, team.id, genericBoard)
    }

    console.log(`[BoardInitialization] Successfully created boards for all teams`)
  } catch (error) {
    console.error(`[BoardInitialization] Error initializing boards for event ${eventId}:`, error)
    throw error
  }
}

/**
 * Create a board for a specific team from generic board config
 */
async function createBoardForTeam(
  eventId: string,
  teamId: string,
  genericBoard: Record<string, any>
): Promise<void> {
  // Check if board already exists
  const existing = await query(
    'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
    [eventId, teamId]
  )

  if (existing.length > 0) {
    console.log(`[BoardInitialization] Board already exists for team ${teamId}, skipping`)
    return
  }

  // Get team name for board name
  const teams = await query('SELECT name FROM event_teams WHERE id = $1', [teamId])
  const teamName = teams.length > 0 ? teams[0].name : 'Team'

  // Create board metadata with show_tile_buffs setting
  const boardMetadata = {
    ...(genericBoard.metadata || {}),
    show_tile_buffs: genericBoard.metadata?.show_tile_buffs !== false
  }

  // Create board
  const boardResult = await query(`
    INSERT INTO bingo_boards (
      event_id, team_id, name, description, columns, rows, show_row_column_buffs, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    eventId,
    teamId,
    genericBoard.name ? `${genericBoard.name} - ${teamName}` : `${teamName} Board`,
    genericBoard.description || null,
    genericBoard.columns || 7,
    genericBoard.rows || 7,
    genericBoard.show_row_column_buffs || false,
    JSON.stringify(boardMetadata)
  ])

  const boardId = boardResult[0].id

  // Create tiles from generic board config
  if (genericBoard.tiles && Array.isArray(genericBoard.tiles)) {
    for (const tile of genericBoard.tiles) {
      await query(`
        INSERT INTO bingo_board_tiles (board_id, tile_id, position, custom_points, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (board_id, position) DO NOTHING
      `, [
        boardId,
        tile.tile_id,
        tile.position,
        tile.custom_points || null,
        JSON.stringify(tile.metadata || {})
      ])
    }
    console.log(`[BoardInitialization] Created ${genericBoard.tiles.length} tiles for team ${teamId}`)
  }

  // Create row effects from generic board config
  if (genericBoard.row_effects && Array.isArray(genericBoard.row_effects)) {
    for (const effect of genericBoard.row_effects) {
      await query(`
        INSERT INTO bingo_board_line_effects (
          board_id, line_type, line_identifier, buff_debuff_id,
          applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, 'row', $2, $3, NULL, $4, CURRENT_TIMESTAMP, $5, $6)
        ON CONFLICT (board_id, line_type, line_identifier, buff_debuff_id) DO NOTHING
      `, [
        boardId,
        effect.row_number?.toString() || effect.row?.toString(),
        effect.buff_debuff_id,
        effect.is_active !== false,
        effect.expires_at || null,
        JSON.stringify(effect.metadata || {})
      ])
    }
  }

  // Create column effects from generic board config
  if (genericBoard.column_effects && Array.isArray(genericBoard.column_effects)) {
    for (const effect of genericBoard.column_effects) {
      await query(`
        INSERT INTO bingo_board_line_effects (
          board_id, line_type, line_identifier, buff_debuff_id,
          applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, 'column', $2, $3, NULL, $4, CURRENT_TIMESTAMP, $5, $6)
        ON CONFLICT (board_id, line_type, line_identifier, buff_debuff_id) DO NOTHING
      `, [
        boardId,
        effect.column_letter || effect.column,
        effect.buff_debuff_id,
        effect.is_active !== false,
        effect.expires_at || null,
        JSON.stringify(effect.metadata || {})
      ])
    }
  }

  // Create tile effects from generic board config
  if (genericBoard.tile_effects && Array.isArray(genericBoard.tile_effects)) {
    // First get all board tiles to map positions to IDs
    const boardTiles = await query(
      'SELECT id, position FROM bingo_board_tiles WHERE board_id = $1',
      [boardId]
    )
    const positionToTileId = new Map(boardTiles.map((t: any) => [t.position, t.id]))

    for (const effect of genericBoard.tile_effects) {
      const tileId = positionToTileId.get(effect.tile_position || effect.position)
      if (!tileId) {
        console.warn(`[BoardInitialization] Tile at position ${effect.tile_position || effect.position} not found, skipping effect`)
        continue
      }

      await query(`
        INSERT INTO bingo_board_tile_effects (
          board_tile_id, buff_debuff_id, applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, $2, NULL, $3, CURRENT_TIMESTAMP, $4, $5)
        ON CONFLICT (board_tile_id, buff_debuff_id) DO NOTHING
      `, [
        tileId,
        effect.buff_debuff_id,
        effect.is_active !== false,
        effect.expires_at || null,
        JSON.stringify(effect.metadata || {})
      ])
    }
  }

  console.log(`[BoardInitialization] Successfully created board for team ${teamId}`)
}

