/**
 * Tile Progress Service
 * Main service for tracking bingo tile progress from game events
 */

import { query } from '../../../db/connection.js'
import { adaptDinkEvent } from './adapters/dink.adapter.js'
import { matchesRequirement } from './matchers/requirement-matcher.js'
import { calculateItemDropProgress } from './calculators/item-drop.calculator.js'
import { calculatePetProgress } from './calculators/pet.calculator.js'
import { calculateValueDropProgress } from './calculators/value-drop.calculator.js'
import { calculateSpeedrunProgress } from './calculators/speedrun.calculator.js'
import { calculateBaGamblesProgress } from './calculators/ba-gambles.calculator.js'
import { calculateExperienceProgress } from './calculators/experience.calculator.js'
import type { UnifiedGameEvent } from './types/unified-event.types.js'
import type { DinkEvent } from '../../dink/events/event.js'
import type { 
  TileRequirements, 
  SimplifiedRequirement,
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  ExperienceRequirement,
  BaGamblesRequirement,
  TieredRequirement
} from '../../../types/bingo-requirements.js'

interface BoardTile {
  board_tile_id: string
  board_id: string
  tile_id: string
  team_id: string
  event_id: string
  event_start_date: Date
  requirements: TileRequirements
  is_completed: boolean
}

/**
 * Process a Dink event and update tile progress
 */
export async function processDinkEventForTileProgress(dinkEvent: DinkEvent): Promise<void> {
  try {
    // Convert Dink event to unified format
    const unifiedEvent = await adaptDinkEvent(dinkEvent)
    if (!unifiedEvent) {
      // Event type not supported for bingo tracking
      return
    }

    // Process the unified event
    await processUnifiedEvent(unifiedEvent)
  } catch (error) {
    console.error('[TileProgressService] Error processing Dink event:', error)
    throw error
  }
}

/**
 * Process a unified game event
 */
async function processUnifiedEvent(event: UnifiedGameEvent): Promise<void> {
  // Get active events and board tiles for this player
  const boardTiles = await getActiveBoardTilesForPlayer(event)
  
  if (boardTiles.length === 0) {
    // Player not in any active events or no matching tiles
    return
  }

  // Process each matching tile
  for (const tile of boardTiles) {
    // Check if event matches tile requirements
    if (!matchesRequirement(event, tile.requirements)) {
      continue
    }

    // Check if tile is already completed
    if (tile.is_completed) {
      continue
    }

    // Calculate and update progress
    await updateTileProgress(event, tile)
  }
}

/**
 * Get active board tiles for a player
 */
async function getActiveBoardTilesForPlayer(event: UnifiedGameEvent): Promise<BoardTile[]> {
  // Get OSRS account ID if available
  let osrsAccountId: number | undefined = event.osrsAccountId
  
  // If not available, try to get from player name
  if (!osrsAccountId && event.playerName) {
    const accounts = await query(
      'SELECT id FROM osrs_accounts WHERE name = $1 LIMIT 1',
      [event.playerName]
    )
    osrsAccountId = accounts.length > 0 ? accounts[0].id : undefined
  }

  // Get team memberships for this OSRS account
  let teamMemberships: Array<{ team_id: string; event_id: string; event_start_date: Date }> = []
  
  if (osrsAccountId) {
    const memberships = await query(`
      SELECT DISTINCT
        et.id as team_id,
        e.id as event_id,
        e.start_date as event_start_date
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.status = 'active'
        AND (e.start_date IS NULL OR e.start_date <= NOW())
        AND (e.end_date IS NULL OR e.end_date > NOW())
    `, [osrsAccountId])
    
    teamMemberships = memberships.map((m: any) => ({
      team_id: m.team_id,
      event_id: m.event_id,
      event_start_date: m.event_start_date || new Date()
    }))
  }

  if (teamMemberships.length === 0) {
    return []
  }

  // Get board tiles for these teams
  const teamIds = teamMemberships.map(m => m.team_id)
  const tiles = await query(`
    SELECT
      bbt.id as board_tile_id,
      bbt.board_id,
      bbt.tile_id,
      bbt.is_completed,
      bb.team_id,
      bt.requirements
    FROM bingo_board_tiles bbt
    JOIN bingo_boards bb ON bbt.board_id = bb.id
    JOIN bingo_tiles bt ON bbt.tile_id = bt.id
    WHERE bb.team_id = ANY($1::uuid[])
      AND bbt.is_completed = false
  `, [teamIds])

  // Map to BoardTile format with event info
  return tiles.map((tile: any) => {
    const membership = teamMemberships.find(m => m.team_id === tile.team_id)
    return {
      board_tile_id: tile.board_tile_id,
      board_id: tile.board_id,
      tile_id: tile.tile_id,
      team_id: tile.team_id,
      event_id: membership?.event_id || '',
      event_start_date: membership?.event_start_date || new Date(),
      requirements: tile.requirements,
      is_completed: tile.is_completed
    }
  })
}

/**
 * Update tile progress
 */
async function updateTileProgress(event: UnifiedGameEvent, tile: BoardTile): Promise<void> {
  // Get existing progress
  const existingProgress = await getExistingProgress(tile.board_tile_id, event.osrsAccountId)
  
  // Calculate new progress based on requirement type
  const progressUpdate = await calculateProgress(event, tile.requirements, existingProgress, tile.event_start_date)
  
  // Update or insert progress
  if (existingProgress) {
    await updateProgress(tile.board_tile_id, event.osrsAccountId, progressUpdate)
  } else {
    await insertProgress(tile.board_tile_id, tile.team_id, event.osrsAccountId, progressUpdate)
  }

  // Check if tile should be marked as completed
  if (progressUpdate.isCompleted) {
    await markTileCompleted(tile.board_tile_id, event.osrsAccountId, 'auto')
  }
}

/**
 * Calculate progress based on requirement type
 */
async function calculateProgress(
  event: UnifiedGameEvent,
  requirements: TileRequirements,
  existing: { progressValue: number; metadata: Record<string, any> } | null,
  eventStartDate: Date
): Promise<any> {
  // Handle tiered requirements
  if (requirements.tiers && requirements.tiers.length > 0) {
    // Check each tier and calculate progress
    for (const tier of requirements.tiers) {
      if (matchesRequirement(event, { match_type: 'all', requirements: [], tiers: [tier] })) {
        return await calculateRequirementProgress(event, tier.requirement, existing, eventStartDate, tier)
      }
    }
    // If no tier matches, return existing progress
    return {
      progressValue: existing?.progressValue || 0,
      metadata: existing?.metadata || {},
      isCompleted: false
    }
  }

  // Handle regular requirements
  if (requirements.requirements && requirements.requirements.length > 0) {
    // For 'all' match type, we need all requirements to progress
    // For 'any' match type, any requirement can progress
    // For simplicity, we'll process the first matching requirement
    for (const req of requirements.requirements) {
      if (matchesRequirement(event, { match_type: 'all', requirements: [req], tiers: [] })) {
        return await calculateRequirementProgress(event, req, existing, eventStartDate)
      }
    }
  }

  return {
    progressValue: existing?.progressValue || 0,
    metadata: existing?.metadata || {},
    isCompleted: false
  }
}

/**
 * Calculate progress for a specific requirement
 */
async function calculateRequirementProgress(
  event: UnifiedGameEvent,
  requirement: SimplifiedRequirement | TieredRequirement,
  existing: { progressValue: number; metadata: Record<string, any> } | null,
  eventStartDate: Date,
  tier?: TieredRequirement
): Promise<any> {
  const req = 'requirement' in requirement ? requirement.requirement : requirement

  switch (req.type) {
    case 'ITEM_DROP':
      return calculateItemDropProgress(event, req as ItemDropRequirement, existing)
    case 'PET':
      return calculatePetProgress(event, req as PetRequirement, existing)
    case 'VALUE_DROP':
      return calculateValueDropProgress(event, req as ValueDropRequirement, existing)
    case 'SPEEDRUN':
      return calculateSpeedrunProgress(event, tier || req as SpeedrunRequirement, existing)
    case 'BA_GAMBLES':
      return calculateBaGamblesProgress(event, req as BaGamblesRequirement, existing)
    case 'EXPERIENCE':
      return await calculateExperienceProgress(event, req as ExperienceRequirement, existing, eventStartDate)
    default:
      return {
        progressValue: existing?.progressValue || 0,
        metadata: existing?.metadata || {},
        isCompleted: false
      }
  }
}

/**
 * Get existing progress for a tile
 */
async function getExistingProgress(
  boardTileId: string,
  osrsAccountId: number | undefined
): Promise<{ progressValue: number; metadata: Record<string, any> } | null> {
  const result = await query(`
    SELECT progress_value, progress_metadata
    FROM bingo_tile_progress
    WHERE board_tile_id = $1 
      AND (osrs_account_id = $2 OR (osrs_account_id IS NULL AND $2 IS NULL))
    LIMIT 1
  `, [boardTileId, osrsAccountId || null])

  if (result.length === 0) {
    return null
  }

  return {
    progressValue: parseFloat(result[0].progress_value) || 0,
    metadata: result[0].progress_metadata || {}
  }
}

/**
 * Insert new progress
 */
async function insertProgress(
  boardTileId: string,
  teamId: string,
  osrsAccountId: number | undefined,
  progressUpdate: any
): Promise<void> {
  await query(`
    INSERT INTO bingo_tile_progress (
      board_tile_id,
      osrs_account_id,
      progress_value,
      progress_metadata
    ) VALUES ($1, $2, $3, $4)
  `, [
    boardTileId,
    osrsAccountId || null,
    progressUpdate.progressValue,
    JSON.stringify(progressUpdate.metadata)
  ])
}

/**
 * Update existing progress
 */
async function updateProgress(
  boardTileId: string,
  osrsAccountId: number | undefined,
  progressUpdate: any
): Promise<void> {
  await query(`
    UPDATE bingo_tile_progress
    SET 
      progress_value = $1,
      progress_metadata = $2,
      recorded_at = CURRENT_TIMESTAMP
    WHERE board_tile_id = $3 
      AND (osrs_account_id = $4 OR (osrs_account_id IS NULL AND $4 IS NULL))
  `, [
    progressUpdate.progressValue,
    JSON.stringify(progressUpdate.metadata),
    boardTileId,
    osrsAccountId || null
  ])
}

/**
 * Mark tile as completed
 */
async function markTileCompleted(
  boardTileId: string,
  osrsAccountId: number | undefined,
  completionType: 'auto' | 'manual_admin'
): Promise<void> {
  // Update tile progress with completion info
  await query(`
    UPDATE bingo_tile_progress
    SET 
      completion_type = $1,
      completed_at = CURRENT_TIMESTAMP,
      completed_by_osrs_account_id = $2
    WHERE board_tile_id = $3 
      AND (osrs_account_id = $4 OR (osrs_account_id IS NULL AND $4 IS NULL))
  `, [completionType, osrsAccountId || null, boardTileId, osrsAccountId || null])

  // Mark board tile as completed (only if not already completed)
  await query(`
    UPDATE bingo_board_tiles
    SET 
      is_completed = true,
      completed_at = CURRENT_TIMESTAMP,
      completed_by_team_id = (
        SELECT team_id FROM bingo_boards WHERE id = (
          SELECT board_id FROM bingo_board_tiles WHERE id = $1
        )
      )
    WHERE id = $1 AND is_completed = false
  `, [boardTileId])
}

