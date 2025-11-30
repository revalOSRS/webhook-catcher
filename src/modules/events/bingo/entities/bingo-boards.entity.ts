/**
 * Bingo Boards Entity
 * Database operations for bingo boards
 */

import { query, queryOne } from '../../../../db/connection.js';
import { BaseEntity } from '../../../base-entity.js';

export interface BingoBoardMetadata {
  showRowColumnBuffs?: boolean;
  showRowColumnEffects?: boolean;
  showTileEffects?: boolean;
  [key: string]: unknown;
}

export interface BingoBoard {
  id: string;
  eventId: string;
  teamId: string;
  columns: number;
  rows: number;
  metadata: BingoBoardMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bingo Boards Entity Class
 * Handles CRUD operations for the bingo_boards table
 */
export class BingoBoardsEntity extends BaseEntity<BingoBoard, string> {
  protected tableName = 'bingo_boards';
  protected primaryKey = 'id';
  protected camelCaseFields = ['eventId', 'teamId', 'createdAt', 'updatedAt'];

  /**
   * Create the bingo_boards table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS bingo_boards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
        columns INTEGER NOT NULL DEFAULT 7,
        rows INTEGER NOT NULL DEFAULT 7,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_board_size CHECK (columns > 0 AND columns <= 20 AND rows > 0 AND rows <= 20),
        CONSTRAINT unique_event_team_board UNIQUE (event_id, team_id)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_event_id ON bingo_boards(event_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_team_id ON bingo_boards(team_id)`);

    console.log('✅ Bingo boards table created/verified');
  };

  /**
   * Find a board by ID
   */
  async findById(id: string): Promise<BingoBoard | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.mapRow(result) : null;
  }

  /**
   * Find all boards for an event
   */
  async findByEventId(eventId: string): Promise<BingoBoard[]> {
    const results = await query(
      'SELECT * FROM bingo_boards WHERE event_id = $1 ORDER BY created_at ASC',
      [eventId]
    );
    return results.map(row => this.mapRow(row));
  }

  /**
   * Find board by event and team
   */
  async findByEventAndTeam(eventId: string, teamId: string): Promise<BingoBoard | null> {
    const result = await queryOne(
      'SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
      [eventId, teamId]
    );
    return result ? this.mapRow(result) : null;
  }

  /**
   * Find board by team ID
   */
  async findByTeamId(teamId: string): Promise<BingoBoard | null> {
    const result = await queryOne(
      'SELECT * FROM bingo_boards WHERE team_id = $1',
      [teamId]
    );
    return result ? this.mapRow(result) : null;
  }

  /**
   * Create a new board
   */
  async create(input: Pick<BingoBoard, 'eventId' | 'teamId'> & Partial<Pick<BingoBoard, 'columns' | 'rows' | 'metadata'>>): Promise<BingoBoard> {
    const result = await queryOne(`
      INSERT INTO bingo_boards (event_id, team_id, columns, rows, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      input.eventId,
      input.teamId,
      input.columns || 7,
      input.rows || 7,
      JSON.stringify(input.metadata || {})
    ]);

    if (!result) {
      throw new Error('Failed to create bingo board');
    }

    return this.mapRow(result);
  }

  /**
   * Update a board by ID
   */
  async update(id: string, input: Partial<Pick<BingoBoard, 'columns' | 'rows' | 'metadata'>>): Promise<BingoBoard | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.columns !== undefined) {
      updates.push(`columns = $${paramIndex++}`);
      params.push(input.columns);
    }

    if (input.rows !== undefined) {
      updates.push(`rows = $${paramIndex++}`);
      params.push(input.rows);
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
      UPDATE bingo_boards 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.mapRow(result) : null;
  }

  /**
   * Delete a board by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM bingo_boards WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Delete all boards for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    const result = await query(
      'DELETE FROM bingo_boards WHERE event_id = $1 RETURNING id',
      [eventId]
    );
    return result.length;
  }

  /**
   * Map database row to BingoBoard
   */
  private mapRow(row: any): BingoBoard {
    return {
      id: row.id,
      eventId: row.event_id,
      teamId: row.team_id,
      columns: row.columns,
      rows: row.rows,
      metadata: row.metadata as BingoBoardMetadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

