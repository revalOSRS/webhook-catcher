/**
 * Admin Routes - Effects Management
 * 
 * Routes for managing the bingo effects system:
 * - Effect library CRUD (bingo_buffs_debuffs)
 * - Granting effects to teams
 * - Viewing effect history
 * - Managing team earned effects
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../../../../db/connection.js';
import { EffectsService } from '../../../../modules/events/bingo/effects.service.js';
import { EffectSource } from '../../../../modules/events/bingo/types/effects.type.js';

const router = Router();

// ============================================================================
// EFFECT LIBRARY MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/clan-events/effects/library
 * Get all effects from the library with filtering
 */
router.get('/library', async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      target,
      trigger,
      effectType,
      isActive,
      search,
      limit = '100',
      offset = '0'
    } = req.query;

    let sql = 'SELECT * FROM bingo_buffs_debuffs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (target) {
      sql += ` AND target = $${paramIndex++}`;
      params.push(target);
    }

    if (trigger) {
      sql += ` AND trigger = $${paramIndex++}`;
      params.push(trigger);
    }

    if (effectType) {
      sql += ` AND effect_type = $${paramIndex++}`;
      params.push(effectType);
    }

    if (isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex++}`;
      params.push(isActive === 'true');
    }

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY category, type, name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const effects = await query(sql, params);

    // Get stats
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE type = 'buff') as buffs,
        COUNT(*) FILTER (WHERE type = 'debuff') as debuffs,
        COUNT(*) FILTER (WHERE category = 'points') as points,
        COUNT(*) FILTER (WHERE category = 'board_manipulation') as boardManipulation,
        COUNT(*) FILTER (WHERE category = 'defense') as defense,
        COUNT(*) FILTER (WHERE category = 'offense') as offense
      FROM bingo_buffs_debuffs
    `);

    res.json({
      success: true,
      data: effects,
      stats,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: any) {
    console.error('Error fetching effects library:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch effects',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/clan-events/effects/library/:id
 * Get a single effect by ID with usage stats
 */
router.get('/library/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const effect = await queryOne('SELECT * FROM bingo_buffs_debuffs WHERE id = $1', [id]);

    if (!effect) {
      return res.status(404).json({
        success: false,
        error: 'Effect not found'
      });
    }

    // Get usage stats
    const usageStats = await queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM bingo_team_earned_effects WHERE buff_debuff_id = $1) as timesEarned,
        (SELECT COUNT(*) FROM bingo_team_earned_effects WHERE buff_debuff_id = $1 AND status = 'used') as timesUsed,
        (SELECT COUNT(*) FROM bingo_board_tile_effects WHERE buff_debuff_id = $1) as appliedToTiles,
        (SELECT COUNT(*) FROM bingo_board_line_effects WHERE buff_debuff_id = $1) as appliedToLines
    `, [id]);

    res.json({
      success: true,
      data: {
        ...effect,
        usageStats
      }
    });
  } catch (error: any) {
    console.error('Error fetching effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch effect',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/clan-events/effects/library
 * Create a new effect in the library
 * 
 * Body: {
 *   id: string,
 *   name: string,
 *   description: string,
 *   type: 'buff' | 'debuff',
 *   category: 'points' | 'board_manipulation' | 'defense' | 'offense',
 *   target: 'self' | 'enemy' | 'all',
 *   trigger: 'immediate' | 'manual' | 'reactive',
 *   config: { type: string, ...effectSpecificFields },
 *   icon?: string,
 *   isActive?: boolean
 * }
 */
router.post('/library', async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      description,
      type,
      category = 'points',
      target = 'self',
      trigger = 'manual',
      config,
      icon,
      isActive = true
    } = req.body;

    // Validation
    if (!id || !name || !type || !config || !config.type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['id', 'name', 'type', 'config', 'config.type']
      });
    }

    // Check if ID exists
    const existing = await queryOne('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [id]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Effect ID already exists'
      });
    }

    // Extract a numeric value from config for backward compatibility with effect_value column
    const effectValue = config.points ?? config.multiplier ?? config.charges ?? 
                        config.tilesCount ?? config.durationSeconds ?? config.bonusPerLine ?? 0;

    const result = await queryOne(`
      INSERT INTO bingo_buffs_debuffs (
        id, name, description, type, category, target, trigger,
        effect_type, effect_value, config, icon, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id, name, description, type, category, target, trigger,
      config.type, effectValue, JSON.stringify(config), icon, isActive
    ]);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Effect created successfully'
    });
  } catch (error: any) {
    console.error('Error creating effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create effect',
      message: error.message
    });
  }
});

/**
 * PATCH /api/admin/clan-events/effects/library/:id
 * Update an effect in the library
 */
router.patch('/library/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await queryOne('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Effect not found'
      });
    }

    const allowedFields = [
      'name', 'description', 'type', 'category', 'target', 'trigger',
      'effect_type', 'config', 'icon', 'is_active'
    ];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      effectType: 'effect_type',
      isActive: 'is_active'
    };

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex++}`);
        // Handle config specially - also update effect_type from config.type
        if (key === 'config') {
          values.push(JSON.stringify(value));
          // Also update effect_type if config.type is provided
          if ((value as any).type) {
            updateFields.push(`effect_type = $${paramIndex++}`);
            values.push((value as any).type);
          }
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id);
    const result = await queryOne(`
      UPDATE bingo_buffs_debuffs
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({
      success: true,
      data: result,
      message: 'Effect updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update effect',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/clan-events/effects/library/:id
 * Delete an effect from the library
 */
router.delete('/library/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check usage
    const usage = await queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM bingo_team_earned_effects WHERE buff_debuff_id = $1) +
        (SELECT COUNT(*) FROM bingo_board_tile_effects WHERE buff_debuff_id = $1) +
        (SELECT COUNT(*) FROM bingo_board_line_effects WHERE buff_debuff_id = $1) as count
    `, [id]);

    if (parseInt(usage?.count || '0') > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete effect',
        message: `Effect is in use ${usage.count} time(s). Remove references first.`
      });
    }

    const result = await query('DELETE FROM bingo_buffs_debuffs WHERE id = $1 RETURNING id', [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Effect not found'
      });
    }

    res.json({
      success: true,
      message: 'Effect deleted successfully',
      deletedId: id
    });
  } catch (error: any) {
    console.error('Error deleting effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete effect',
      message: error.message
    });
  }
});

// ============================================================================
// TEAM EFFECTS MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/clan-events/effects/events/:eventId/teams/:teamId
 * Get a team's effects
 */
router.get('/events/:eventId/teams/:teamId', async (req: Request, res: Response) => {
  try {
    const { eventId, teamId } = req.params;

    const effectState = await EffectsService.getTeamEffectState(teamId, eventId);

    // Get full effect details
    const allEffects = await query(`
      SELECT tee.*, bbd.name, bbd.description, bbd.type, bbd.category,
             bbd.effect_type, bbd.effect_value, bbd.icon, bbd.target, bbd.trigger
      FROM bingo_team_earned_effects tee
      JOIN bingo_buffs_debuffs bbd ON tee.buff_debuff_id = bbd.id
      WHERE tee.team_id = $1 AND tee.event_id = $2
      ORDER BY tee.earned_at DESC
    `, [teamId, eventId]);

    res.json({
      success: true,
      data: {
        summary: effectState,
        effects: allEffects
      }
    });
  } catch (error: any) {
    console.error('Error fetching team effects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team effects',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/clan-events/effects/events/:eventId/teams/:teamId/grant
 * Grant an effect to a team (admin action)
 */
router.post('/events/:eventId/teams/:teamId/grant', async (req: Request, res: Response) => {
  try {
    const { eventId, teamId } = req.params;
    const { buffDebuffId, reason } = req.body;

    if (!buffDebuffId) {
      return res.status(400).json({
        success: false,
        error: 'buffDebuffId is required'
      });
    }

    const earnedEffect = await EffectsService.grantEffect({
      teamId,
      eventId,
      buffDebuffId,
      source: EffectSource.ADMIN,
      sourceIdentifier: reason || 'Admin grant',
      metadata: { grantedBy: 'admin', reason }
    });

    if (!earnedEffect) {
      return res.status(400).json({
        success: false,
        error: 'Failed to grant effect',
        message: 'Effect may not exist or be inactive'
      });
    }

    res.status(201).json({
      success: true,
      data: earnedEffect,
      message: 'Effect granted successfully'
    });
  } catch (error: any) {
    console.error('Error granting effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant effect',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/clan-events/effects/earned/:earnedEffectId
 * Remove an earned effect
 */
router.delete('/earned/:earnedEffectId', async (req: Request, res: Response) => {
  try {
    const { earnedEffectId } = req.params;

    const result = await query(
      'DELETE FROM bingo_team_earned_effects WHERE id = $1 RETURNING id',
      [earnedEffectId]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Earned effect not found'
      });
    }

    res.json({
      success: true,
      message: 'Earned effect removed',
      deletedId: earnedEffectId
    });
  } catch (error: any) {
    console.error('Error removing earned effect:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove earned effect',
      message: error.message
    });
  }
});

// ============================================================================
// EFFECT HISTORY & ANALYTICS
// ============================================================================

/**
 * GET /api/admin/clan-events/effects/events/:eventId/history
 * Get effect activation history for an event
 */
router.get('/events/:eventId/history', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = '50', offset = '0', action, teamId } = req.query;

    let sql = `
      SELECT eal.*, 
        bbd.name as effectName,
        bbd.effect_type as effectType,
        bbd.icon as effectIcon,
        st.name as sourceTeamName,
        tt.name as targetTeamName
      FROM bingo_effect_activation_log eal
      JOIN bingo_buffs_debuffs bbd ON eal.buff_debuff_id = bbd.id
      JOIN event_teams st ON eal.source_team_id = st.id
      LEFT JOIN event_teams tt ON eal.target_team_id = tt.id
      WHERE eal.event_id = $1
    `;
    const params: any[] = [eventId];
    let paramIndex = 2;

    if (action) {
      sql += ` AND eal.action = $${paramIndex++}`;
      params.push(action);
    }

    if (teamId) {
      sql += ` AND (eal.source_team_id = $${paramIndex} OR eal.target_team_id = $${paramIndex})`;
      params.push(teamId);
      paramIndex++;
    }

    sql += ` ORDER BY eal.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const history = await query(sql, params);

    // Get counts by action
    const actionCounts = await query(`
      SELECT action, COUNT(*) as count
      FROM bingo_effect_activation_log
      WHERE event_id = $1
      GROUP BY action
    `, [eventId]);

    res.json({
      success: true,
      data: history,
      stats: {
        actionCounts: actionCounts.reduce((acc: any, row: any) => {
          acc[row.action] = parseInt(row.count);
          return acc;
        }, {})
      },
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: any) {
    console.error('Error fetching effect history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch effect history',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/clan-events/effects/events/:eventId/line-completions
 * Get all line completions for an event
 */
router.get('/events/:eventId/line-completions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const completions = await query(`
      SELECT lc.*, et.name as teamName
      FROM bingo_line_completions lc
      JOIN event_teams et ON lc.team_id = et.id
      WHERE lc.event_id = $1
      ORDER BY lc.completed_at DESC
    `, [eventId]);

    res.json({
      success: true,
      data: completions
    });
  } catch (error: any) {
    console.error('Error fetching line completions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch line completions',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/clan-events/effects/expire
 * Manually trigger effect expiration check
 */
router.post('/expire', async (_req: Request, res: Response) => {
  try {
    const expiredCount = await EffectsService.expireEffects();

    res.json({
      success: true,
      message: `Expired ${expiredCount} effect(s)`
    });
  } catch (error: any) {
    console.error('Error expiring effects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to expire effects',
      message: error.message
    });
  }
});

export default router;

