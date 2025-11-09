const db = require('../index');

/**
 * OSRSAccount Model
 * Represents an OSRS account linked to a Discord member
 * Each Discord member can have multiple OSRS accounts
 */
class OSRSAccount {
	/**
	 * Create the osrs_accounts table
	 */
	static async createTable() {
		const query = `
			CREATE TABLE IF NOT EXISTS osrs_accounts (
				id SERIAL PRIMARY KEY,
				discord_id VARCHAR(255) NOT NULL,
				osrs_nickname VARCHAR(12) NOT NULL,
				dink_hash VARCHAR(255),
				wom_player_id INTEGER,
				wom_rank VARCHAR(50),
				ehp DECIMAL(10, 2) DEFAULT 0,
				ehb DECIMAL(10, 2) DEFAULT 0,
				is_primary BOOLEAN DEFAULT false,
				last_synced_at TIMESTAMP,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(osrs_nickname),
				FOREIGN KEY (discord_id) REFERENCES members(discord_id) ON DELETE CASCADE
			);
			
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_discord_id ON osrs_accounts(discord_id);
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_wom_player_id ON osrs_accounts(wom_player_id);
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_dink_hash ON osrs_accounts(dink_hash);
		`;
		
		await db.query(query);
		console.log('✅ OSRSAccount table created/verified');
	}
	
	/**
	 * Create a new OSRS account
	 * @param {Object} data - Account data
	 * @returns {Promise<Object>} Created account
	 */
	static async create(data) {
		const {
			discordId,
			osrsNickname,
			dinkHash = null,
			womPlayerId = null,
			womRank = null,
			ehp = 0,
			ehb = 0,
			isPrimary = false
		} = data;
		
		const query = `
			INSERT INTO osrs_accounts (
				discord_id, osrs_nickname, dink_hash, wom_player_id, wom_rank, ehp, ehb, is_primary
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING *
		`;
		
		const result = await db.query(query, [
			discordId,
			osrsNickname,
			dinkHash,
			womPlayerId,
			womRank,
			ehp,
			ehb,
			isPrimary
		]);
		
		return result[0];
	}
	
	/**
	 * Find all OSRS accounts
	 * @returns {Promise<Array>} Array of all OSRS accounts
	 */
	static async findAll() {
		const query = 'SELECT * FROM osrs_accounts ORDER BY created_at DESC';
		const result = await db.query(query);
		return result;
	}
	
	/**
	 * Find all accounts for a Discord user
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<Array>} Array of OSRS accounts
	 */
	static async findByDiscordId(discordId) {
		const query = 'SELECT * FROM osrs_accounts WHERE discord_id = $1 ORDER BY is_primary DESC, created_at ASC';
		const result = await db.query(query, [discordId]);
		return result; // Neon returns results directly, not wrapped in .rows
	}
	
	/**
	 * Find account by OSRS nickname
	 * @param {string} osrsNickname - OSRS account name
	 * @returns {Promise<Object|null>} OSRS account or null
	 */
	static async findByOSRSNickname(osrsNickname) {
		const query = 'SELECT * FROM osrs_accounts WHERE LOWER(osrs_nickname) = LOWER($1)';
		const result = await db.query(query, [osrsNickname]);
		return result[0] || null;
	}
	
	/**
	 * Find account by WOM player ID
	 * @param {number} womPlayerId - WOM player ID
	 * @returns {Promise<Object|null>} OSRS account or null
	 */
	static async findByWOMPlayerId(womPlayerId) {
		const query = 'SELECT * FROM osrs_accounts WHERE wom_player_id = $1';
		const result = await db.query(query, [womPlayerId]);
		return result[0] || null;
	}
	
	/**
	 * Find account by Dink Hash
	 * @param {string} dinkHash - Dink webhook hash
	 * @returns {Promise<Object|null>} OSRS account or null
	 */
	static async findByDinkHash(dinkHash) {
		const query = 'SELECT * FROM osrs_accounts WHERE dink_hash = $1';
		const result = await db.query(query, [dinkHash]);
		return result[0] || null;
	}
	
	/**
	 * Update an OSRS account
	 * @param {number} id - Account ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated account
	 */
	static async update(id, updates) {
		const fields = [];
		const values = [];
		let paramCount = 1;
		
		for (const [key, value] of Object.entries(updates)) {
			const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
			fields.push(`${snakeKey} = $${paramCount}`);
			values.push(value);
			paramCount++;
		}
		
		fields.push(`updated_at = CURRENT_TIMESTAMP`);
		values.push(id);
		
		const query = `
			UPDATE osrs_accounts 
			SET ${fields.join(', ')}
			WHERE id = $${paramCount}
			RETURNING *
		`;
		
		const result = await db.query(query, values);
		return result[0];
	}
	
	/**
	 * Set an account as primary (and unset others for that Discord user)
	 * @param {number} id - Account ID to set as primary
	 * @param {string} discordId - Discord user ID
	 */
	static async setPrimary(id, discordId) {
		// Unset all primary flags for this Discord user
		await db.query(
			'UPDATE osrs_accounts SET is_primary = false WHERE discord_id = $1',
			[discordId]
		);
		
		// Set this account as primary
		await db.query(
			'UPDATE osrs_accounts SET is_primary = true WHERE id = $1',
			[id]
		);
	}
	
	/**
	 * Delete an OSRS account
	 * @param {number} id - Account ID
	 */
	static async delete(id) {
		await db.query('DELETE FROM osrs_accounts WHERE id = $1', [id]);
	}
	
	/**
	 * Get the account with highest EHP+EHB for a Discord user
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<Object|null>} Account with highest efficiency
	 */
	static async getHighestEfficiency(discordId) {
		const query = `
			SELECT *, (ehp + ehb) as total_efficiency
			FROM osrs_accounts 
			WHERE discord_id = $1
			ORDER BY total_efficiency DESC
			LIMIT 1
		`;
		const result = await db.query(query, [discordId]);
		return result[0] || null;
	}
	
	/**
	 * Get all accounts with their total efficiency
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<Array>} Accounts with total_efficiency field
	 */
	static async getAllWithEfficiency(discordId) {
		const query = `
			SELECT *, (ehp + ehb) as total_efficiency
			FROM osrs_accounts 
			WHERE discord_id = $1
			ORDER BY total_efficiency DESC
		`;
		const result = await db.query(query, [discordId]);
		return result; // Neon returns results directly, not wrapped in .rows
	}
	
	/**
	 * Update sync timestamp
	 * @param {number} id - Account ID
	 */
	static async updateSyncTimestamp(id) {
		await db.query(
			'UPDATE osrs_accounts SET last_synced_at = CURRENT_TIMESTAMP WHERE id = $1',
			[id]
		);
	}
}

module.exports = OSRSAccount;

