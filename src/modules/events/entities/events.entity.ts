/**
 * Events Entity
 * Database operations for clan events
 */

import { query, queryOne } from '../../../db/connection.js'
import { BaseEntity } from '../../base-entity.js'
import { EventStatus } from '../types/event-status.type.js';
import { EventType } from '../types/event-type.type.js'
import type { CreateEventInput, UpdateEventInput } from '../types/index.js'

export interface BingoTileConfig {
  tileId: string;
  position: string;
  metadata?: Record<string, unknown>;
}

export interface BingoLineEffectConfig {
  /** For rows: the row number (1, 2, 3...) */
  rowNumber?: number;
  /** For columns: the column letter (A, B, C...) */
  columnLetter?: string;
  /** Unified identifier - can be used instead of rowNumber/columnLetter */
  lineIdentifier?: string;
  buffDebuffId: string;
  isActive?: boolean;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BingoTileEffectConfig {
  position: string;
  buffDebuffId: string;
  isActive?: boolean;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BingoBoardConfig {
  columns?: number;
  rows?: number;
  metadata?: {
    showTileEffects?: boolean;
    showRowEffects?: boolean;
    showColumnEffects?: boolean;
  }
  tiles?: BingoTileConfig[];
  rowEffects?: BingoLineEffectConfig[];
  columnEffects?: BingoLineEffectConfig[];
  tileEffects?: BingoTileEffectConfig[];
}

export interface BingoEventConfig {
  board?: BingoBoardConfig;
}

export type EventConfig = BingoEventConfig;

export interface Event {
  id: string;
  name: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  config: EventConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Events Entity Class
 * Handles CRUD operations for the events table
 */
export class EventsEntity extends BaseEntity<Event, string> {
  protected tableName = 'events'
  protected primaryKey = 'id'
  protected camelCaseFields = ['eventType', 'startDate', 'endDate', 'createdAt', 'updatedAt']

  /**
   * Create the events table if it doesn't exist
   */
  static createTable = async (): Promise<void> => {
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(50) NOT NULL DEFAULT 'bingo',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date)`)

    console.log('✅ Events table created/verified')
  }

  /**
   * Find an event by ID (UUID)
   */
  async findById(id: string): Promise<Event | null> {
    const result = await queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    )
    return result ? this.formatFromDb(result) : null
  }

  /**
   * Create a new event
   */
  async create(input: CreateEventInput): Promise<Event> {
    const result = await queryOne(`
      INSERT INTO events (name, description, event_type, status, start_date, end_date, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      input.name,
      input.description || null,
      input.eventType,
      input.status || EventStatus.DRAFT,
      input.startDate,
      input.endDate,
      JSON.stringify(input.config || {})
    ])

    if (!result) {
      throw new Error('Failed to create event')
    }

    return this.formatFromDb(result)
  }

  /**
   * Find all events with optional filters
   */
  async findAllFiltered(filters?: {
    eventType?: EventType
    status?: EventStatus
    limit?: number
    offset?: number
  }): Promise<Event[]> {
    let sql = 'SELECT * FROM events WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (filters?.eventType) {
      sql += ` AND event_type = $${paramIndex++}`
      params.push(filters.eventType)
    }

    if (filters?.status) {
      sql += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }

    sql += ' ORDER BY created_at DESC'

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex++}`
      params.push(filters.limit)
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex++}`
      params.push(filters.offset)
    }

    const results = await query(sql, params)
    return results.map(row => this.formatFromDb(row))
  }

  /**
   * Find active events (status = active, within date range)
   * Note: Event dates are stored as Estonian time (Europe/Tallinn) in the database
   * We use AT TIME ZONE to properly convert to UTC for comparison with NOW()
   */
  async findActive(eventType?: EventType): Promise<Event[]> {
    let sql = `
      SELECT * FROM events 
      WHERE status = $1
        AND (start_date IS NULL OR (start_date AT TIME ZONE 'Europe/Tallinn') <= NOW())
        AND (end_date IS NULL OR (end_date AT TIME ZONE 'Europe/Tallinn') > NOW())
    `
    const params: any[] = [EventStatus.ACTIVE]

    if (eventType) {
      sql += ' AND event_type = $2'
      params.push(eventType)
    }

    sql += ' ORDER BY start_date ASC'

    const results = await query(sql, params)
    return results.map(row => this.formatFromDb(row))
  }

  /**
   * Update an event by ID (UUID)
   */
  async update(id: string, input: UpdateEventInput): Promise<Event | null> {
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(input.name)
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(input.description)
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(input.status)
    }

    if (input.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`)
      params.push(input.startDate)
    }

    if (input.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`)
      params.push(input.endDate)
    }

    if (input.config !== undefined) {
      updates.push(`config = $${paramIndex++}`)
      params.push(JSON.stringify(input.config))
    }

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(id)

    const result = await queryOne(`
      UPDATE events 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params)

    return result ? this.formatFromDb(result) : null
  }

  /**
   * Delete an event by ID (UUID)
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM events WHERE id = $1 RETURNING id',
      [id]
    )
    return result.length > 0
  }

  /**
   * Update event status
   */
  async updateStatus(id: string, status: EventStatus): Promise<Event | null> {
    return this.update(id, { status })
  }

  /**
   * Update event config (merges with existing config)
   */
  async updateConfig(id: string, configUpdate: Partial<EventConfig>): Promise<Event | null> {
    const event = await this.findById(id)
    if (!event) return null

    const mergedConfig = {
      ...event.config,
      ...configUpdate
    }

    return this.update(id, { config: mergedConfig })
  }
}
