/**
 * Migration: Restore Boss and Activity Snapshots
 * 
 * Re-adds player_bosses_snapshots and player_activities_snapshots tables
 * These are useful for historical tracking from WOM data
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 042_restore_boss_activity_snapshots');
	
	try {
		// Recreate player_bosses_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_bosses_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				boss VARCHAR(100) NOT NULL,
				kills INTEGER DEFAULT -1,
				rank INTEGER DEFAULT -1,
				ehb DECIMAL(12, 4) DEFAULT 0,
				CONSTRAINT unique_player_boss UNIQUE (player_snapshot_id, boss)
			)
		`);
		
		console.log('✅ Created player_bosses_snapshots table');
		
		// Create indexes for bosses
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_bosses_snapshot_id 
			ON player_bosses_snapshots(player_snapshot_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_bosses_boss 
			ON player_bosses_snapshots(boss)
		`);
		
		console.log('✅ Created indexes for player_bosses_snapshots');
		
		// Recreate player_activities_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_activities_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				activity VARCHAR(100) NOT NULL,
				score INTEGER DEFAULT -1,
				rank INTEGER DEFAULT -1,
				CONSTRAINT unique_player_activity UNIQUE (player_snapshot_id, activity)
			)
		`);
		
		console.log('✅ Created player_activities_snapshots table');
		
		// Create indexes for activities
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_activities_snapshot_id 
			ON player_activities_snapshots(player_snapshot_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_activities_activity 
			ON player_activities_snapshots(activity)
		`);
		
		console.log('✅ Created indexes for player_activities_snapshots');
		
		console.log('✅ Migration 042_restore_boss_activity_snapshots completed successfully');
		console.log('');
		console.log('ℹ️  Boss and activity snapshots are now tracked again from WOM');
		console.log('   This provides historical tracking alongside real-time data');
		
	} catch (error) {
		console.error('❌ Migration 042_restore_boss_activity_snapshots failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 042_restore_boss_activity_snapshots');
	
	try {
		// Drop tables
		await db.query('DROP TABLE IF EXISTS player_activities_snapshots CASCADE');
		await db.query('DROP TABLE IF EXISTS player_bosses_snapshots CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

