import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import {
	getMemberFromHeaders,
	getEventParticipation,
	EventListItem,
	EventDetail,
	TeamMember,
	BoardTileWithProgress,
	TileProgressEntry,
	TileEffect,
	LineEffect,
	BoardTileEffect
} from './types.js';

const router = Router();

/**
 * GET /api/app/clan-events/events
 * Get list of all active events
 * Shows team information only for events where the user is participating
 */
router.get('/', async (req, res: Response) => {
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
				teamId: p.team_id,
				teamName: p.team_name,
				teamScore: p.team_score
			}])
		);

		const response: EventListItem[] = events.map((event: any) => {
			const participation = participatingMap.get(event.id);
			return {
				id: event.id,
				name: event.name,
				eventType: event.event_type,
				status: event.status,
				startDate: event.start_date,
				endDate: event.end_date,
				teamCount: parseInt(event.total_teams),
				isParticipating: !!participation,
				teamId: participation?.teamId,
				teamName: participation?.teamName,
				teamScore: participation?.teamScore
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
 * GET /api/app/clan-events/events/my-events
 * Get all events the user is participating in (past and present)
 */
router.get('/my-events', async (req, res: Response) => {
	try {
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		const events = await query(`
			SELECT 
				e.id,
				e.name,
				e.event_type,
				e.status,
				e.start_date,
				e.end_date,
				et.id as team_id,
				et.name as team_name,
				et.color as team_color,
				et.icon as team_icon,
				et.score as team_score,
				etm.role,
				etm.individual_score
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			JOIN events e ON et.event_id = e.id
			WHERE etm.member_id = $1
			ORDER BY 
				CASE e.status 
					WHEN 'active' THEN 1 
					WHEN 'paused' THEN 2 
					WHEN 'scheduled' THEN 3 
					ELSE 4 
				END,
				e.start_date DESC NULLS LAST
		`, [member.id]);

		res.json({
			success: true,
			data: events.map((e: any) => ({
				id: e.id,
				name: e.name,
				eventType: e.event_type,
				status: e.status,
				startDate: e.start_date,
				endDate: e.end_date,
				team: {
					id: e.team_id,
					name: e.team_name,
					color: e.team_color,
					icon: e.team_icon,
					score: e.team_score
				},
				myRole: e.role,
				myScore: e.individual_score
			}))
		});
	} catch (error: any) {
		console.error('Error fetching user events:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch user events',
			message: error.message
		});
	}
});

/**
 * Helper to map progress entry from DB to camelCase
 */
const mapProgressEntry = (p: any): TileProgressEntry => ({
	id: p.id,
	osrsAccountId: p.osrs_account_id,
	progressValue: p.progress_value,
	progressMetadata: p.progress_metadata,
	completionType: p.completion_type,
	completedAt: p.completed_at,
	completedByOsrsAccountId: p.completed_by_osrs_account_id,
	completedByMemberId: p.completed_by_member_id,
	recordedAt: p.recorded_at
});

/**
 * Helper to map tile effect from DB to camelCase
 */
const mapTileEffect = (e: any): TileEffect => ({
	id: e.id,
	buffName: e.buff_name,
	buffType: e.buff_type,
	effectType: e.effect_type,
	effectValue: e.effect_value,
	buffIcon: e.buff_icon,
	isActive: e.is_active,
	expiresAt: e.expires_at
});

/**
 * Helper to map line effect from DB to camelCase
 */
const mapLineEffect = (e: any): LineEffect => ({
	id: e.id,
	lineType: e.line_type,
	lineIdentifier: e.line_identifier,
	buffName: e.buff_name,
	buffType: e.buff_type,
	effectType: e.effect_type,
	effectValue: e.effect_value,
	buffIcon: e.buff_icon,
	isActive: e.is_active,
	expiresAt: e.expires_at
});

/**
 * Helper to map board tile effect from DB to camelCase
 */
const mapBoardTileEffect = (e: any): BoardTileEffect => ({
	id: e.id,
	boardTileId: e.board_tile_id,
	buffName: e.buff_name,
	buffType: e.buff_type,
	effectType: e.effect_type,
	effectValue: e.effect_value,
	buffIcon: e.buff_icon,
	isActive: e.is_active,
	expiresAt: e.expires_at
});

/**
 * GET /api/app/clan-events/events/:eventId
 * Get event details for user's team (only if participating)
 * Includes board, tiles with full progress, team members, buffs/debuffs
 */
router.get('/:eventId', async (req, res: Response) => {
	try {
		const { eventId } = req.params;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Check if member is participating
		const participation = await getEventParticipation(member.id, eventId);

		if (!participation) {
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
		`, [participation.teamId]);

		const members: TeamMember[] = teamMembers.map((tm: any) => ({
			id: tm.id,
			memberId: tm.member_id,
			discordTag: tm.discord_tag,
			role: tm.role,
			osrsAccountId: tm.osrs_account_id,
			osrsAccountName: tm.osrs_account_name
		}));

		// Get team's board
		const boards = await query(
			'SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, participation.teamId]
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
				GROUP BY bbt.id, bt.task, bt.category, bt.difficulty, bt.icon, bt.description, bt.base_points, bt.requirements
				ORDER BY bbt.position
			`, [teamBoard.id]);

			// Get tile effects
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
			const tileEffectsByTile: Record<string, TileEffect[]> = {};
			tileEffects.forEach((effect: any) => {
				if (!tileEffectsByTile[effect.board_tile_id]) {
					tileEffectsByTile[effect.board_tile_id] = [];
				}
				if (showTileBuffs || effect.is_active) {
					tileEffectsByTile[effect.board_tile_id].push(mapTileEffect(effect));
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

			const rowEffects: LineEffect[] = lineEffects
				.filter((e: any) => e.line_type === 'row')
				.map(mapLineEffect);

			const columnEffects: LineEffect[] = lineEffects
				.filter((e: any) => e.line_type === 'column')
				.map(mapLineEffect);

			// Map tiles with progress entries and tile effects
			const tilesWithProgress: BoardTileWithProgress[] = tiles.map((tile: any) => {
				// Map progress entries from snake_case to camelCase
				const progressEntries: TileProgressEntry[] = (tile.progress_entries || []).map(mapProgressEntry);

				return {
					id: tile.id,
					boardId: tile.board_id,
					tileId: tile.tile_id,
					position: tile.position,
					isCompleted: tile.is_completed,
					completedAt: tile.completed_at,
					task: tile.task,
					category: tile.category,
					difficulty: tile.difficulty,
					icon: tile.icon,
					description: tile.description,
					basePoints: tile.base_points,
					requirements: tile.requirements,
					progressEntries,
					teamTotalXpGained: tile.team_total_xp_gained,
					tileEffects: tileEffectsByTile[tile.id] || undefined
				};
			});

			board = {
				id: teamBoard.id,
				columns: teamBoard.columns,
				rows: teamBoard.rows,
				metadata: teamBoard.metadata,
				tiles: tilesWithProgress,
				tileEffects: tileEffects
					.filter((e: any) => showTileBuffs || e.is_active)
					.map(mapBoardTileEffect),
				rowEffects,
				columnEffects
			};
		}

		const response: EventDetail = {
			id: event.id,
			name: event.name,
			description: event.description,
			eventType: event.event_type,
			status: event.status,
			startDate: event.start_date,
			endDate: event.end_date,
			config: event.config,
			team: {
				id: participation.teamId,
				name: participation.teamName,
				color: participation.color,
				icon: participation.icon,
				score: participation.score,
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

export default router;
