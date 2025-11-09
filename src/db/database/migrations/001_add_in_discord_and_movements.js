/**
 * Migration: Add in_discord field and member_movements table
 * Created: 2025-10-16
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 001_add_in_discord_and_movements');
	
	// Add in_discord column to members table if it doesn't exist
	console.log('  - Adding in_discord column to members table...');
	await query(`
		ALTER TABLE members 
		ADD COLUMN IF NOT EXISTS in_discord BOOLEAN DEFAULT true
	`);
	
	// Create member_movements table if it doesn't exist
	console.log('  - Creating member_movements table...');
	await query(`
		CREATE TABLE IF NOT EXISTS member_movements (
			id SERIAL PRIMARY KEY,
			member_id INTEGER,
			discord_id VARCHAR(20) NOT NULL,
			event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('joined', 'left')),
			previous_rank VARCHAR(50),
			notes TEXT,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
	
	// Create indexes for member_movements
	console.log('  - Creating indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_movements_member_id ON member_movements(member_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_movements_discord_id ON member_movements(discord_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON member_movements(timestamp)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_movements_event_type ON member_movements(event_type)`);
	
	// Set default value for existing rows (all existing members are assumed to be in Discord)
	console.log('  - Setting default values for existing members...');
	await query(`
		UPDATE members 
		SET in_discord = true 
		WHERE in_discord IS NULL
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 001_add_in_discord_and_movements');
	
	// Drop indexes
	await query(`DROP INDEX IF EXISTS idx_movements_event_type`);
	await query(`DROP INDEX IF EXISTS idx_movements_timestamp`);
	await query(`DROP INDEX IF EXISTS idx_movements_discord_id`);
	await query(`DROP INDEX IF EXISTS idx_movements_member_id`);
	
	// Drop member_movements table
	await query(`DROP TABLE IF EXISTS member_movements`);
	
	// Remove in_discord column
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS in_discord`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

