/**
 * Events Entity
 * Basic CRUD operations for clan events
 */
import { query } from '../../db/connection.js';
import { BaseEntity } from '../base-entity.js';
/**
 * Events Entity Class
 * Basic CRUD operations for clan events
 */
export class EventsEntity extends BaseEntity {
    tableName = 'events';
    primaryKey = 'id';
    camelCaseFields = ['fundsUsed', 'createdAt', 'createdBy'];
    /**
     * Create the events table if it doesn't exist
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        funds_used DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(20) NOT NULL
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)`);
        console.log('✅ Events table created/verified');
    }
    /**
     * Find events by creator
     */
    async findByCreator(creatorDiscordId, limit = 50) {
        return this.findAll({
            where: { createdBy: creatorDiscordId },
            orderBy: 'createdAt',
            order: 'DESC',
            limit
        });
    }
    /**
     * Get total funds used for all events
     */
    static async getTotalFundsUsed() {
        const sql = `SELECT SUM(funds_used) as total FROM events`;
        const result = await query(sql);
        return Number(result[0]?.total || 0);
    }
    /**
     * Get events summary for the last N days
     */
    static async getRecentSummary(days = 30) {
        const sql = `
      SELECT
        COUNT(*) as event_count,
        SUM(funds_used) as total_funds_used,
        AVG(funds_used) as avg_funds_per_event
      FROM events
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;
        const result = await query(sql);
        const data = result[0];
        return {
            eventCount: Number(data.event_count),
            totalFundsUsed: Number(data.total_funds_used || 0),
            avgFundsPerEvent: Number(data.avg_funds_per_event || 0)
        };
    }
    /**
     * Get event with related coffer movements
     */
    async getWithMovements(eventId) {
        const event = await this.findById(eventId);
        if (!event) {
            throw new Error(`Event with id ${eventId} not found`);
        }
        const movementsSql = `
      SELECT cm.*
      FROM coffer_movements cm
      WHERE cm.event_id = $1
      ORDER BY cm.created_at DESC
    `;
        const movements = await query(movementsSql, [eventId]);
        return {
            ...event,
            movements
        };
    }
}
