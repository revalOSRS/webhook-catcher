/**
 * Migration: Restore Events Table and Fix Foreign Keys
 * Created: 2025-01-XX
 * 
 * Migration 043 dropped the old events table, but we need the new events table
 * from migration 037. This migration:
 * 1. Creates the events table if it doesn't exist (with proper schema from 037)
 * 2. Ensures all foreign key relationships are properly set up
 * 3. Creates event_teams and event_team_members tables if needed
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 046_restore_events_table_and_fix_fks');

	try {
		// Step 1: Enable UUID extension if not already enabled
		console.log('  - Ensuring UUID extension is enabled...');
		await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

		// Step 2: Create enums if they don't exist
		console.log('  - Creating enums...');
		// Check if event_status exists
		const eventStatusExists = await query(`
			SELECT EXISTS (
				SELECT 1 FROM pg_type WHERE typname = 'event_status'
			)
		`);
		if (!eventStatusExists[0]?.exists) {
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
		}

		// Check if event_type_enum exists
		const eventTypeExists = await query(`
			SELECT EXISTS (
				SELECT 1 FROM pg_type WHERE typname = 'event_type_enum'
			)
		`);
		if (!eventTypeExists[0]?.exists) {
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
		}

		// Step 3: Create events table if it doesn't exist
		console.log('  - Creating events table...');
		await query(`
			CREATE TABLE IF NOT EXISTS events (
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

		// Create indexes for events table
		await query(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)`);

		// Step 4: Create trigger for updated_at on events
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

		await query(`DROP TRIGGER IF EXISTS trigger_update_events_updated_at ON events`);
		await query(`
			CREATE TRIGGER trigger_update_events_updated_at
			BEFORE UPDATE ON events
			FOR EACH ROW
			EXECUTE FUNCTION update_events_updated_at()
		`);

		// Step 5: Create event_teams table if it doesn't exist
		console.log('  - Creating event_teams table...');
		await query(`
			CREATE TABLE IF NOT EXISTS event_teams (
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

		// Step 6: Create trigger for updated_at on event_teams
		await query(`
			CREATE OR REPLACE FUNCTION update_event_teams_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);

		await query(`DROP TRIGGER IF EXISTS trigger_update_event_teams_updated_at ON event_teams`);
		await query(`
			CREATE TRIGGER trigger_update_event_teams_updated_at
			BEFORE UPDATE ON event_teams
			FOR EACH ROW
			EXECUTE FUNCTION update_event_teams_updated_at()
		`);

		// Step 7: Create event_team_members table if it doesn't exist
		console.log('  - Creating event_team_members table...');
		await query(`
			CREATE TABLE IF NOT EXISTS event_team_members (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
				member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
				osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE SET NULL,
				role VARCHAR(50) DEFAULT 'member',
				individual_score INTEGER DEFAULT 0,
				metadata JSONB DEFAULT '{}'::jsonb,
				joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_team_member UNIQUE (team_id, member_id)
			)
		`);

		await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_team_id ON event_team_members(team_id)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_member_id ON event_team_members(member_id)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_event_team_members_osrs_account_id ON event_team_members(osrs_account_id)`);

		// Step 8: Ensure bingo_boards has proper FK to events (if table exists)
		console.log('  - Verifying bingo_boards foreign keys...');
		const bingoBoardsExists = await query(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'bingo_boards'
			)
		`);

		if (bingoBoardsExists[0]?.exists) {
			// Check if event_id column exists and has FK constraint
			const eventIdColumnExists = await query(`
				SELECT EXISTS (
					SELECT FROM information_schema.columns 
					WHERE table_schema = 'public' 
					AND table_name = 'bingo_boards' 
					AND column_name = 'event_id'
				)
			`);

			if (!eventIdColumnExists[0]?.exists) {
				console.log('  - Adding event_id to bingo_boards...');
				await query(`
					ALTER TABLE bingo_boards
					ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE
				`);
				await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_event_id ON bingo_boards(event_id)`);
			} else {
				// Verify FK constraint exists
				const fkExists = await query(`
					SELECT EXISTS (
						SELECT FROM information_schema.table_constraints 
						WHERE table_schema = 'public' 
						AND table_name = 'bingo_boards' 
						AND constraint_type = 'FOREIGN KEY'
						AND constraint_name LIKE '%event_id%'
					)
				`);

				if (!fkExists[0]?.exists) {
					console.log('  - Adding foreign key constraint to bingo_boards.event_id...');
					await query(`
						ALTER TABLE bingo_boards
						ADD CONSTRAINT bingo_boards_event_id_fkey 
						FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
					`);
				}
			}
		}

		// Step 9: Ensure bingo_boards has team_id FK (if table exists)
		if (bingoBoardsExists[0]?.exists) {
			const teamIdColumnExists = await query(`
				SELECT EXISTS (
					SELECT FROM information_schema.columns 
					WHERE table_schema = 'public' 
					AND table_name = 'bingo_boards' 
					AND column_name = 'team_id'
				)
			`);

			if (!teamIdColumnExists[0]?.exists) {
				console.log('  - Adding team_id to bingo_boards...');
				await query(`
					ALTER TABLE bingo_boards
					ADD COLUMN team_id UUID REFERENCES event_teams(id) ON DELETE CASCADE
				`);
				await query(`CREATE INDEX IF NOT EXISTS idx_bingo_boards_team_id ON bingo_boards(team_id)`);
			}
		}

		console.log('✅ Migration 046_restore_events_table_and_fix_fks completed successfully');

	} catch (error) {
		console.error('❌ Migration 046_restore_events_table_and_fix_fks failed:', error);
		throw error;
	}
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 046_restore_events_table_and_fix_fks');
	console.log('⚠️  Warning: This will drop the events table and related tables');
	console.log('⚠️  This is a destructive operation - use with caution');
	
	// Note: We don't actually drop anything in rollback since other migrations
	// might depend on these tables. Manual cleanup would be required.
	console.log('✅ Rollback noted (manual cleanup may be required)');
}

module.exports = { up, down };

