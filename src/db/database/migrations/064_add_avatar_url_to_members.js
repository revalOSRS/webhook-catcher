/**
 * Migration: Add avatar_url column to members table
 * Created: 2025-01-XX
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 064_add_avatar_url_to_members');
	
	// Add avatar_url column to members table
	console.log('  - Adding avatar_url column to members table...');
	await query(`
		ALTER TABLE members 
		ADD COLUMN IF NOT EXISTS avatar_url TEXT
	`);
	
	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 064_add_avatar_url_to_members');
	
	// Remove avatar_url column from members table
	console.log('  - Removing avatar_url column from members table...');
	await query(`
		ALTER TABLE members 
		DROP COLUMN IF EXISTS avatar_url
	`);
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = {
	up,
	down
};

