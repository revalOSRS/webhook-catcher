const { query } = require('../index');

/**
 * Migration: Refactor Bingo Boards for Team-Specific Boards
 * - Add team_id to bingo_boards (make boards team-specific)
 * - Merge row and column effects into single bingo_board_line_effects table
 */
async function up() {
	console.log('🔄 Refactoring bingo boards for team-specific boards...');

	// Step 1: Add team_id column to bingo_boards (nullable initially)
	console.log('  - Adding team_id to bingo_boards...');
	await query(`
		ALTER TABLE bingo_boards
		ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES event_teams(id) ON DELETE CASCADE
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_team_id ON bingo_boards(team_id)`);

	// Step 1b: Add osrs_account_id to event_team_members
	console.log('  - Adding osrs_account_id to event_team_members...');
	await query(`
		ALTER TABLE event_team_members
		ADD COLUMN IF NOT EXISTS osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE SET NULL
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_osrs_account_id ON event_team_members(osrs_account_id)`);

	// Step 2: Create merged line effects table
	console.log('  - Creating merged bingo_board_line_effects table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_board_line_effects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
			line_type VARCHAR(10) NOT NULL CHECK (line_type IN ('row', 'column')),
			line_identifier VARCHAR(10) NOT NULL, -- row_number for rows, column_letter for columns
			buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
			applied_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			metadata JSONB DEFAULT '{}'::jsonb,
			CONSTRAINT unique_board_line_buff_debuff UNIQUE (board_id, line_type, line_identifier, buff_debuff_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_line_effects_board ON bingo_board_line_effects(board_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_line_effects_type ON bingo_board_line_effects(board_id, line_type, line_identifier)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_line_effects_buff_debuff ON bingo_board_line_effects(buff_debuff_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_line_effects_is_active ON bingo_board_line_effects(is_active)`);

	// Step 3: Migrate existing row effects data
	console.log('  - Migrating row effects data...');
	await query(`
		INSERT INTO bingo_board_line_effects (
			board_id, line_type, line_identifier, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		)
		SELECT 
			board_id, 'row', row_number::VARCHAR, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		FROM bingo_board_row_effects
		ON CONFLICT DO NOTHING
	`);

	// Step 4: Migrate existing column effects data
	console.log('  - Migrating column effects data...');
	await query(`
		INSERT INTO bingo_board_line_effects (
			board_id, line_type, line_identifier, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		)
		SELECT 
			board_id, 'column', column_letter, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		FROM bingo_board_column_effects
		ON CONFLICT DO NOTHING
	`);

	// Step 5: Drop old tables (they will cascade delete indexes)
	console.log('  - Dropping old row and column effects tables...');
	await query(`DROP TABLE IF EXISTS bingo_board_row_effects CASCADE`);
	await query(`DROP TABLE IF EXISTS bingo_board_column_effects CASCADE`);

	console.log('✅ Bingo boards refactoring completed');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('⚠️  Rolling back bingo boards refactoring...');

	// Recreate row effects table
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_board_row_effects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
			row_number INTEGER NOT NULL,
			buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
			applied_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			metadata JSONB DEFAULT '{}'::jsonb,
			CONSTRAINT unique_board_row_buff_debuff UNIQUE (board_id, row_number, buff_debuff_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_row_effects_board ON bingo_board_row_effects(board_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_row_effects_row ON bingo_board_row_effects(board_id, row_number)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_row_effects_buff_debuff ON bingo_board_row_effects(buff_debuff_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_row_effects_is_active ON bingo_board_row_effects(is_active)`);

	// Recreate column effects table
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_board_column_effects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
			column_letter VARCHAR(2) NOT NULL,
			buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
			applied_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			metadata JSONB DEFAULT '{}'::jsonb,
			CONSTRAINT unique_board_column_buff_debuff UNIQUE (board_id, column_letter, buff_debuff_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_column_effects_board ON bingo_board_column_effects(board_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_column_effects_column ON bingo_board_column_effects(board_id, column_letter)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_column_effects_buff_debuff ON bingo_board_column_effects(buff_debuff_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_column_effects_is_active ON bingo_board_column_effects(is_active)`);

	// Migrate data back from merged table
	await query(`
		INSERT INTO bingo_board_row_effects (
			board_id, row_number, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		)
		SELECT 
			board_id, line_identifier::INTEGER, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		FROM bingo_board_line_effects
		WHERE line_type = 'row'
		ON CONFLICT DO NOTHING
	`);

	await query(`
		INSERT INTO bingo_board_column_effects (
			board_id, column_letter, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		)
		SELECT 
			board_id, line_identifier, buff_debuff_id,
			applied_by, is_active, applied_at, expires_at, metadata
		FROM bingo_board_line_effects
		WHERE line_type = 'column'
		ON CONFLICT DO NOTHING
	`);

	// Drop merged table
	await query(`DROP TABLE IF EXISTS bingo_board_line_effects CASCADE`);

	// Remove team_id column
	await query(`ALTER TABLE bingo_boards DROP COLUMN IF EXISTS team_id`);
	await query(`DROP INDEX IF EXISTS idx_bingo_boards_team_id`);

	// Remove osrs_account_id column
	await query(`ALTER TABLE event_team_members DROP COLUMN IF EXISTS osrs_account_id`);
	await query(`DROP INDEX IF EXISTS idx_event_team_members_osrs_account_id`);

	console.log('✅ Rollback completed');
}

module.exports = {
	up,
	down
};
