/**
 * Migration: Add New Events System
 * Created: 2025-11-12
 * 
 * Creates a flexible event system that supports:
 * - Multiple event types (bingo, tournaments, competitions, etc.)
 * - Team management with members
 * - Event-specific configuration in JSONB
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 037_add_new_events_system');

	// Enable UUID extension if not already enabled
	console.log('  - Ensuring UUID extension is enabled...');
	await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

	// Drop existing tables if they exist (in case of failed migration or old schema)
	console.log('  - Cleaning up existing tables if any...');
	
	// Drop token movements table (has FK to old events table)
	await query(`DROP TABLE IF EXISTS token_movements CASCADE`);
	
	// Drop any old event-related tables
	await query(`DROP TABLE IF EXISTS event_team_members CASCADE`);
	await query(`DROP TABLE IF EXISTS event_teams CASCADE`);
	await query(`DROP TABLE IF EXISTS events CASCADE`);

	// Drop existing types if they exist (in case of failed migration)
	console.log('  - Cleaning up existing types if any...');
	await query(`DROP TYPE IF EXISTS event_status CASCADE`);
	await query(`DROP TYPE IF EXISTS event_type_enum CASCADE`);

	// Create event_status enum
	console.log('  - Creating enums...');
	await query(`
		CREATE TYPE event_status AS ENUM (
			'draft',
			'scheduled',
			'active',
			'paused',
			'completed',
			'cancelled'
		)
	`);

	// Create event_type enum
	await query(`
		CREATE TYPE event_type_enum AS ENUM (
			'bingo',
			'battleship_bingo',
			'dungeoncrawler_bingo',
			'risk_bingo',
			'hide_and_seek',
			'puzzle',
			'reval_games'
		)
	`);

	// Create main events table
	console.log('  - Creating events table...');
	await query(`
		CREATE TABLE events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(255) NOT NULL,
			description TEXT,
			event_type event_type_enum NOT NULL,
			status event_status NOT NULL DEFAULT 'draft',
			start_date TIMESTAMP,
			end_date TIMESTAMP,
			config JSONB DEFAULT '{}'::jsonb,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT chk_event_dates CHECK (end_date IS NULL OR end_date >= start_date)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date)`);

	// Create event_teams table
	console.log('  - Creating event_teams table...');
	await query(`
		CREATE TABLE event_teams (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			name VARCHAR(100) NOT NULL,
			color VARCHAR(7),
			icon VARCHAR(100),
			score INTEGER DEFAULT 0,
			metadata JSONB DEFAULT '{}'::jsonb,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_event_team_name UNIQUE (event_id, name)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_event_teams_event_id ON event_teams(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_event_teams_score ON event_teams(score DESC)`);

	// Create event_team_members table
	console.log('  - Creating event_team_members table...');
	await query(`
		CREATE TABLE event_team_members (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
			member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
			role VARCHAR(50) DEFAULT 'member',
			individual_score INTEGER DEFAULT 0,
			metadata JSONB DEFAULT '{}'::jsonb,
			joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_team_member UNIQUE (team_id, member_id)
		)
	`);

	await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_team_id ON event_team_members(team_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_member_id ON event_team_members(member_id)`);

	// Create trigger for updated_at on events
	console.log('  - Creating triggers...');
	await query(`
		CREATE OR REPLACE FUNCTION update_events_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_events_updated_at
		BEFORE UPDATE ON events
		FOR EACH ROW
		EXECUTE FUNCTION update_events_updated_at()
	`);

	// Create trigger for updated_at on event_teams
	await query(`
		CREATE OR REPLACE FUNCTION update_event_teams_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await query(`
		CREATE TRIGGER trigger_update_event_teams_updated_at
		BEFORE UPDATE ON event_teams
		FOR EACH ROW
		EXECUTE FUNCTION update_event_teams_updated_at()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 037_add_new_events_system');

	// Drop triggers and functions
	await query(`DROP TRIGGER IF EXISTS trigger_update_events_updated_at ON events`);
	await query(`DROP FUNCTION IF EXISTS update_events_updated_at()`);
	await query(`DROP TRIGGER IF EXISTS trigger_update_event_teams_updated_at ON event_teams`);
	await query(`DROP FUNCTION IF EXISTS update_event_teams_updated_at()`);

	// Drop tables
	await query(`DROP TABLE IF EXISTS event_team_members CASCADE`);
	await query(`DROP TABLE IF EXISTS event_teams CASCADE`);
	await query(`DROP TABLE IF EXISTS events CASCADE`);

	// Drop enums
	await query(`DROP TYPE IF EXISTS event_type_enum CASCADE`);
	await query(`DROP TYPE IF EXISTS event_status CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

