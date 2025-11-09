/**
 * Migration: Fix Combat Achievement Trigger Case Sensitivity
 * 
 * The trigger was checking for lowercase tier names ('easy', 'medium', etc.)
 * but the actual data uses capitalized names ('Easy', 'Medium', etc.).
 * 
 * This migration fixes the trigger to be case-insensitive and adds an ELSE clause.
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 023_fix_ca_trigger_case');
	
	try {
		// Drop the existing trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_ca_counts ON osrs_account_combat_achievements');
		await db.query('DROP FUNCTION IF EXISTS update_ca_counts()');
		
		console.log('✅ Dropped old trigger and function');
		
		// Recreate with case-insensitive comparison and ELSE clause
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
				
				-- Update the appropriate counter (case-insensitive)
				CASE LOWER(tier_name)
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
					ELSE
						-- Handle unexpected tier names - just update total count
						UPDATE osrs_accounts 
						SET ca_total_count = ca_total_count + 1
						WHERE id = NEW.osrs_account_id;
						
						-- Log warning
						RAISE WARNING 'Unknown combat achievement tier: %', tier_name;
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
		
		console.log('✅ Recreated trigger with case-insensitive comparison and ELSE clause');
		console.log('✅ Migration 023_fix_ca_trigger_case completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 023_fix_ca_trigger_case failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 023_fix_ca_trigger_case');
	
	try {
		// Restore the old version (without LOWER() and without ELSE)
		await db.query('DROP TRIGGER IF EXISTS trigger_update_ca_counts ON osrs_account_combat_achievements');
		await db.query('DROP FUNCTION IF EXISTS update_ca_counts()');
		
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
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

