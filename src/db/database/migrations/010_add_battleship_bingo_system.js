/**
 * Migration: Add Battleship Bingo Event System
 * Created: 2025-10-21
 * 
 * Implements a complete Battleship Bingo game system with:
 * - Game events tracking
 * - Team management
 * - Board tiles and ship placement
 * - Tile progress and completion
 * - Bombing mechanics
 * - Buffs/debuffs system
 * - Comprehensive audit logging
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 010_add_battleship_bingo_system');

	// Enable UUID extension if not already enabled
	console.log('  - Enabling UUID extension...');
	await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

	// 1. Create game_events table (generic for all game types)
	console.log('  - Creating game_events table...');
	await query(`
		CREATE TABLE IF NOT EXISTS game_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_type VARCHAR(50) NOT NULL,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
			start_time TIMESTAMP NOT NULL,
			end_time TIMESTAMP NOT NULL,
			created_by_discord_id VARCHAR(50) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			metadata JSONB,
			CONSTRAINT chk_event_status CHECK (status IN ('upcoming', 'active', 'paused', 'completed', 'cancelled'))
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_game_events_status ON game_events(status)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_game_events_start_time ON game_events(start_time)`);

	// 2. Create battleship_bingo_events table
	console.log('  - Creating battleship_bingo_events table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL UNIQUE,
			board_config JSONB NOT NULL,
			rules_config JSONB NOT NULL,
			winning_team_id UUID,
			total_tiles INTEGER NOT NULL,
			completed_tiles INTEGER DEFAULT 0,
			FOREIGN KEY (event_id) REFERENCES game_events(id) ON DELETE CASCADE
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_events_event_id ON battleship_bingo_events(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_events_winning_team ON battleship_bingo_events(winning_team_id)`);

	// 3. Create teams table
	console.log('  - Creating teams table...');
	await query(`
		CREATE TABLE IF NOT EXISTS teams (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			name VARCHAR(100) NOT NULL,
			color VARCHAR(7) NOT NULL,
			score INTEGER DEFAULT 0,
			ships_remaining INTEGER DEFAULT 0,
			tiles_completed INTEGER DEFAULT 0,
			bombs_remaining INTEGER DEFAULT 0,
			last_bomb_reset TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (event_id) REFERENCES game_events(id) ON DELETE CASCADE
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_teams_score ON teams(score DESC)`);

	// Add foreign key for winning_team_id now that teams table exists
	await query(`
		ALTER TABLE battleship_bingo_events
		ADD CONSTRAINT fk_bb_events_winning_team
		FOREIGN KEY (winning_team_id) REFERENCES teams(id) ON DELETE SET NULL
	`);

	// 4. Create team_members table
	console.log('  - Creating team_members table...');
	await query(`
		CREATE TABLE IF NOT EXISTS team_members (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			team_id UUID NOT NULL,
			discord_id VARCHAR(50) NOT NULL,
			member_code VARCHAR(20),
			role VARCHAR(20) DEFAULT 'member',
			individual_score INTEGER DEFAULT 0,
			tiles_completed INTEGER DEFAULT 0,
			joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
			CONSTRAINT chk_team_member_role CHECK (role IN ('captain', 'member')),
			CONSTRAINT unique_team_member UNIQUE (team_id, discord_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_team_members_discord_id ON team_members(discord_id)`);

	// 5. Create battleship_bingo_ships table
	console.log('  - Creating battleship_bingo_ships table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_ships (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			team_id UUID NOT NULL,
			ship_name VARCHAR(100),
			size INTEGER NOT NULL,
			coordinates JSONB NOT NULL,
			segments_destroyed INTEGER DEFAULT 0,
			is_sunk BOOLEAN DEFAULT FALSE,
			is_hidden BOOLEAN DEFAULT TRUE,
			placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			destroyed_at TIMESTAMP,
			FOREIGN KEY (event_id) REFERENCES battleship_bingo_events(id) ON DELETE CASCADE,
			FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_ships_event_id ON battleship_bingo_ships(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_ships_team_id ON battleship_bingo_ships(team_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_ships_is_sunk ON battleship_bingo_ships(is_sunk)`);

	// 6. Create battleship_bingo_tiles table
	console.log('  - Creating battleship_bingo_tiles table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_tiles (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			coordinate VARCHAR(10) NOT NULL,
			task_id VARCHAR(100) NOT NULL,
			status VARCHAR(20) DEFAULT 'unclaimed',
			claimed_by_team_id UUID,
			completed_by_discord_id VARCHAR(50),
			contributors JSONB,
			buff_debuff_id VARCHAR(100),
			base_points INTEGER DEFAULT 100,
			bonus_tier_achieved VARCHAR(50),
			completion_value DECIMAL(10,2),
			total_points_awarded INTEGER DEFAULT 0,
			is_ship_segment BOOLEAN DEFAULT FALSE,
			ship_id UUID,
			is_bombed BOOLEAN DEFAULT FALSE,
			bombed_by_team_id UUID,
			proof_url TEXT,
			claimed_at TIMESTAMP,
			completed_at TIMESTAMP,
			bombed_at TIMESTAMP,
			metadata JSONB,
			FOREIGN KEY (event_id) REFERENCES battleship_bingo_events(id) ON DELETE CASCADE,
			FOREIGN KEY (claimed_by_team_id) REFERENCES teams(id) ON DELETE SET NULL,
			FOREIGN KEY (ship_id) REFERENCES battleship_bingo_ships(id) ON DELETE SET NULL,
			FOREIGN KEY (bombed_by_team_id) REFERENCES teams(id) ON DELETE SET NULL,
			CONSTRAINT chk_tile_status CHECK (status IN ('unclaimed', 'claimed', 'in_progress', 'pending_review', 'completed', 'bombed')),
			CONSTRAINT unique_event_coordinate UNIQUE (event_id, coordinate)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_tiles_event_id ON battleship_bingo_tiles(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_tiles_coordinate ON battleship_bingo_tiles(event_id, coordinate)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_tiles_status ON battleship_bingo_tiles(status)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_tiles_claimed_team ON battleship_bingo_tiles(claimed_by_team_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_tiles_ship_id ON battleship_bingo_tiles(ship_id)`);

	// 7. Create battleship_bingo_tile_progress table
	console.log('  - Creating battleship_bingo_tile_progress table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_tile_progress (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tile_id UUID NOT NULL,
			discord_id VARCHAR(50) NOT NULL,
			progress_amount INTEGER DEFAULT 0,
			progress_percentage INTEGER DEFAULT 0,
			contribution_type VARCHAR(100),
			current_best_value DECIMAL(10,2),
			proof_url TEXT,
			notes TEXT,
			last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tile_id) REFERENCES battleship_bingo_tiles(id) ON DELETE CASCADE,
			CONSTRAINT unique_bb_player_tile_progress UNIQUE (tile_id, discord_id),
			CONSTRAINT chk_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_progress_tile_id ON battleship_bingo_tile_progress(tile_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_progress_discord_id ON battleship_bingo_tile_progress(discord_id)`);

	// 8. Create battleship_bingo_active_effects table
	console.log('  - Creating battleship_bingo_active_effects table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_active_effects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			effect_id VARCHAR(100) NOT NULL,
			type VARCHAR(10) NOT NULL,
			applied_to_type VARCHAR(20) NOT NULL,
			applied_to_id VARCHAR(100) NOT NULL,
			triggered_by_tile_id UUID,
			triggered_by_discord_id VARCHAR(50),
			is_active BOOLEAN DEFAULT TRUE,
			expires_at TIMESTAMP,
			activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			deactivated_at TIMESTAMP,
			metadata JSONB,
			FOREIGN KEY (event_id) REFERENCES battleship_bingo_events(id) ON DELETE CASCADE,
			FOREIGN KEY (triggered_by_tile_id) REFERENCES battleship_bingo_tiles(id) ON DELETE SET NULL,
			CONSTRAINT chk_effect_type CHECK (type IN ('buff', 'debuff')),
			CONSTRAINT chk_applied_to_type CHECK (applied_to_type IN ('team', 'tile', 'player'))
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_effects_event_id ON battleship_bingo_active_effects(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_effects_is_active ON battleship_bingo_active_effects(is_active)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_effects_applied_to ON battleship_bingo_active_effects(applied_to_type, applied_to_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_effects_expires_at ON battleship_bingo_active_effects(expires_at)`);

	// 9. Create battleship_bingo_bomb_actions table
	console.log('  - Creating battleship_bingo_bomb_actions table...');
	await query(`
		CREATE TABLE IF NOT EXISTS battleship_bingo_bomb_actions (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			bombing_team_id UUID NOT NULL,
			target_coordinate VARCHAR(10) NOT NULL,
			bombed_by_discord_id VARCHAR(50) NOT NULL,
			result VARCHAR(20) NOT NULL,
			ship_id UUID,
			points_awarded INTEGER DEFAULT 0,
			bombed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			metadata JSONB,
			FOREIGN KEY (event_id) REFERENCES battleship_bingo_events(id) ON DELETE CASCADE,
			FOREIGN KEY (bombing_team_id) REFERENCES teams(id) ON DELETE CASCADE,
			FOREIGN KEY (ship_id) REFERENCES battleship_bingo_ships(id) ON DELETE SET NULL,
			CONSTRAINT chk_bomb_result CHECK (result IN ('hit', 'miss', 'sunk_ship', 'blocked'))
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_bb_bombs_event_id ON battleship_bingo_bomb_actions(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_bombs_team_id ON battleship_bingo_bomb_actions(bombing_team_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_bombs_result ON battleship_bingo_bomb_actions(result)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bb_bombs_bombed_at ON battleship_bingo_bomb_actions(bombed_at DESC)`);

	// 10. Create event_log table
	console.log('  - Creating event_log table...');
	await query(`
		CREATE TABLE IF NOT EXISTS event_log (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL,
			action_type VARCHAR(50) NOT NULL,
			actor_discord_id VARCHAR(50),
			team_id UUID,
			details JSONB NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (event_id) REFERENCES game_events(id) ON DELETE CASCADE,
			FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_event_log_event_id ON event_log(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_event_log_action_type ON event_log(action_type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at DESC)`);

	// Create trigger for updated_at on game_events
	console.log('  - Creating triggers...');
	await query(`
		CREATE OR REPLACE FUNCTION update_game_event_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`DROP TRIGGER IF EXISTS update_game_events_updated_at ON game_events`);
	await query(`
		CREATE TRIGGER update_game_events_updated_at
		BEFORE UPDATE ON game_events
		FOR EACH ROW
		EXECUTE FUNCTION update_game_event_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 010_add_battleship_bingo_system');

	// Drop triggers and functions
	await query(`DROP TRIGGER IF EXISTS update_game_events_updated_at ON game_events`);
	await query(`DROP FUNCTION IF EXISTS update_game_event_updated_at()`);

	// Drop tables in reverse order (respecting foreign key constraints)
	await query(`DROP TABLE IF EXISTS event_log CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_bomb_actions CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_active_effects CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_tile_progress CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_tiles CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_ships CASCADE`);
	await query(`DROP TABLE IF EXISTS team_members CASCADE`);
	await query(`DROP TABLE IF EXISTS teams CASCADE`);
	await query(`DROP TABLE IF EXISTS battleship_bingo_events CASCADE`);
	await query(`DROP TABLE IF EXISTS game_events CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };


