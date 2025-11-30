/**
 * Migration: Update bingo_tiles table structure
 * Created: 2025-11-29
 * 
 * This migration:
 * 1. Removes bonus_tiers column (no longer needed)
 * 2. Removes metadata column (no longer needed)
 * 3. Removes is_active column (no longer needed)
 * 4. Renames base_points to points
 * 5. Updates any indexes that reference these columns
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 050_update_bingo_tiles_table_structure');
	
	// Drop indexes that reference columns we're removing
	console.log('  - Dropping indexes...');
	await query(`DROP INDEX IF EXISTS idx_bingo_tiles_bonus_tiers`);
	await query(`DROP INDEX IF EXISTS idx_bingo_tiles_is_active`);
	
	// Rename base_points to points
	console.log('  - Renaming base_points to points...');
	await query(`
		ALTER TABLE bingo_tiles
		RENAME COLUMN base_points TO points
	`);
	
	// Drop columns we no longer need
	console.log('  - Removing bonus_tiers column...');
	await query(`
		ALTER TABLE bingo_tiles
		DROP COLUMN IF EXISTS bonus_tiers
	`);
	
	console.log('  - Removing metadata column...');
	await query(`
		ALTER TABLE bingo_tiles
		DROP COLUMN IF EXISTS metadata
	`);
	
	console.log('  - Removing is_active column...');
	await query(`
		ALTER TABLE bingo_tiles
		DROP COLUMN IF EXISTS is_active
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 050_update_bingo_tiles_table_structure');
	
	// Rename points back to base_points
	console.log('  - Renaming points back to base_points...');
	await query(`
		ALTER TABLE bingo_tiles
		RENAME COLUMN points TO base_points
	`);
	
	// Re-add columns with defaults
	console.log('  - Re-adding bonus_tiers column...');
	await query(`
		ALTER TABLE bingo_tiles
		ADD COLUMN IF NOT EXISTS bonus_tiers JSONB DEFAULT '[]'::jsonb
	`);
	
	console.log('  - Re-adding metadata column...');
	await query(`
		ALTER TABLE bingo_tiles
		ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
	`);
	
	console.log('  - Re-adding is_active column...');
	await query(`
		ALTER TABLE bingo_tiles
		ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
	`);
	
	// Recreate indexes
	console.log('  - Recreating indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_bonus_tiers ON bingo_tiles USING GIN (bonus_tiers)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_is_active ON bingo_tiles(is_active)`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

