/**
 * Migration: Update Bingo Tile Progress for Team Tracking
 * Created: 2025-11-27
 * 
 * Updates bingo_tile_progress to support:
 * - Nullable osrs_account_id (for team completions)
 * - Completion tracking (auto vs manual admin)
 * - Better metadata for tier tracking
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 047_update_bingo_tile_progress_for_team_tracking');

	// Step 1: Drop existing unique constraint
	console.log('  - Dropping existing unique constraint...');
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP CONSTRAINT IF EXISTS unique_board_tile_account
	`);

	// Step 2: Make osrs_account_id nullable
	console.log('  - Making osrs_account_id nullable...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ALTER COLUMN osrs_account_id DROP NOT NULL
	`);

	// Step 3: Add completion tracking fields
	console.log('  - Adding completion tracking fields...');
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD COLUMN IF NOT EXISTS completion_type VARCHAR(20) CHECK (completion_type IN ('auto', 'manual_admin')),
		ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
		ADD COLUMN IF NOT EXISTS completed_by_osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE SET NULL,
		ADD COLUMN IF NOT EXISTS completed_by_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL
	`);

	// Step 4: Create new unique constraint (allows NULL osrs_account_id)
	// PostgreSQL unique indexes treat NULLs as distinct, so we can have multiple NULLs
	// For non-NULL values, we enforce uniqueness per board_tile_id
	console.log('  - Creating new unique constraint...');
	await query(`
		CREATE UNIQUE INDEX IF NOT EXISTS unique_board_tile_account_nullable 
		ON bingo_tile_progress(board_tile_id, osrs_account_id)
		WHERE osrs_account_id IS NOT NULL
	`);

	// Step 5: Add indexes for completion queries
	console.log('  - Adding completion indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_completion_type ON bingo_tile_progress(completion_type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_completed_at ON bingo_tile_progress(completed_at DESC)`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 047_update_bingo_tile_progress_for_team_tracking');

	// Drop new indexes
	await query(`DROP INDEX IF EXISTS idx_bingo_tile_progress_completed_at`);
	await query(`DROP INDEX IF EXISTS idx_bingo_tile_progress_completion_type`);
	await query(`DROP INDEX IF EXISTS unique_board_tile_account_nullable`);

	// Remove completion fields
	await query(`
		ALTER TABLE bingo_tile_progress
		DROP COLUMN IF EXISTS completed_by_member_id,
		DROP COLUMN IF EXISTS completed_by_osrs_account_id,
		DROP COLUMN IF EXISTS completed_at,
		DROP COLUMN IF EXISTS completion_type
	`);

	// Make osrs_account_id NOT NULL again (this will fail if NULLs exist)
	await query(`
		ALTER TABLE bingo_tile_progress
		ALTER COLUMN osrs_account_id SET NOT NULL
	`);

	// Restore original unique constraint
	await query(`
		ALTER TABLE bingo_tile_progress
		ADD CONSTRAINT unique_board_tile_account UNIQUE (board_tile_id, osrs_account_id)
	`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

