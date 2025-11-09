/**
 * Migration: Add wom_rank field and remove discord_rank
 * Created: 2025-10-16
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 002_add_wom_rank_field');
	
	// Add wom_rank column
	console.log('  - Adding wom_rank column to members table...');
	await query(`
		ALTER TABLE members 
		ADD COLUMN IF NOT EXISTS wom_rank VARCHAR(50)
	`);
	
	// Rename discord_rank to discord_rank_legacy for reference
	console.log('  - Renaming discord_rank to discord_rank_legacy...');
	await query(`
		ALTER TABLE members 
		RENAME COLUMN discord_rank TO discord_rank_legacy
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 002_add_wom_rank_field');
	
	// Rename back
	await query(`
		ALTER TABLE members 
		RENAME COLUMN discord_rank_legacy TO discord_rank
	`);
	
	// Remove wom_rank column
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS wom_rank`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

