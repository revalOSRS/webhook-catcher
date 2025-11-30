/**
 * Event Registrations Entity
 * Database operations for event registrations
 */

import { query, queryOne } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';
import { EventRegistrationStatus } from '../types/event-registration-status.type.js';

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: number;
  osrsAccountId: number;
  status: EventRegistrationStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Registrations Entity Class
 * Handles CRUD operations for the event_registrations table
 */
export class EventRegistrationsEntity extends BaseEntity<EventRegistration, string> {
  protected tableName = 'event_registrations';
  protected primaryKey = 'id';
  protected camelCaseFields = ['eventId', 'memberId', 'osrsAccountId', 'createdAt', 'updatedAt'];

  /**
   * Create the event_registrations table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_event_registration UNIQUE (event_id, member_id)
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON event_registrations(member_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_registrations_osrs_account_id ON event_registrations(osrs_account_id)`);

    console.log('✅ Event registrations table created/verified');
  };

  /**
   * Find a registration by ID
   */
  async findById(id: string): Promise<EventRegistration | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Find all registrations for an event
   */
  async findByEventId(eventId: string): Promise<EventRegistration[]> {
    const results = await query(
      'SELECT * FROM event_registrations WHERE event_id = $1 ORDER BY created_at ASC',
      [eventId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find all registrations for a member
   */
  async findByMemberId(memberId: number): Promise<EventRegistration[]> {
    const results = await query(
      'SELECT * FROM event_registrations WHERE member_id = $1 ORDER BY created_at DESC',
      [memberId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find registration by event and member
   */
  async findByEventAndMember(eventId: string, memberId: number): Promise<EventRegistration | null> {
    const result = await queryOne(
      'SELECT * FROM event_registrations WHERE event_id = $1 AND member_id = $2',
      [eventId, memberId]
    );
    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Find registrations by OSRS account ID
   */
  async findByOsrsAccountId(osrsAccountId: number): Promise<EventRegistration[]> {
    const results = await query(
      'SELECT * FROM event_registrations WHERE osrs_account_id = $1 ORDER BY created_at DESC',
      [osrsAccountId]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Find registrations by event and status
   */
  async findByEventAndStatus(eventId: string, status: EventRegistrationStatus): Promise<EventRegistration[]> {
    const results = await query(
      'SELECT * FROM event_registrations WHERE event_id = $1 AND status = $2 ORDER BY created_at ASC',
      [eventId, status]
    );
    return results.map(row => this.formatFromDb(row));
  }

  /**
   * Create a new registration
   */
  async create(input: Pick<EventRegistration, 'eventId' | 'memberId' | 'osrsAccountId'> & Partial<Pick<EventRegistration, 'status' | 'metadata'>>): Promise<EventRegistration> {
    const result = await queryOne(`
      INSERT INTO event_registrations (event_id, member_id, osrs_account_id, status, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      input.eventId,
      input.memberId,
      input.osrsAccountId,
      input.status || EventRegistrationStatus.PENDING,
      JSON.stringify(input.metadata || {})
    ]);

    if (!result) {
      throw new Error('Failed to create event registration');
    }

    return this.formatFromDb(result);
  }

  /**
   * Update a registration by ID
   */
  async update(id: string, input: Partial<Pick<EventRegistration, 'status' | 'metadata'>>): Promise<EventRegistration | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
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
      UPDATE event_registrations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    return result ? this.formatFromDb(result) : null;
  }

  /**
   * Update registration status
   */
  async updateStatus(id: string, status: EventRegistrationStatus): Promise<EventRegistration | null> {
    return this.update(id, { status });
  }

  /**
   * Delete a registration by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM event_registrations WHERE id = $1 RETURNING id',
      [id]
    );
    return result.length > 0;
  }

  /**
   * Delete all registrations for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    const result = await query(
      'DELETE FROM event_registrations WHERE event_id = $1 RETURNING id',
      [eventId]
    );
    return result.length;
  }

  /**
   * Get registration count for an event
   */
  async countByEventId(eventId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1',
      [eventId]
    );
    return parseInt(result?.count || '0');
  }

  /**
   * Get registration count by status for an event
   */
  async countByEventAndStatus(eventId: string, status: EventRegistrationStatus): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = $1 AND status = $2',
      [eventId, status]
    );
    return parseInt(result?.count || '0');
  }

  /**
   * Check if member is registered for an event
   */
  async isRegistered(eventId: string, memberId: number): Promise<boolean> {
    const registration = await this.findByEventAndMember(eventId, memberId);
    return registration !== null && registration.status === EventRegistrationStatus.REGISTERED;
  }
}
