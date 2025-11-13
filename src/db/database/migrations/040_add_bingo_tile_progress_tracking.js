/**
 * Migration: Add Bingo Tile Progress Tracking
 * Created: 2025-11-12
 * 
 * Creates the tile progress tracking system to record:
 * - Individual player contributions to tiles
 * - Progress values (kill counts, XP, times, etc.)
 * - Flexible metadata for proof and additional data
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 040_add_bingo_tile_progress_tracking');

	// Create bingo_tile_progress table
	console.log('  - Creating bingo_tile_progress table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_tile_progress (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_tile_id UUID NOT NULL REFERENCES bingo_board_tiles(id) ON DELETE CASCADE,
			osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
			progress_value NUMERIC(15, 2) DEFAULT 0,
			progress_metadata JSONB DEFAULT '{}'::jsonb,
			proof_url TEXT,
			notes TEXT,
			recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_board_tile_account UNIQUE (board_tile_id, osrs_account_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_board_tile ON bingo_tile_progress(board_tile_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_account ON bingo_tile_progress(osrs_account_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_recorded_at ON bingo_tile_progress(recorded_at DESC)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tile_progress_metadata ON bingo_tile_progress USING GIN (progress_metadata)`);

	// Create trigger for updated_at
	console.log('  - Creating trigger...');
	await query(`
		CREATE OR REPLACE FUNCTION update_bingo_tile_progress_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_bingo_tile_progress_updated_at
		BEFORE UPDATE ON bingo_tile_progress
		FOR EACH ROW
		EXECUTE FUNCTION update_bingo_tile_progress_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 040_add_bingo_tile_progress_tracking');

	// Drop trigger and function
	await query(`DROP TRIGGER IF EXISTS trigger_update_bingo_tile_progress_updated_at ON bingo_tile_progress`);
	await query(`DROP FUNCTION IF EXISTS update_bingo_tile_progress_updated_at()`);

	// Drop table
	await query(`DROP TABLE IF EXISTS bingo_tile_progress CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

