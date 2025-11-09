/**
 * Migration: Add Collection Log System
 * Creates tables for tracking collection log items and killcounts
 * Only stores OBTAINED items for efficiency
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 017_add_collection_log');
	
	try {
		// Create reference table for collection log items (static data)
		await db.query(`
			CREATE TABLE IF NOT EXISTS collection_log_items (
				id SERIAL PRIMARY KEY,
				item_name VARCHAR(150) NOT NULL,
				category VARCHAR(100) NOT NULL,
				subcategory VARCHAR(150) NOT NULL,
				rarity VARCHAR(20),
				wiki_url TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_clog_item UNIQUE (item_name, subcategory)
			)
		`);
		
		console.log('✅ Created collection_log_items table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_category 
			ON collection_log_items(category, subcategory)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_item_name 
			ON collection_log_items(item_name)
		`);
		
		// Player collection log (only obtained items)
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
		
		console.log('✅ Created osrs_account_collection_log table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_account 
			ON osrs_account_collection_log(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_item 
			ON osrs_account_collection_log(collection_log_item_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_obtained 
			ON osrs_account_collection_log(obtained_at DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_quantity 
			ON osrs_account_collection_log(quantity DESC)
		`);
		
		console.log('✅ Created indexes');
		
		// Collection log drop history (tracks EACH drop occurrence)
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
		
		console.log('✅ Created osrs_account_collection_log_drops table');
		
		// Create indexes for drop history
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_account 
			ON osrs_account_collection_log_drops(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_item 
			ON osrs_account_collection_log_drops(collection_log_item_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_time 
			ON osrs_account_collection_log_drops(dropped_at DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_clog_drops_account_item 
			ON osrs_account_collection_log_drops(osrs_account_id, collection_log_item_id, dropped_at DESC)
		`);
		
		console.log('✅ Created drop history indexes');
		
		// Killcount tracking table
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_killcounts (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				activity_name VARCHAR(150) NOT NULL,
				killcount INTEGER DEFAULT 0,
				last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_activity UNIQUE (osrs_account_id, activity_name)
			)
		`);
		
		console.log('✅ Created osrs_account_killcounts table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_kc_account 
			ON osrs_account_killcounts(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_kc_activity 
			ON osrs_account_killcounts(activity_name)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_kc_killcount 
			ON osrs_account_killcounts(killcount DESC)
		`);
		
		console.log('✅ Created indexes');
		
		// Add summary columns to osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS clog_items_obtained INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS clog_total_items INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS clog_completion_percentage DECIMAL(5,2) DEFAULT 0
		`);
		
		console.log('✅ Added collection log summary columns to osrs_accounts');
		
		// Create trigger to auto-update collection log count
		await db.query(`
			CREATE OR REPLACE FUNCTION update_clog_count()
			RETURNS TRIGGER AS $$
			BEGIN
				UPDATE osrs_accounts 
				SET clog_items_obtained = clog_items_obtained + 1,
					clog_completion_percentage = ROUND((clog_items_obtained + 1)::NUMERIC / NULLIF(clog_total_items, 0) * 100, 2)
				WHERE id = NEW.osrs_account_id;
				
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		await db.query(`
			CREATE TRIGGER trigger_update_clog
			AFTER INSERT ON osrs_account_collection_log
			FOR EACH ROW EXECUTE FUNCTION update_clog_count()
		`);
		
		console.log('✅ Created collection log count update trigger');
		
		console.log('✅ Migration 017_add_collection_log completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 017_add_collection_log failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 017_add_collection_log');
	
	try {
		// Drop trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_clog ON osrs_account_collection_log');
		await db.query('DROP FUNCTION IF EXISTS update_clog_count()');
		
		// Remove columns from osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS clog_items_obtained,
			DROP COLUMN IF EXISTS clog_total_items,
			DROP COLUMN IF EXISTS clog_completion_percentage
		`);
		
		// Drop tables
		await db.query('DROP TABLE IF EXISTS osrs_account_killcounts CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log_drops CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_collection_log CASCADE');
		await db.query('DROP TABLE IF EXISTS collection_log_items CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

