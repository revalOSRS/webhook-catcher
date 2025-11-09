/**
 * Migration: Add osrs_accounts table for multiple account support
 * 
 * This migration:
 * 1. Creates the osrs_accounts table
 * 2. Migrates existing OSRS data from members table to osrs_accounts
 * 3. Removes OSRS-specific columns from members table (optional for backwards compatibility)
 */

const db = require('../index');

module.exports = {
	name: '003_add_osrs_accounts_table',
	
	async up() {
		console.log('📝 Running migration: Add osrs_accounts table...');
		
		// Create osrs_accounts table
		await db.query(`
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
		`);
		
		console.log('  ✅ Created osrs_accounts table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_discord_id ON osrs_accounts(discord_id);
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_wom_player_id ON osrs_accounts(wom_player_id);
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_dink_hash ON osrs_accounts(dink_hash);
		`);
		
		console.log('  ✅ Created indexes');
		
		// Migrate existing data from members table
		const result = await db.query(`
			SELECT discord_id, osrs_nickname, wom_player_id, wom_rank
			FROM members
			WHERE osrs_nickname IS NOT NULL AND osrs_nickname != ''
		`);
		
		if (result && result.length > 0) {
			console.log(`  📦 Migrating ${result.length} existing accounts...`);
			
			for (const row of result) {
				try {
					await db.query(`
						INSERT INTO osrs_accounts (
							discord_id, osrs_nickname, wom_player_id, wom_rank, is_primary, ehp, ehb
						) VALUES ($1, $2, $3, $4, true, 0, 0)
						ON CONFLICT (osrs_nickname) DO NOTHING
					`, [row.discord_id, row.osrs_nickname, row.wom_player_id, row.wom_rank]);
				} catch (error) {
					console.error(`    ⚠️ Failed to migrate ${row.osrs_nickname}:`, error.message);
				}
			}
			
			console.log('  ✅ Migration complete');
		} else {
			console.log('  ℹ️ No existing accounts to migrate');
		}
		
		// Note: We're keeping the old columns in members table for backwards compatibility
		// They can be removed in a future migration if desired
		
		console.log('✅ Migration 003 complete');
	},
	
	async down() {
		console.log('📝 Rolling back migration: Add osrs_accounts table...');
		
		// Drop indexes
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_discord_id');
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_wom_player_id');
		
		// Drop table
		await db.query('DROP TABLE IF EXISTS osrs_accounts CASCADE');
		
		console.log('✅ Migration 003 rolled back');
	}
};

