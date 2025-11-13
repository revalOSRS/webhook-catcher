import { Router, Request, Response } from 'express';
import { query } from '../../../db/connection.js';

const router = Router();

/**
 * GET /api/bingo/teams
 * Get all teams with optional filtering by event_id
 * Query params: event_id, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { event_id, limit = '50', offset = '0' } = req.query;

		let sql = `
			SELECT 
				et.*,
				e.name as event_name,
				e.status as event_status,
				COUNT(etm.id) as member_count
			FROM event_teams et
			JOIN events e ON et.event_id = e.id
			LEFT JOIN event_team_members etm ON et.id = etm.team_id
			WHERE 1=1
		`;

		const params: any[] = [];
		let paramIndex = 1;

		if (event_id) {
			sql += ` AND et.event_id = $${paramIndex}`;
			params.push(event_id);
			paramIndex++;
		}

		sql += `
			GROUP BY et.id, e.name, e.status
			ORDER BY et.score DESC, et.created_at DESC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const teams = await query(sql, params);

		res.json({
			success: true,
			data: teams,
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string)
			}
		});
	} catch (error: any) {
		console.error('Error fetching teams:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch teams',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/teams/:id
 * Get a single team with all its members
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Get team details
		const teams = await query(`
			SELECT 
				et.*,
				e.name as event_name,
				e.status as event_status,
				e.event_type
			FROM event_teams et
			JOIN events e ON et.event_id = e.id
			WHERE et.id = $1
		`, [id]);

		if (teams.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found'
			});
		}

		const team = teams[0];

		// Get all members
		const members = await query(`
			SELECT 
				etm.*,
				m.discord_id,
				m.discord_username,
				m.discord_name,
				m.discord_discriminator,
				m.discord_avatar
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			WHERE etm.team_id = $1
			ORDER BY etm.role DESC, etm.individual_score DESC, etm.joined_at ASC
		`, [id]);

		res.json({
			success: true,
			data: {
				...team,
				members
			}
		});
	} catch (error: any) {
		console.error('Error fetching team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/teams
 * Create a new team
 * Body: { event_id, name, color, icon, metadata }
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const {
			event_id,
			name,
			color,
			icon,
			metadata = {}
		} = req.body;

		// Validation
		if (!event_id || !name) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['event_id', 'name']
			});
		}

		// Check if event exists
		const eventCheck = await query('SELECT id FROM events WHERE id = $1', [event_id]);
		if (eventCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		// Check if team name is already taken for this event
		const nameCheck = await query(
			'SELECT id FROM event_teams WHERE event_id = $1 AND name = $2',
			[event_id, name]
		);
		if (nameCheck.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'Team name already exists for this event'
			});
		}

		const result = await query(`
			INSERT INTO event_teams (
				event_id, name, color, icon, metadata
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`, [event_id, name, color, icon, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Team created successfully'
		});
	} catch (error: any) {
		console.error('Error creating team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create team',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/teams/:id
 * Update a team
 */
router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Check if team exists
		const existing = await query('SELECT id, event_id FROM event_teams WHERE id = $1', [id]);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found'
			});
		}

		// If updating name, check for duplicates
		if (updates.name) {
			const nameCheck = await query(
				'SELECT id FROM event_teams WHERE event_id = $1 AND name = $2 AND id != $3',
				[existing[0].event_id, updates.name, id]
			);
			if (nameCheck.length > 0) {
				return res.status(409).json({
					success: false,
					error: 'Team name already exists for this event'
				});
			}
		}

		// Build dynamic update query
		const allowedFields = ['name', 'color', 'icon', 'score', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				if (key === 'metadata') {
					values.push(JSON.stringify(value));
				} else {
					values.push(value);
				}
				paramIndex++;
			}
		}

		if (updateFields.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No valid fields to update',
				allowed_fields: allowedFields
			});
		}

		values.push(id);
		const sql = `
			UPDATE event_teams 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Team updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update team',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/teams/:id
 * Delete a team
 */
router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM event_teams WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found'
			});
		}

		res.json({
			success: true,
			message: 'Team deleted successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error deleting team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete team',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/teams/:id/members
 * Add a member to a team
 * Body: { member_id, role, metadata }
 */
router.post('/:id/members', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { member_id, role = 'member', metadata = {} } = req.body;

		// Validation
		if (!member_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required field: member_id'
			});
		}

		// Check if team exists
		const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1', [id]);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found'
			});
		}

		// Check if member exists
		const memberCheck = await query('SELECT id FROM members WHERE id = $1', [member_id]);
		if (memberCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Member not found'
			});
		}

		// Check if member is already on this team
		const existingMember = await query(
			'SELECT id FROM event_team_members WHERE team_id = $1 AND member_id = $2',
			[id, member_id]
		);
		if (existingMember.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'Member is already on this team'
			});
		}

		const result = await query(`
			INSERT INTO event_team_members (
				team_id, member_id, role, metadata
			)
			VALUES ($1, $2, $3, $4)
			RETURNING *
		`, [id, member_id, role, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Member added to team successfully'
		});
	} catch (error: any) {
		console.error('Error adding member to team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to add member to team',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/teams/:teamId/members/:memberId
 * Update a team member (role, individual_score, metadata)
 */
router.patch('/:teamId/members/:memberId', async (req: Request, res: Response) => {
	try {
		const { teamId, memberId } = req.params;
		const updates = req.body;

		// Check if team member exists
		const existing = await query(
			'SELECT id FROM event_team_members WHERE team_id = $1 AND id = $2',
			[teamId, memberId]
		);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team member not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['role', 'individual_score', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				if (key === 'metadata') {
					values.push(JSON.stringify(value));
				} else {
					values.push(value);
				}
				paramIndex++;
			}
		}

		if (updateFields.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No valid fields to update',
				allowed_fields: allowedFields
			});
		}

		values.push(memberId);
		const sql = `
			UPDATE event_team_members 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Team member updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating team member:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update team member',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/teams/:teamId/members/:memberId
 * Remove a member from a team
 */
router.delete('/:teamId/members/:memberId', async (req: Request, res: Response) => {
	try {
		const { teamId, memberId } = req.params;

		const result = await query(
			'DELETE FROM event_team_members WHERE team_id = $1 AND id = $2 RETURNING id',
			[teamId, memberId]
		);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team member not found'
			});
		}

		res.json({
			success: true,
			message: 'Member removed from team successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error removing member from team:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to remove member from team',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/teams/:id/leaderboard
 * Get team leaderboard (members sorted by individual score)
 */
router.get('/:id/leaderboard', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Check if team exists
		const teamCheck = await query('SELECT id, name FROM event_teams WHERE id = $1', [id]);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found'
			});
		}

		const leaderboard = await query(`
			SELECT 
				etm.*,
				m.discord_username,
				m.discord_name,
				m.discord_avatar,
				COUNT(btp.id) as tiles_contributed_to,
				COALESCE(SUM(btp.progress_value), 0) as total_progress
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			LEFT JOIN bingo_tile_progress btp ON btp.osrs_account_id IN (
				SELECT id FROM osrs_accounts WHERE member_code = m.member_code
			)
			WHERE etm.team_id = $1
			GROUP BY etm.id, m.discord_username, m.discord_name, m.discord_avatar
			ORDER BY etm.individual_score DESC, total_progress DESC
		`, [id]);

		res.json({
			success: true,
			data: {
				team: teamCheck[0],
				leaderboard
			}
		});
	} catch (error: any) {
		console.error('Error fetching team leaderboard:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team leaderboard',
			message: error.message
		});
	}
});

export default router;

