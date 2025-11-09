/**
 * Migration: Remove discord_rank_legacy column
 * Created: 2025-10-16
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 003_remove_discord_rank_legacy');
	
	// Drop discord_rank_legacy column
	console.log('  - Removing discord_rank_legacy column from members table...');
	await query(`
		ALTER TABLE members 
		DROP COLUMN IF EXISTS discord_rank_legacy
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 003_remove_discord_rank_legacy');
	
	// Add it back as a nullable column
	await query(`
		ALTER TABLE members 
		ADD COLUMN IF NOT EXISTS discord_rank_legacy VARCHAR(50)
	`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

