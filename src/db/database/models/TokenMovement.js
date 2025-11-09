/**
 * TokenMovement Model
 * Tracks token balance changes for members
 * 
 * Each token = 1M OSRS GP
 * Used for tracking earnings from events, especially for Ironman accounts
 */

const { query, queryOne } = require('../index');

/**
 * @typedef {Object} TokenMovementData
 * @property {number} [id] - Auto-generated ID
 * @property {number} memberId - Reference to member ID
 * @property {string} discordId - Discord user ID
 * @property {string} type - Type of movement (earned, payout, adjustment, transfer)
 * @property {number} amount - Amount of tokens (+/-)
 * @property {number} balanceBefore - Balance before this movement
 * @property {number} balanceAfter - Balance after this movement
 * @property {number} [eventId] - Reference to event ID if earned from event
 * @property {string} [description] - Description of the movement
 * @property {string} [note] - Additional notes
 * @property {Date} [createdAt] - When the movement occurred
 * @property {string} createdBy - Who created this movement (Discord ID)
 */

class TokenMovement {
	/**
	 * Create the token_movements table if it doesn't exist
	 * @returns {Promise<void>}
	 */
	static async createTable() {
		const createTableSql = `
			CREATE TABLE IF NOT EXISTS token_movements (
				id SERIAL PRIMARY KEY,
				member_id INTEGER NOT NULL,
				discord_id VARCHAR(20) NOT NULL,
				type VARCHAR(50) NOT NULL,
				amount INTEGER NOT NULL,
				balance_before INTEGER NOT NULL,
				balance_after INTEGER NOT NULL,
				event_id INTEGER NULL,
				description TEXT,
				note TEXT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				created_by VARCHAR(255) NOT NULL,
				FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
				FOREIGN KEY (discord_id) REFERENCES members(discord_id) ON DELETE CASCADE,
				FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
			)
		`;
		await query(createTableSql);
		
		// Create indexes
		await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_member_id ON token_movements(member_id)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_discord_id ON token_movements(discord_id)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_type ON token_movements(type)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_created_at ON token_movements(created_at DESC)`);
		
		console.log('✅ Token movements table created/verified');
	}

	/**
	 * Record a token movement
	 * @param {TokenMovementData} data - Movement data
	 * @returns {Promise<TokenMovementData>} The created movement record
	 */
	static async create(data) {
		const sql = `
			INSERT INTO token_movements (
				member_id, discord_id, type, amount, balance_before, balance_after,
				event_id, description, note, created_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *
		`;
		
		const params = [
			data.memberId,
			data.discordId,
			data.type,
			data.amount,
			data.balanceBefore,
			data.balanceAfter,
			data.eventId || null,
			data.description || null,
			data.note || null,
			data.createdBy
		];
		
		const result = await query(sql, params);
		return this._formatMovement(result[0]);
	}

	/**
	 * Get all movements for a specific member
	 * @param {number} memberId - Member ID
	 * @param {number} [limit=50] - Maximum results
	 * @returns {Promise<TokenMovementData[]>}
	 */
	static async getByMemberId(memberId, limit = 50) {
		const sql = `
			SELECT * FROM token_movements 
			WHERE member_id = $1 
			ORDER BY created_at DESC 
			LIMIT $2
		`;
		const movements = await query(sql, [memberId, limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get all movements for a specific Discord user
	 * @param {string} discordId - Discord user ID
	 * @param {number} [limit=50] - Maximum results
	 * @returns {Promise<TokenMovementData[]>}
	 */
	static async getByDiscordId(discordId, limit = 50) {
		const sql = `
			SELECT * FROM token_movements 
			WHERE discord_id = $1 
			ORDER BY created_at DESC 
			LIMIT $2
		`;
		const movements = await query(sql, [discordId, limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get movements by type
	 * @param {string} type - Movement type
	 * @param {number} [days=30] - Number of days to look back
	 * @param {number} [limit=100] - Maximum results
	 * @returns {Promise<TokenMovementData[]>}
	 */
	static async getByType(type, days = 30, limit = 100) {
		const sql = `
			SELECT * FROM token_movements 
			WHERE type = $1 
			AND created_at > NOW() - INTERVAL '${days} days'
			ORDER BY created_at DESC 
			LIMIT $2
		`;
		const movements = await query(sql, [type, limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get movements for a specific event
	 * @param {number} eventId - Event ID
	 * @returns {Promise<TokenMovementData[]>}
	 */
	static async getByEventId(eventId) {
		const sql = `
			SELECT * FROM token_movements 
			WHERE event_id = $1 
			ORDER BY created_at DESC
		`;
		const movements = await query(sql, [eventId]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get recent movements across all members
	 * @param {number} [days=7] - Number of days to look back
	 * @param {number} [limit=100] - Maximum results
	 * @returns {Promise<TokenMovementData[]>}
	 */
	static async getRecent(days = 7, limit = 100) {
		const sql = `
			SELECT * FROM token_movements 
			WHERE created_at > NOW() - INTERVAL '${days} days'
			ORDER BY created_at DESC 
			LIMIT $1
		`;
		const movements = await query(sql, [limit]);
		return movements.map(m => this._formatMovement(m));
	}

	/**
	 * Get total tokens earned by a member
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<number>}
	 */
	static async getTotalEarned(discordId) {
		const sql = `
			SELECT COALESCE(SUM(amount), 0) as total 
			FROM token_movements 
			WHERE discord_id = $1 
			AND type = 'earned'
		`;
		const result = await queryOne(sql, [discordId]);
		return parseInt(result.total);
	}

	/**
	 * Get total tokens paid out to a member
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<number>}
	 */
	static async getTotalPaidOut(discordId) {
		const sql = `
			SELECT COALESCE(SUM(ABS(amount)), 0) as total 
			FROM token_movements 
			WHERE discord_id = $1 
			AND type = 'payout'
		`;
		const result = await queryOne(sql, [discordId]);
		return parseInt(result.total);
	}

	/**
	 * Get statistics for a member's token movements
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<Object>}
	 */
	static async getStats(discordId) {
		const sql = `
			SELECT 
				COUNT(*) as total_movements,
				COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
				COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
				COALESCE(MAX(amount), 0) as largest_earning,
				COALESCE(MIN(balance_after), 0) as lowest_balance,
				COALESCE(MAX(balance_after), 0) as highest_balance
			FROM token_movements 
			WHERE discord_id = $1
		`;
		const result = await queryOne(sql, [discordId]);
		return {
			totalMovements: parseInt(result.total_movements),
			totalEarned: parseInt(result.total_earned),
			totalSpent: parseInt(result.total_spent),
			largestEarning: parseInt(result.largest_earning),
			lowestBalance: parseInt(result.lowest_balance),
			highestBalance: parseInt(result.highest_balance)
		};
	}

	/**
	 * Format database row to movement object
	 * @private
	 * @param {Object} row - Database row
	 * @returns {TokenMovementData}
	 */
	static _formatMovement(row) {
		return {
			id: row.id,
			memberId: row.member_id,
			discordId: row.discord_id,
			type: row.type,
			amount: row.amount,
			balanceBefore: row.balance_before,
			balanceAfter: row.balance_after,
			eventId: row.event_id,
			description: row.description,
			note: row.note,
			createdAt: row.created_at,
			createdBy: row.created_by
		};
	}

	/**
	 * Format token amount for display
	 * @param {number} tokens - Number of tokens
	 * @returns {string} Formatted string (e.g., "25 tokens (25M GP)")
	 */
	static formatTokens(tokens) {
		const gp = tokens;
		return `${tokens} token${tokens !== 1 ? 's' : ''} (${gp}M GP)`;
	}
}

module.exports = TokenMovement;

