/**
 * Migration: Update bingo_tile_progress table structure
 * Created: 2025-11-29
 * 
 * This migration:
 * 1. Removes completed_by_member_id column (no longer needed)
 * 2. Removes recorded_at column (no longer needed)
 * 3. Removes notes column (no longer needed)
 * 4. Removes proof_url column (no longer needed)
 * 5. Ensures completed_by_osrs_account_id is nullable
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 051_update_bingo_tile_progress_table');
	
	// Drop indexes that reference columns we're removing
	console.log('  - Dropping indexes...');
	await query(`DROP INDEX IF EXISTS idx_bingo_tile_progress_recorded_at`);
	
	// Drop columns we no longer need
	console.log('  - Removing completed_by_member_id column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS completed_by_member_id
	`);
	
	console.log('  - Removing recorded_at column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS recorded_at
	`);
	
	console.log('  - Removing notes column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS notes
	`);
	
	console.log('  - Removing proof_url column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS proof_url
	`);
	
	// Ensure completed_by_osrs_account_id is nullable (should already be nullable from migration 047, but ensure it)
	console.log('  - Ensuring completed_by_osrs_account_id is nullable...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ALTER COLUMN completed_by_osrs_account_id DROP NOT NULL
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 051_update_bingo_tile_progress_table');
	
	// Re-add columns with defaults
	console.log('  - Re-adding completed_by_member_id column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS completed_by_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL
	`);
	
	console.log('  - Re-adding recorded_at column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	`);
	
	console.log('  - Re-adding notes column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS notes TEXT
	`);
	
	console.log('  - Re-adding proof_url column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS proof_url TEXT
	`);
	
	// Recreate index for recorded_at
	console.log('  - Recreating recorded_at index...');
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_recorded_at ON bingo_tile_progress(recorded_at DESC)`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

