/**
 * Bingo Service
 * Bingo tile matching and progress tracking
 */
import * as db from '../../../db/connection.js';
/**
 * Bingo Service Class
 * Handles bingo tile matching, progress tracking, and related business logic
 */
export class BingoService {
    /**
     * Process RuneLite event and check if it matches any active bingo tiles
     */
    static async processRuneLiteEventForBingo(event) {
        try {
            // TODO: RuneLiteEvent is currently SyncEventPayload which doesn't have member_id, timestamp, or data
            // This service needs to be refactored to work with the actual RuneLite event structure
            // For now, return early as this needs proper implementation
            console.warn('[BingoService] processRuneLiteEventForBingo not yet implemented for new event structure');
            return { matched: false, message: 'Bingo event processing not yet implemented for new event structure' };
        }
        catch (error) {
            console.error('Error processing bingo event:', error);
            throw error;
        }
    }
    // ============================================================================
    // Event Matching
    // ============================================================================
    /**
     * Check if a RuneLite event matches tile requirements
     * TODO: Refactor to use new simplified requirement system (TileRequirements)
     */
    static isEventMatch(event, requirements) {
        // TODO: Implement matching logic for new requirement system
        // This needs to be rewritten to work with:
        // - match_type ('all' | 'any')
        // - requirements array (SimplifiedRequirement[])
        // - tiers array (TieredRequirement[])
        return false;
    }
    // TODO: Re-implement matching functions for new simplified requirement types:
    // - ITEM_DROP
    // - PET
    // - VALUE_DROP
    // - SPEEDRUN
    // ============================================================================
    // Progress Tracking
    // ============================================================================
    /**
     * Get active board tiles for a player
     */
    static async getActiveBoardTilesForPlayer(memberId) {
        const query = `
      SELECT
        bbt.board_id,
        bbt.tile_id,
        bbt.position,
        bbt.is_completed,
        bt.id,
        bt.task,
        bt.requirements,
        bt.base_points
      FROM bingo_board_tiles bbt
      INNER JOIN bingo_tiles bt ON bt.id = bbt.tile_id
      INNER JOIN bingo_boards bb ON bb.id = bbt.board_id
      INNER JOIN events e ON e.id = bb.event_id
      INNER JOIN event_team_members etm ON etm.event_id = e.id
      WHERE etm.member_id = $1
        AND e.status = 'active'
        AND bbt.is_completed = false
    `;
        const results = await db.query(query, [memberId]);
        return results.map(row => ({
            board_id: row.board_id,
            tile_id: row.tile_id,
            position: row.position,
            is_completed: row.is_completed,
            tile: {
                id: row.id,
                task: row.task,
                requirements: row.requirements,
                base_points: row.base_points
            }
        }));
    }
    /**
     * Update tile progress for a player
     * This is where the magic happens - tracks progress incrementally
     */
    static async updateTileProgress(boardId, tileId, position, memberId, event, requirements) {
        // Get current progress
        const existingProgress = await db.query(`
      SELECT
        progress_value,
        metadata
      FROM bingo_tile_progress
      WHERE board_id = $1
        AND tile_id = $2
        AND position = $3
        AND member_id = $4
    `, [boardId, tileId, position, memberId]);
        // Get tile definition to access bonus_tiers and base_points
        const tileData = await db.query(`
      SELECT base_points, bonus_tiers
      FROM bingo_tiles
      WHERE id = $1
    `, [tileId]);
        const basePoints = tileData[0]?.base_points || 0;
        const bonusTiers = tileData[0]?.bonus_tiers || [];
        // Calculate new progress based on requirement type
        const progressData = this.calculateProgress(event, requirements, bonusTiers, basePoints, existingProgress.length > 0 ? existingProgress[0] : null);
        // Update or insert progress
        if (existingProgress.length > 0) {
            await db.query(`
        UPDATE bingo_tile_progress
        SET
          progress_value = $1,
          metadata = $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE board_id = $3
          AND tile_id = $4
          AND position = $5
          AND member_id = $6
      `, [
                progressData.progress,
                JSON.stringify(progressData.metadata),
                boardId,
                tileId,
                position,
                memberId
            ]);
        }
        else {
            await db.query(`
        INSERT INTO bingo_tile_progress (
          board_id, tile_id, position, member_id,
          progress_value, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `, [
                boardId,
                tileId,
                position,
                memberId,
                progressData.progress,
                JSON.stringify(progressData.metadata)
            ]);
        }
        // If tile is now completed, update the board tile
        if (progressData.completed && !existingProgress[0]?.is_completed) {
            await this.completeTile(boardId, tileId, position, memberId);
        }
        return {
            progress: progressData.progress,
            count: progressData.count,
            target: progressData.target,
            completed: progressData.completed,
            metadata: progressData.metadata
        };
    }
    /**
     * Calculate progress based on event and requirement type
     */
    static calculateProgress(event, requirements, bonusTiers, basePoints, existingProgress) {
        // TODO: Re-implement progress calculation for new simplified requirement system
        // This needs to handle:
        // - match_type ('all' | 'any')
        // - requirements array (SimplifiedRequirement[])
        // - tiers array (TieredRequirement[])
        // - Requirement types: ITEM_DROP, PET, VALUE_DROP, SPEEDRUN
        const metadata = existingProgress?.metadata || {};
        return {
            progress: 0,
            count: 0,
            target: 1,
            completed: false,
            metadata: { ...metadata }
        };
    }
    // TODO: Re-implement for new requirement system
    static calculateBossKillProgress(event, requirements, metadata) {
        const currentCount = metadata.kill_count || 0;
        const newCount = currentCount + 1;
        const targetCount = requirements.count;
        const newProgress = Math.min((newCount / targetCount) * 100, 100);
        return {
            progress: newProgress,
            count: newCount,
            target: targetCount,
            completed: newProgress >= 100,
            metadata: {
                ...metadata,
                kill_count: newCount,
                last_kill_at: event.eventTimestamp,
                kills: [
                    ...(metadata.kills || []),
                    {
                        timestamp: event.eventTimestamp,
                        count: newCount
                    }
                ]
            }
        };
    }
    // TODO: Re-implement for new requirement system
    static calculateItemProgress(event, requirements, bonusTiers, metadata) {
        // TODO: SyncEventPayload doesn't have a data property
        const eventData = {};
        const items = eventData.items || [];
        // Initialize obtained items tracking
        const obtainedItems = metadata.obtained_items || {};
        // Track which required items were obtained in this event
        requirements.items.forEach(reqItem => {
            const foundItem = items.find((item) => item.id === reqItem.item_id);
            if (foundItem) {
                const currentQty = obtainedItems[reqItem.item_id]?.quantity || 0;
                const newQty = currentQty + foundItem.quantity;
                obtainedItems[reqItem.item_id] = {
                    item_id: reqItem.item_id,
                    item_name: reqItem.item_name,
                    quantity: newQty,
                    required: reqItem.quantity || 1,
                    last_obtained_at: event.eventTimestamp
                };
            }
        });
        // Calculate progress based on match type
        let progress = 0;
        let completed = false;
        let itemsCompleted = 0;
        if (requirements.match_type === 'any') {
            // Need ANY one item
            completed = requirements.items.some(reqItem => {
                const obtained = obtainedItems[reqItem.item_id];
                return obtained && obtained.quantity >= (reqItem.quantity || 1);
            });
            progress = completed ? 100 : 0;
            itemsCompleted = completed ? 1 : 0;
        }
        else {
            // Need ALL items
            const totalRequired = requirements.items.length;
            itemsCompleted = requirements.items.filter(reqItem => {
                const obtained = obtainedItems[reqItem.item_id];
                return obtained && obtained.quantity >= (reqItem.quantity || 1);
            }).length;
            progress = (itemsCompleted / totalRequired) * 100;
            completed = progress >= 100;
        }
        // Calculate bonus tier points
        let bonusPoints = 0;
        const tiersAchieved = [];
        if (bonusTiers && bonusTiers.length > 0) {
            for (const tier of bonusTiers) {
                if (itemsCompleted >= tier.requirementValue) {
                    tiersAchieved.push({
                        threshold: tier.threshold,
                        points: tier.points,
                        achieved_at: event.eventTimestamp
                    });
                    bonusPoints += tier.points;
                }
            }
        }
        return {
            progress,
            count: Object.keys(obtainedItems).length,
            target: requirements.items.length,
            completed,
            metadata: {
                ...metadata,
                obtained_items: obtainedItems,
                last_drop_at: event.eventTimestamp,
                tiers_achieved: tiersAchieved,
                bonus_points: bonusPoints,
                total_points: (metadata.base_points || 0) + bonusPoints
            }
        };
    }
    // TODO: Re-implement for new requirement system
    static calculateXpProgress(event, requirements, bonusTiers, metadata) {
        // TODO: SyncEventPayload doesn't have a data property
        const eventData = {};
        const xpGained = eventData.xp_gained || 0;
        const currentXp = metadata.total_xp_gained || 0;
        const newXp = currentXp + xpGained;
        const targetXp = requirements.amount;
        const newProgress = Math.min((newXp / targetXp) * 100, 100);
        // Calculate bonus tier points
        let bonusPoints = 0;
        const tiersAchieved = [];
        if (bonusTiers && bonusTiers.length > 0) {
            for (const tier of bonusTiers) {
                if (newXp >= tier.requirementValue) {
                    // Check if this tier was already achieved
                    const alreadyAchieved = metadata.tiers_achieved?.some((t) => t.requirementValue === tier.requirementValue);
                    if (!alreadyAchieved) {
                        tiersAchieved.push({
                            threshold: tier.threshold,
                            points: tier.points,
                            requirementValue: tier.requirementValue,
                            achieved_at: event.eventTimestamp
                        });
                    }
                    bonusPoints += tier.points;
                }
            }
        }
        return {
            progress: newProgress,
            count: newXp,
            target: targetXp,
            completed: newProgress >= 100,
            metadata: {
                ...metadata,
                total_xp_gained: newXp,
                last_xp_gain: xpGained,
                last_xp_at: event.eventTimestamp,
                tiers_achieved: [
                    ...(metadata.tiers_achieved || []),
                    ...tiersAchieved
                ],
                bonus_points: bonusPoints,
                total_points: (metadata.base_points || 0) + bonusPoints
            }
        };
    }
    // TODO: Re-implement for new requirement system
    static calculateBossSpeedrunProgress(event, requirements, bonusTiers, basePoints, metadata) {
        // TODO: SyncEventPayload doesn't have a data property
        const eventData = {};
        const killTimeSeconds = eventData.kill_time_seconds;
        const currentBest = metadata.best_time_seconds || Infinity;
        // Only update if this is a new best time OR first completion
        if (killTimeSeconds >= currentBest && currentBest !== Infinity) {
            // Not a new best, return existing progress with incremented kill count
            return {
                progress: 100,
                count: 1,
                target: 1,
                completed: true,
                metadata: {
                    ...metadata,
                    kill_count: (metadata.kill_count || 0) + 1,
                    all_attempts: [
                        ...(metadata.all_attempts || []),
                        {
                            time: killTimeSeconds,
                            timestamp: event.eventTimestamp
                        }
                    ]
                }
            };
        }
        // New best time!
        const baseCompleted = killTimeSeconds <= requirements.time_limit_seconds;
        // Calculate which tiers are achieved
        const tiersAchieved = [];
        let bonusPoints = 0;
        if (bonusTiers && bonusTiers.length > 0) {
            for (const tier of bonusTiers) {
                if (killTimeSeconds <= tier.requirementValue) {
                    tiersAchieved.push({
                        threshold: tier.threshold,
                        time_seconds: tier.requirementValue,
                        points: tier.points,
                        achieved_at: event.eventTimestamp
                    });
                    bonusPoints += tier.points;
                }
            }
        }
        return {
            progress: baseCompleted ? 100 : 0,
            count: 1,
            target: 1,
            completed: baseCompleted,
            metadata: {
                best_time_seconds: killTimeSeconds,
                best_time_formatted: this.formatTime(killTimeSeconds),
                kill_count: (metadata.kill_count || 0) + 1,
                achieved_at: event.eventTimestamp,
                previous_best: currentBest !== Infinity ? currentBest : null,
                tiers_achieved: tiersAchieved,
                base_points: baseCompleted ? basePoints : 0,
                bonus_points: bonusPoints,
                total_points: (baseCompleted ? basePoints : 0) + bonusPoints,
                all_attempts: [
                    ...(metadata.all_attempts || []),
                    {
                        time: killTimeSeconds,
                        timestamp: event.eventTimestamp,
                        tiers_achieved: tiersAchieved.length,
                        is_new_best: true
                    }
                ]
            }
        };
    }
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    // TODO: Re-implement for new requirement system
    static calculateResourceProgress(event, requirements, metadata) {
        // TODO: SyncEventPayload doesn't have a data property
        const eventData = {};
        const items = eventData.items || [];
        const foundResource = items.find((item) => item.id === requirements.resource_id);
        const quantityGained = foundResource?.quantity || 0;
        const currentQty = metadata.total_gathered || 0;
        const newQty = currentQty + quantityGained;
        const targetQty = requirements.quantity;
        const newProgress = Math.min((newQty / targetQty) * 100, 100);
        return {
            progress: newProgress,
            count: newQty,
            target: targetQty,
            completed: newProgress >= 100,
            metadata: {
                ...metadata,
                total_gathered: newQty,
                last_gather_amount: quantityGained,
                last_gather_at: event.eventTimestamp
            }
        };
    }
    /**
     * Mark a tile as completed on the board
     */
    static async completeTile(boardId, tileId, position, memberId) {
        await db.query(`
      UPDATE bingo_board_tiles
      SET
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $1
      WHERE board_id = $2
        AND tile_id = $3
        AND position = $4
    `, [memberId, boardId, tileId, position]);
        console.log(`✅ Tile ${tileId} at ${position} completed by member ${memberId}`);
    }
    // ============================================================================
    // Query Functions
    // ============================================================================
    /**
     * Get progress for a specific tile
     */
    static async getTileProgress(boardId, tileId, position) {
        return await db.query(`
      SELECT
        btp.*,
        m.discord_username,
        m.ingame_name
      FROM bingo_tile_progress btp
      INNER JOIN members m ON m.id = btp.member_id
      WHERE btp.board_id = $1
        AND btp.tile_id = $2
        AND btp.position = $3
      ORDER BY btp.progress_value DESC, btp.updated_at DESC
    `, [boardId, tileId, position]);
    }
    /**
     * Get all progress for a player
     */
    static async getPlayerProgress(memberId, boardId) {
        let query = `
      SELECT
        btp.*,
        bt.task,
        bt.category,
        bt.difficulty,
        bbt.is_completed
      FROM bingo_tile_progress btp
      INNER JOIN bingo_tiles bt ON bt.id = btp.tile_id
      INNER JOIN bingo_board_tiles bbt ON
        bbt.board_id = btp.board_id
        AND bbt.tile_id = btp.tile_id
        AND bbt.position = btp.position
      WHERE btp.member_id = $1
    `;
        const params = [memberId];
        if (boardId) {
            query += ` AND btp.board_id = $2`;
            params.push(boardId);
        }
        query += ` ORDER BY btp.updated_at DESC`;
        return await db.query(query, params);
    }
    /**
     * Get team progress summary
     */
    static async getTeamProgress(teamId, boardId) {
        const result = await db.query(`
      SELECT
        COUNT(DISTINCT bbt.position) as total_tiles,
        COUNT(DISTINCT CASE WHEN bbt.is_completed THEN bbt.position END) as completed_tiles,
        SUM(bt.base_points) FILTER (WHERE bbt.is_completed) as total_points,
        AVG(btp.progress_value) as average_progress
      FROM event_teams et
      INNER JOIN event_team_members etm ON etm.team_id = et.id
      LEFT JOIN bingo_tile_progress btp ON btp.member_id = etm.member_id AND btp.board_id = $2
      LEFT JOIN bingo_board_tiles bbt ON
        bbt.board_id = btp.board_id
        AND bbt.position = btp.position
      LEFT JOIN bingo_tiles bt ON bt.id = bbt.tile_id
      WHERE et.id = $1
      GROUP BY et.id
    `, [teamId, boardId]);
        return result[0] || null;
    }
}
// Legacy exports for backward compatibility
export const processRuneLiteEventForBingo = BingoService.processRuneLiteEventForBingo;
export const getTileProgress = BingoService.getTileProgress;
export const getPlayerProgress = BingoService.getPlayerProgress;
export const getTeamProgress = BingoService.getTeamProgress;
