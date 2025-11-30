/**
 * Event Teams Entity
 * Database operations for event teams
 */

import { query, queryOne } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';

export interface EventTeam {
  id: string;
  eventId: string;
  name: string;
  color?: string;
  icon?: string;
  score: number;
  discordWebhookUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Teams Entity Class
 * Handles CRUD operations for the event_teams table
 */
export class EventTeamsEntity extends BaseEntity<EventTeam, string> {
  protected tableName = 'event_teams';
  protected primaryKey = 'id';
  protected camelCaseFields = ['eventId', 'discordWebhookUrl', 'createdAt', 'updatedAt'];

  /**
   * Create the event_teams table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS event_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7),
        icon VARCHAR(100),
        score INTEGER DEFAULT 0,
        discord_webhook_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_event_team_name UNIQUE (event_id, name)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_event_teams_event_id ON event_teams(event_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_teams_score ON event_teams(score DESC)`);

    console.log('✅ Event teams table created/verified');
  };

  /**
   * Find a team by ID
   */
  async findById(id: string): Promise<EventTeam | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Find all teams for an event
   */
  async findByEventId(eventId: string): Promise<EventTeam[]> {
    const results = await query(
      'SELECT * FROM event_teams WHERE event_id = $1 ORDER BY score DESC, name ASC',
      [eventId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find a team by event ID and name
   */
  async findByEventAndName(eventId: string, name: string): Promise<EventTeam | null> {
    const result = await queryOne(
      'SELECT * FROM event_teams WHERE event_id = $1 AND name = $2',
      [eventId, name]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Create a new team
   */
  async create(input: Pick<EventTeam, 'eventId' | 'name'> & Partial<Pick<EventTeam, 'color' | 'icon' | 'score' | 'discordWebhookUrl' | 'metadata'>>): Promise<EventTeam> {
    const result = await queryOne(`
      INSERT INTO event_teams (event_id, name, color, icon, score, discord_webhook_url, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      input.eventId,
      input.name,
      input.color || null,
      input.icon || null,
      input.score || 0,
      input.discordWebhookUrl || null,
      JSON.stringify(input.metadata || {})
    ]);

    if (!result) {
      throw new Error('Failed to create event team');
    }

    return this.formatFromDb(result);
  }

  /**
   * Update a team by ID
   */
  async update(id: string, input: Partial<Pick<EventTeam, 'name' | 'color' | 'icon' | 'score' | 'discordWebhookUrl' | 'metadata'>>): Promise<EventTeam | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }

    if (input.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      params.push(input.color);
    }

    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      params.push(input.icon);
    }

    if (input.score !== undefined) {
      updates.push(`score = $${paramIndex++}`);
      params.push(input.score);
    }

    if (input.discordWebhookUrl !== undefined) {
      updates.push(`discord_webhook_url = $${paramIndex++}`);
      params.push(input.discordWebhookUrl);
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
      UPDATE event_teams 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Delete a team by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM event_teams WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Delete all teams for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    const result = await query(
      'DELETE FROM event_teams WHERE event_id = $1 RETURNING id',
      [eventId]
    );
    return result.length;
  }

  /**
   * Update team score
   */
  async updateScore(id: string, score: number): Promise<EventTeam | null> {
    return this.update(id, { score });
  }

  /**
   * Increment team score
   */
  async incrementScore(id: string, points: number): Promise<EventTeam | null> {
    const result = await queryOne(`
      UPDATE event_teams 
      SET score = score + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [points, id]);

    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Get team count for an event
   */
  async countByEventId(eventId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM event_teams WHERE event_id = $1',
      [eventId]
    );
    return parseInt(result?.count || '0');
  }

  /**
   * Get leaderboard (teams sorted by score)
   */
  async getLeaderboard(eventId: string): Promise<EventTeam[]> {
    const results = await query(
      'SELECT * FROM event_teams WHERE event_id = $1 ORDER BY score DESC',
      [eventId]
    );
    return results.map(row => this.formatFromDb(row));
  }
}
