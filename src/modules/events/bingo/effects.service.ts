/**
 * Bingo Effects Service
 * 
 * Core service for managing bingo board effects.
 * Handles:
 * - Line completion detection
 * - Effect granting when lines are completed
 * - Effect usage (manual activation)
 * - Effect resolution (shields, reflects, etc.)
 * - Logging and history
 */

import { query, queryOne } from '../../../db/connection.js';
import { DiscordNotificationsService } from './discord-notifications.service.js';
import {
  EffectType,
  EffectCategory,
  EffectTarget,
  EffectTrigger,
  EffectSource,
  EarnedEffectStatus,
  EffectAction,
  type EffectDefinition,
  type TeamEarnedEffect,
  type EffectActivationLog,
  type LineCompletion,
  type UseEffectRequest,
  type UseEffectResponse,
  type EffectResultData,
  type TeamEffectState,
  type EarnedEffectMetadata
} from './types/effects.type.js';

/**
 * Service for managing bingo effects
 */
export class EffectsService {
  // ============================================================================
  // LINE COMPLETION DETECTION
  // ============================================================================

  /**
   * Check if any rows or columns are newly completed after a tile completion.
   * Called from tile-progress.service.ts when a tile is marked complete.
   * 
   * @param boardId - The board where the tile was completed
   * @param tilePosition - Position of the completed tile (e.g., "A1", "B3")
   * @returns Array of newly completed lines
   */
  static checkLineCompletions = async (
    boardId: string,
    tilePosition: string
  ): Promise<LineCompletion[]> => {
    const completedLines: LineCompletion[] = [];

    // Get board info
    const board = await queryOne<{ teamId: string; eventId: string; rows: number; columns: number }>(
      'SELECT team_id, event_id, rows, columns FROM bingo_boards WHERE id = $1',
      [boardId]
    );

    if (!board) return completedLines;

    // Parse position (e.g., "A1" -> column "A", row 1)
    const column = tilePosition.charAt(0).toUpperCase();
    const row = parseInt(tilePosition.slice(1), 10);

    // Check row completion
    const rowCompletion = await this.checkRowCompletion(boardId, row, board);
    if (rowCompletion) {
      completedLines.push(rowCompletion);
    }

    // Check column completion
    const columnCompletion = await this.checkColumnCompletion(boardId, column, board);
    if (columnCompletion) {
      completedLines.push(columnCompletion);
    }

    // Process completions - grant effects
    for (const line of completedLines) {
      await this.grantLineCompletionEffects(line);
    }

    return completedLines;
  };

  /**
   * Check if a specific row is fully completed
   */
  private static checkRowCompletion = async (
    boardId: string,
    rowNumber: number,
    board: { teamId: string; eventId: string; rows: number; columns: number }
  ): Promise<LineCompletion | null> => {
    // Check if already recorded as completed
    const existing = await queryOne(
      'SELECT id FROM bingo_line_completions WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3',
      [boardId, 'row', rowNumber.toString()]
    );
    if (existing) return null;

    // Get all tiles in this row
    const rowTiles = await query<{ id: string; isCompleted: boolean; position: string }>(
      `SELECT bbt.id, bbt.is_completed, bbt.position 
       FROM bingo_board_tiles bbt
       WHERE bbt.board_id = $1 
       AND SUBSTRING(bbt.position FROM 2)::integer = $2`,
      [boardId, rowNumber]
    );

    // Check if all tiles are completed
    if (rowTiles.length === 0 || !rowTiles.every(t => t.isCompleted)) {
      return null;
    }

    // Calculate total points from tiles
    const tilePoints = await this.calculateTilePoints(rowTiles.map(t => t.id));

    // Record the completion
    const result = await queryOne<{ id: string }>(`
      INSERT INTO bingo_line_completions (board_id, team_id, event_id, line_type, line_identifier, tile_ids, tile_points)
      VALUES ($1, $2, $3, 'row', $4, $5, $6)
      RETURNING id
    `, [boardId, board.teamId, board.eventId, rowNumber.toString(), rowTiles.map(t => t.id), tilePoints]);

    return {
      type: 'row',
      identifier: rowNumber.toString(),
      boardId,
      teamId: board.teamId,
      eventId: board.eventId,
      completedAt: new Date(),
      tileIds: rowTiles.map(t => t.id),
      tilePoints
    };
  };

  /**
   * Check if a specific column is fully completed
   */
  private static checkColumnCompletion = async (
    boardId: string,
    columnLetter: string,
    board: { teamId: string; eventId: string; rows: number; columns: number }
  ): Promise<LineCompletion | null> => {
    // Check if already recorded as completed
    const existing = await queryOne(
      'SELECT id FROM bingo_line_completions WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3',
      [boardId, 'column', columnLetter]
    );
    if (existing) return null;

    // Get all tiles in this column
    const columnTiles = await query<{ id: string; isCompleted: boolean; position: string }>(
      `SELECT bbt.id, bbt.is_completed, bbt.position 
       FROM bingo_board_tiles bbt
       WHERE bbt.board_id = $1 
       AND UPPER(SUBSTRING(bbt.position FROM 1 FOR 1)) = $2`,
      [boardId, columnLetter]
    );

    // Check if all tiles are completed
    if (columnTiles.length === 0 || !columnTiles.every(t => t.isCompleted)) {
      return null;
    }

    // Calculate total points from tiles
    const tilePoints = await this.calculateTilePoints(columnTiles.map(t => t.id));

    // Record the completion
    const result = await queryOne<{ id: string }>(`
      INSERT INTO bingo_line_completions (board_id, team_id, event_id, line_type, line_identifier, tile_ids, tile_points)
      VALUES ($1, $2, $3, 'column', $4, $5, $6)
      RETURNING id
    `, [boardId, board.teamId, board.eventId, columnLetter, columnTiles.map(t => t.id), tilePoints]);

    return {
      type: 'column',
      identifier: columnLetter,
      boardId,
      teamId: board.teamId,
      eventId: board.eventId,
      completedAt: new Date(),
      tileIds: columnTiles.map(t => t.id),
      tilePoints
    };
  };

  /**
   * Calculate total points for a set of tiles
   */
  private static calculateTilePoints = async (tileIds: string[]): Promise<number> => {
    if (tileIds.length === 0) return 0;

    const result = await queryOne<{ total: string }>(`
      SELECT COALESCE(SUM(bt.points), 0) as total
      FROM bingo_board_tiles bbt
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      WHERE bbt.id = ANY($1)
    `, [tileIds]);

    return parseInt(result?.total || '0', 10);
  };

  // ============================================================================
  // EFFECT GRANTING
  // ============================================================================

  /**
   * Grant effects for a completed line
   */
  private static grantLineCompletionEffects = async (line: LineCompletion): Promise<void> => {
    // Get configured effects for this line
    const lineEffects = await query<{ buffDebuffId: string; metadata: object }>(
      `SELECT buff_debuff_id, metadata 
       FROM bingo_board_line_effects 
       WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3`,
      [line.boardId, line.type, line.identifier]
    );

    for (const lineEffect of lineEffects) {
      await this.grantEffect({
        teamId: line.teamId,
        eventId: line.eventId,
        buffDebuffId: lineEffect.buffDebuffId,
        source: line.type === 'row' ? EffectSource.ROW_COMPLETION : EffectSource.COLUMN_COMPLETION,
        sourceIdentifier: `${line.type}_${line.identifier}`,
        metadata: lineEffect.metadata as EarnedEffectMetadata
      });
    }

    // Mark effects as granted
    await query(
      'UPDATE bingo_line_completions SET effects_granted = true WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3',
      [line.boardId, line.type, line.identifier]
    );
  };

  /**
   * Grant an effect to a team
   */
  static grantEffect = async (params: {
    teamId: string;
    eventId: string;
    buffDebuffId: string;
    source: EffectSource;
    sourceIdentifier?: string;
    metadata?: EarnedEffectMetadata;
  }): Promise<TeamEarnedEffect | null> => {
    // Get effect definition
    const effectDef = await queryOne<EffectDefinition>(
      'SELECT * FROM bingo_buffs_debuffs WHERE id = $1 AND is_active = true',
      [params.buffDebuffId]
    );

    if (!effectDef) return null;

    // Calculate expiration if duration is set in config
    const config = effectDef.config as any;
    const durationSeconds = config.durationSeconds;
    const expiresAt = durationSeconds
      ? new Date(Date.now() + durationSeconds * 1000)
      : null;

    // Get charges/uses from config
    const charges = config.charges || config.tilesCount || 1;

    // Create earned effect
    const result = await queryOne<TeamEarnedEffect>(`
      INSERT INTO bingo_team_earned_effects (
        team_id, event_id, buff_debuff_id, source, source_identifier,
        status, expires_at, remaining_uses, metadata
      )
      VALUES ($1, $2, $3, $4, $5, 'available', $6, $7, $8)
      RETURNING *
    `, [
      params.teamId,
      params.eventId,
      params.buffDebuffId,
      params.source,
      params.sourceIdentifier,
      expiresAt,
      charges,
      JSON.stringify(params.metadata || {})
    ]);

    if (!result) return null;

    // Log the earning
    await this.logEffectAction({
      eventId: params.eventId,
      sourceTeamId: params.teamId,
      buffDebuffId: params.buffDebuffId,
      earnedEffectId: result.id,
      action: EffectAction.EARNED,
      success: true,
      result: {
        source: params.source,
        sourceIdentifier: params.sourceIdentifier
      }
    });

    // Apply immediate effect if needed
    let immediateResult: { pointsAwarded?: number; message?: string } | undefined;
    if (effectDef.trigger === EffectTrigger.IMMEDIATE) {
      immediateResult = await this.applyImmediateEffect(result, effectDef);
    }

    // Send Discord notification for effect unlock
    try {
      await DiscordNotificationsService.sendEffectUnlockNotification({
        teamId: params.teamId,
        eventId: params.eventId,
        effectName: effectDef.name,
        effectDescription: effectDef.description,
        effectIcon: effectDef.icon,
        effectType: effectDef.type,
        effectCategory: effectDef.category,
        source: params.source,
        sourceIdentifier: params.sourceIdentifier,
        trigger: effectDef.trigger,
        immediateResult
      });
    } catch (error) {
      console.error('[EffectsService] Failed to send effect unlock notification:', error);
    }

    return result;
  };

  /**
   * Apply an immediate effect (e.g., point bonus)
   * @returns Result of the immediate effect for notification purposes
   */
  private static applyImmediateEffect = async (
    earnedEffect: TeamEarnedEffect,
    effectDef: EffectDefinition
  ): Promise<{ pointsAwarded?: number; message?: string } | undefined> => {
    let result: EffectResultData = {};
    const config = effectDef.config as any;

    switch (config.type) {
      case EffectType.POINT_BONUS:
        // Add points to team score
        const points = config.points || 0;
        await query(
          'UPDATE event_teams SET score = score + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [points, earnedEffect.teamId]
        );
        result = { pointsChanged: points, message: `+${points} points` };
        break;

      case EffectType.LINE_COMPLETION_BONUS:
        // This is a passive effect, just mark as used
        result = { message: 'Line completion bonus activated' };
        break;

      default:
        // Most effects are manual, not immediate
        return undefined;
    }

    // Mark as used
    await query(
      `UPDATE bingo_team_earned_effects 
       SET status = 'used', used_at = CURRENT_TIMESTAMP, remaining_uses = remaining_uses - 1
       WHERE id = $1`,
      [earnedEffect.id]
    );

    return {
      pointsAwarded: result.pointsChanged,
      message: result.message
    };

    // Log
    await this.logEffectAction({
      eventId: earnedEffect.eventId,
      sourceTeamId: earnedEffect.teamId,
      buffDebuffId: earnedEffect.buffDebuffId,
      earnedEffectId: earnedEffect.id,
      action: EffectAction.AUTO_TRIGGERED,
      success: true,
      result
    });
  };

  // ============================================================================
  // EFFECT USAGE (MANUAL)
  // ============================================================================

  /**
   * Use an earned effect
   */
  static useEffect = async (
    teamId: string,
    request: UseEffectRequest
  ): Promise<UseEffectResponse> => {
    // Get the earned effect
    const earnedEffect = await queryOne<TeamEarnedEffect>(
      'SELECT * FROM bingo_team_earned_effects WHERE id = $1 AND team_id = $2 AND status = $3',
      [request.earnedEffectId, teamId, EarnedEffectStatus.AVAILABLE]
    );

    if (!earnedEffect) {
      return {
        success: false,
        action: EffectAction.ACTIVATED,
        result: { message: 'Effect not found or not available' },
        earnedEffect: earnedEffect as any
      };
    }

    // Get effect definition
    const effectDef = await queryOne<EffectDefinition>(
      'SELECT * FROM bingo_buffs_debuffs WHERE id = $1',
      [earnedEffect.buffDebuffId]
    );

    if (!effectDef) {
      return {
        success: false,
        action: EffectAction.ACTIVATED,
        result: { message: 'Effect definition not found' },
        earnedEffect
      };
    }

    // Check if targeting enemy and validate target
    if (effectDef.target === EffectTarget.ENEMY) {
      if (!request.targetTeamId) {
        return {
          success: false,
          action: EffectAction.ACTIVATED,
          result: { message: 'Target team required for this effect' },
          earnedEffect
        };
      }

      // Check for defensive effects on target
      const blocked = await this.checkDefensiveEffects(
        request.targetTeamId,
        earnedEffect,
        effectDef
      );

      if (blocked) {
        return blocked;
      }
    }

    // Apply the effect
    const result = await this.applyEffect(earnedEffect, effectDef, request);

    // Update effect status
    const newStatus = earnedEffect.remainingUses <= 1 ? 'used' : 'available';
    await query(`
      UPDATE bingo_team_earned_effects 
      SET status = $1, 
          used_at = CASE WHEN $1 = 'used' THEN CURRENT_TIMESTAMP ELSE used_at END,
          used_on_team_id = $2,
          remaining_uses = remaining_uses - 1
      WHERE id = $3
    `, [newStatus, request.targetTeamId, earnedEffect.id]);

    // Get updated effect
    const updatedEffect = await queryOne<TeamEarnedEffect>(
      'SELECT * FROM bingo_team_earned_effects WHERE id = $1',
      [earnedEffect.id]
    );

    // Log
    await this.logEffectAction({
      eventId: earnedEffect.eventId,
      sourceTeamId: teamId,
      targetTeamId: request.targetTeamId,
      buffDebuffId: earnedEffect.buffDebuffId,
      earnedEffectId: earnedEffect.id,
      action: EffectAction.ACTIVATED,
      success: true,
      result: result.result
    });

    // Send Discord notification for effect activation
    try {
      await DiscordNotificationsService.sendEffectActivationNotification({
        sourceTeamId: teamId,
        targetTeamId: request.targetTeamId,
        eventId: earnedEffect.eventId,
        effectName: effectDef.name,
        effectDescription: effectDef.description,
        effectIcon: effectDef.icon,
        effectType: effectDef.type,
        action: 'activated',
        result: {
          message: result.result.message,
          pointsChanged: result.result.pointsChanged,
          tilesAffected: result.result.tilesAffected
        }
      });
    } catch (error) {
      console.error('[EffectsService] Failed to send effect activation notification:', error);
    }

    return {
      success: result.success,
      action: EffectAction.ACTIVATED,
      result: result.result,
      earnedEffect: updatedEffect!
    };
  };

  /**
   * Check if target has defensive effects
   */
  private static checkDefensiveEffects = async (
    targetTeamId: string,
    incomingEffect: TeamEarnedEffect,
    incomingDef: EffectDefinition
  ): Promise<UseEffectResponse | null> => {
    // Check for UNO_REVERSE
    const unoReverse = await queryOne<TeamEarnedEffect>(`
      SELECT tee.* FROM bingo_team_earned_effects tee
      JOIN bingo_buffs_debuffs bbd ON tee.buff_debuff_id = bbd.id
      WHERE tee.team_id = $1 
        AND tee.status = 'available'
        AND bbd.effect_type = $2
      ORDER BY tee.earned_at ASC
      LIMIT 1
    `, [targetTeamId, EffectType.UNO_REVERSE]);

    if (unoReverse) {
      // Reflect the effect back
      await this.grantEffect({
        teamId: incomingEffect.teamId, // Original attacker
        eventId: incomingEffect.eventId,
        buffDebuffId: incomingEffect.buffDebuffId,
        source: EffectSource.REFLECTED,
        sourceIdentifier: unoReverse.id,
        metadata: { reflectedFrom: targetTeamId }
      });

      // Consume the reverse
      await query(
        `UPDATE bingo_team_earned_effects SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [unoReverse.id]
      );

      // Log the reflection
      await this.logEffectAction({
        eventId: incomingEffect.eventId,
        sourceTeamId: targetTeamId,
        targetTeamId: incomingEffect.teamId,
        buffDebuffId: unoReverse.buffDebuffId,
        earnedEffectId: unoReverse.id,
        action: EffectAction.REFLECTED,
        success: true,
        result: { reflectedEffectId: incomingEffect.id }
      });

      // Send notification for reflected effect
      try {
        await DiscordNotificationsService.sendEffectActivationNotification({
          sourceTeamId: incomingEffect.teamId,
          targetTeamId: targetTeamId,
          eventId: incomingEffect.eventId,
          effectName: incomingDef.name,
          effectDescription: incomingDef.description,
          effectIcon: incomingDef.icon,
          effectType: incomingDef.type,
          action: 'reflected',
          result: {
            message: 'Effect was reflected back!',
            blockedBy: 'Uno Reverse'
          }
        });
      } catch (error) {
        console.error('[EffectsService] Failed to send reflection notification:', error);
      }

      return {
        success: false,
        action: EffectAction.REFLECTED,
        result: { message: 'Effect was reflected!' },
        blockedBy: {
          effectId: unoReverse.id,
          teamId: targetTeamId,
          effectName: 'Uno Reverse'
        },
        earnedEffect: incomingEffect
      };
    }

    // Check for SHIELD
    const shield = await queryOne<TeamEarnedEffect>(`
      SELECT tee.* FROM bingo_team_earned_effects tee
      JOIN bingo_buffs_debuffs bbd ON tee.buff_debuff_id = bbd.id
      WHERE tee.team_id = $1 
        AND tee.status = 'available'
        AND bbd.effect_type = $2
      ORDER BY tee.earned_at ASC
      LIMIT 1
    `, [targetTeamId, EffectType.SHIELD]);

    if (shield) {
      // Consume the shield
      const newUses = shield.remainingUses - 1;
      if (newUses <= 0) {
        await query(
          `UPDATE bingo_team_earned_effects SET status = 'used', used_at = CURRENT_TIMESTAMP, remaining_uses = 0 WHERE id = $1`,
          [shield.id]
        );
      } else {
        await query(
          `UPDATE bingo_team_earned_effects SET remaining_uses = $1 WHERE id = $2`,
          [newUses, shield.id]
        );
      }

      // Log the block
      await this.logEffectAction({
        eventId: incomingEffect.eventId,
        sourceTeamId: targetTeamId,
        buffDebuffId: shield.buffDebuffId,
        earnedEffectId: shield.id,
        action: EffectAction.BLOCKED,
        success: true,
        result: { blockedEffectId: incomingEffect.id }
      });

      // Send notification for blocked effect
      try {
        await DiscordNotificationsService.sendEffectActivationNotification({
          sourceTeamId: incomingEffect.teamId,
          targetTeamId: targetTeamId,
          eventId: incomingEffect.eventId,
          effectName: incomingDef.name,
          effectDescription: incomingDef.description,
          effectIcon: incomingDef.icon,
          effectType: incomingDef.type,
          action: 'blocked',
          result: {
            message: 'Effect was blocked!',
            blockedBy: 'Shield'
          }
        });
      } catch (error) {
        console.error('[EffectsService] Failed to send blocked notification:', error);
      }

      return {
        success: false,
        action: EffectAction.BLOCKED,
        result: { message: 'Effect was blocked by shield!' },
        blockedBy: {
          effectId: shield.id,
          teamId: targetTeamId,
          effectName: 'Shield'
        },
        earnedEffect: incomingEffect
      };
    }

    return null;
  };

  /**
   * Apply an effect based on its type
   */
  private static applyEffect = async (
    earnedEffect: TeamEarnedEffect,
    effectDef: EffectDefinition,
    request: UseEffectRequest
  ): Promise<{ success: boolean; result: EffectResultData }> => {
    const config = effectDef.config as any;
    
    switch (config.type) {
      case EffectType.TILE_SWAP_SELF:
        return this.applyTileSwap(
          earnedEffect.teamId,
          earnedEffect.eventId,
          request.targetTileIds || [],
          request.targetPositions || []
        );

      case EffectType.TILE_SWAP_ENEMY:
        return this.applyTileSwap(
          request.targetTeamId!,
          earnedEffect.eventId,
          request.targetTileIds || [],
          request.targetPositions || []
        );

      case EffectType.POINT_BONUS:
        return this.applyPointBonus(earnedEffect.teamId, config.points || 0);

      case EffectType.POINT_MULTIPLIER:
        // Multipliers are stored and applied during tile completion
        return {
          success: true,
          result: {
            message: `Point multiplier x${config.multiplier} activated for next ${config.completionsAffected || 1} completions`
          }
        };

      case EffectType.TILE_LOCK:
        return this.applyTileLock(
          request.targetTeamId!,
          earnedEffect.eventId,
          request.targetTileIds?.[0] || ''
        );

      case EffectType.TILE_UNLOCK:
        return this.applyTileUnlock(
          earnedEffect.teamId,
          request.targetTileIds?.[0] || ''
        );

      default:
        return {
          success: true,
          result: { message: 'Effect applied' }
        };
    }
  };

  /**
   * Apply a tile swap effect
   */
  private static applyTileSwap = async (
    teamId: string,
    eventId: string,
    tileIds: string[],
    newPositions: string[]
  ): Promise<{ success: boolean; result: EffectResultData }> => {
    if (tileIds.length !== 2 || newPositions.length !== 2) {
      return {
        success: false,
        result: { message: 'Must specify exactly 2 tiles to swap' }
      };
    }

    // Get board for team
    const board = await queryOne<{ id: string }>(
      'SELECT id FROM bingo_boards WHERE team_id = $1 AND event_id = $2',
      [teamId, eventId]
    );

    if (!board) {
      return { success: false, result: { message: 'Board not found' } };
    }

    // Get current positions
    const tiles = await query<{ id: string; position: string }>(
      'SELECT id, position FROM bingo_board_tiles WHERE id = ANY($1) AND board_id = $2',
      [tileIds, board.id]
    );

    if (tiles.length !== 2) {
      return { success: false, result: { message: 'Tiles not found on board' } };
    }

    // Swap positions
    await query(
      'UPDATE bingo_board_tiles SET position = $1 WHERE id = $2',
      [tiles[1].position, tiles[0].id]
    );
    await query(
      'UPDATE bingo_board_tiles SET position = $1 WHERE id = $2',
      [tiles[0].position, tiles[1].id]
    );

    return {
      success: true,
      result: {
        tilesAffected: tileIds,
        message: `Swapped tiles at ${tiles[0].position} and ${tiles[1].position}`
      }
    };
  };

  /**
   * Apply point bonus
   */
  private static applyPointBonus = async (
    teamId: string,
    points: number
  ): Promise<{ success: boolean; result: EffectResultData }> => {
    await query(
      'UPDATE event_teams SET score = score + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [points, teamId]
    );

    return {
      success: true,
      result: {
        pointsChanged: points,
        message: `+${points} points`
      }
    };
  };

  /**
   * Apply tile lock
   */
  private static applyTileLock = async (
    teamId: string,
    eventId: string,
    tileId: string
  ): Promise<{ success: boolean; result: EffectResultData }> => {
    // Get board for team
    const board = await queryOne<{ id: string }>(
      'SELECT id FROM bingo_boards WHERE team_id = $1 AND event_id = $2',
      [teamId, eventId]
    );

    if (!board) {
      return { success: false, result: { message: 'Board not found' } };
    }

    // Lock the tile (add to metadata)
    await query(`
      UPDATE bingo_board_tiles 
      SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{locked}', 'true')
      WHERE id = $1 AND board_id = $2
    `, [tileId, board.id]);

    return {
      success: true,
      result: {
        tilesAffected: [tileId],
        message: 'Tile locked'
      }
    };
  };

  /**
   * Apply tile unlock
   */
  private static applyTileUnlock = async (
    teamId: string,
    tileId: string
  ): Promise<{ success: boolean; result: EffectResultData }> => {
    await query(`
      UPDATE bingo_board_tiles 
      SET metadata = metadata - 'locked'
      WHERE id = $1
    `, [tileId]);

    return {
      success: true,
      result: {
        tilesAffected: [tileId],
        message: 'Tile unlocked'
      }
    };
  };

  // ============================================================================
  // LOGGING
  // ============================================================================

  /**
   * Log an effect action
   */
  private static logEffectAction = async (params: {
    eventId: string;
    sourceTeamId: string;
    targetTeamId?: string;
    buffDebuffId: string;
    earnedEffectId?: string;
    action: EffectAction;
    success: boolean;
    blockedByEffectId?: string;
    result: EffectResultData;
  }): Promise<void> => {
    await query(`
      INSERT INTO bingo_effect_activation_log (
        event_id, source_team_id, target_team_id, buff_debuff_id,
        earned_effect_id, action, success, blocked_by_effect_id, result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      params.eventId,
      params.sourceTeamId,
      params.targetTeamId,
      params.buffDebuffId,
      params.earnedEffectId,
      params.action,
      params.success,
      params.blockedByEffectId,
      JSON.stringify(params.result)
    ]);
  };

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get team's current effect state
   */
  static getTeamEffectState = async (
    teamId: string,
    eventId: string
  ): Promise<TeamEffectState> => {
    const available = await query<TeamEarnedEffect>(`
      SELECT tee.*, bbd.effect_type, bbd.trigger
      FROM bingo_team_earned_effects tee
      JOIN bingo_buffs_debuffs bbd ON tee.buff_debuff_id = bbd.id
      WHERE tee.team_id = $1 AND tee.event_id = $2 AND tee.status = 'available'
      ORDER BY tee.earned_at ASC
    `, [teamId, eventId]);

    const recentlyUsed = await query<TeamEarnedEffect>(`
      SELECT * FROM bingo_team_earned_effects
      WHERE team_id = $1 AND event_id = $2 AND status = 'used'
      ORDER BY used_at DESC
      LIMIT 10
    `, [teamId, eventId]);

    // Separate by type
    const activeDefense = available.filter(e => 
      [EffectType.SHIELD, EffectType.UNO_REVERSE, EffectType.EFFECT_IMMUNITY].includes((e as any).effectType)
    );

    const activePassive = available.filter(e => 
      (e as any).trigger === EffectTrigger.REACTIVE
    );

    return {
      available: available.filter(e => (e as any).trigger === EffectTrigger.MANUAL),
      activePassive,
      activeDefense,
      recentlyUsed
    };
  };

  /**
   * Get effect activation history for an event
   */
  static getEffectHistory = async (
    eventId: string,
    limit: number = 50
  ): Promise<EffectActivationLog[]> => {
    return query<EffectActivationLog>(`
      SELECT eal.*, 
        bbd.name as effect_name,
        st.name as source_team_name,
        tt.name as target_team_name
      FROM bingo_effect_activation_log eal
      JOIN bingo_buffs_debuffs bbd ON eal.buff_debuff_id = bbd.id
      JOIN event_teams st ON eal.source_team_id = st.id
      LEFT JOIN event_teams tt ON eal.target_team_id = tt.id
      WHERE eal.event_id = $1
      ORDER BY eal.timestamp DESC
      LIMIT $2
    `, [eventId, limit]);
  };

  /**
   * Get all line completions for a board
   */
  static getBoardLineCompletions = async (boardId: string): Promise<LineCompletion[]> => {
    return query<LineCompletion>(
      'SELECT * FROM bingo_line_completions WHERE board_id = $1 ORDER BY completed_at ASC',
      [boardId]
    );
  };

  /**
   * Expire old effects (called periodically)
   */
  static expireEffects = async (): Promise<number> => {
    const result = await query(
      `UPDATE bingo_team_earned_effects 
       SET status = 'expired'
       WHERE status = 'available' AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );
    return result.length;
  };
}

// Export individual functions for convenience
export const checkLineCompletions = EffectsService.checkLineCompletions;
export const grantEffect = EffectsService.grantEffect;
export const useEffect = EffectsService.useEffect;
export const getTeamEffectState = EffectsService.getTeamEffectState;
export const getEffectHistory = EffectsService.getEffectHistory;

