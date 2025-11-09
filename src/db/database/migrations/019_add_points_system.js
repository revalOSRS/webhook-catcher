/**
 * Migration: Add Points System
 * Creates tables for tracking account points, point breakdowns, and point rules
 * Points are awarded for various achievements and activities
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 019_add_points_system');
	
	try {
		// Add point tracking columns to osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS total_points BIGINT DEFAULT 0,
			ADD COLUMN IF NOT EXISTS points_rank INTEGER,
			ADD COLUMN IF NOT EXISTS points_last_updated TIMESTAMP
		`);
		
		console.log('✅ Added points columns to osrs_accounts');
		
		// Create index for points leaderboard
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_points 
			ON osrs_accounts(total_points DESC)
		`);
		
		console.log('✅ Created points leaderboard index');
		
		// Create point breakdown by category table
		await db.query(`
			CREATE TABLE IF NOT EXISTS osrs_account_points_breakdown (
				id SERIAL PRIMARY KEY,
				osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
				category VARCHAR(50) NOT NULL,
				points INTEGER DEFAULT 0,
				last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_account_category UNIQUE (osrs_account_id, category)
			)
		`);
		
		console.log('✅ Created osrs_account_points_breakdown table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_points_breakdown_account 
			ON osrs_account_points_breakdown(osrs_account_id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_points_breakdown_category 
			ON osrs_account_points_breakdown(category)
		`);
		
		// Create point rules configuration table
		await db.query(`
			CREATE TABLE IF NOT EXISTS point_rules (
				id SERIAL PRIMARY KEY,
				rule_type VARCHAR(50) NOT NULL,
				rule_key VARCHAR(100) NOT NULL,
				points INTEGER NOT NULL,
				description TEXT,
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT unique_rule UNIQUE (rule_type, rule_key)
			)
		`);
		
		console.log('✅ Created point_rules table');
		
		// Create indexes
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_point_rules_type 
			ON point_rules(rule_type)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_point_rules_active 
			ON point_rules(is_active)
		`);
		
		// Insert default point rules
		await db.query(`
			INSERT INTO point_rules (rule_type, rule_key, points, description) VALUES
			-- Quest difficulties
			('quest_difficulty', 'novice', 10, 'Novice quest completion'),
			('quest_difficulty', 'intermediate', 25, 'Intermediate quest completion'),
			('quest_difficulty', 'experienced', 50, 'Experienced quest completion'),
			('quest_difficulty', 'master', 100, 'Master quest completion'),
			('quest_difficulty', 'grandmaster', 200, 'Grandmaster quest completion'),
			
			-- Achievement diary tiers
			('diary_tier', 'easy', 50, 'Easy diary completion'),
			('diary_tier', 'medium', 100, 'Medium diary completion'),
			('diary_tier', 'hard', 200, 'Hard diary completion'),
			('diary_tier', 'elite', 400, 'Elite diary completion'),
			
			-- Combat achievement tiers
			('combat_achievement_tier', 'easy', 10, 'Easy combat achievement'),
			('combat_achievement_tier', 'medium', 25, 'Medium combat achievement'),
			('combat_achievement_tier', 'hard', 50, 'Hard combat achievement'),
			('combat_achievement_tier', 'elite', 100, 'Elite combat achievement'),
			('combat_achievement_tier', 'master', 200, 'Master combat achievement'),
			('combat_achievement_tier', 'grandmaster', 500, 'Grandmaster combat achievement'),
			
			-- Boss KC milestones
			('boss_kc_milestone', '1', 10, 'First kill'),
			('boss_kc_milestone', '10', 25, '10 KC milestone'),
			('boss_kc_milestone', '25', 50, '25 KC milestone'),
			('boss_kc_milestone', '50', 100, '50 KC milestone'),
			('boss_kc_milestone', '100', 200, '100 KC milestone'),
			('boss_kc_milestone', '250', 500, '250 KC milestone'),
			('boss_kc_milestone', '500', 1000, '500 KC milestone'),
			('boss_kc_milestone', '1000', 2000, '1000 KC milestone'),
			('boss_kc_milestone', '2500', 5000, '2500 KC milestone'),
			('boss_kc_milestone', '5000', 10000, '5000 KC milestone'),
			
			-- Collection log items by rarity
			('collection_log_rarity', 'common', 10, 'Common collection log item'),
			('collection_log_rarity', 'uncommon', 25, 'Uncommon collection log item'),
			('collection_log_rarity', 'rare', 50, 'Rare collection log item'),
			('collection_log_rarity', 'very_rare', 100, 'Very rare collection log item'),
			('collection_log_rarity', 'pet', 500, 'Pet obtained'),
			
			-- Level milestones
			('level_milestone', '50', 10, 'Level 50 reached'),
			('level_milestone', '75', 25, 'Level 75 reached'),
			('level_milestone', '90', 50, 'Level 90 reached'),
			('level_milestone', '99', 100, 'Level 99 reached'),
			
			-- Speedrun achievements
			('speedrun', 'personal_best', 50, 'Personal best speedrun time'),
			('speedrun', 'sub_hour', 100, 'Sub-hour speedrun'),
			('speedrun', 'top_10_percent', 200, 'Top 10% speedrun time'),
			
			-- Special drops
			('special_drop', 'rare_drop', 25, 'Rare drop obtained'),
			('special_drop', 'unique_drop', 50, 'Unique drop obtained'),
			('special_drop', 'pet_drop', 500, 'Pet drop obtained')
			ON CONFLICT (rule_type, rule_key) DO NOTHING
		`);
		
		console.log('✅ Inserted default point rules');
		
		// Create trigger to auto-update account points from events
		await db.query(`
			CREATE OR REPLACE FUNCTION update_account_points()
			RETURNS TRIGGER AS $$
			BEGIN
				-- Update total points on the account
				UPDATE osrs_accounts 
				SET total_points = total_points + NEW.points_awarded,
					points_last_updated = CURRENT_TIMESTAMP
				WHERE id = NEW.osrs_account_id;
				
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		await db.query(`
			CREATE TRIGGER trigger_update_account_points
			AFTER INSERT ON osrs_account_events
			FOR EACH ROW 
			WHEN (NEW.points_awarded > 0)
			EXECUTE FUNCTION update_account_points()
		`);
		
		console.log('✅ Created points update trigger');
		
		// Create function to update point category breakdown
		await db.query(`
			CREATE OR REPLACE FUNCTION update_points_breakdown(
				p_account_id INTEGER,
				p_category VARCHAR(50),
				p_points INTEGER
			) RETURNS VOID AS $$
			BEGIN
				INSERT INTO osrs_account_points_breakdown (
					osrs_account_id,
					category,
					points,
					last_updated
				)
				VALUES (
					p_account_id,
					p_category,
					p_points,
					CURRENT_TIMESTAMP
				)
				ON CONFLICT (osrs_account_id, category)
				DO UPDATE SET
					points = osrs_account_points_breakdown.points + EXCLUDED.points,
					last_updated = CURRENT_TIMESTAMP;
			END;
			$$ LANGUAGE plpgsql;
		`);
		
		console.log('✅ Created points breakdown update function');
		
		// Create materialized view for points leaderboard (optional, for performance)
		await db.query(`
			CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_points AS
			SELECT 
				o.id,
				o.osrs_nickname,
				o.discord_id,
				o.total_points,
				o.quest_points,
				o.ca_total_count,
				o.diary_total_count,
				o.clog_items_obtained,
				o.ehp,
				o.ehb,
				ROW_NUMBER() OVER (ORDER BY o.total_points DESC) as rank
			FROM osrs_accounts o
			WHERE o.total_points > 0
			ORDER BY total_points DESC
		`);
		
		await db.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_points_id 
			ON leaderboard_points(id)
		`);
		
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_leaderboard_points_rank 
			ON leaderboard_points(rank)
		`);
		
		console.log('✅ Created points leaderboard materialized view');
		
		console.log('✅ Migration 019_add_points_system completed successfully');
		console.log('💡 Remember to refresh the materialized view periodically with:');
		console.log('   REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_points;');
		
	} catch (error) {
		console.error('❌ Migration 019_add_points_system failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 019_add_points_system');
	
	try {
		// Drop materialized view
		await db.query('DROP MATERIALIZED VIEW IF EXISTS leaderboard_points CASCADE');
		
		// Drop functions
		await db.query('DROP FUNCTION IF EXISTS update_points_breakdown(INTEGER, VARCHAR, INTEGER)');
		
		// Drop trigger and function
		await db.query('DROP TRIGGER IF EXISTS trigger_update_account_points ON osrs_account_events');
		await db.query('DROP FUNCTION IF EXISTS update_account_points()');
		
		// Drop tables
		await db.query('DROP TABLE IF EXISTS point_rules CASCADE');
		await db.query('DROP TABLE IF EXISTS osrs_account_points_breakdown CASCADE');
		
		// Remove columns from osrs_accounts
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS total_points,
			DROP COLUMN IF EXISTS points_rank,
			DROP COLUMN IF EXISTS points_last_updated
		`);
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

