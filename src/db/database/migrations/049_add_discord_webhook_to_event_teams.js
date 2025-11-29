/**
 * Migration: Add Discord Webhook URL to Event Teams
 * Created: 2025-11-29
 * 
 * Adds discord_webhook_url column to event_teams table for team-specific notifications
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 049_add_discord_webhook_to_event_teams');

	// Add discord_webhook_url column to event_teams
	console.log('  - Adding discord_webhook_url column to event_teams...');
	await query(`
		ALTER TABLE event_teams
		ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 049_add_discord_webhook_to_event_teams');

	// Remove discord_webhook_url column
	await query(`
		ALTER TABLE event_teams
		DROP COLUMN IF EXISTS discord_webhook_url
	`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

