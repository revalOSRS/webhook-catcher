/**
 * Migration: Remove Old Event Tables
 * Created: 2025-11-12
 * 
 * Removes old battleship bingo system, event_log, and old event tables
 * to prepare for the new flexible event system.
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 036_remove_old_event_tables');

	// Drop triggers and functions first
	console.log('  - Dropping triggers and functions...');
	await query(`DROP TRIGGER IF EXISTS update_game_events_updated_at ON game_events`);
	await query(`DROP FUNCTION IF EXISTS update_game_event_updated_at()`);
	await query(`DROP TRIGGER IF EXISTS trigger_update_event_counts ON osrs_account_events`);
	await query(`DROP FUNCTION IF EXISTS update_event_counts()`);

	// Drop battleship bingo tables (from migration 010)
	console.log('  - Dropping battleship bingo tables...');
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

	// Drop events tables (from migration 018)
	console.log('  - Dropping old events system tables...');
	await query(`DROP TABLE IF EXISTS osrs_account_daily_stats CASCADE`);
	await query(`DROP TABLE IF EXISTS osrs_account_events CASCADE`);
	await query(`DROP TYPE IF EXISTS event_type CASCADE`);

	// Remove event summary columns from osrs_accounts
	console.log('  - Removing event columns from osrs_accounts...');
	await query(`
		ALTER TABLE osrs_accounts 
		DROP COLUMN IF EXISTS total_events,
		DROP COLUMN IF EXISTS last_event_at
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration - recreate basic structure if needed
 * Note: This is a destructive migration, rollback may not restore data
 */
async function down() {
	console.log('Rolling back migration: 036_remove_old_event_tables');
	console.log('  ⚠️  Warning: This rollback cannot restore deleted data');
	console.log('  ⚠️  Please run migrations 010 and 018 manually if needed');
	console.log('  ✅ Rollback noted');
}

module.exports = { up, down };

