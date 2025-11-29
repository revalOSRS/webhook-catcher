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
export async function processDinkEventForTileProgress(dinkEvent: DinkEvent | any): Promise<void> {
  try {
    console.log(`[TileProgressService] Processing Dink event: ${dinkEvent.type} for player ${dinkEvent.playerName}`)
    
    // Convert Dink event to unified format
    const unifiedEvent = await adaptDinkEvent(dinkEvent)
    if (!unifiedEvent) {
      // Event type not supported for bingo tracking
      console.log(`[TileProgressService] Event type ${dinkEvent.type} not supported for bingo tracking`)
      return
    }

    console.log(`[TileProgressService] Converted to unified event: ${unifiedEvent.eventType}`)
    
    // Process the unified event
    await processUnifiedEvent(unifiedEvent)
    
    console.log(`[TileProgressService] Successfully processed event for ${unifiedEvent.playerName}`)
  } catch (error) {
    console.error('[TileProgressService] Error processing Dink event:', error)
    // Don't throw - we don't want to break the webhook flow
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
    console.log(`[TileProgressService] No active board tiles found for player ${event.playerName} (osrs_account_id: ${event.osrsAccountId})`)
    return
  }

  console.log(`[TileProgressService] Found ${boardTiles.length} board tiles for player ${event.playerName}`)

  // Process each matching tile
  let matchedTiles = 0
  for (const tile of boardTiles) {
    // Check if event matches tile requirements
    if (!matchesRequirement(event, tile.requirements)) {
      continue
    }

    matchedTiles++

    // For tiered requirements, check if all tiers are completed
    // For non-tiered requirements, check if tile is completed
    const hasTiers = tile.requirements.tiers && tile.requirements.tiers.length > 0
    let shouldSkip = false
    
    if (hasTiers) {
      // For tiered tiles, check if all tiers are completed
      const existingProgress = await getExistingProgress(tile.board_tile_id, event.osrsAccountId)
      const completedTiers = existingProgress?.metadata?.completed_tiers || []
      const totalTiers = tile.requirements.tiers.length
      const allTiersCompleted = completedTiers.length === totalTiers
      
      if (allTiersCompleted) {
        console.log(`[TileProgressService] Tile ${tile.tile_id} has all tiers completed, skipping`)
        shouldSkip = true
      } else {
        console.log(`[TileProgressService] Tile ${tile.tile_id} is marked complete but has incomplete tiers (${completedTiers.length}/${totalTiers}), continuing to track`)
      }
    } else {
      // For non-tiered tiles, skip if already completed
      if (tile.is_completed) {
        console.log(`[TileProgressService] Tile ${tile.tile_id} already completed, skipping`)
        shouldSkip = true
      }
    }
    
    if (shouldSkip) {
      continue
    }

    // Calculate and update progress
    await updateTileProgress(event, tile)
  }

  if (matchedTiles > 0) {
    console.log(`[TileProgressService] Matched ${matchedTiles} tiles for event ${event.eventType}`)
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
      'SELECT id FROM osrs_accounts WHERE osrs_nickname = $1 LIMIT 1',
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
    // Track completed tiers from existing metadata
    const completedTiers: number[] = existing?.metadata?.completed_tiers || []
    let updatedMetadata = { ...existing?.metadata }
    let highestTierProgress = existing?.progressValue || 0
    let tierMatched = false
    
    // Check each tier to see if it matches the current event
    for (const tier of requirements.tiers) {
      if (matchesRequirement(event, { match_type: 'all', requirements: [], tiers: [tier] })) {
        // Get tier-specific existing progress (if stored separately)
        const tierExisting = existing?.metadata?.[`tier_${tier.tier}_progress`] !== undefined
          ? { progressValue: existing.metadata[`tier_${tier.tier}_progress`], metadata: existing.metadata[`tier_${tier.tier}_metadata`] || {} }
          : existing
        
        // Calculate progress for this tier
        const tierResult = await calculateRequirementProgress(event, tier.requirement, tierExisting, eventStartDate, tier)
        
        // If this tier is now completed and wasn't before, add it to completed tiers
        if (tierResult.isCompleted && !completedTiers.includes(tier.tier)) {
          completedTiers.push(tier.tier)
          updatedMetadata[`tier_${tier.tier}_completed_at`] = event.timestamp.toISOString()
        }
        
        // Update metadata with tier-specific progress
        updatedMetadata[`tier_${tier.tier}_progress`] = tierResult.progressValue
        updatedMetadata[`tier_${tier.tier}_metadata`] = tierResult.metadata
        
        // Track highest tier progress value
        if (tierResult.progressValue > highestTierProgress) {
          highestTierProgress = tierResult.progressValue
        }
        
        tierMatched = true
        
        // Mark tile as complete when ANY tier is completed (so they get points)
        // But continue tracking all tiers for additional progress
        const tileIsComplete = completedTiers.length > 0 || tierResult.isCompleted
        
        return {
          progressValue: highestTierProgress,
          metadata: {
            ...updatedMetadata,
            ...tierResult.metadata,
            completed_tiers: completedTiers.sort((a, b) => a - b),
            total_tiers: requirements.tiers.length,
            completed_tiers_count: completedTiers.length,
            current_tier: tier.tier,
            current_tier_progress: tierResult.progressValue
          },
          isCompleted: tileIsComplete // Mark complete when ANY tier is done
        }
      }
    }
    
    // If no tier matched but we have existing progress, return it
    if (existing) {
      // Tile is complete if any tier was completed
      const tileIsComplete = completedTiers.length > 0
      return {
        progressValue: existing.progressValue,
        metadata: {
          ...updatedMetadata,
          completed_tiers: completedTiers.sort((a, b) => a - b),
          total_tiers: requirements.tiers.length,
          completed_tiers_count: completedTiers.length
        },
        isCompleted: tileIsComplete // Complete if any tier was completed
      }
    }
    
    // If no tier matches and no existing progress
    return {
      progressValue: 0,
      metadata: {
        completed_tiers: [],
        total_tiers: requirements.tiers.length,
        completed_tiers_count: 0
      },
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

