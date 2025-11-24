import { Router } from 'express';
import { query } from '../../db/connection.js';
const router = Router();
/**
 * Helper to get member from headers
 */
async function getMemberFromHeaders(req) {
    const memberCode = req.headers['x-member-code'];
    const discordId = req.headers['x-discord-id'];
    if (!memberCode || !discordId) {
        return null;
    }
    const code = parseInt(memberCode);
    if (isNaN(code)) {
        return null;
    }
    const members = await query('SELECT id, discord_id, member_code FROM members WHERE discord_id = $1 AND member_code = $2 AND is_active = true', [discordId, code]);
    return members.length > 0 ? members[0] : null;
}
/**
 * GET /api/clan-events
 * Get list of ongoing events (active, scheduled, paused)
 * Only shows events user is participating in with full details
 *
 * Returns: EventListItem[]
 */
router.get('/', async (req, res) => {
    try {
        const member = await getMemberFromHeaders(req);
        // Get ongoing events
        const events = await query(`
			SELECT 
				e.id,
				e.name,
				e.event_type,
				e.status,
				e.start_date,
				e.end_date,
				COUNT(DISTINCT et.id) as team_count
			FROM events e
			LEFT JOIN event_teams et ON e.id = et.event_id
			WHERE e.status IN ('active', 'scheduled', 'paused')
			AND (e.end_date IS NULL OR e.end_date > NOW())
			GROUP BY e.id, e.name, e.event_type, e.status, e.start_date, e.end_date
			ORDER BY e.start_date DESC NULLS LAST, e.created_at DESC
		`);
        // If member is authenticated, check which events they're participating in
        let participatingEventIds = [];
        if (member) {
            const participating = await query(`
				SELECT DISTINCT et.event_id
				FROM event_team_members etm
				JOIN event_teams et ON etm.team_id = et.id
				WHERE etm.member_id = $1
			`, [member.id]);
            participatingEventIds = participating.map((p) => p.event_id);
        }
        const response = events.map((event) => ({
            id: event.id,
            name: event.name,
            event_type: event.event_type,
            status: event.status,
            start_date: event.start_date,
            end_date: event.end_date,
            team_count: parseInt(event.team_count),
            is_participating: member ? participatingEventIds.includes(event.id) : false
        }));
        res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events',
            message: error.message
        });
    }
});
/**
 * GET /api/clan-events/:eventId
 * Get event details (only if participating)
 *
 * Returns: EventDetail
 */
router.get('/:eventId', async (req, res) => {
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
        // Get team's board
        const boards = await query('SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, team.team_id]);
        let board = null;
        if (boards.length > 0) {
            const teamBoard = boards[0];
            // Get tiles with progress
            const tiles = await query(`
				SELECT 
					bbt.*,
					bt.task,
					bt.category,
					bt.difficulty,
					bt.icon,
					bt.description,
					bt.base_points,
					bt.bonus_tiers
				FROM bingo_board_tiles bbt
				JOIN bingo_tiles bt ON bbt.tile_id = bt.id
				WHERE bbt.board_id = $1
				ORDER BY bbt.position
			`, [teamBoard.id]);
            // Get progress for user's OSRS accounts
            const osrsAccounts = await query('SELECT id FROM osrs_accounts WHERE discord_id = $1', [member.discord_id]);
            const osrsAccountIds = osrsAccounts.map((acc) => acc.id);
            const tilesWithProgress = await Promise.all(tiles.map(async (tile) => {
                let progress = null;
                if (osrsAccountIds.length > 0) {
                    const progressData = await query(`
							SELECT progress_value, progress_metadata, recorded_at
							FROM bingo_tile_progress
							WHERE board_tile_id = $1 AND osrs_account_id = ANY($2::int[])
							ORDER BY recorded_at DESC
							LIMIT 1
						`, [tile.id, osrsAccountIds]);
                    if (progressData.length > 0) {
                        progress = progressData[0];
                    }
                }
                // Get tile effects (only active ones, filtered by show_tile_buffs setting)
                // If show_tile_buffs is false in metadata, hide inactive effects
                let tileEffects = [];
                const showTileBuffs = teamBoard.metadata?.show_tile_buffs !== false;
                const effects = await query(`
						SELECT 
							bbte.id,
							bbd.name as buff_name,
							bbd.type as buff_type,
							bbd.effect_type,
							bbd.effect_value,
							bbd.icon as buff_icon,
							bbte.is_active,
							bbte.expires_at
						FROM bingo_board_tile_effects bbte
						JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
						WHERE bbte.board_tile_id = $1
						AND (bbte.is_active = true OR $2 = true)
						ORDER BY bbte.applied_at DESC
					`, [tile.id, showTileBuffs]);
                // Filter: if show_tile_buffs is false, only return active effects
                if (showTileBuffs) {
                    tileEffects = effects;
                }
                else {
                    tileEffects = effects.filter((e) => e.is_active === true);
                }
                return {
                    ...tile,
                    progress,
                    tile_effects: tileEffects.length > 0 ? tileEffects : undefined
                };
            }));
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
            const rowEffects = lineEffects.filter((e) => e.line_type === 'row');
            const columnEffects = lineEffects.filter((e) => e.line_type === 'column');
            board = {
                ...teamBoard,
                tiles: tilesWithProgress,
                row_effects: rowEffects,
                column_effects: columnEffects
            };
        }
        const response = {
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
                score: team.score
            },
            board
        };
        res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event details',
            message: error.message
        });
    }
});
export default router;
