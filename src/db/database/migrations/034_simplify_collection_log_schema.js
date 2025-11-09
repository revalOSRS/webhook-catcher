/**
 * Migration: Simplify Collection Log Schema
 * 
 * Updates collection log tables to store items directly without foreign keys.
 * This is more flexible for the RuneLite plugin sync where we receive raw item data.
 * 
 * Changes:
 * 1. Update osrs_account_collection_log to store summary data only
 * 2. Update osrs_account_collection_log_drops to store items directly (no FK)
 * 3. Keep collection_log_items as reference data (for future use)
 * 4. Update osrs_account_killcounts schema to match current usage
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 034_simplify_collection_log_schema');
	
	try {
		// Drop old collection log tables and recreate with new schema
		console.log('Dropping old collection log tables...');
		
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log_drops CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log CASCADE');
		
		// Recreate osrs_account_collection_log as current state table
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_collection_log (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				category VARCHAR(100) NOT NULL,
				source VARCHAR(150) NOT NULL,
				item_id INTEGER NOT NULL,
				item_name VARCHAR(150) NOT NULL,
				quantity INTEGER DEFAULT 1,
				total_items INTEGER,
				last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		console.log('✅ Created simplified osrs_account_collection_log table (current state)');
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_account 
			ON osrs_account_collection_log(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_item_id 
			ON osrs_account_collection_log(item_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_category 
			ON osrs_account_collection_log(category)
		`);
		
		// Recreate osrs_account_collection_log_drops for HISTORICAL event data
		// This is populated by Dink webhooks when drops happen in real-time
		// NOT populated by SYNC events
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_collection_log_drops (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				category VARCHAR(100) NOT NULL,
				source VARCHAR(150) NOT NULL,
				item_id INTEGER NOT NULL,
				item_name VARCHAR(150) NOT NULL,
				quantity INTEGER DEFAULT 1,
				killcount_at_drop INTEGER,
				obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				event_data JSONB
			)
		`);
		
		console.log('✅ Created simplified osrs_account_collection_log_drops table');
		
		// Create indexes for efficient queries
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_account 
			ON osrs_account_collection_log_drops(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_item 
			ON osrs_account_collection_log_drops(item_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_category 
			ON osrs_account_collection_log_drops(category)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_source 
			ON osrs_account_collection_log_drops(source)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_obtained 
			ON osrs_account_collection_log_drops(obtained_at DESC)
		`);
		
		console.log('✅ Created indexes for collection log drops');
		
		// Update osrs_account_killcounts to match current schema usage
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN activity_name TO boss_name
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN killcount TO kill_count
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN last_updated TO last_updated_at
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			ADD COLUMN IF NOT EXISTS category VARCHAR(100)
		`);
		
		console.log('✅ Updated osrs_account_killcounts schema');
		
		// Rename constraint to match new column name
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			DROP CONSTRAINT IF EXISTS unique_account_activity
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			ADD CONSTRAINT unique_account_boss UNIQUE (osrs_account_id, boss_name)
		`);
		
		console.log('✅ Updated constraints');
		
		// Drop old trigger that references the old schema
		await db.query('DROP TRIGGER IF EXISTS trigger_update_clog ON osrs_account_collection_log');
		await db.query('DROP FUNCTION IF EXISTS update_clog_count()');
		
		console.log('✅ Removed old trigger (will be replaced with denormalized counter updates)');
		
		console.log('✅ Migration 034_simplify_collection_log_schema completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 034_simplify_collection_log_schema failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 034_simplify_collection_log_schema');
	
	try {
		// This rollback will restore the original schema from migration 017
		// Note: This will lose any data in the simplified tables
		
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log_drops CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log CASCADE');
		
		// Restore original osrs_account_collection_log with FK
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_collection_log (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				collection_log_item_id INTEGER NOT NULL REFERENCES collection_log_items(id),
				quantity INTEGER DEFAULT 1,
				obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_clog_item UNIQUE (osrs_account_id, collection_log_item_id)
			)
		`);
		
		// Restore original osrs_account_collection_log_drops
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_collection_log_drops (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				collection_log_item_id INTEGER NOT NULL REFERENCES collection_log_items(id),
				source_activity VARCHAR(150),
				killcount_at_drop INTEGER,
				dropped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				event_data JSONB
			)
		`);
		
		// Restore original killcount column names
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN boss_name TO activity_name
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN kill_count TO killcount
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts 
			RENAME COLUMN last_updated_at TO last_updated
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			DROP COLUMN IF EXISTS category
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			DROP CONSTRAINT IF EXISTS unique_account_boss
		`);
		
		await db.query(`
			ALTER TABLE osrs_account_killcounts
			ADD CONSTRAINT unique_account_activity UNIQUE (osrs_account_id, activity_name)
		`);
		
		console.log('✅ Rollback completed - restored original schema from migration 017');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

