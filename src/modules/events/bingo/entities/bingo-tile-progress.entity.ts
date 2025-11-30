/**
 * Bingo Tile Progress Entity
 * Database operations for bingo tile progress tracking
 * 
 * Tracks progress toward tile completion including:
 * - Individual player contributions
 * - Tier completion status and dates
 * - Overall tile completion state
 */

import { query, queryOne } from '../../../../db/connection.js';
import { BaseEntity } from '../../../base-entity.js';
import { BingoTileRequirementType } from './bingo-tiles.entity.js';
import type { ProgressMetadata } from '../types/bingo-requirements.type.js';
import { BingoTileCompletionType } from '../types/bingo-tile-completion-type.type.js';

/**
 * Bingo Tile Progress
 * 
 * Tracks progress toward completing a specific tile on a team's board.
 * 
 * The `completedByOsrsAccountId` is ONLY set when a single player
 * completed the entire tile alone. For team efforts, this remains null
 * and individual contributions are tracked in `progressMetadata`.
 */
export interface BingoTileProgress {
  /** Unique identifier */
  id: string;
  /** Reference to the board tile being tracked */
  boardTileId: string;
  /** Current progress value (interpretation depends on requirement type) */
  progressValue: number;
  /** 
   * Detailed progress metadata including player contributions.
   * Structure varies by requirement type - use the requirementType 
   * discriminator to narrow the type.
   */
  progressMetadata: ProgressMetadata;
  /** How the tile was completed (null if not completed) */
  completionType?: BingoTileCompletionType;
  /** 
   * OSRS account that completed the tile.
   * ONLY set if one player completed the entire tile solo.
   * For team completions, individual contributions are in progressMetadata.
   */
  completedByOsrsAccountId?: number;
  /** When the tile was completed (null if not completed) */
  completedAt?: Date;
  /** When this progress record was created */
  createdAt: Date;
  /** When this progress record was last updated */
  updatedAt: Date;
}

/**
 * Input for creating a new progress record
 */
export type CreateBingoTileProgressInput = Pick<BingoTileProgress, 'boardTileId' | 'progressValue' | 'progressMetadata'> & 
  Partial<Pick<BingoTileProgress, 'completionType' | 'completedByOsrsAccountId' | 'completedAt'>>;

/**
 * Input for updating a progress record
 */
export type UpdateBingoTileProgressInput = Partial<Pick<BingoTileProgress, 'progressValue' | 'progressMetadata' | 'completionType' | 'completedByOsrsAccountId' | 'completedAt'>>;

/**
 * Bingo Tile Progress Entity Class
 * Handles CRUD operations for the bingo_tile_progress table
 */
export class BingoTileProgressEntity extends BaseEntity<BingoTileProgress, string> {
  protected tableName = 'bingo_tile_progress';
  protected primaryKey = 'id';
  protected camelCaseFields = ['boardTileId', 'progressValue', 'progressMetadata', 'completionType', 'completedByOsrsAccountId', 'completedAt', 'createdAt', 'updatedAt'];

  /**
   * Create the bingo_tile_progress table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS bingo_tile_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_tile_id UUID NOT NULL REFERENCES bingo_board_tiles(id) ON DELETE CASCADE,
        progress_value NUMERIC DEFAULT 0,
        progress_metadata JSONB DEFAULT '{}',
        completion_type VARCHAR(20),
        completed_by_osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE SET NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_board_tile_progress UNIQUE (board_tile_id)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_board_tile_id ON bingo_tile_progress(board_tile_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_completed_by ON bingo_tile_progress(completed_by_osrs_account_id)`);

    console.log('✅ Bingo tile progress table created/verified');
  };

  /**
   * Find progress by ID
   */
  findById = async (id: string): Promise<BingoTileProgress | null> => {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.mapRow(result) : null;
  };

  /**
   * Find progress by board tile ID
   */
  findByBoardTileId = async (boardTileId: string): Promise<BingoTileProgress | null> => {
    const result = await queryOne(
      'SELECT * FROM bingo_tile_progress WHERE board_tile_id = $1',
      [boardTileId]
    );
    return result ? this.mapRow(result) : null;
  };

  /**
   * Find all progress entries for a board (via board tiles)
   */
  findByBoardId = async (boardId: string): Promise<BingoTileProgress[]> => {
    const results = await query(`
      SELECT btp.* FROM bingo_tile_progress btp
      JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
      WHERE bbt.board_id = $1
    `, [boardId]);
    return results.map(row => this.mapRow(row));
  };

  /**
   * Find progress entries completed by a specific OSRS account (solo completions only)
   */
  findByCompletedBy = async (osrsAccountId: number): Promise<BingoTileProgress[]> => {
    const results = await query(
      'SELECT * FROM bingo_tile_progress WHERE completed_by_osrs_account_id = $1 ORDER BY completed_at DESC',
      [osrsAccountId]
    );
    return results.map(row => this.mapRow(row));
  };

  /**
   * Find all completed progress entries for a board
   */
  findCompletedByBoardId = async (boardId: string): Promise<BingoTileProgress[]> => {
    const results = await query(`
      SELECT btp.* FROM bingo_tile_progress btp
      JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
      WHERE bbt.board_id = $1 AND btp.completed_at IS NOT NULL
      ORDER BY btp.completed_at DESC
    `, [boardId]);
    return results.map(row => this.mapRow(row));
  };

  /**
   * Create a new progress entry
   */
  create = async (input: CreateBingoTileProgressInput): Promise<BingoTileProgress> => {
    const result = await queryOne(`
      INSERT INTO bingo_tile_progress (board_tile_id, progress_value, progress_metadata, completion_type, completed_by_osrs_account_id, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      input.boardTileId,
      input.progressValue,
      JSON.stringify(input.progressMetadata),
      input.completionType ?? null,
      input.completedByOsrsAccountId ?? null,
      input.completedAt ?? null
    ]);

    if (!result) {
      throw new Error('Failed to create bingo tile progress');
    }

    return this.mapRow(result);
  };

  /**
   * Update progress by ID
   */
  update = async (id: string, input: UpdateBingoTileProgressInput): Promise<BingoTileProgress | null> => {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.progressValue !== undefined) {
      updates.push(`progress_value = $${paramIndex++}`);
      params.push(input.progressValue);
    }

    if (input.progressMetadata !== undefined) {
      updates.push(`progress_metadata = $${paramIndex++}`);
      params.push(JSON.stringify(input.progressMetadata));
    }

    if (input.completionType !== undefined) {
      updates.push(`completion_type = $${paramIndex++}`);
      params.push(input.completionType);
    }

    if (input.completedByOsrsAccountId !== undefined) {
      updates.push(`completed_by_osrs_account_id = $${paramIndex++}`);
      params.push(input.completedByOsrsAccountId);
    }

    if (input.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      params.push(input.completedAt);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await queryOne(`
      UPDATE bingo_tile_progress 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.mapRow(result) : null;
  };

  /**
   * Upsert progress by board tile ID
   * Creates if doesn't exist, updates if exists
   */
  upsertByBoardTileId = async (boardTileId: string, input: UpdateBingoTileProgressInput & { progressValue: number; progressMetadata: ProgressMetadata }): Promise<BingoTileProgress> => {
    const result = await queryOne(`
      INSERT INTO bingo_tile_progress (board_tile_id, progress_value, progress_metadata, completion_type, completed_by_osrs_account_id, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (board_tile_id) DO UPDATE SET
        progress_value = $2,
        progress_metadata = $3,
        completion_type = COALESCE($4, bingo_tile_progress.completion_type),
        completed_by_osrs_account_id = COALESCE($5, bingo_tile_progress.completed_by_osrs_account_id),
        completed_at = COALESCE($6, bingo_tile_progress.completed_at),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      boardTileId,
      input.progressValue,
      JSON.stringify(input.progressMetadata),
      input.completionType ?? null,
      input.completedByOsrsAccountId ?? null,
      input.completedAt ?? null
    ]);

    if (!result) {
      throw new Error('Failed to upsert bingo tile progress');
    }

    return this.mapRow(result);
  };

  /**
   * Mark a tile as completed
   * 
   * @param id - Progress record ID
   * @param completionType - How the tile was completed
   * @param completedByOsrsAccountId - Account that completed it (only for solo completions)
   */
  markCompleted = async (
    id: string, 
    completionType: BingoTileCompletionType, 
    completedByOsrsAccountId?: number
  ): Promise<BingoTileProgress | null> => {
    return this.update(id, {
      completionType,
      completedByOsrsAccountId,
      completedAt: new Date()
    });
  };

  /**
   * Delete progress by ID
   */
  delete = async (id: string): Promise<boolean> => {
    const result = await query(
      'DELETE FROM bingo_tile_progress WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  };

  /**
   * Delete progress by board tile ID
   */
  deleteByBoardTileId = async (boardTileId: string): Promise<boolean> => {
    const result = await query(
      'DELETE FROM bingo_tile_progress WHERE board_tile_id = $1 RETURNING id',
      [boardTileId]
    );
    return result.length > 0;
  };

  /**
   * Get requirement type from progress metadata
   */
  getRequirementType = (progress: BingoTileProgress): BingoTileRequirementType => {
    return progress.progressMetadata.requirementType;
  };

  /**
   * Check if tile is completed
   */
  isCompleted = (progress: BingoTileProgress): boolean => {
    return progress.completedAt !== undefined && progress.completedAt !== null;
  };

  /**
   * Get completed tier numbers from progress
   */
  getCompletedTiers = (progress: BingoTileProgress): number[] => {
    const tiers = progress.progressMetadata.completedTiers;
    return tiers ? tiers.map(t => t.tier) : [];
  };

  /**
   * Map database row to BingoTileProgress
   */
  private mapRow = (row: Record<string, unknown>): BingoTileProgress => {
    return {
      id: row.id as string,
      boardTileId: row.board_tile_id as string,
      progressValue: parseFloat(row.progress_value as string) || 0,
      progressMetadata: row.progress_metadata as ProgressMetadata,
      completionType: row.completion_type as BingoTileCompletionType | undefined,
      completedByOsrsAccountId: row.completed_by_osrs_account_id as number | undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  };
}
