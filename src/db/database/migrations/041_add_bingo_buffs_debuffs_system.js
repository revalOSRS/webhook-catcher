/**
 * Migration: Add Bingo Buffs/Debuffs System
 * Created: 2025-11-12
 * 
 * Creates the buffs and debuffs system with:
 * - Library of reusable buffs/debuffs
 * - Application to tiles, rows, columns
 * - Flexible effect types and values
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 041_add_bingo_buffs_debuffs_system');

	// Create buff_debuff_type enum
	console.log('  - Creating enums...');
	await query(`
		DO $$ BEGIN
			CREATE TYPE buff_debuff_type AS ENUM (
				'buff',
				'debuff'
			);
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$;
	`);

	// Create bingo_buffs_debuffs library table
	console.log('  - Creating bingo_buffs_debuffs table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_buffs_debuffs (
			id VARCHAR(100) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			type buff_debuff_type NOT NULL,
			effect_type VARCHAR(50) NOT NULL,
			effect_value NUMERIC(10, 2) NOT NULL,
			icon VARCHAR(100),
			metadata JSONB DEFAULT '{}'::jsonb,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_type ON bingo_buffs_debuffs(type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_effect_type ON bingo_buffs_debuffs(effect_type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_is_active ON bingo_buffs_debuffs(is_active)`);

	// Create bingo_board_tile_effects table (buffs/debuffs applied to specific tiles)
	console.log('  - Creating bingo_board_tile_effects table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_board_tile_effects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			board_tile_id UUID NOT NULL REFERENCES bingo_board_tiles(id) ON DELETE CASCADE,
			buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
			applied_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			metadata JSONB DEFAULT '{}'::jsonb,
			CONSTRAINT unique_tile_buff_debuff UNIQUE (board_tile_id, buff_debuff_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tile_effects_board_tile ON bingo_board_tile_effects(board_tile_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tile_effects_buff_debuff ON bingo_board_tile_effects(buff_debuff_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tile_effects_is_active ON bingo_board_tile_effects(is_active)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_board_tile_effects_expires_at ON bingo_board_tile_effects(expires_at)`);

	// Create bingo_board_row_effects table
	console.log('  - Creating bingo_board_row_effects table...');
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

	// Create bingo_board_column_effects table
	console.log('  - Creating bingo_board_column_effects table...');
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

	// Create trigger for updated_at on bingo_buffs_debuffs
	console.log('  - Creating triggers...');
	await query(`
		CREATE OR REPLACE FUNCTION update_bingo_buffs_debuffs_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_bingo_buffs_debuffs_updated_at
		BEFORE UPDATE ON bingo_buffs_debuffs
		FOR EACH ROW
		EXECUTE FUNCTION update_bingo_buffs_debuffs_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 041_add_bingo_buffs_debuffs_system');

	// Drop trigger and function
	await query(`DROP TRIGGER IF EXISTS trigger_update_bingo_buffs_debuffs_updated_at ON bingo_buffs_debuffs`);
	await query(`DROP FUNCTION IF EXISTS update_bingo_buffs_debuffs_updated_at()`);

	// Drop tables
	await query(`DROP TABLE IF EXISTS bingo_board_column_effects CASCADE`);
	await query(`DROP TABLE IF EXISTS bingo_board_row_effects CASCADE`);
	await query(`DROP TABLE IF EXISTS bingo_board_tile_effects CASCADE`);
	await query(`DROP TABLE IF EXISTS bingo_buffs_debuffs CASCADE`);

	// Drop enum
	await query(`DROP TYPE IF EXISTS buff_debuff_type CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

