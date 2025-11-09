/**
 * Migration: Add Combat Achievements System
 * Creates tables for tracking combat achievement completions
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 016_add_combat_achievements');
	
	try {
		// Create reference table for combat achievements (static data)
		await db.query(`
			CREATE TABLE IF NOT EXISTS combat_achievements (
				id SERIAL PRIMARY KEY,
				name VARCHAR(150) NOT NULL UNIQUE,
				tier VARCHAR(20) NOT NULL,
				type VARCHAR(50),
				monster VARCHAR(100),
				description TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		console.log('✅ Created combat_achievements table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_combat_achievements_tier 
			ON combat_achievements(tier)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_combat_achievements_monster 
			ON combat_achievements(monster)
		`);
		
		// Player combat achievement completions
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_combat_achievements (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				combat_achievement_id INTEGER NOT NULL REFERENCES combat_achievements(id),
				completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_ca UNIQUE (osrs_account_id, combat_achievement_id)
			)
		`);
		
		console.log('✅ Created osrs_account_combat_achievements table');
		
		// Create indexes for performance
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_ca_account 
			ON osrs_account_combat_achievements(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_ca_achievement 
			ON osrs_account_combat_achievements(combat_achievement_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_ca_completed 
			ON osrs_account_combat_achievements(completed_at DESC)
		`);
		
		console.log('✅ Created indexes');
		
		// Add summary columns to osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS ca_easy_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_medium_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_hard_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_elite_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_master_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_grandmaster_count INTEGER DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ca_total_count INTEGER DEFAULT 0
		`);
		
		console.log('✅ Added combat achievement summary columns to osrs_accounts');
		
		// Create trigger to auto-update summary counts
		await db.query(`
			CREATE OR REPLACE FUNCTION update_ca_counts()
			RETURNS TRIGGER AS $$
			DECLARE
				tier_name VARCHAR(20);
			BEGIN
				-- Get the tier name
				SELECT tier INTO tier_name
				FROM combat_achievements
				WHERE id = NEW.combat_achievement_id;
				
				-- Update the appropriate counter
				CASE tier_name
					WHEN 'easy' THEN
						UPDATE osrs_accounts 
						SET ca_easy_count = ca_easy_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
					WHEN 'medium' THEN
						UPDATE osrs_accounts 
						SET ca_medium_count = ca_medium_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
					WHEN 'hard' THEN
						UPDATE osrs_accounts 
						SET ca_hard_count = ca_hard_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
					WHEN 'elite' THEN
						UPDATE osrs_accounts 
						SET ca_elite_count = ca_elite_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
					WHEN 'master' THEN
						UPDATE osrs_accounts 
						SET ca_master_count = ca_master_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
					WHEN 'grandmaster' THEN
						UPDATE osrs_accounts 
						SET ca_grandmaster_count = ca_grandmaster_count + 1,
							ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
				END CASE;
				
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		await db.query(`
			CREATE TRIGGER trigger_update_ca_counts
			AFTER INSERT ON osrs_account_combat_achievements
			FOR EACH ROW EXECUTE FUNCTION update_ca_counts()
		`);
		
		console.log('✅ Created combat achievement count update trigger');
		
		console.log('✅ Migration 016_add_combat_achievements completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 016_add_combat_achievements failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 016_add_combat_achievements');
	
	try {
		// Drop trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_ca_counts ON osrs_account_combat_achievements');
		await db.query('DROP FUNCTION IF EXISTS update_ca_counts()');
		
		// Remove columns from osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS ca_easy_count,
			DROP COLUMN IF EXISTS ca_medium_count,
			DROP COLUMN IF EXISTS ca_hard_count,
			DROP COLUMN IF EXISTS ca_elite_count,
			DROP COLUMN IF EXISTS ca_master_count,
			DROP COLUMN IF EXISTS ca_grandmaster_count,
			DROP COLUMN IF EXISTS ca_total_count
		`);
		
		// Drop tables
		await db.query('DROP TABLE IF EXISTS osrs_account_combat_achievements CASCADE');
		await db.query('DROP TABLE IF EXISTS combat_achievements CASCADE');
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

