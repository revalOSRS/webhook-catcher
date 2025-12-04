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
import type { BingoBoardTile } from './entities/bingo-board-tiles.entity.js';
import type { BingoTile } from './entities/bingo-tiles.entity.js';
import { BingoTileCategory, BingoTileDifficulty } from './entities/bingo-tiles.entity.js';
import type { BingoTileProgress } from './entities/bingo-tile-progress.entity.js';

/**
 * Board tile with its associated tile definition from the library
 */
export type BoardTileWithDetails = BingoBoardTile & {
  tile: Pick<BingoTile, 'id' | 'task' | 'category' | 'difficulty' | 'description' | 'icon' | 'points' | 'requirements'>;
};

/**
 * Team progress summary (aggregated query result)
 */
export interface TeamProgressSummary {
  teamId: string;
  teamName: string;
  totalTiles: number;
  completedTiles: number;
  completionPercentage: number;
  totalPoints: number;
}

/**
 * Player progress entry with tile info (aggregated query result)
 */
export type PlayerProgressEntry = Pick<BingoTileProgress, 'boardTileId' | 'completedAt'> & {
  tileId: string;
  position: string;
  task: string;
  category: string;
  difficulty: string;
  progressValue: number;
  isCompleted: boolean;
  metadata: Record<string, unknown>;
};

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
  static isPlayerInActiveBingoEvent = async (
    osrsAccountId?: number,
    playerName?: string
  ): Promise<boolean> => {
    const accountId = osrsAccountId ?? (
      playerName ? (await OsrsAccountsService.getAccountByNickname(playerName))?.id : undefined
    );
    
    if (!accountId) return false;

    // Note: Event dates are stored as Estonian time (Europe/Tallinn) in the database
    // We use AT TIME ZONE to properly convert to UTC for comparison with NOW()
    // start_date is REQUIRED and must have passed for events to be processed
    const result = await query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.event_type = 'bingo'
        AND e.status = 'active'
        AND e.start_date IS NOT NULL
        AND (e.start_date AT TIME ZONE 'Europe/Tallinn') <= NOW()
        AND (e.end_date IS NULL OR (e.end_date AT TIME ZONE 'Europe/Tallinn') > NOW())
    `, [accountId]);

    return parseInt(result[0].count) > 0;
  };

  // ============================================================================
  // Board Queries
  // ============================================================================

  /**
   * Get a team's board for an event
   */
  static getBoardForTeam = async (eventId: string, teamId: string): Promise<{ id: string } | null> => {
    const boards = await query<{ id: string }>(
      'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
      [eventId, teamId]
    );
    return boards[0] || null;
  };

  /**
   * Get all tiles on a board with their details
   */
  static getBoardTiles = async (boardId: string): Promise<BoardTileWithDetails[]> => {
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

    // Note: query() auto-converts snake_case to camelCase
    return tiles.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      boardId: row.boardId as string,
      tileId: row.tileId as string,
      position: row.position as string,
      isCompleted: row.isCompleted as boolean,
      completedAt: row.completedAt ? new Date(row.completedAt as string) : undefined,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
      tile: {
        id: row.tileLibId as string,
        task: row.task as string,
        category: row.category as BingoTileCategory,
        difficulty: row.difficulty as BingoTileDifficulty,
        description: row.description as string | undefined,
        icon: row.icon as string | undefined,
        points: row.points as number,
        requirements: row.requirements as BingoTile['requirements']
      }
    }));
  };

  /**
   * Get incomplete tiles for a board
   */
  static getIncompleteTiles = async (boardId: string): Promise<BoardTileWithDetails[]> => {
    const allTiles = await this.getBoardTiles(boardId);
    return allTiles.filter(t => !t.isCompleted);
  };

  /**
   * Get completed tiles for a board
   */
  static getCompletedTiles = async (boardId: string): Promise<BoardTileWithDetails[]> => {
    const allTiles = await this.getBoardTiles(boardId);
    return allTiles.filter(t => t.isCompleted);
  };

  /**
   * Check if a tile is completed on a board
   */
  static isTileCompleted = async (boardId: string, position: string): Promise<boolean> => {
    // Note: query() auto-converts snake_case to camelCase
    const result = await query<{ isCompleted: boolean }>(
      'SELECT is_completed FROM bingo_board_tiles WHERE board_id = $1 AND position = $2',
      [boardId, position]
    );
    return result[0]?.isCompleted ?? false;
  };

  // ============================================================================
  // Progress Queries
  // ============================================================================

  /**
   * Get progress for a specific board tile
   */
  static getTileProgress = async (boardTileId: string): Promise<Pick<
    BingoTileProgress, 
    'completionType' | 'completedAt' | 'completedByOsrsAccountId'
  > & { progressValue: number; metadata: Record<string, unknown> } | null> => {
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

    if (result.length === 0) return null;

    // Note: query() auto-converts snake_case to camelCase
    const row = result[0];
    return {
      progressValue: parseFloat(row.progressValue as string) || 0,
      metadata: (row.progressMetadata || {}) as Record<string, unknown>,
      completionType: row.completionType as BingoTileProgress['completionType'],
      completedAt: row.completedAt ? new Date(row.completedAt as string) : undefined,
      completedByOsrsAccountId: row.completedByOsrsAccountId as number | undefined
    };
  };

  /**
   * Get all progress entries for a board
   */
  static getBoardProgress = async (boardId: string): Promise<Array<{
    boardTileId: string;
    position: string;
    progressValue: number;
    isCompleted: boolean;
    metadata: Record<string, unknown>;
  }>> => {
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

    // Note: query() auto-converts snake_case to camelCase
    return result.map((row: Record<string, unknown>) => ({
      boardTileId: row.boardTileId as string,
      position: row.position as string,
      progressValue: parseFloat(row.progressValue as string) || 0,
      isCompleted: row.isCompleted as boolean,
      metadata: (row.progressMetadata || {}) as Record<string, unknown>
    }));
  };

  /**
   * Get all progress entries for a player (OSRS account) across all active events
   */
  static getPlayerProgress = async (osrsAccountId: number): Promise<PlayerProgressEntry[]> => {
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

    // Note: query() auto-converts snake_case to camelCase
    return result.map((row: Record<string, unknown>) => ({
      boardTileId: row.boardTileId as string,
      tileId: row.tileId as string,
      position: row.position as string,
      task: row.task as string,
      category: row.category as string,
      difficulty: row.difficulty as string,
      progressValue: parseFloat(row.progressValue as string) || 0,
      isCompleted: row.isCompleted as boolean,
      completedAt: row.completedAt ? new Date(row.completedAt as string) : undefined,
      metadata: (row.progressMetadata || {}) as Record<string, unknown>
    }));
  };

  // ============================================================================
  // Team & Leaderboard Queries
  // ============================================================================

  /**
   * Get team progress summary for an event
   */
  static getTeamProgressSummary = async (eventId: string, teamId: string): Promise<TeamProgressSummary | null> => {
    const board = await this.getBoardForTeam(eventId, teamId);
    if (!board) return null;

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

    if (stats.length === 0) return null;

    // Note: query() auto-converts snake_case to camelCase
    const row = stats[0];
    const totalTiles = parseInt(row.totalTiles as string) || 0;
    const completedTiles = parseInt(row.completedTiles as string) || 0;

    return {
      teamId: row.teamId as string,
      teamName: row.teamName as string,
      totalTiles,
      completedTiles,
      completionPercentage: totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0,
      totalPoints: parseInt(row.totalPoints as string) || 0
    };
  };

  /**
   * Get leaderboard for an event (all teams ranked by completion)
   */
  static getEventLeaderboard = async (eventId: string): Promise<TeamProgressSummary[]> => {
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

    // Note: query() auto-converts snake_case to camelCase
    return result.map((row: Record<string, unknown>) => {
      const totalTiles = parseInt(row.totalTiles as string) || 0;
      const completedTiles = parseInt(row.completedTiles as string) || 0;

      return {
        teamId: row.teamId as string,
        teamName: row.teamName as string,
        totalTiles,
        completedTiles,
        completionPercentage: totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0,
        totalPoints: parseInt(row.totalPoints as string) || 0
      };
    });
  };
}