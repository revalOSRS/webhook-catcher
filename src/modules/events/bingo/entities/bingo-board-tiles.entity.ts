/**
 * Bingo Board Tiles Entity
 * Database operations for tiles placed on bingo boards
 */

import { query, queryOne } from '../../../../db/connection.js';
import { BaseEntity } from '../../../base-entity.js';

export interface BingoBoardTile {
  id: string;
  boardId: string;
  tileId: string;
  position: string;
  isCompleted: boolean;
  completedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bingo Board Tiles Entity Class
 * Handles CRUD operations for the bingo_board_tiles table
 */
export class BingoBoardTilesEntity extends BaseEntity<BingoBoardTile, string> {
  protected tableName = 'bingo_board_tiles';
  protected primaryKey = 'id';
  protected camelCaseFields = ['boardId', 'tileId', 'isCompleted', 'completedAt', 'createdAt', 'updatedAt'];

  /**
   * Create the bingo_board_tiles table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS bingo_board_tiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
        tile_id VARCHAR(100) NOT NULL REFERENCES bingo_tiles(id) ON DELETE CASCADE,
        position VARCHAR(10) NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_board_position UNIQUE (board_id, position)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_board_id ON bingo_board_tiles(board_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_tile_id ON bingo_board_tiles(tile_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_position ON bingo_board_tiles(board_id, position)`);

    console.log('✅ Bingo board tiles table created/verified');
  };

  /**
   * Find a board tile by ID
   */
  async findById(id: string): Promise<BingoBoardTile | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.mapRow(result) : null;
  }

  /**
   * Find all tiles for a board
   */
  async findByBoardId(boardId: string): Promise<BingoBoardTile[]> {
    const results = await query(
      'SELECT * FROM bingo_board_tiles WHERE board_id = $1 ORDER BY position',
      [boardId]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Find tile by board and position
   */
  async findByBoardAndPosition(boardId: string, position: string): Promise<BingoBoardTile | null> {
    const result = await queryOne(
      'SELECT * FROM bingo_board_tiles WHERE board_id = $1 AND position = $2',
      [boardId, position]
    );
    return result ? this.mapRow(result) : null;
  }

  /**
   * Find all completed tiles for a board
   */
  async findCompletedByBoardId(boardId: string): Promise<BingoBoardTile[]> {
    const results = await query(
      'SELECT * FROM bingo_board_tiles WHERE board_id = $1 AND is_completed = true ORDER BY completed_at',
      [boardId]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Create a new board tile
   */
  async create(input: Pick<BingoBoardTile, 'boardId' | 'tileId' | 'position'> & Partial<Pick<BingoBoardTile, 'metadata'>>): Promise<BingoBoardTile> {
    const result = await queryOne(`
      INSERT INTO bingo_board_tiles (board_id, tile_id, position, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      input.boardId,
      input.tileId,
      input.position,
      JSON.stringify(input.metadata || {})
    ]);

    if (!result) {
      throw new Error('Failed to create bingo board tile');
    }

    return this.mapRow(result);
  }

  /**
   * Update a board tile by ID
   */
  async update(id: string, input: Partial<Pick<BingoBoardTile, 'isCompleted' | 'completedAt' | 'metadata'>>): Promise<BingoBoardTile | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.isCompleted !== undefined) {
      updates.push(`is_completed = $${paramIndex++}`);
      params.push(input.isCompleted);
    }

    if (input.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      params.push(input.completedAt);
    }

    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await queryOne(`
      UPDATE bingo_board_tiles 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.mapRow(result) : null;
  }

  /**
   * Mark a tile as completed
   */
  async markCompleted(id: string): Promise<BingoBoardTile | null> {
    const result = await queryOne(`
      UPDATE bingo_board_tiles 
      SET is_completed = true, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    return result ? this.mapRow(result) : null;
  }

  /**
   * Mark a tile as incomplete
   */
  async markIncomplete(id: string): Promise<BingoBoardTile | null> {
    const result = await queryOne(`
      UPDATE bingo_board_tiles 
      SET is_completed = false, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    return result ? this.mapRow(result) : null;
  }

  /**
   * Delete a board tile by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM bingo_board_tiles WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Delete all tiles for a board
   */
  async deleteByBoardId(boardId: string): Promise<number> {
    const result = await query(
      'DELETE FROM bingo_board_tiles WHERE board_id = $1 RETURNING id',
      [boardId]
    );
    return result.length;
  }

  /**
   * Get completion count for a board
   */
  async getCompletionCount(boardId: string): Promise<{ total: number; completed: number }> {
    const result = await queryOne<{ total: string; completed: string }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_completed = true) as completed
      FROM bingo_board_tiles 
      WHERE board_id = $1
    `, [boardId]);

    return {
      total: parseInt(result?.total || '0'),
      completed: parseInt(result?.completed || '0')
    };
  }

  /**
   * Map database row to BingoBoardTile
   */
  private mapRow(row: any): BingoBoardTile {
    return {
      id: row.id,
      boardId: row.board_id,
      tileId: row.tile_id,
      position: row.position,
      isCompleted: row.is_completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

