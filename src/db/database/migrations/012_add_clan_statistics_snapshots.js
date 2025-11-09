/**
 * Migration: Add Clan Statistics Snapshots
 * Creates tables for storing daily clan statistics snapshots
 */

const db = require('../index');

async function up() {
	console.log('Creating clan statistics snapshot tables...');
	
	// Create main snapshots table
	await db.query(`
		CREATE TABLE IF NOT EXISTS clan_statistics_snapshots (
			id SERIAL PRIMARY KEY,
			snapshot_date DATE NOT NULL UNIQUE,
			group_id INTEGER NOT NULL,
			group_name VARCHAR(255) NOT NULL,
			total_members INTEGER NOT NULL,
			average_level INTEGER NOT NULL,
			average_xp BIGINT NOT NULL,
			maxed_count INTEGER NOT NULL,
			maxed_percentage DECIMAL(5,2) NOT NULL,
			total_clues INTEGER NOT NULL,
			total_boss_kills INTEGER NOT NULL,
			total_cox INTEGER NOT NULL,
			total_toa INTEGER NOT NULL,
			total_tob INTEGER NOT NULL,
			total_ehp INTEGER NOT NULL,
			total_ehb INTEGER NOT NULL,
			failed_members INTEGER DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
	
	console.log('✅ Created clan_statistics_snapshots table');
	
	// Create index for faster date lookups
	await db.query(`
		CREATE INDEX IF NOT EXISTS idx_snapshot_date 
		ON clan_statistics_snapshots(snapshot_date DESC)
	`);
	
	console.log('✅ Created snapshot_date index');
	
	// Create table for tracking failed member fetches
	await db.query(`
		CREATE TABLE IF NOT EXISTS snapshot_failed_members (
			id SERIAL PRIMARY KEY,
			snapshot_id INTEGER REFERENCES clan_statistics_snapshots(id) ON DELETE CASCADE,
			player_id INTEGER NOT NULL,
			player_username VARCHAR(255) NOT NULL,
			error_message TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
	
	console.log('✅ Created snapshot_failed_members table');
}

async function down() {
	console.log('Dropping clan statistics snapshot tables...');
	
	await db.query('DROP TABLE IF EXISTS snapshot_failed_members CASCADE');
	await db.query('DROP INDEX IF EXISTS idx_snapshot_date');
	await db.query('DROP TABLE IF EXISTS clan_statistics_snapshots CASCADE');
	
	console.log('✅ Dropped all snapshot tables');
}

module.exports = { up, down };

