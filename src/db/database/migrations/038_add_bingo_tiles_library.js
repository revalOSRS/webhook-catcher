/**
 * Migration: Add Bingo Tiles Library
 * Created: 2025-11-12
 * 
 * Creates a library of reusable bingo tiles with:
 * - Tile definitions (task, category, difficulty)
 * - Base points and bonus tiers
 * - Flexible requirements and metadata
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 038_add_bingo_tiles_library');

	// Create bingo_tiles table
	console.log('  - Creating bingo_tiles table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_tiles (
			id VARCHAR(100) PRIMARY KEY,
			task TEXT NOT NULL,
			category VARCHAR(50) NOT NULL,
			difficulty VARCHAR(20) NOT NULL,
			icon VARCHAR(100),
			description TEXT,
			base_points INTEGER DEFAULT 0,
			requirements JSONB DEFAULT '[]'::jsonb,
			bonus_tiers JSONB DEFAULT '[]'::jsonb,
			metadata JSONB DEFAULT '{}'::jsonb,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme'))
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_category ON bingo_tiles(category)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_difficulty ON bingo_tiles(difficulty)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_is_active ON bingo_tiles(is_active)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_tiles_bonus_tiers ON bingo_tiles USING GIN (bonus_tiers)`);

	// Create trigger for updated_at
	console.log('  - Creating trigger...');
	await query(`
		CREATE OR REPLACE FUNCTION update_bingo_tiles_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_bingo_tiles_updated_at
		BEFORE UPDATE ON bingo_tiles
		FOR EACH ROW
		EXECUTE FUNCTION update_bingo_tiles_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 038_add_bingo_tiles_library');

	// Drop trigger and function
	await query(`DROP TRIGGER IF EXISTS trigger_update_bingo_tiles_updated_at ON bingo_tiles`);
	await query(`DROP FUNCTION IF EXISTS update_bingo_tiles_updated_at()`);

	// Drop table
	await query(`DROP TABLE IF EXISTS bingo_tiles CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

