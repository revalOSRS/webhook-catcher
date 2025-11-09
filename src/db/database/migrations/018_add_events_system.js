/**
 * Migration: Add Events System
 * Creates tables for tracking in-game events with JSONB flexible storage
 * Supports real-time event processing and daily statistics aggregation
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 018_add_events_system');
	
	try {
		// Create event type enum
		await db.query(`
			DO $$ BEGIN
				CREATE TYPE event_type AS ENUM (
					'quest_completion',
					'diary_completion',
					'combat_achievement',
					'collection_log_item',
					'boss_kill',
					'npc_kill',
					'significant_drop',
					'speedrun',
					'level_up',
					'pet_drop',
					'personal_best',
					'skill_milestone',
					'rare_drop',
					'achievement_unlock'
				);
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`);
		
		console.log('✅ Created event_type enum');
		
		// Create main events table with monthly partitioning
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_events (
				id SERIAL,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				event_type event_type NOT NULL,
				event_name VARCHAR(255) NOT NULL,
				event_data JSONB,
				points_awarded INTEGER DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id, created_at)
			) PARTITION BY RANGE (created_at)
		`);
		
		console.log('✅ Created osrs_account_events table (partitioned)');
		
		// Create initial partitions (current month + next 3 months)
		const now = new Date();
		const partitions = [];
		
		for (let i = 0; i < 4; i++) {
			const partitionDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
			const nextPartitionDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
			
			const year = partitionDate.getFullYear();
			const month = String(partitionDate.getMonth() + 1).padStart(2, '0');
			const partitionName = `osrs_account_events_${year}_${month}`;
			
			const startDate = partitionDate.toISOString().split('T')[0];
			const endDate = nextPartitionDate.toISOString().split('T')[0];
			
			partitions.push({ name: partitionName, start: startDate, end: endDate });
		}
		
		for (const partition of partitions) {
			await db.query(`
				CREATE TABLE IF NOT EXISTS ${partition.name}
				PARTITION OF osrs_account_events
				FOR VALUES FROM ('${partition.start}') TO ('${partition.end}')
			`);
			console.log(`✅ Created partition: ${partition.name}`);
		}
		
		// Create indexes for performance
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_events_account 
			ON osrs_account_events(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_events_type 
			ON osrs_account_events(event_type)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_events_created 
			ON osrs_account_events(created_at DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_events_account_created 
			ON osrs_account_events(osrs_account_id, created_at DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_events_data_gin 
			ON osrs_account_events USING GIN (event_data)
		`);
		
		console.log('✅ Created event indexes');
		
		// Create aggregated daily statistics table
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_daily_stats (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				stat_date DATE NOT NULL,
				npc_kills INTEGER DEFAULT 0,
				boss_kills INTEGER DEFAULT 0,
				total_drops INTEGER DEFAULT 0,
				total_xp_gained BIGINT DEFAULT 0,
				play_time_minutes INTEGER DEFAULT 0,
				events_recorded INTEGER DEFAULT 0,
				points_earned INTEGER DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_date UNIQUE (osrs_account_id, stat_date)
			)
		`);
		
		console.log('✅ Created osrs_account_daily_stats table');
		
		console.log('\n💡 Partition Management:');
		console.log('   • Initial partitions created for next 4 months');
		console.log('   • Create new partitions monthly: node src/scripts/create-event-partition.js next');
		console.log('   • Or set up cron job to run script automatically');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_daily_stats_account_date 
			ON osrs_account_daily_stats(osrs_account_id, stat_date DESC)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_daily_stats_date 
			ON osrs_account_daily_stats(stat_date DESC)
		`);
		
		console.log('✅ Created daily stats indexes');
		
		// Add event summary columns to osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS total_events INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMP
		`);
		
		console.log('✅ Added event summary columns to osrs_accounts');
		
		// Create trigger to update event counts
		await db.query(`
			CREATE OR REPLACE FUNCTION update_event_counts()
			RETURNS TRIGGER AS $$
			BEGIN
				-- Update account event summary
				UPDATE osrs_accounts 
				SET total_events = total_events + 1,
					last_event_at = NEW.created_at
				WHERE id = NEW.osrs_account_id;
				
				-- Update or insert daily stats
				INSERT INTO osrs_account_daily_stats (
					osrs_account_id, 
					stat_date, 
					events_recorded, 
					points_earned,
					updated_at
				)
				VALUES (
					NEW.osrs_account_id,
					DATE(NEW.created_at),
					1,
					NEW.points_awarded,
					CURRENT_TIMESTAMP
				)
				ON CONFLICT (osrs_account_id, stat_date) 
				DO UPDATE SET
					events_recorded = osrs_account_daily_stats.events_recorded + 1,
					points_earned = osrs_account_daily_stats.points_earned + EXCLUDED.points_earned,
					updated_at = CURRENT_TIMESTAMP;
				
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		await db.query(`
			CREATE TRIGGER trigger_update_event_counts
			AFTER INSERT ON osrs_account_events
			FOR EACH ROW EXECUTE FUNCTION update_event_counts()
		`);
		
		console.log('✅ Created event count update trigger');
		
		console.log('✅ Migration 018_add_events_system completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 018_add_events_system failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 018_add_events_system');
	
	try {
		// Drop trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_event_counts ON osrs_account_events');
		await db.query('DROP FUNCTION IF EXISTS update_event_counts()');
		
		// Remove columns from osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS total_events,
			DROP COLUMN IF EXISTS last_event_at
		`);
		
		// Drop tables
		await db.query('DROP TABLE IF EXISTS osrs_account_daily_stats CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_events CASCADE');
		
		// Drop enum type
		await db.query('DROP TYPE IF EXISTS event_type CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

