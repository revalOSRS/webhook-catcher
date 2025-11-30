/**
 * Event Team Members Entity
 * Database operations for event team members
 */

import { query, queryOne } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';

export interface EventTeamMember {
  id: string;
  teamId: string;
  memberId: number;
  osrsAccountId: number;
  role: string;
  individualScore: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Team Members Entity Class
 * Handles CRUD operations for the event_team_members table
 */
export class EventTeamMembersEntity extends BaseEntity<EventTeamMember, string> {
  protected tableName = 'event_team_members';
  protected primaryKey = 'id';
  protected camelCaseFields = ['teamId', 'memberId', 'osrsAccountId', 'individualScore', 'createdAt', 'updatedAt'];

  /**
   * Create the event_team_members table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS event_team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        individual_score INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_team_member UNIQUE (team_id, member_id)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_team_id ON event_team_members(team_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_member_id ON event_team_members(member_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_osrs_account_id ON event_team_members(osrs_account_id)`);

    console.log('✅ Event team members table created/verified');
  };

  /**
   * Find a member by ID
   */
  async findById(id: string): Promise<EventTeamMember | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Find all members for a team
   */
  async findByTeamId(teamId: string): Promise<EventTeamMember[]> {
    const results = await query(
      'SELECT * FROM event_team_members WHERE team_id = $1 ORDER BY individual_score DESC',
      [teamId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find a member by team ID and member ID
   */
  async findByTeamAndMember(teamId: string, memberId: number): Promise<EventTeamMember | null> {
    const result = await queryOne(
      'SELECT * FROM event_team_members WHERE team_id = $1 AND member_id = $2',
      [teamId, memberId]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Find a member by OSRS account ID
   */
  async findByOsrsAccountId(osrsAccountId: number): Promise<EventTeamMember[]> {
    const results = await query(
      'SELECT * FROM event_team_members WHERE osrs_account_id = $1',
      [osrsAccountId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find team membership for an OSRS account in a specific event
   */
  async findByOsrsAccountAndEvent(osrsAccountId: number, eventId: string): Promise<EventTeamMember | null> {
    const result = await queryOne(`
      SELECT etm.* FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      WHERE etm.osrs_account_id = $1 AND et.event_id = $2
    `, [osrsAccountId, eventId]);
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Create a new team member
   */
  async create(input: Pick<EventTeamMember, 'teamId' | 'memberId' | 'osrsAccountId'> & Partial<Pick<EventTeamMember, 'role' | 'individualScore' | 'metadata'>>): Promise<EventTeamMember> {
    const result = await queryOne(`
      INSERT INTO event_team_members (team_id, member_id, osrs_account_id, role, individual_score, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      input.teamId,
      input.memberId,
      input.osrsAccountId,
      input.role || 'member',
      input.individualScore || 0,
      JSON.stringify(input.metadata || {})
    ]);

    if (!result) {
      throw new Error('Failed to create event team member');
    }

    return this.formatFromDb(result);
  }

  /**
   * Update a team member by ID
   */
  async update(id: string, input: Partial<Pick<EventTeamMember, 'role' | 'individualScore' | 'metadata'>>): Promise<EventTeamMember | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(input.role);
    }

    if (input.individualScore !== undefined) {
      updates.push(`individual_score = $${paramIndex++}`);
      params.push(input.individualScore);
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
      UPDATE event_team_members 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Delete a team member by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM event_team_members WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Delete all members from a team
   */
  async deleteByTeamId(teamId: string): Promise<number> {
    const result = await query(
      'DELETE FROM event_team_members WHERE team_id = $1 RETURNING id',
      [teamId]
    );
    return result.length;
  }

  /**
   * Update individual score
   */
  async updateScore(id: string, score: number): Promise<EventTeamMember | null> {
    return this.update(id, { individualScore: score });
  }

  /**
   * Increment individual score
   */
  async incrementScore(id: string, points: number): Promise<EventTeamMember | null> {
    const result = await queryOne(`
      UPDATE event_team_members 
      SET individual_score = individual_score + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [points, id]);

    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Get member count for a team
   */
  async countByTeamId(teamId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM event_team_members WHERE team_id = $1',
      [teamId]
    );
    return parseInt(result?.count || '0');
  }

  /**
   * Get team leaderboard (members sorted by individual score)
   */
  async getTeamLeaderboard(teamId: string): Promise<EventTeamMember[]> {
    const results = await query(
      'SELECT * FROM event_team_members WHERE team_id = $1 ORDER BY individual_score DESC',
      [teamId]
    );
    return results.map(row => this.formatFromDb(row));
  }
}
