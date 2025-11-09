/**
 * Migration: Add Achievement Diaries System
 * Creates tables for tracking achievement diary completions
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 014_add_achievement_diaries');
	
	try {
		// Create reference table for diary tiers (static data)
		await db.query(`
			CREATE TABLE IF NOT EXISTS achievement_diary_tiers (
				id SERIAL PRIMARY KEY,
				diary_name VARCHAR(50) NOT NULL,
				tier VARCHAR(10) NOT NULL,
				total_tasks INTEGER NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_diary_tier UNIQUE (diary_name, tier)
			)
		`);
		
		console.log('✅ Created achievement_diary_tiers table');
		
		// Create index for faster lookups
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_diary_tiers_name 
			ON achievement_diary_tiers(diary_name)
		`);
		
		// Player diary completions (only store completed diaries)
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_diary_completions (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				diary_tier_id INTEGER NOT NULL REFERENCES achievement_diary_tiers(id),
				completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_diary UNIQUE (osrs_account_id, diary_tier_id)
			)
		`);
		
		console.log('✅ Created osrs_account_diary_completions table');
		
		// Create indexes for performance
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_diary_completions_account 
			ON osrs_account_diary_completions(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_diary_completions_tier 
			ON osrs_account_diary_completions(diary_tier_id)
		`);
		
		console.log('✅ Created indexes');
		
		// Add summary columns to osrs_accounts for quick stats
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS diary_easy_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS diary_medium_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS diary_hard_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS diary_elite_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS diary_total_count INTEGER DEFAULT 0
		`);
		
		console.log('✅ Added diary summary columns to osrs_accounts');
		
		// Insert all diary tiers (11 diaries × 4 tiers = 44 entries)
		await db.query(`
			INSERT INTO achievement_diary_tiers (diary_name, tier, total_tasks) VALUES
			('Ardougne', 'easy', 10),
			('Ardougne', 'medium', 11),
			('Ardougne', 'hard', 14),
			('Ardougne', 'elite', 13),
			('Desert', 'easy', 12),
			('Desert', 'medium', 11),
			('Desert', 'hard', 11),
			('Desert', 'elite', 10),
			('Falador', 'easy', 10),
			('Falador', 'medium', 11),
			('Falador', 'hard', 11),
			('Falador', 'elite', 12),
			('Fremennik', 'easy', 11),
			('Fremennik', 'medium', 10),
			('Fremennik', 'hard', 11),
			('Fremennik', 'elite', 11),
			('Kandarin', 'easy', 11),
			('Kandarin', 'medium', 11),
			('Kandarin', 'hard', 14),
			('Kandarin', 'elite', 10),
			('Karamja', 'easy', 9),
			('Karamja', 'medium', 10),
			('Karamja', 'hard', 10),
			('Karamja', 'elite', 10),
			('Kourend & Kebos', 'easy', 12),
			('Kourend & Kebos', 'medium', 11),
			('Kourend & Kebos', 'hard', 11),
			('Kourend & Kebos', 'elite', 12),
			('Lumbridge & Draynor', 'easy', 9),
			('Lumbridge & Draynor', 'medium', 11),
			('Lumbridge & Draynor', 'hard', 10),
			('Lumbridge & Draynor', 'elite', 12),
			('Morytania', 'easy', 9),
			('Morytania', 'medium', 11),
			('Morytania', 'hard', 13),
			('Morytania', 'elite', 10),
			('Varrock', 'easy', 10),
			('Varrock', 'medium', 11),
			('Varrock', 'hard', 11),
			('Varrock', 'elite', 11),
			('Western Provinces', 'easy', 10),
			('Western Provinces', 'medium', 11),
			('Western Provinces', 'hard', 13),
			('Western Provinces', 'elite', 11),
			('Wilderness', 'easy', 13),
			('Wilderness', 'medium', 12),
			('Wilderness', 'hard', 11),
			('Wilderness', 'elite', 11)
			ON CONFLICT (diary_name, tier) DO NOTHING
		`);
		
		console.log('✅ Inserted all achievement diary tiers');
		
		// Create trigger to auto-update summary counts
		await db.query(`
			CREATE OR REPLACE FUNCTION update_diary_counts()
			RETURNS TRIGGER AS $$
			DECLARE
				tier_name VARCHAR(10);
			BEGIN
				-- Get the tier name
				SELECT tier INTO tier_name
				FROM achievement_diary_tiers
				WHERE id = NEW.diary_tier_id;
				
				-- Update the appropriate counter
				IF tier_name = 'easy' THEN
					UPDATE osrs_accounts 
					SET diary_easy_count = diary_easy_count + 1,
						diary_total_count = diary_total_count + 1
					WHERE id = NEW.osrs_account_id;
				ELSIF tier_name = 'medium' THEN
					UPDATE osrs_accounts 
					SET diary_medium_count = diary_medium_count + 1,
						diary_total_count = diary_total_count + 1
					WHERE id = NEW.osrs_account_id;
				ELSIF tier_name = 'hard' THEN
					UPDATE osrs_accounts 
					SET diary_hard_count = diary_hard_count + 1,
						diary_total_count = diary_total_count + 1
					WHERE id = NEW.osrs_account_id;
				ELSIF tier_name = 'elite' THEN
					UPDATE osrs_accounts 
					SET diary_elite_count = diary_elite_count + 1,
						diary_total_count = diary_total_count + 1
					WHERE id = NEW.osrs_account_id;
				END IF;
				
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		await db.query(`
			CREATE TRIGGER trigger_update_diary_counts
			AFTER INSERT ON osrs_account_diary_completions
			FOR EACH ROW EXECUTE FUNCTION update_diary_counts()
		`);
		
		console.log('✅ Created diary count update trigger');
		
		console.log('✅ Migration 014_add_achievement_diaries completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 014_add_achievement_diaries failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 014_add_achievement_diaries');
	
	try {
		// Drop trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_diary_counts ON osrs_account_diary_completions');
		await db.query('DROP FUNCTION IF EXISTS update_diary_counts()');
		
		// Remove columns from osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS diary_easy_count,
			DROP COLUMN IF EXISTS diary_medium_count,
			DROP COLUMN IF EXISTS diary_hard_count,
			DROP COLUMN IF EXISTS diary_elite_count,
			DROP COLUMN IF EXISTS diary_total_count
		`);
		
		// Drop tables
		await db.query('DROP TABLE IF EXISTS osrs_account_diary_completions CASCADE');
		await db.query('DROP TABLE IF EXISTS achievement_diary_tiers CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

