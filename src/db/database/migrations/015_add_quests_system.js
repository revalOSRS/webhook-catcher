/**
 * Migration: Add Quests System
 * Stores quest completion data using efficient array storage
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 015_add_quests_system');
	
	try {
		// Add quest-related columns to osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS quests_completed TEXT[] DEFAULT '{}',
			ADD COLUMN IF NOT EXISTS quest_points INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS quests_last_updated TIMESTAMP
		`);
		
		console.log('✅ Added quest columns to osrs_accounts');
		
		// Create index for quest points (for leaderboards)
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_quest_points 
			ON osrs_accounts(quest_points DESC)
		`);
		
		console.log('✅ Created quest points index');
		
		// Create GIN index for array queries (if you need to query "who completed quest X")
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_quests_gin 
			ON osrs_accounts USING GIN (quests_completed)
		`);
		
		console.log('✅ Created GIN index for quest array queries');
		
		console.log('✅ Migration 015_add_quests_system completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 015_add_quests_system failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 015_add_quests_system');
	
	try {
		// Remove indexes
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_quests_gin');
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_quest_points');
		
		// Remove columns
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS quests_completed,
			DROP COLUMN IF EXISTS quest_points,
			DROP COLUMN IF EXISTS quests_last_updated
		`);
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

