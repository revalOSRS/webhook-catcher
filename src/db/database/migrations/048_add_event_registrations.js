/**
 * Migration: Add event_registrations table
 * Allows admins to mark members as signed up for events
 */

const { query } = require('../index');

module.exports = {
	async up() {
		console.log('  - Creating event_registrations table...');
		await query(`
			CREATE TABLE IF NOT EXISTS event_registrations (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
				osrs_account_id INTEGER REFERENCES osrs_accounts(id) ON DELETE SET NULL,
				status VARCHAR(50) NOT NULL DEFAULT 'pending',
				metadata JSONB DEFAULT '{}',
				registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				registered_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
				UNIQUE(event_id, member_id)
			)
		`);

		console.log('  - Creating indexes...');
		await query(`
			CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)
		`);
		await query(`
			CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON event_registrations(member_id)
		`);
		await query(`
			CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status)
		`);
	},

	async down() {
		console.log('  - Dropping event_registrations table...');
		await query('DROP TABLE IF EXISTS event_registrations CASCADE');
	}
};

