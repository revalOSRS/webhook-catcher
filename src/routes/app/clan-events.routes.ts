import { Router, Request, Response } from 'express';
import { query } from '../../db/connection.js';

const router = Router();

/**
 * Helper to get member from headers
 */
async function getMemberFromHeaders(req: Request): Promise<any | null> {
	const memberCode = req.headers['x-member-code'] as string;
	const discordId = req.headers['x-discord-id'] as string;

	if (!memberCode || !discordId) {
		return null;
	}

	const code = parseInt(memberCode);
	if (isNaN(code)) {
		return null;
	}

	const members = await query(
		'SELECT id, discord_id, member_code, discord_tag FROM members WHERE discord_id = $1 AND member_code = $2 AND is_active = true',
		[discordId, code]
	);

	return members.length > 0 ? members[0] : null;
}

/**
 * Types for responses
 */
interface EventListItem {
	id: string;
	name: string;
	event_type: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
	team_count?: number;
	is_participating?: boolean;
	team_id?: string;
	team_name?: string;
	team_score?: number;
}

interface TeamMember {
	id: string;
	member_id: number;
	discord_tag: string;
	role: string;
	osrs_account_id: number | null;
	osrs_account_name: string | null;
}

interface TileProgressEntry {
	id: string;
	osrs_account_id: number | null;
	progress_value: number;
	progress_metadata: Record<string, any>;
	completion_type: 'auto' | 'manual_admin' | null;
	completed_at: string | null;
	completed_by_osrs_account_id: number | null;
	completed_by_member_id: number | null;
	recorded_at: string;
}

interface BoardTileWithProgress {
	id: string;
	board_id: string;
	tile_id: string;
	position: string;
	custom_points: number | null;
	is_completed: boolean;
	completed_at: string | null;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	description: string | null;
	base_points: number;
	bonus_tiers: any[];
	requirements: any;
	progress_entries: TileProgressEntry[];
	team_total_xp_gained?: number | null;
	tile_effects?: Array<{
		id: string;
		buff_name: string;
		buff_type: 'buff' | 'debuff';
		effect_type: string;
		effect_value: number;
		buff_icon: string | null;
		is_active: boolean;
		expires_at: string | null;
	}>;
}

interface EventDetail {
	id: string;
	name: string;
	description: string | null;
	event_type: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
	config: any;
	team: {
		id: string;
		name: string;
		color: string | null;
		icon: string | null;
		score: number;
		members: TeamMember[];
	};
	board?: {
		id: string;
		name: string;
		description: string | null;
		columns: number;
		rows: number;
		show_row_column_buffs: boolean;
		metadata: any;
		tiles: BoardTileWithProgress[];
		tile_effects: Array<{
			id: string;
			board_tile_id: string;
			buff_name: string;
			buff_type: 'buff' | 'debuff';
			effect_type: string;
			effect_value: number;
			buff_icon: string | null;
			is_active: boolean;
			expires_at: string | null;
		}>;
		row_effects: Array<{
			id: string;
			line_type: 'row';
			line_identifier: string;
			buff_name: string;
			buff_type: 'buff' | 'debuff';
			effect_type: string;
			effect_value: number;
			buff_icon: string | null;
			is_active: boolean;
			expires_at: string | null;
		}>;
		column_effects: Array<{
			id: string;
			line_type: 'column';
			line_identifier: string;
			buff_name: string;
			buff_type: 'buff' | 'debuff';
			effect_type: string;
			effect_value: number;
			buff_icon: string | null;
			is_active: boolean;
			expires_at: string | null;
		}>;
	};
}

/**
 * GET /api/app/clan-events
 * Get list of all active events
 * Shows team information only for events where the user is participating
 * Requires authentication (x-member-code and x-discord-id headers)
 * 
 * Returns: EventListItem[]
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Get all active events
		const events = await query(`
			SELECT 
				e.id,
				e.name,
				e.event_type,
				e.status,
				e.start_date,
				e.end_date,
				COUNT(DISTINCT et.id) as total_teams
			FROM events e
			LEFT JOIN event_teams et ON e.id = et.event_id
			WHERE e.status = 'active'
				AND (e.end_date IS NULL OR e.end_date > NOW())
			GROUP BY e.id, e.name, e.event_type, e.status, e.start_date, e.end_date
			ORDER BY e.start_date DESC NULLS LAST, e.created_at DESC
		`);

		// Get events where user is participating (for team info)
		const participating = await query(`
			SELECT 
				et.event_id,
				et.id as team_id,
				et.name as team_name,
				et.score as team_score
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			WHERE etm.member_id = $1
		`, [member.id]);

		const participatingMap = new Map(
			participating.map((p: any) => [p.event_id, {
				team_id: p.team_id,
				team_name: p.team_name,
				team_score: p.team_score
			}])
		);

		const response: EventListItem[] = events.map((event: any) => {
			const participation = participatingMap.get(event.id);
			return {
				id: event.id,
				name: event.name,
				event_type: event.event_type,
				status: event.status,
				start_date: event.start_date,
				end_date: event.end_date,
				team_count: parseInt(event.total_teams),
				is_participating: !!participation,
				team_id: participation?.team_id,
				team_name: participation?.team_name,
				team_score: participation?.team_score
			};
		});

		res.json({
			success: true,
			data: response
		});
	} catch (error: any) {
		console.error('Error fetching events:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch events',
			message: error.message
		});
	}
});

/**
 * GET /api/app/clan-events/:eventId
 * Get event details for user's team (only if participating)
 * Includes board, tiles with full progress, team members, buffs/debuffs
 * 
 * Returns: EventDetail
 */
router.get('/:eventId', async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Check if member is participating in this event and get their team
		const participation = await query(`
			SELECT 
				et.id as team_id,
				et.name as team_name,
				et.color,
				et.icon,
				et.score,
				e.id as event_id
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			JOIN events e ON et.event_id = e.id
			WHERE etm.member_id = $1 AND e.id = $2
			LIMIT 1
		`, [member.id, eventId]);

		if (participation.length === 0) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get event details
		const events = await query('SELECT * FROM events WHERE id = $1', [eventId]);
		if (events.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		const event = events[0];
		const team = participation[0];

		// Get team members
		const teamMembers = await query(`
			SELECT 
				etm.id,
				etm.member_id,
				m.discord_tag,
				etm.role,
				etm.osrs_account_id,
				oa.osrs_nickname as osrs_account_name
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			WHERE etm.team_id = $1
			ORDER BY etm.role, m.discord_tag
		`, [team.team_id]);

		const members: TeamMember[] = teamMembers.map((tm: any) => ({
			id: tm.id,
			member_id: tm.member_id,
			discord_tag: tm.discord_tag,
			role: tm.role,
			osrs_account_id: tm.osrs_account_id,
			osrs_account_name: tm.osrs_account_name
		}));

		// Get team's board
		const boards = await query(
			'SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, team.team_id]
		);

		let board = null;
		if (boards.length > 0) {
			const teamBoard = boards[0];

			// Get all tiles with requirements and progress entries
			const tiles = await query(`
				SELECT 
					bbt.*,
					bt.task,
					bt.category,
					bt.difficulty,
					bt.icon,
					bt.description,
					bt.base_points,
					bt.bonus_tiers,
					bt.requirements,
					COALESCE(
						json_agg(
							json_build_object(
								'id', btp.id,
								'osrs_account_id', btp.osrs_account_id,
								'progress_value', btp.progress_value,
								'progress_metadata', btp.progress_metadata,
								'completion_type', btp.completion_type,
								'completed_at', btp.completed_at,
								'completed_by_osrs_account_id', btp.completed_by_osrs_account_id,
								'completed_by_member_id', btp.completed_by_member_id,
								'recorded_at', btp.recorded_at
							)
						) FILTER (WHERE btp.id IS NOT NULL),
						'[]'::json
					) as progress_entries,
					-- For EXPERIENCE requirements, calculate team total XP gained
					CASE 
						WHEN (
							(bt.requirements->>'match_type' IS NOT NULL 
								AND EXISTS (
									SELECT 1 FROM jsonb_array_elements(COALESCE(bt.requirements->'requirements', '[]'::jsonb)) req
									WHERE req->>'type' = 'EXPERIENCE'
								))
							OR (bt.requirements->'tiers' IS NOT NULL
								AND EXISTS (
									SELECT 1 FROM jsonb_array_elements(bt.requirements->'tiers') tier
									WHERE tier->'requirement'->>'type' = 'EXPERIENCE'
								))
						)
						THEN (
							SELECT COALESCE(SUM(
								CASE 
									WHEN progress_metadata::text LIKE '%"gained_xp"%' 
									THEN COALESCE((progress_metadata->>'gained_xp')::numeric, 0)
									ELSE 0
								END
							), 0)
							FROM bingo_tile_progress
							WHERE board_tile_id = bbt.id
						)
						ELSE NULL
					END as team_total_xp_gained
				FROM bingo_board_tiles bbt
				JOIN bingo_tiles bt ON bbt.tile_id = bt.id
				LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
				WHERE bbt.board_id = $1
				GROUP BY bbt.id, bt.task, bt.category, bt.difficulty, bt.icon, bt.description, bt.base_points, bt.bonus_tiers, bt.requirements
				ORDER BY bbt.position
			`, [teamBoard.id]);

			// Get tile effects for all tiles (filtered by show_tile_buffs setting)
			const showTileBuffs = teamBoard.metadata?.show_tile_buffs !== false;
			const tileEffects = await query(`
				SELECT 
					bbte.*,
					bbd.name as buff_name,
					bbd.type as buff_type,
					bbd.effect_type,
					bbd.effect_value,
					bbd.icon as buff_icon
				FROM bingo_board_tile_effects bbte
				JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
				WHERE bbte.board_tile_id IN (SELECT id FROM bingo_board_tiles WHERE board_id = $1)
				AND (bbte.is_active = true OR $2 = true)
				ORDER BY bbte.applied_at DESC
			`, [teamBoard.id, showTileBuffs]);

			// Group tile effects by board_tile_id
			const tileEffectsByTile: Record<string, any[]> = {};
			tileEffects.forEach((effect: any) => {
				if (!tileEffectsByTile[effect.board_tile_id]) {
					tileEffectsByTile[effect.board_tile_id] = [];
				}
				// Filter inactive effects if show_tile_buffs is false
				if (showTileBuffs || effect.is_active) {
					tileEffectsByTile[effect.board_tile_id].push({
						id: effect.id,
						buff_name: effect.buff_name,
						buff_type: effect.buff_type,
						effect_type: effect.effect_type,
						effect_value: effect.effect_value,
						buff_icon: effect.buff_icon,
						is_active: effect.is_active,
						expires_at: effect.expires_at
					});
				}
			});

			// Get line effects (row and column)
			const lineEffects = await query(`
				SELECT 
					bble.*,
					bbd.name as buff_name,
					bbd.type as buff_type,
					bbd.effect_type,
					bbd.effect_value,
					bbd.icon as buff_icon
				FROM bingo_board_line_effects bble
				JOIN bingo_buffs_debuffs bbd ON bble.buff_debuff_id = bbd.id
				WHERE bble.board_id = $1 AND bble.is_active = true
				ORDER BY bble.line_type, bble.line_identifier
			`, [teamBoard.id]);

			const rowEffects = lineEffects
				.filter((e: any) => e.line_type === 'row')
				.map((e: any) => ({
					id: e.id,
					line_type: 'row' as const,
					line_identifier: e.line_identifier,
					buff_name: e.buff_name,
					buff_type: e.buff_type,
					effect_type: e.effect_type,
					effect_value: e.effect_value,
					buff_icon: e.buff_icon,
					is_active: e.is_active,
					expires_at: e.expires_at
				}));

			const columnEffects = lineEffects
				.filter((e: any) => e.line_type === 'column')
				.map((e: any) => ({
					id: e.id,
					line_type: 'column' as const,
					line_identifier: e.line_identifier,
					buff_name: e.buff_name,
					buff_type: e.buff_type,
					effect_type: e.effect_type,
					effect_value: e.effect_value,
					buff_icon: e.buff_icon,
					is_active: e.is_active,
					expires_at: e.expires_at
				}));

			// Map tiles with progress entries and tile effects
			const tilesWithProgress: BoardTileWithProgress[] = tiles.map((tile: any) => ({
				id: tile.id,
				board_id: tile.board_id,
				tile_id: tile.tile_id,
				position: tile.position,
				custom_points: tile.custom_points,
				is_completed: tile.is_completed,
				completed_at: tile.completed_at,
				task: tile.task,
				category: tile.category,
				difficulty: tile.difficulty,
				icon: tile.icon,
				description: tile.description,
				base_points: tile.base_points,
				bonus_tiers: tile.bonus_tiers,
				requirements: tile.requirements,
				progress_entries: tile.progress_entries || [],
				team_total_xp_gained: tile.team_total_xp_gained,
				tile_effects: tileEffectsByTile[tile.id] || undefined
			}));

			board = {
				id: teamBoard.id,
				name: teamBoard.name,
				description: teamBoard.description,
				columns: teamBoard.columns,
				rows: teamBoard.rows,
				show_row_column_buffs: teamBoard.show_row_column_buffs,
				metadata: teamBoard.metadata,
				tiles: tilesWithProgress,
				tile_effects: tileEffects.filter((e: any) => showTileBuffs || e.is_active).map((e: any) => ({
					id: e.id,
					board_tile_id: e.board_tile_id,
					buff_name: e.buff_name,
					buff_type: e.buff_type,
					effect_type: e.effect_type,
					effect_value: e.effect_value,
					buff_icon: e.buff_icon,
					is_active: e.is_active,
					expires_at: e.expires_at
				})),
				row_effects: rowEffects,
				column_effects: columnEffects
			};
		}

		const response: EventDetail = {
			id: event.id,
			name: event.name,
			description: event.description,
			event_type: event.event_type,
			status: event.status,
			start_date: event.start_date,
			end_date: event.end_date,
			config: event.config,
			team: {
				id: team.team_id,
				name: team.team_name,
				color: team.color,
				icon: team.icon,
				score: team.score,
				members
			},
			board
		};

		res.json({
			success: true,
			data: response
		});
	} catch (error: any) {
		console.error('Error fetching event details:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch event details',
			message: error.message
		});
	}
});

/**
 * GET /api/app/clan-events/:eventId/team/progress
 * Get team progress summary
 * 
 * Returns: Team progress stats
 */
router.get('/:eventId/team/progress', async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Check if member is participating in this event
		const participation = await query(`
			SELECT et.id as team_id
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			JOIN events e ON et.event_id = e.id
			WHERE etm.member_id = $1 AND e.id = $2
			LIMIT 1
		`, [member.id, eventId]);

		if (participation.length === 0) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		const teamId = participation[0].team_id;

		// Get team progress stats
		const stats = await query(`
			SELECT 
				COUNT(DISTINCT bbt.id) as total_tiles,
				COUNT(DISTINCT bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
				SUM(et.score) as team_score
			FROM bingo_boards bb
			JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			JOIN event_teams et ON bb.team_id = et.id
			WHERE bb.team_id = $1 AND bb.event_id = $2
		`, [teamId, eventId]);

		const progress = stats[0] || { total_tiles: 0, completed_tiles: 0, team_score: 0 };
		const completionPercentage = progress.total_tiles > 0 
			? (parseInt(progress.completed_tiles) / parseInt(progress.total_tiles)) * 100 
			: 0;

		res.json({
			success: true,
			data: {
				total_tiles: parseInt(progress.total_tiles),
				completed_tiles: parseInt(progress.completed_tiles),
				completion_percentage: Math.round(completionPercentage * 100) / 100,
				team_score: parseInt(progress.team_score) || 0
			}
		});
	} catch (error: any) {
		console.error('Error fetching team progress:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team progress',
			message: error.message
		});
	}
});

/**
 * GET /api/app/clan-events/:eventId/my-contributions
 * Get user's individual contributions to tiles
 * 
 * Returns: Array of tiles user has contributed to
 */
router.get('/:eventId/my-contributions', async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Check if member is participating in this event
		const participation = await query(`
			SELECT et.id as team_id
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			JOIN events e ON et.event_id = e.id
			WHERE etm.member_id = $1 AND e.id = $2
			LIMIT 1
		`, [member.id, eventId]);

		if (participation.length === 0) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get user's OSRS accounts
		const osrsAccounts = await query(
			'SELECT id FROM osrs_accounts WHERE discord_id = $1',
			[member.discord_id]
		);
		const osrsAccountIds = osrsAccounts.map((acc: any) => acc.id);

		if (osrsAccountIds.length === 0) {
			return res.json({
				success: true,
				data: []
			});
		}

		// Get tiles user has contributed to
		const contributions = await query(`
			SELECT 
				bbt.id as board_tile_id,
				bbt.position,
				bt.task,
				bt.category,
				bt.icon,
				btp.progress_value,
				btp.progress_metadata,
				btp.completion_type,
				btp.completed_at,
				btp.recorded_at
			FROM bingo_tile_progress btp
			JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bb.event_id = $1
				AND bb.team_id = $2
				AND btp.osrs_account_id = ANY($3::int[])
			ORDER BY btp.recorded_at DESC
		`, [eventId, participation[0].team_id, osrsAccountIds]);

		res.json({
			success: true,
			data: contributions
		});
	} catch (error: any) {
		console.error('Error fetching user contributions:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch user contributions',
			message: error.message
		});
	}
});

export default router;
