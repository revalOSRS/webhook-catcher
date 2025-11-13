/**
 * Migration: Add Bingo Boards System
 * Created: 2025-11-12
 * 
 * Creates the bingo board system with:
 * - Board configuration (grid size, settings)
 * - Tile placement on boards
 * - Completion tracking
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 039_add_bingo_boards_system');

	// Create bingo_boards table
	console.log('  - Creating bingo_boards table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_boards (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			columns INTEGER NOT NULL DEFAULT 7,
			rows INTEGER NOT NULL DEFAULT 7,
			show_row_column_buffs BOOLEAN DEFAULT false,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT chk_board_size CHECK (columns > 0 AND columns <= 20 AND rows > 0 AND rows <= 20)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_event_id ON bingo_boards(event_id)`);

	// Create bingo_board_tiles table (placed tiles on a board)
	console.log('  - Creating bingo_board_tiles table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_board_tiles (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
			tile_id VARCHAR(100) NOT NULL REFERENCES bingo_tiles(id) ON DELETE CASCADE,
			position VARCHAR(10) NOT NULL,
			custom_points INTEGER,
			is_completed BOOLEAN DEFAULT false,
			completed_by_team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL,
			completed_at TIMESTAMP,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_board_position UNIQUE (board_id, position)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_board_id ON bingo_board_tiles(board_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_tile_id ON bingo_board_tiles(tile_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_position ON bingo_board_tiles(board_id, position)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_completed ON bingo_board_tiles(is_completed)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_team ON bingo_board_tiles(completed_by_team_id)`);

	// Create triggers for updated_at
	console.log('  - Creating triggers...');
	await query(`
		CREATE OR REPLACE FUNCTION update_bingo_boards_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_bingo_boards_updated_at
		BEFORE UPDATE ON bingo_boards
		FOR EACH ROW
		EXECUTE FUNCTION update_bingo_boards_updated_at()
	`);

	await query(`
		CREATE OR REPLACE FUNCTION update_bingo_board_tiles_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_bingo_board_tiles_updated_at
		BEFORE UPDATE ON bingo_board_tiles
		FOR EACH ROW
		EXECUTE FUNCTION update_bingo_board_tiles_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 039_add_bingo_boards_system');

	// Drop triggers and functions
	await query(`DROP TRIGGER IF EXISTS trigger_update_bingo_boards_updated_at ON bingo_boards`);
	await query(`DROP FUNCTION IF EXISTS update_bingo_boards_updated_at()`);
	await query(`DROP TRIGGER IF EXISTS trigger_update_bingo_board_tiles_updated_at ON bingo_board_tiles`);
	await query(`DROP FUNCTION IF EXISTS update_bingo_board_tiles_updated_at()`);

	// Drop tables
	await query(`DROP TABLE IF EXISTS bingo_board_tiles CASCADE`);
	await query(`DROP TABLE IF EXISTS bingo_boards CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

