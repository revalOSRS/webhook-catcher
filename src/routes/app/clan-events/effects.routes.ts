/**
 * User Routes - Effects
 * 
 * Endpoints for authenticated users to:
 * - View their team's available effects
 * - Use effects (tile swaps, etc.)
 * - View effect history
 * - See line completions
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../../db/connection.js';
import { EffectsService } from '../../../modules/events/bingo/effects.service.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/app/clan-events/events/:eventId/effects
 * Get current user's team effects for an event
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const member = await getMemberFromHeaders(req);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const participation = await getEventParticipation(member.id, eventId);
    if (!participation) {
      return res.status(403).json({ success: false, error: 'You are not participating in this event' });
    }

    const availableWithDetails = await query(`
      SELECT 
        tee.id, tee.source, tee.source_identifier as sourceIdentifier,
        tee.status, tee.earned_at as earnedAt, tee.expires_at as expiresAt,
        tee.remaining_uses as remainingUses, tee.metadata,
        bbd.id as buffDebuffId, bbd.name, bbd.description, bbd.type,
        bbd.category, bbd.effect_type as effectType, bbd.effect_value as effectValue,
        bbd.target, bbd.trigger, bbd.icon, bbd.duration, bbd.max_stacks as maxStacks
      FROM bingo_team_earned_effects tee
      JOIN bingo_buffs_debuffs bbd ON tee.buff_debuff_id = bbd.id
      WHERE tee.team_id = $1 AND tee.event_id = $2 AND tee.status = 'available'
      ORDER BY tee.earned_at ASC
    `, [participation.teamId, eventId]);

    const defensiveEffects = availableWithDetails.filter((e: any) =>
      ['shield', 'uno_reverse', 'effect_immunity'].includes(e.effectType)
    );
    const usableEffects = availableWithDetails.filter((e: any) => e.trigger === 'manual');

    res.json({
      success: true,
      data: {
        teamId: participation.teamId,
        teamName: participation.teamName,
        available: usableEffects,
        defensive: defensiveEffects,
        stats: {
          totalAvailable: availableWithDetails.length,
          usable: usableEffects.length,
          defensive: defensiveEffects.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching effects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch effects', message: error.message });
  }
});

/**
 * POST /api/app/clan-events/events/:eventId/effects/:effectId/use
 * Use an effect
 */
router.post('/:effectId/use', async (req: Request, res: Response) => {
  try {
    const { eventId, effectId } = req.params;
    const { targetTeamId, targetTileIds, targetPositions } = req.body;

    const member = await getMemberFromHeaders(req);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const participation = await getEventParticipation(member.id, eventId);
    if (!participation) {
      return res.status(403).json({ success: false, error: 'You are not participating in this event' });
    }

    const result = await EffectsService.useEffect(participation.teamId, {
      earnedEffectId: effectId,
      targetTeamId,
      targetTileIds,
      targetPositions
    });

    if (!result.success && result.blockedBy) {
      return res.json({
        success: true,
        data: { action: result.action, blocked: true, blockedBy: result.blockedBy, message: result.result.message }
      });
    }

    res.json({
      success: result.success,
      data: { action: result.action, result: result.result, effect: result.earnedEffect, newEffects: result.newEffects }
    });
  } catch (error: any) {
    console.error('Error using effect:', error);
    res.status(500).json({ success: false, error: 'Failed to use effect', message: error.message });
  }
});

/**
 * GET /api/app/clan-events/events/:eventId/effects/targets
 * Get list of other teams that can be targeted
 */
router.get('/targets', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const member = await getMemberFromHeaders(req);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const participation = await getEventParticipation(member.id, eventId);
    if (!participation) {
      return res.status(403).json({ success: false, error: 'You are not participating in this event' });
    }

    const teams = await query(`
      SELECT et.id, et.name, et.color, et.icon, et.score,
             (SELECT COUNT(*) FROM event_team_members WHERE team_id = et.id) as memberCount
      FROM event_teams et
      WHERE et.event_id = $1 AND et.id != $2
      ORDER BY et.score DESC
    `, [eventId, participation.teamId]);

    res.json({ success: true, data: teams });
  } catch (error: any) {
    console.error('Error fetching target teams:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teams', message: error.message });
  }
});

/**
 * GET /api/app/clan-events/events/:eventId/effects/history
 * Get effect history visible to the user
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = '20' } = req.query;

    const member = await getMemberFromHeaders(req);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const participation = await getEventParticipation(member.id, eventId);
    if (!participation) {
      return res.status(403).json({ success: false, error: 'You are not participating in this event' });
    }

    const history = await query(`
      SELECT 
        eal.id, eal.action, eal.success, eal.result, eal.timestamp,
        bbd.name as effectName, bbd.icon as effectIcon, bbd.effect_type as effectType,
        st.id as sourceTeamId, st.name as sourceTeamName, st.color as sourceTeamColor,
        tt.id as targetTeamId, tt.name as targetTeamName, tt.color as targetTeamColor,
        CASE WHEN st.id = $2 OR tt.id = $2 THEN true ELSE false END as involvesMyTeam
      FROM bingo_effect_activation_log eal
      JOIN bingo_buffs_debuffs bbd ON eal.buff_debuff_id = bbd.id
      JOIN event_teams st ON eal.source_team_id = st.id
      LEFT JOIN event_teams tt ON eal.target_team_id = tt.id
      WHERE eal.event_id = $1
      ORDER BY eal.timestamp DESC
      LIMIT $3
    `, [eventId, participation.teamId, parseInt(limit as string)]);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Error fetching effect history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch effect history', message: error.message });
  }
});

/**
 * GET /api/app/clan-events/events/:eventId/effects/line-completions
 * Get line completions for the user's team
 */
router.get('/line-completions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const member = await getMemberFromHeaders(req);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const participation = await getEventParticipation(member.id, eventId);
    if (!participation) {
      return res.status(403).json({ success: false, error: 'You are not participating in this event' });
    }

    const completions = await query(`
      SELECT lc.id, lc.line_type as lineType, lc.line_identifier as lineIdentifier,
             lc.completed_at as completedAt, lc.tile_points as tilePoints, lc.effects_granted as effectsGranted
      FROM bingo_line_completions lc
      WHERE lc.team_id = $1 AND lc.event_id = $2
      ORDER BY lc.completed_at ASC
    `, [participation.teamId, eventId]);

    const board = await queryOne<{ rows: number; columns: number }>(
      'SELECT rows, columns FROM bingo_boards WHERE team_id = $1 AND event_id = $2',
      [participation.teamId, eventId]
    );

    const rowCompletions = completions.filter((c: any) => c.lineType === 'row');
    const columnCompletions = completions.filter((c: any) => c.lineType === 'column');

    res.json({
      success: true,
      data: {
        completions,
        summary: {
          rowsCompleted: rowCompletions.length,
          columnsCompleted: columnCompletions.length,
          totalRows: board?.rows || 0,
          totalColumns: board?.columns || 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching line completions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch line completions', message: error.message });
  }
});

export default router;

