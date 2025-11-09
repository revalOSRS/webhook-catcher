/**
 * MemberMovement Model
 * Tracks when members join or leave the Discord server
 */

const { query, queryOne } = require('../index');

/**
 * @typedef {Object} MemberMovementData
 * @property {number} [id] - Auto-generated ID
 * @property {number} [memberId] - Reference to member ID
 * @property {string} discordId - Discord user ID
 * @property {string} eventType - Type of event ('joined' or 'left')
 * @property {string} [previousRank] - Previous Discord rank (for left events)
 * @property {string} [notes] - Additional notes about the event
 * @property {Date} [timestamp] - When the event occurred
 */

class MemberMovement {
	/**
	 * Create the member_movements table if it doesn't exist
	 * @returns {Promise<void>}
	 */
	static async createTable() {
		// Create table
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
	 * @param {MemberMovementData} data - Movement data
	 * @returns {Promise<number>} The ID of the created movement record
	 */
	static async record(data) {
		const sql = `
			INSERT INTO member_movements (
				member_id, discord_id, event_type, previous_rank, notes
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`;
		
		const params = [
			data.memberId || null,
			data.discordId,
			data.eventType,
			data.previousRank || null,
			data.notes || null
		];
		
		const result = await query(sql, params);
		return result[0].id;
	}

	/**
	 * Get all movements for a specific member
	 * @param {string} discordId - Discord user ID
	 * @param {number} [limit=50] - Maximum results
	 * @returns {Promise<MemberMovementData[]>}
	 */
	static async getByDiscordId(discordId, limit = 50) {
		const sql = `
			SELECT * FROM member_movements 
			WHERE discord_id = $1 
			ORDER BY timestamp DESC 
			LIMIT $2
		`;
		const movements = await query(sql, [discordId, limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get all movements for a member by member ID
	 * @param {number} memberId - Member ID
	 * @param {number} [limit=50] - Maximum results
	 * @returns {Promise<MemberMovementData[]>}
	 */
	static async getByMemberId(memberId, limit = 50) {
		const sql = `
			SELECT * FROM member_movements 
			WHERE member_id = $1 
			ORDER BY timestamp DESC 
			LIMIT $2
		`;
		const movements = await query(sql, [memberId, limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get recent movements
	 * @param {number} [days=7] - Number of days to look back
	 * @param {number} [limit=100] - Maximum results
	 * @returns {Promise<MemberMovementData[]>}
	 */
	static async getRecent(days = 7, limit = 100) {
		const sql = `
			SELECT * FROM member_movements 
			WHERE timestamp > NOW() - INTERVAL '${days} days'
			ORDER BY timestamp DESC 
			LIMIT $1
		`;
		const movements = await query(sql, [limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get movements by event type
	 * @param {string} eventType - Event type ('joined' or 'left')
	 * @param {number} [days=30] - Number of days to look back
	 * @returns {Promise<MemberMovementData[]>}
	 */
	static async getByEventType(eventType, days = 30) {
		const sql = `
			SELECT * FROM member_movements 
			WHERE event_type = $1 
			AND timestamp > NOW() - INTERVAL '${days} days'
			ORDER BY timestamp DESC
		`;
		const movements = await query(sql, [eventType]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get the last movement for a member
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<MemberMovementData|null>}
	 */
	static async getLastMovement(discordId) {
		const sql = `
			SELECT * FROM member_movements 
			WHERE discord_id = $1 
			ORDER BY timestamp DESC 
			LIMIT 1
		`;
		const movement = await queryOne(sql, [discordId]);
		return movement ? this._formatMovement(movement) : null;
	}

	/**
	 * Count movements by type
	 * @param {string} eventType - Event type ('joined' or 'left')
	 * @param {number} [days=30] - Number of days to look back
	 * @returns {Promise<number>}
	 */
	static async count(eventType, days = 30) {
		const sql = `
			SELECT COUNT(*) as count 
			FROM member_movements 
			WHERE event_type = $1 
			AND timestamp > NOW() - INTERVAL '${days} days'
		`;
		const result = await queryOne(sql, [eventType]);
		return result.count;
	}

	/**
	 * Delete old movement records
	 * @param {number} [days=365] - Delete records older than this many days
	 * @returns {Promise<number>} Number of records deleted
	 */
	static async cleanup(days = 365) {
		const sql = `
			DELETE FROM member_movements 
			WHERE timestamp < NOW() - INTERVAL '${days} days'
		`;
		const result = await query(sql);
		return result.rowCount || 0;
	}

	/**
	 * Format database row to movement object
	 * @private
	 * @param {Object} row - Database row
	 * @returns {MemberMovementData}
	 */
	static _formatMovement(row) {
		return {
			id: row.id,
			memberId: row.member_id,
			discordId: row.discord_id,
			eventType: row.event_type,
			previousRank: row.previous_rank,
			notes: row.notes,
			timestamp: row.timestamp
		};
	}
}

module.exports = MemberMovement;

