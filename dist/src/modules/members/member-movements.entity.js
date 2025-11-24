/**
 * Member Movements Entity
 * Basic CRUD operations for member movements
 */
import { query } from '../../db/connection.js';
import { BaseEntity } from '../base-entity.js';
/**
 * Member Movements Entity Class
 * Basic CRUD operations for member movements
 */
export class MemberMovementsEntity extends BaseEntity {
    tableName = 'member_movements';
    primaryKey = 'id';
    camelCaseFields = ['memberId', 'discordId', 'eventType', 'previousRank'];
    /**
     * Create the member_movements table if it doesn't exist
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS member_movements (
        id SERIAL PRIMARY KEY,
        member_id INTEGER,
        discord_id VARCHAR(20) NOT NULL,
        event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('joined', 'left')),
        previous_rank VARCHAR(50),
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_movements_member_id ON member_movements(member_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_movements_discord_id ON member_movements(discord_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON member_movements(timestamp)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_movements_event_type ON member_movements(event_type)`);
        console.log('✅ Member movements table created/verified');
    }
    /**
     * Record a member movement event
     */
    async record(data) {
        return this.create(data);
    }
    /**
     * Get movements by Discord ID
     */
    async getByDiscordId(discordId, limit = 50) {
        return this.findAll({
            where: { discordId },
            orderBy: 'timestamp',
            order: 'DESC',
            limit
        });
    }
    /**
     * Get movements by member ID
     */
    async getByMemberId(memberId, limit = 50) {
        return this.findAll({
            where: { memberId },
            orderBy: 'timestamp',
            order: 'DESC',
            limit
        });
    }
    /**
     * Get recent movements
     */
    async getRecent(days = 7, limit = 100) {
        // For complex queries with date filters, we still need custom methods
        const sql = `
      SELECT * FROM member_movements
      WHERE timestamp > NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC
      LIMIT $1
    `;
        const results = await query(sql, [limit]);
        return results.map(row => this.formatFromDb(row));
    }
    /**
     * Get movements by event type
     */
    async getByEventType(eventType, days = 30) {
        const sql = `
      SELECT * FROM member_movements
      WHERE event_type = $1
      AND timestamp > NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC
    `;
        const results = await query(sql, [eventType]);
        return results.map(row => this.formatFromDb(row));
    }
    /**
     * Get last movement for a member
     */
    async getLastMovement(discordId) {
        const movements = await this.getByDiscordId(discordId, 1);
        return movements[0] || null;
    }
    /**
     * Count movements by type within the last N days
     */
    async countByEventType(eventType, days = 30) {
        const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE event_type = $1
      AND timestamp >= NOW() - INTERVAL '${days} days'
    `;
        const result = await this.executeQuery(sql, [eventType]);
        return parseInt(result.rows[0].count);
    }
}
