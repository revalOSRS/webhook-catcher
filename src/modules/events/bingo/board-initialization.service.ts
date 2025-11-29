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
  console.log(`[BoardInitialization] Starting initialization for event ${eventId}`)
  
  // Get event config
  const events = await query('SELECT config FROM events WHERE id = $1', [eventId])
  if (events.length === 0) {
    throw new Error(`Event ${eventId} not found`)
  }

  const eventConfig = events[0].config || {}
  const genericBoard = eventConfig.board || {}

  // Get all teams for this event
  console.log(`[BoardInitialization] Querying teams for event ${eventId}`)
  const teams = await query('SELECT id, name FROM event_teams WHERE event_id = $1', [eventId])
  console.log(`[BoardInitialization] Teams query returned ${teams.length} teams:`, JSON.stringify(teams.map((t: any) => ({ id: t.id, name: t.name }))))

  if (teams.length === 0) {
    console.log(`[BoardInitialization] No teams found for event ${eventId}, skipping board creation`)
    return
  }

  console.log(`[BoardInitialization] Found ${teams.length} teams for event ${eventId}`)

  // Process each team one by one
  for (const team of teams) {
    console.log(`[BoardInitialization] ===== STARTING TEAM ${team.name || team.id} (${team.id}) =====`)
    
    try {
      await createBoardForTeam(eventId, team.id, team.name, genericBoard)
      console.log(`[BoardInitialization] ✓✓✓ SUCCESS team ${team.name || team.id} ✓✓✓`)
    } catch (error: any) {
      console.error(`[BoardInitialization] ✗✗✗ FAILED team ${team.name || team.id} ✗✗✗`)
      console.error(`[BoardInitialization] Error details:`, error)
      console.error(`[BoardInitialization] Error message:`, error?.message)
      console.error(`[BoardInitialization] Error stack:`, error?.stack)
      // Continue with next team
    }
    console.log(`[BoardInitialization] ===== FINISHED TEAM ${team.name || team.id} =====`)
  }

  console.log(`[BoardInitialization] Finished initialization for event ${eventId}`)
}

/**
 * Create a board for a specific team from generic board config
 */
async function createBoardForTeam(
  eventId: string,
  teamId: string,
  teamName: string | null,
  genericBoard: Record<string, any>
): Promise<void> {
  console.log(`[BoardInitialization] [${teamId}] Starting`)

  // Check if board already exists
  const existing = await query(
    'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
    [eventId, teamId]
  )

  if (existing.length > 0) {
    console.log(`[BoardInitialization] [${teamId}] Board already exists, skipping`)
    return
  }

  // Create board metadata
  const boardMetadata = {
    ...(genericBoard.metadata || {}),
    show_tile_buffs: genericBoard.metadata?.show_tile_buffs !== false
  }

  // Create board
  console.log(`[BoardInitialization] [${teamId}] Creating board with INSERT query`)
  console.log(`[BoardInitialization] [${teamId}] Event ID: ${eventId}, Team ID: ${teamId}`)
  
  let boardId: string
  try {
    const boardResult = await query(`
      INSERT INTO bingo_boards (
        event_id, team_id, name, description, columns, rows, show_row_column_buffs, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      eventId,
      teamId,
      genericBoard.name ? `${genericBoard.name} - ${teamName || 'Team'}` : `${teamName || 'Team'} Board`,
      genericBoard.description || null,
      genericBoard.columns || 7,
      genericBoard.rows || 7,
      genericBoard.show_row_column_buffs || false,
      JSON.stringify(boardMetadata)
    ])

    console.log(`[BoardInitialization] [${teamId}] INSERT query completed, result:`, JSON.stringify(boardResult))

    if (!boardResult || boardResult.length === 0) {
      throw new Error(`Failed to create board - no result returned`)
    }

    boardId = boardResult[0].id
    console.log(`[BoardInitialization] [${teamId}] ✓✓✓ Board INSERTED successfully: ${boardId} ✓✓✓`)
  } catch (error: any) {
    console.error(`[BoardInitialization] [${teamId}] ✗✗✗ INSERT FAILED ✗✗✗`)
    console.error(`[BoardInitialization] [${teamId}] Error:`, error)
    console.error(`[BoardInitialization] [${teamId}] Error message:`, error?.message)
    throw error
  }

  // Create tiles one by one
  if (genericBoard.tiles && Array.isArray(genericBoard.tiles) && genericBoard.tiles.length > 0) {
    console.log(`[BoardInitialization] [${teamId}] Creating ${genericBoard.tiles.length} tiles`)
    
    for (const tile of genericBoard.tiles) {
      if (!tile.tile_id || !tile.position) {
        console.warn(`[BoardInitialization] [${teamId}] Skipping tile - missing tile_id or position`)
        continue
      }

      // Check if tile exists in library
      const tileExists = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tile.tile_id])
      if (tileExists.length === 0) {
        console.warn(`[BoardInitialization] [${teamId}] Skipping tile - tile ${tile.tile_id} not found in library`)
        continue
      }

      // Insert tile
      const result = await query(`
        INSERT INTO bingo_board_tiles (board_id, tile_id, position, custom_points, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (board_id, position) DO NOTHING
        RETURNING id
      `, [
        boardId,
        tile.tile_id,
        tile.position,
        tile.custom_points || null,
        JSON.stringify(tile.metadata || {})
      ])

      if (result && result.length > 0) {
        console.log(`[BoardInitialization] [${teamId}] Created tile: ${tile.position}`)
      } else {
        console.log(`[BoardInitialization] [${teamId}] Skipped tile: ${tile.position} (conflict)`)
      }
    }
  } else {
    console.log(`[BoardInitialization] [${teamId}] No tiles to create`)
  }

  // Create row effects one by one
  if (genericBoard.row_effects && Array.isArray(genericBoard.row_effects)) {
    console.log(`[BoardInitialization] [${teamId}] Creating ${genericBoard.row_effects.length} row effects`)
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

  // Create column effects one by one
  if (genericBoard.column_effects && Array.isArray(genericBoard.column_effects)) {
    console.log(`[BoardInitialization] [${teamId}] Creating ${genericBoard.column_effects.length} column effects`)
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

  // Create tile effects one by one
  if (genericBoard.tile_effects && Array.isArray(genericBoard.tile_effects)) {
    console.log(`[BoardInitialization] [${teamId}] Creating ${genericBoard.tile_effects.length} tile effects`)
    
    // Get all board tiles first
    const boardTiles = await query(
      'SELECT id, position FROM bingo_board_tiles WHERE board_id = $1',
      [boardId]
    )
    const positionToTileId = new Map(boardTiles.map((t: any) => [t.position, t.id]))

    for (const effect of genericBoard.tile_effects) {
      const tileId = positionToTileId.get(effect.tile_position || effect.position)
      if (!tileId) {
        console.warn(`[BoardInitialization] [${teamId}] Tile at position ${effect.tile_position || effect.position} not found, skipping effect`)
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

  console.log(`[BoardInitialization] [${teamId}] Finished`)
}
