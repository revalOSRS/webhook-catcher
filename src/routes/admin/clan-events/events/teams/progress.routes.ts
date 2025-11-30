/**
 * Team Progress Admin Routes
 * 
 * Endpoints for viewing team progress, tile completions, and member contributions.
 */

import { Router, Request, Response } from 'express';
import { query } from '../../../../../db/connection.js';
import { EventTeamsEntity } from '../../../../../modules/events/entities/event-teams.entity.js';

const router = Router({ mergeParams: true });

const teamsEntity = new EventTeamsEntity();

/**
 * GET /api/admin/clan-events/teams/:teamId/progress
 * Get team progress summary
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const team = await teamsEntity.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get board ID
    const boards = await query(
      'SELECT id FROM bingo_boards WHERE team_id = $1',
      [teamId]
    );

    if (boards.length === 0) {
      return res.json({
        success: true,
        data: {
          team: { id: team.id, name: team.name, score: team.score },
          totalTiles: 0,
          completedTiles: 0,
          completionPercentage: 0,
          totalProgressValue: 0,
          memberContributions: []
        }
      });
    }

    const boardId = boards[0].id;

    // Get tile statistics
    const tileStats = await query(`
      SELECT 
        COUNT(*) as total_tiles,
        COUNT(*) FILTER (WHERE is_completed = true) as completed_tiles
      FROM bingo_board_tiles
      WHERE board_id = $1
    `, [boardId]);

    // Get total progress value
    const progressStats = await query(`
      SELECT 
        COALESCE(SUM(progress_value), 0) as total_progress_value,
        COUNT(DISTINCT board_tile_id) as tiles_with_progress
      FROM bingo_tile_progress
      WHERE board_tile_id IN (
        SELECT id FROM bingo_board_tiles WHERE board_id = $1
      )
    `, [boardId]);

    // Get member contributions from progress metadata
    const memberContributions = await query(`
      SELECT 
        etm.id as team_member_id,
        m.id as member_id,
        m.discord_tag,
        oa.id as osrs_account_id,
        oa.osrs_nickname as osrs_account_name,
        COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
        COALESCE(SUM(btp.progress_value), 0) as total_progress_contributed
      FROM event_team_members etm
      JOIN members m ON etm.member_id = m.id
      LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
      LEFT JOIN bingo_tile_progress btp ON btp.completed_by_osrs_account_id = oa.id
        AND btp.board_tile_id IN (SELECT id FROM bingo_board_tiles WHERE board_id = $1)
      WHERE etm.team_id = $2
      GROUP BY etm.id, m.id, m.discord_tag, oa.id, oa.osrs_nickname
      ORDER BY tiles_completed DESC, total_progress_contributed DESC
    `, [boardId, teamId]);

    const totalTiles = parseInt(tileStats[0]?.total_tiles || '0');
    const completedTiles = parseInt(tileStats[0]?.completed_tiles || '0');
    const completionPercentage = totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0;

    res.json({
      success: true,
      data: {
        team: { id: team.id, name: team.name, score: team.score },
        totalTiles,
        completedTiles,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        totalProgressValue: parseFloat(progressStats[0]?.total_progress_value || '0'),
        tilesWithProgress: parseInt(progressStats[0]?.tiles_with_progress || '0'),
        memberContributions: memberContributions.map(m => ({
          ...m,
          tilesCompleted: parseInt(m.tiles_completed),
          totalProgressContributed: parseFloat(m.total_progress_contributed)
        }))
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching team progress:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team progress',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/teams/:teamId/progress/tiles
 * Get detailed tile progress for team
 */
router.get('/tiles', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { completed_only, limit = '50', offset = '0' } = req.query;

    const team = await teamsEntity.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get board ID
    const boards = await query(
      'SELECT id FROM bingo_boards WHERE team_id = $1',
      [teamId]
    );

    if (boards.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    }

    const boardId = boards[0].id;

    let sql = `
      SELECT 
        bbt.id, bbt.board_id, bbt.tile_id, bbt.position,
        bbt.is_completed, bbt.completed_at, bbt.metadata,
        bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
        bt.base_points, bt.requirements,
        btp.id as progress_id,
        btp.progress_value,
        btp.progress_metadata,
        btp.completion_type,
        btp.completed_at as progress_completed_at,
        btp.completed_by_osrs_account_id
      FROM bingo_board_tiles bbt
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
      WHERE bbt.board_id = $1
    `;

    const params: unknown[] = [boardId];
    let paramIndex = 2;

    if (completed_only === 'true') {
      sql += ' AND bbt.is_completed = true';
    }

    sql += `
      ORDER BY bbt.is_completed DESC, bbt.position ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const tiles = await query(sql, params);

    res.json({
      success: true,
      data: tiles,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching tile progress:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tile progress',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/teams/:teamId/progress/members
 * Get individual member contributions to team progress
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const team = await teamsEntity.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get board ID
    const boards = await query(
      'SELECT id FROM bingo_boards WHERE team_id = $1',
      [teamId]
    );

    if (boards.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const boardId = boards[0].id;

    // Get member contributions with detailed breakdown
    const memberContributions = await query(`
      SELECT 
        etm.id as team_member_id,
        etm.role,
        etm.individual_score,
        m.id as member_id,
        m.discord_tag,
        oa.id as osrs_account_id,
        oa.osrs_nickname as osrs_account_name,
        oa.account_type as osrs_account_type,
        COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
        COALESCE(SUM(btp.progress_value), 0) as total_progress_contributed,
        COUNT(DISTINCT btp.board_tile_id) as tiles_contributed_to
      FROM event_team_members etm
      JOIN members m ON etm.member_id = m.id
      LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
      LEFT JOIN bingo_tile_progress btp ON btp.completed_by_osrs_account_id = oa.id
        AND btp.board_tile_id IN (
          SELECT id FROM bingo_board_tiles WHERE board_id = $1
        )
      WHERE etm.team_id = $2
      GROUP BY etm.id, etm.role, etm.individual_score, m.id, m.discord_tag, 
        oa.id, oa.osrs_nickname, oa.account_type
      ORDER BY tiles_completed DESC, total_progress_contributed DESC
    `, [boardId, teamId]);

    res.json({
      success: true,
      data: memberContributions.map(m => ({
        ...m,
        tilesCompleted: parseInt(m.tiles_completed),
        totalProgressContributed: parseFloat(m.total_progress_contributed),
        tilesContributedTo: parseInt(m.tiles_contributed_to)
      }))
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching member contributions:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member contributions',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/teams/:teamId/progress/activity
 * Get recent activity log for the team (tile completions, progress updates)
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const team = await teamsEntity.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get recent tile completions and progress updates
    const activity = await query(`
      SELECT 
        btp.id,
        btp.board_tile_id,
        btp.progress_value,
        btp.completion_type,
        btp.completed_at,
        btp.updated_at,
        bbt.position,
        bt.task,
        bt.category,
        oa.osrs_nickname as player_name
      FROM bingo_tile_progress btp
      JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
      JOIN bingo_boards bb ON bbt.board_id = bb.id
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      LEFT JOIN osrs_accounts oa ON btp.completed_by_osrs_account_id = oa.id
      WHERE bb.team_id = $1
      ORDER BY COALESCE(btp.completed_at, btp.updated_at) DESC
      LIMIT $2 OFFSET $3
    `, [teamId, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      data: activity.map(a => ({
        id: a.id,
        boardTileId: a.board_tile_id,
        position: a.position,
        task: a.task,
        category: a.category,
        progressValue: a.progress_value,
        completionType: a.completion_type,
        completedAt: a.completed_at,
        updatedAt: a.updated_at,
        playerName: a.player_name,
        type: a.completed_at ? 'completion' : 'progress'
      })),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching team activity:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team activity',
      message
    });
  }
});

export default router;
