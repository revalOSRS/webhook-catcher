/**
 * Migration: Remove Redundant Snapshot Tables
 * 
 * Removes player_activities_snapshots and player_bosses_snapshots tables
 * as we now track this data directly through:
 * - osrs_account_killcounts (from collection log KC)
 * - osrs_account_collection_log (collection log items)
 * - osrs_account_combat_achievements
 * - osrs_account_diary_completions
 * 
 * We still keep player_skills_snapshots and player_computed_snapshots
 * as WOM provides valuable historical skill tracking.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 035_remove_redundant_snapshots');
	
	try {
		// Drop player_activities_snapshots table
		await db.query('DROP TABLE IF EXISTS player_activities_snapshots CASCADE');
		console.log('✅ Dropped player_activities_snapshots table');
		
		// Drop player_bosses_snapshots table
		await db.query('DROP TABLE IF EXISTS player_bosses_snapshots CASCADE');
		console.log('✅ Dropped player_bosses_snapshots table');
		
		console.log('✅ Migration 035_remove_redundant_snapshots completed successfully');
		console.log('');
		console.log('ℹ️  Kept player_skills_snapshots and player_computed_snapshots');
		console.log('   These are still valuable for historical skill tracking from WOM');
		
	} catch (error) {
		console.error('❌ Migration 035_remove_redundant_snapshots failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 035_remove_redundant_snapshots');
	
	try {
		// Recreate player_activities_snapshots
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_activities_snapshots (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				snapshot_data JSONB NOT NULL,
				snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_activities_snapshots_account 
			ON player_activities_snapshots(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_activities_snapshots_date 
			ON player_activities_snapshots(snapshot_date DESC)
		`);
		
		console.log('✅ Recreated player_activities_snapshots table');
		
		// Recreate player_bosses_snapshots
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_bosses_snapshots (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				snapshot_data JSONB NOT NULL,
				snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_bosses_snapshots_account 
			ON player_bosses_snapshots(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_bosses_snapshots_date 
			ON player_bosses_snapshots(snapshot_date DESC)
		`);
		
		console.log('✅ Recreated player_bosses_snapshots table');
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

