/**
 * Bingo Service
 *
 * Query service for bingo-related data. Provides methods for fetching
 * board tiles, progress, and team statistics.
 *
 * Note: Event processing is handled by TileProgressService.
 * This service is for data retrieval and participant checking.
 */
import { query } from '../../../db/connection.js';
import { OsrsAccountsService } from '../../osrs-accounts/osrs-accounts.service.js';
/**
 * Bingo query service for data retrieval and participant checking
 */
export class BingoService {
    // ============================================================================
    // Participant Checking
    // ============================================================================
    /**
     * Checks if a player is participating in an active bingo event.
     *
     * A player is considered "in an active bingo event" when:
     * 1. They have an OSRS account registered in the system
     * 2. That account is a member of a team (event_team_members)
     * 3. The team belongs to an event of type 'bingo'
     * 4. The event status is 'active'
     * 5. The current time is within the event's start/end date window
     *
     * @param osrsAccountId - Direct account ID (preferred if available)
     * @param playerName - Player's OSRS nickname (used to lookup account ID if not provided)
     * @returns true if player is in an active bingo event, false otherwise
     */
    static isPlayerInActiveBingoEvent = async (osrsAccountId, playerName) => {
        const accountId = osrsAccountId ?? (playerName ? (await OsrsAccountsService.getAccountByNickname(playerName))?.id : undefined);
        if (!accountId)
            return false;
        const result = await query(`
      SELECT COUNT(*) as count
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.event_type = 'bingo'
        AND e.status = 'active'
        AND (e.start_date IS NULL OR e.start_date <= NOW())
        AND (e.end_date IS NULL OR e.end_date > NOW())
    `, [accountId]);
        return parseInt(result[0].count) > 0;
    };
    // ============================================================================
    // Board Queries
    // ============================================================================
    /**
     * Get a team's board for an event
     */
    static getBoardForTeam = async (eventId, teamId) => {
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        return boards[0] || null;
    };
    /**
     * Get all tiles on a board with their details
     */
    static getBoardTiles = async (boardId) => {
        const tiles = await query(`
      SELECT
        bbt.id, bbt.board_id, bbt.tile_id, bbt.position,
        bbt.is_completed, bbt.completed_at, bbt.metadata,
        bbt.created_at, bbt.updated_at,
        bt.id as tile_lib_id, bt.task, bt.category, bt.difficulty,
        bt.description, bt.icon, bt.points, bt.requirements
      FROM bingo_board_tiles bbt
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      WHERE bbt.board_id = $1
      ORDER BY bbt.position
    `, [boardId]);
        return tiles.map((row) => ({
            id: row.id,
            boardId: row.board_id,
            tileId: row.tile_id,
            position: row.position,
            isCompleted: row.is_completed,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            metadata: (row.metadata || {}),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            tile: {
                id: row.tile_lib_id,
                task: row.task,
                category: row.category,
                difficulty: row.difficulty,
                description: row.description,
                icon: row.icon,
                points: row.points,
                requirements: row.requirements
            }
        }));
    };
    /**
     * Get incomplete tiles for a board
     */
    static getIncompleteTiles = async (boardId) => {
        const allTiles = await this.getBoardTiles(boardId);
        return allTiles.filter(t => !t.isCompleted);
    };
    /**
     * Get completed tiles for a board
     */
    static getCompletedTiles = async (boardId) => {
        const allTiles = await this.getBoardTiles(boardId);
        return allTiles.filter(t => t.isCompleted);
    };
    /**
     * Check if a tile is completed on a board
     */
    static isTileCompleted = async (boardId, position) => {
        const result = await query('SELECT is_completed FROM bingo_board_tiles WHERE board_id = $1 AND position = $2', [boardId, position]);
        return result[0]?.is_completed ?? false;
    };
    // ============================================================================
    // Progress Queries
    // ============================================================================
    /**
     * Get progress for a specific board tile
     */
    static getTileProgress = async (boardTileId) => {
        const result = await query(`
      SELECT
        progress_value,
        progress_metadata,
        completion_type,
        completed_at,
        completed_by_osrs_account_id
      FROM bingo_tile_progress
      WHERE board_tile_id = $1
    `, [boardTileId]);
        if (result.length === 0)
            return null;
        const row = result[0];
        return {
            progressValue: parseFloat(row.progress_value) || 0,
            metadata: (row.progress_metadata || {}),
            completionType: row.completion_type,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            completedByOsrsAccountId: row.completed_by_osrs_account_id
        };
    };
    /**
     * Get all progress entries for a board
     */
    static getBoardProgress = async (boardId) => {
        const result = await query(`
      SELECT
        btp.board_tile_id,
        bbt.position,
        btp.progress_value,
        bbt.is_completed,
        btp.progress_metadata
      FROM bingo_tile_progress btp
      JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
      WHERE bbt.board_id = $1
      ORDER BY bbt.position
    `, [boardId]);
        return result.map((row) => ({
            boardTileId: row.board_tile_id,
            position: row.position,
            progressValue: parseFloat(row.progress_value) || 0,
            isCompleted: row.is_completed,
            metadata: (row.progress_metadata || {})
        }));
    };
    /**
     * Get all progress entries for a player (OSRS account) across all active events
     */
    static getPlayerProgress = async (osrsAccountId) => {
        const result = await query(`
      SELECT
        btp.board_tile_id,
        bbt.tile_id,
        bbt.position,
        bt.task,
        bt.category,
        bt.difficulty,
        btp.progress_value,
        bbt.is_completed,
        bbt.completed_at,
        btp.progress_metadata
      FROM bingo_tile_progress btp
      JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      JOIN bingo_boards bb ON bbt.board_id = bb.id
      JOIN events e ON bb.event_id = e.id
      WHERE btp.completed_by_osrs_account_id = $1
        AND e.status = 'active'
      ORDER BY bbt.completed_at DESC NULLS LAST
    `, [osrsAccountId]);
        return result.map((row) => ({
            boardTileId: row.board_tile_id,
            tileId: row.tile_id,
            position: row.position,
            task: row.task,
            category: row.category,
            difficulty: row.difficulty,
            progressValue: parseFloat(row.progress_value) || 0,
            isCompleted: row.is_completed,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            metadata: (row.progress_metadata || {})
        }));
    };
    // ============================================================================
    // Team & Leaderboard Queries
    // ============================================================================
    /**
     * Get team progress summary for an event
     */
    static getTeamProgressSummary = async (eventId, teamId) => {
        const board = await this.getBoardForTeam(eventId, teamId);
        if (!board)
            return null;
        const stats = await query(`
      SELECT
        et.id as team_id,
        et.name as team_name,
        COUNT(bbt.id) as total_tiles,
        COUNT(bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
        COALESCE(SUM(bt.points) FILTER (WHERE bbt.is_completed = true), 0) as total_points
      FROM event_teams et
      JOIN bingo_boards bb ON bb.team_id = et.id AND bb.event_id = $1
      LEFT JOIN bingo_board_tiles bbt ON bbt.board_id = bb.id
      LEFT JOIN bingo_tiles bt ON bt.id = bbt.tile_id
      WHERE et.id = $2
      GROUP BY et.id, et.name
    `, [eventId, teamId]);
        if (stats.length === 0)
            return null;
        const row = stats[0];
        const totalTiles = parseInt(row.total_tiles) || 0;
        const completedTiles = parseInt(row.completed_tiles) || 0;
        return {
            teamId: row.team_id,
            teamName: row.team_name,
            totalTiles,
            completedTiles,
            completionPercentage: totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0,
            totalPoints: parseInt(row.total_points) || 0
        };
    };
    /**
     * Get leaderboard for an event (all teams ranked by completion)
     */
    static getEventLeaderboard = async (eventId) => {
        const result = await query(`
      SELECT
        et.id as team_id,
        et.name as team_name,
        COUNT(bbt.id) as total_tiles,
        COUNT(bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
        COALESCE(SUM(bt.points) FILTER (WHERE bbt.is_completed = true), 0) as total_points
      FROM event_teams et
      JOIN bingo_boards bb ON bb.team_id = et.id AND bb.event_id = $1
      LEFT JOIN bingo_board_tiles bbt ON bbt.board_id = bb.id
      LEFT JOIN bingo_tiles bt ON bt.id = bbt.tile_id
      WHERE et.event_id = $1
      GROUP BY et.id, et.name
      ORDER BY total_points DESC, completed_tiles DESC
    `, [eventId]);
        return result.map((row) => {
            const totalTiles = parseInt(row.total_tiles) || 0;
            const completedTiles = parseInt(row.completed_tiles) || 0;
            return {
                teamId: row.team_id,
                teamName: row.team_name,
                totalTiles,
                completedTiles,
                completionPercentage: totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0,
                totalPoints: parseInt(row.total_points) || 0
            };
        });
    };
}
