/**
 * Migration: Add Player Snapshots System
 * Creates tables for storing detailed player statistics snapshots
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 013_add_player_snapshots');
	
	try {
		// Create player_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_snapshots (
				id SERIAL PRIMARY KEY,
				player_id INTEGER NOT NULL,
				username VARCHAR(255) NOT NULL,
				display_name VARCHAR(255),
				snapshot_date DATE NOT NULL,
				
				-- Player metadata
				player_type VARCHAR(50),
				player_build VARCHAR(50),
				country VARCHAR(2),
				status VARCHAR(50),
				patron BOOLEAN DEFAULT FALSE,
				
				-- Overall stats
				total_exp BIGINT DEFAULT 0,
				total_level INTEGER DEFAULT 0,
				combat_level INTEGER DEFAULT 0,
				
				-- Computed metrics
				ehp DECIMAL(12, 4) DEFAULT 0,
				ehb DECIMAL(12, 4) DEFAULT 0,
				ttm DECIMAL(12, 4) DEFAULT 0,
				tt200m DECIMAL(12, 4) DEFAULT 0,
				
				-- WOM timestamps
				registered_at TIMESTAMP,
				updated_at TIMESTAMP,
				last_changed_at TIMESTAMP,
				last_imported_at TIMESTAMP,
				
				-- Snapshot metadata
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				
				-- Indexes for efficient querying
				CONSTRAINT unique_player_snapshot UNIQUE (player_id, snapshot_date)
			);
		`);
		
		console.log('✅ Created player_snapshots table');
		
		// Create player_skills_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_skills_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				skill VARCHAR(50) NOT NULL,
				
				experience BIGINT DEFAULT 0,
				level INTEGER DEFAULT 0,
				rank INTEGER DEFAULT -1,
				ehp DECIMAL(12, 4) DEFAULT 0,
				
				CONSTRAINT unique_player_skill UNIQUE (player_snapshot_id, skill)
			);
		`);
		
		console.log('✅ Created player_skills_snapshots table');
		
		// Create player_bosses_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_bosses_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				boss VARCHAR(100) NOT NULL,
				
				kills INTEGER DEFAULT -1,
				rank INTEGER DEFAULT -1,
				ehb DECIMAL(12, 4) DEFAULT 0,
				
				CONSTRAINT unique_player_boss UNIQUE (player_snapshot_id, boss)
			);
		`);
		
		console.log('✅ Created player_bosses_snapshots table');
		
		// Create player_activities_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_activities_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				activity VARCHAR(100) NOT NULL,
				
				score INTEGER DEFAULT -1,
				rank INTEGER DEFAULT -1,
				
				CONSTRAINT unique_player_activity UNIQUE (player_snapshot_id, activity)
			);
		`);
		
		console.log('✅ Created player_activities_snapshots table');
		
		// Create player_computed_snapshots table
		await db.query(`
			CREATE TABLE IF NOT EXISTS player_computed_snapshots (
				id SERIAL PRIMARY KEY,
				player_snapshot_id INTEGER NOT NULL REFERENCES player_snapshots(id) ON DELETE CASCADE,
				metric VARCHAR(100) NOT NULL,
				
				value DECIMAL(12, 4) DEFAULT 0,
				rank INTEGER DEFAULT -1,
				
				CONSTRAINT unique_player_computed UNIQUE (player_snapshot_id, metric)
			);
		`);
		
		console.log('✅ Created player_computed_snapshots table');
		
		// Create indexes for better query performance (one at a time)
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_snapshots_player_id 
			ON player_snapshots(player_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_snapshots_date 
			ON player_snapshots(snapshot_date DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_snapshots_username 
			ON player_snapshots(username)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_skills_snapshot_id 
			ON player_skills_snapshots(player_snapshot_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_bosses_snapshot_id 
			ON player_bosses_snapshots(player_snapshot_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_activities_snapshot_id 
			ON player_activities_snapshots(player_snapshot_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_computed_snapshot_id 
			ON player_computed_snapshots(player_snapshot_id)
		`);
		
		console.log('✅ Created indexes');
		
		// Link player snapshots to clan snapshots
		await db.query(`
			ALTER TABLE player_snapshots 
			ADD COLUMN IF NOT EXISTS clan_snapshot_id INTEGER 
			REFERENCES clan_statistics_snapshots(id) ON DELETE SET NULL
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_player_snapshots_clan_snapshot 
			ON player_snapshots(clan_snapshot_id)
		`);
		
		console.log('✅ Added clan_snapshot_id to player_snapshots');
		
		console.log('✅ Migration 013_add_player_snapshots completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 013_add_player_snapshots failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 013_add_player_snapshots');
	
	try {
		// Drop tables in reverse order (respecting foreign key constraints)
		await db.query('DROP TABLE IF EXISTS player_computed_snapshots CASCADE');
		await db.query('DROP TABLE IF EXISTS player_activities_snapshots CASCADE');
		await db.query('DROP TABLE IF EXISTS player_bosses_snapshots CASCADE');
		await db.query('DROP TABLE IF EXISTS player_skills_snapshots CASCADE');
		await db.query('DROP TABLE IF EXISTS player_snapshots CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

