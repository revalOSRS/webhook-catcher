/**
 * Migration: Add bingo XP snapshots table
 * 
 * Stores player XP snapshots for bingo events.
 * - Baseline XP is captured on first login after event starts
 * - Current XP is updated on each login during the event
 * - Used to calculate XP gains for EXPERIENCE requirements
 */

const { query } = require('../index');

async function up() {
	console.log('Running migration: 065_add_bingo_xp_snapshots');

	// Create the XP snapshots table
	console.log('  - Creating bingo_player_xp_snapshots table...');
	await query(`
		CREATE TABLE IF NOT EXISTS bingo_player_xp_snapshots (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
			
			-- Baseline XP captured at first login after event start
			baseline_skills JSONB NOT NULL DEFAULT '{}',
			baseline_total_xp BIGINT NOT NULL DEFAULT 0,
			baseline_captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
			
			-- Current XP updated on each login
			current_skills JSONB NOT NULL DEFAULT '{}',
			current_total_xp BIGINT NOT NULL DEFAULT 0,
			current_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			
			-- Login count during this event
			login_count INTEGER NOT NULL DEFAULT 1,
			
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW(),
			
			-- One snapshot per player per event
			CONSTRAINT unique_player_event_snapshot UNIQUE (event_id, osrs_account_id)
		)
	`);

	// Create indexes
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_xp_snapshots_event ON bingo_player_xp_snapshots(event_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_xp_snapshots_account ON bingo_player_xp_snapshots(osrs_account_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_bingo_xp_snapshots_event_account ON bingo_player_xp_snapshots(event_id, osrs_account_id)`);

	console.log('  ✅ Migration completed successfully');
}

async function down() {
	console.log('Rolling back migration: 065_add_bingo_xp_snapshots');

	await query(`DROP TABLE IF EXISTS bingo_player_xp_snapshots CASCADE`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

