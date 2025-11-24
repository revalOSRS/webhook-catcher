/**
 * Migration: Simplify Coffer System
 * Created: 2025-11-15
 * 
 * Removes event_id from coffer_movements and simplifies the system to just
 * handle deposits and withdrawals. No need for event-based expenditures.
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 043_simplify_coffer_system');

	try {
		// Drop the event_id foreign key constraint
		console.log('  - Removing event_id foreign key...');
		await query(`
			ALTER TABLE coffer_movements 
			DROP CONSTRAINT IF EXISTS coffer_movements_event_id_fkey
		`);

		// Drop the event_id column
		console.log('  - Removing event_id column...');
		await query(`
			ALTER TABLE coffer_movements 
			DROP COLUMN IF EXISTS event_id
		`);

		// Drop the old events table (if it still exists from migration 006)
		console.log('  - Cleaning up old events table...');
		await query(`DROP TABLE IF EXISTS events CASCADE`);

		console.log('✅ Migration 043_simplify_coffer_system completed successfully');
		console.log('');
		console.log('ℹ️  Coffer system now only handles deposits and withdrawals');
		console.log('   Removed event_id column and events table');

	} catch (error) {
		console.error('❌ Migration 043_simplify_coffer_system failed:', error);
		throw error;
	}
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 043_simplify_coffer_system');

	try {
		// Recreate events table
		await query(`
			CREATE TABLE IF NOT EXISTS events (
				id SERIAL PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT,
				funds_used INTEGER NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				created_by VARCHAR(255) NOT NULL
			)
		`);

		await query(`
			CREATE INDEX IF NOT EXISTS idx_events_created_at 
			ON events(created_at DESC)
		`);

		// Add event_id back to coffer_movements
		await query(`
			ALTER TABLE coffer_movements 
			ADD COLUMN IF NOT EXISTS event_id INTEGER
		`);

		// Add foreign key constraint
		await query(`
			ALTER TABLE coffer_movements 
			ADD CONSTRAINT coffer_movements_event_id_fkey 
			FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
		`);

		console.log('✅ Rollback completed');

	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };




