/**
 * Teams Admin Routes
 *
 * CRUD operations for event teams using the EventTeamsEntity class.
 */
import { Router } from 'express';
import { query } from '../../../../../db/connection.js';
import { EventTeamsEntity } from '../../../../../modules/events/entities/event-teams.entity.js';
import { EventTeamMembersEntity } from '../../../../../modules/events/entities/event-team-members.entity.js';
import { EventsEntity } from '../../../../../modules/events/entities/events.entity.js';
import progressRouter from './progress.routes.js';
const router = Router();
// Instantiate entities
const teamsEntity = new EventTeamsEntity();
const teamMembersEntity = new EventTeamMembersEntity();
const eventsEntity = new EventsEntity();
// ============================================================================
// TEAMS CRUD
// ============================================================================
/**
 * GET /api/admin/clan-events/teams
 * List all teams with optional filtering by event_id
 */
router.get('/', async (req, res) => {
    try {
        const { event_id, limit = '50', offset = '0' } = req.query;
        let sql = `
      SELECT 
        et.id, et.event_id, et.name, et.color, et.icon, et.score,
        et.metadata, et.created_at, et.updated_at,
        e.name as event_name, e.status as event_status,
        COUNT(etm.id) as member_count
      FROM event_teams et
      JOIN events e ON et.event_id = e.id
      LEFT JOIN event_team_members etm ON et.id = etm.team_id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (event_id) {
            sql += ` AND et.event_id = $${paramIndex++}`;
            params.push(event_id);
        }
        sql += `
      GROUP BY et.id, e.name, e.status
      ORDER BY et.score DESC, et.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(parseInt(limit), parseInt(offset));
        const teams = await query(sql, params);
        res.json({
            success: true,
            data: teams.map(t => ({
                ...t,
                memberCount: parseInt(t.memberCount)
            })),
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching teams:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch teams',
            message
        });
    }
});
/**
 * GET /api/admin/clan-events/teams/:id
 * Get a single team with all its members
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get team with event info
        const team = await query(`
      SELECT 
        et.id, et.event_id, et.name, et.color, et.icon, et.score,
        et.metadata, et.created_at, et.updated_at,
        e.name as event_name, e.status as event_status, e.event_type
      FROM event_teams et
      JOIN events e ON et.event_id = e.id
      WHERE et.id = $1
    `, [id]);
        if (team.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        // Get members with OSRS account info
        const members = await query(`
      SELECT 
        etm.id, etm.team_id, etm.member_id, etm.osrs_account_id,
        etm.role, etm.individual_score, etm.metadata,
        m.discord_id, m.discord_tag,
        oa.osrs_nickname as osrs_account_name, oa.account_type as osrs_account_type
      FROM event_team_members etm
      JOIN members m ON etm.member_id = m.id
      LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
      WHERE etm.team_id = $1
      ORDER BY etm.role DESC, etm.individual_score DESC, etm.id ASC
    `, [id]);
        res.json({
            success: true,
            data: {
                ...team[0],
                members
            }
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team',
            message
        });
    }
});
/**
 * POST /api/admin/clan-events/teams
 * Create a new team
 */
router.post('/', async (req, res) => {
    try {
        const { eventId, name, color, icon, metadata = {} } = req.body;
        // Validation
        if (!eventId || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['eventId', 'name']
            });
        }
        // Check if event exists
        const event = await eventsEntity.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        // Check for duplicate name
        const existing = await teamsEntity.findByEventAndName(eventId, name);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Team name already exists for this event'
            });
        }
        const team = await teamsEntity.create({
            eventId,
            name,
            color,
            icon,
            metadata
        });
        res.status(201).json({
            success: true,
            data: team,
            message: 'Team created successfully'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to create team',
            message
        });
    }
});
/**
 * POST /api/admin/clan-events/teams/batch
 * Create multiple teams at once
 */
router.post('/batch', async (req, res) => {
    try {
        const { eventId, teams } = req.body;
        if (!eventId || !Array.isArray(teams) || teams.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['eventId', 'teams (array)']
            });
        }
        const event = await eventsEntity.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        const created = [];
        const errors = [];
        for (const teamData of teams) {
            if (!teamData.name) {
                errors.push({ name: '(unnamed)', error: 'Missing team name' });
                continue;
            }
            try {
                const existing = await teamsEntity.findByEventAndName(eventId, teamData.name);
                if (existing) {
                    errors.push({ name: teamData.name, error: 'Team name already exists' });
                    continue;
                }
                const team = await teamsEntity.create({
                    eventId,
                    name: teamData.name,
                    color: teamData.color,
                    icon: teamData.icon,
                    metadata: teamData.metadata || {}
                });
                created.push(team);
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                errors.push({ name: teamData.name, error: errMsg });
            }
        }
        res.status(201).json({
            success: true,
            data: {
                created: created.length,
                failed: errors.length,
                teams: created,
                errors: errors.length > 0 ? errors : undefined
            },
            message: `Created ${created.length} teams, ${errors.length} failed`
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error batch creating teams:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to batch create teams',
            message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/teams/:id
 * Update a team
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, icon, score, metadata } = req.body;
        const existing = await teamsEntity.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        // Check name uniqueness if changing
        if (name && name !== existing.name) {
            const duplicate = await teamsEntity.findByEventAndName(existing.eventId, name);
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    error: 'Team name already exists for this event'
                });
            }
        }
        const updatedTeam = await teamsEntity.update(id, { name, color, icon, score, metadata });
        res.json({
            success: true,
            data: updatedTeam,
            message: 'Team updated successfully'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error updating team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to update team',
            message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/teams/:id
 * Delete a team (cascades to team members and board)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await teamsEntity.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        res.json({
            success: true,
            message: 'Team deleted successfully',
            deleted_id: id
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error deleting team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete team',
            message
        });
    }
});
/**
 * POST /api/admin/clan-events/teams/:id/recalculate-score
 * Recalculate a single team's score based on completed tiles
 */
router.post('/:id/recalculate-score', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await teamsEntity.findById(id);
        if (!team) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        const scoreResult = await query(`
      SELECT COALESCE(SUM(bt.points), 0) as total_points
      FROM bingo_board_tiles bbt
      JOIN bingo_boards bb ON bbt.board_id = bb.id
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      WHERE bb.team_id = $1 AND bbt.is_completed = true
    `, [id]);
        const newScore = parseInt(scoreResult[0]?.totalPoints || '0');
        const oldScore = team.score;
        if (newScore !== oldScore) {
            await teamsEntity.updateScore(id, newScore);
        }
        res.json({
            success: true,
            data: {
                oldScore,
                newScore,
                changed: newScore !== oldScore
            },
            message: newScore !== oldScore
                ? `Score updated from ${oldScore} to ${newScore}`
                : 'Score unchanged'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error recalculating team score:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to recalculate team score',
            message
        });
    }
});
// ============================================================================
// TEAM MEMBERS
// ============================================================================
/**
 * GET /api/admin/clan-events/teams/:id/leaderboard
 * Get team leaderboard (members sorted by individual score)
 */
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await teamsEntity.findById(id);
        if (!team) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        const leaderboard = await query(`
      SELECT 
        etm.id, etm.member_id, etm.osrs_account_id,
        etm.role, etm.individual_score,
        m.discord_tag,
        oa.osrs_nickname as osrs_account_name,
        COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
        COALESCE(SUM(btp.progress_value), 0) as total_progress
      FROM event_team_members etm
      JOIN members m ON etm.member_id = m.id
      LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
      LEFT JOIN bingo_tile_progress btp ON btp.completed_by_osrs_account_id = oa.id
      WHERE etm.team_id = $1
      GROUP BY etm.id, m.discord_tag, oa.osrs_nickname
      ORDER BY etm.individual_score DESC, total_progress DESC
    `, [id]);
        res.json({
            success: true,
            data: {
                team: { id: team.id, name: team.name, score: team.score },
                leaderboard: leaderboard.map((m, i) => ({
                    rank: i + 1,
                    ...m,
                    tilesCompleted: parseInt(m.tilesCompleted),
                    totalProgress: parseFloat(m.totalProgress)
                }))
            }
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching team leaderboard:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team leaderboard',
            message
        });
    }
});
/**
 * POST /api/admin/clan-events/teams/:id/members
 * Add a member to a team
 */
router.post('/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const { memberId, osrsAccountId, role = 'member', metadata = {} } = req.body;
        if (!memberId || !osrsAccountId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['memberId', 'osrsAccountId']
            });
        }
        const team = await teamsEntity.findById(id);
        if (!team) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        // Check if member exists
        const memberCheck = await query('SELECT id FROM members WHERE id = $1', [memberId]);
        if (memberCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        // Check if OSRS account belongs to member
        const accountCheck = await query('SELECT id FROM osrs_accounts WHERE id = $1 AND discord_id = (SELECT discord_id FROM members WHERE id = $2)', [osrsAccountId, memberId]);
        if (accountCheck.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'OSRS account not found or does not belong to this member'
            });
        }
        // Check if already on team
        const existing = await teamMembersEntity.findByTeamAndMember(id, memberId);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Member is already on this team'
            });
        }
        const teamMember = await teamMembersEntity.create({
            teamId: id,
            memberId,
            osrsAccountId,
            role,
            metadata
        });
        res.status(201).json({
            success: true,
            data: teamMember,
            message: 'Member added to team successfully'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error adding member to team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to add member to team',
            message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/teams/:teamId/members/:memberId
 * Update a team member
 */
router.patch('/:teamId/members/:memberId', async (req, res) => {
    try {
        const { teamId, memberId } = req.params;
        const { role, individualScore, metadata } = req.body;
        const existing = await teamMembersEntity.findById(memberId);
        if (!existing || existing.teamId !== teamId) {
            return res.status(404).json({
                success: false,
                error: 'Team member not found'
            });
        }
        const updateData = {};
        if (role !== undefined)
            updateData.role = role;
        if (individualScore !== undefined)
            updateData.individualScore = individualScore;
        if (metadata !== undefined)
            updateData.metadata = metadata;
        const updated = await teamMembersEntity.update(memberId, updateData);
        res.json({
            success: true,
            data: updated,
            message: 'Team member updated successfully'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error updating team member:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to update team member',
            message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/teams/:teamId/members/:memberId
 * Remove a member from a team
 */
router.delete('/:teamId/members/:memberId', async (req, res) => {
    try {
        const { teamId, memberId } = req.params;
        const existing = await teamMembersEntity.findById(memberId);
        if (!existing || existing.teamId !== teamId) {
            return res.status(404).json({
                success: false,
                error: 'Team member not found'
            });
        }
        await teamMembersEntity.delete(memberId);
        res.json({
            success: true,
            message: 'Member removed from team successfully',
            deleted_id: memberId
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error removing member from team:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to remove member from team',
            message
        });
    }
});
/**
 * POST /api/admin/clan-events/teams/:fromTeamId/members/:memberId/transfer
 * Transfer a member from one team to another
 */
router.post('/:fromTeamId/members/:memberId/transfer', async (req, res) => {
    try {
        const { fromTeamId, memberId } = req.params;
        const { toTeamId } = req.body;
        if (!toTeamId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: toTeamId'
            });
        }
        // Get source member
        const sourceMember = await teamMembersEntity.findById(memberId);
        if (!sourceMember || sourceMember.teamId !== fromTeamId) {
            return res.status(404).json({
                success: false,
                error: 'Team member not found in source team'
            });
        }
        // Check destination team exists
        const destTeam = await teamsEntity.findById(toTeamId);
        if (!destTeam) {
            return res.status(404).json({
                success: false,
                error: 'Destination team not found'
            });
        }
        // Check not already on destination team
        const existingDest = await teamMembersEntity.findByTeamAndMember(toTeamId, sourceMember.memberId);
        if (existingDest) {
            return res.status(409).json({
                success: false,
                error: 'Member is already on the destination team'
            });
        }
        // Delete from source, create in destination
        await teamMembersEntity.delete(memberId);
        const newMember = await teamMembersEntity.create({
            teamId: toTeamId,
            memberId: sourceMember.memberId,
            osrsAccountId: sourceMember.osrsAccountId,
            role: sourceMember.role,
            individualScore: sourceMember.individualScore,
            metadata: sourceMember.metadata
        });
        res.json({
            success: true,
            data: {
                fromTeam: fromTeamId,
                toTeam: toTeamId,
                member: newMember
            },
            message: 'Member transferred successfully'
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error transferring member:', message);
        res.status(500).json({
            success: false,
            error: 'Failed to transfer member',
            message
        });
    }
});
// Mount progress routes
router.use('/:teamId/progress', progressRouter);
export default router;
