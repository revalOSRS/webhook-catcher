/**
 * Migration: Simplify bingo_tile_progress table
 * Created: 2025-11-30
 * 
 * This migration:
 * 1. Removes osrs_account_id column (player contributions are now tracked in progress_metadata)
 * 2. Updates unique constraint to be per board_tile_id only
 * 
 * The new structure tracks:
 * - progress_value: Current numeric progress
 * - progress_metadata: JSONB with player contributions, tier completions, etc.
 * - completed_by_osrs_account_id: Only set if one player completed the tile solo
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 058_simplify_bingo_tile_progress_table');
	
	// Step 1: Drop indexes that reference osrs_account_id
	console.log('  - Dropping osrs_account_id indexes...');
	await query(`DROP INDEX IF EXISTS idx_bingo_tile_progress_account`);
	await query(`DROP INDEX IF EXISTS unique_board_tile_account_nullable`);
	
	// Step 2: Remove osrs_account_id column
	console.log('  - Removing osrs_account_id column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS osrs_account_id
	`);
	
	// Step 3: Add unique constraint on board_tile_id only (one progress record per board tile)
	console.log('  - Adding unique constraint on board_tile_id...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP CONSTRAINT IF EXISTS unique_board_tile_progress
	`);
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD CONSTRAINT unique_board_tile_progress UNIQUE (board_tile_id)
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 058_simplify_bingo_tile_progress_table');
	
	// Drop new unique constraint
	console.log('  - Dropping unique constraint...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP CONSTRAINT IF EXISTS unique_board_tile_progress
	`);
	
	// Re-add osrs_account_id column
	console.log('  - Re-adding osrs_account_id column...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE CASCADE
	`);
	
	// Recreate indexes
	console.log('  - Recreating indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_account ON bingo_tile_progress(osrs_account_id)`);
	await query(`
		CREATE UNIQUE INDEX IF NOT EXISTS unique_board_tile_account_nullable 
		ON bingo_tile_progress(board_tile_id, osrs_account_id)
		WHERE osrs_account_id IS NOT NULL
	`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

