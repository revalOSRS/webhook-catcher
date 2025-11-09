/**
 * Migration: Add clan coffer donation tracking system
 * Created: 2025-10-18
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 006_add_coffer_system');

	// Add donation tracking fields to existing members table
	console.log('  - Adding donation fields to members table...');
	await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS total_donated INTEGER DEFAULT 0`);
	await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS donation_count INTEGER DEFAULT 0`);

	// Create donation categories table
	console.log('  - Creating donation_categories table...');
	await query(`
		CREATE TABLE IF NOT EXISTS donation_categories (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) UNIQUE NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);

	// Insert default donation categories
	console.log('  - Adding default donation categories...');
	await query(`
		INSERT INTO donation_categories (name, description) VALUES
			('General Donation', 'Regular clan donation'),
			('Event Entry Fee', 'Entry fee for clan events')
		ON CONFLICT (name) DO NOTHING
	`);

	// Create donations table
	console.log('  - Creating donations table...');
	await query(`
		CREATE TABLE IF NOT EXISTS donations (
			id SERIAL PRIMARY KEY,
			player_discord_id VARCHAR(255) NOT NULL,
			amount INTEGER NOT NULL,
			category_id INTEGER DEFAULT 1,
			screenshot_url TEXT,
			status VARCHAR(50) DEFAULT 'pending',
			submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			reviewed_at TIMESTAMP NULL,
			reviewed_by VARCHAR(255) NULL,
			denial_reason TEXT NULL,
			message_id VARCHAR(255) NULL,
			channel_id VARCHAR(255) NULL,
			note TEXT NULL,
			FOREIGN KEY (player_discord_id) REFERENCES members(discord_id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES donation_categories(id)
		)
	`);

	// Create events table first (needed for foreign key)
	console.log('  - Creating events table...');
	await query(`
		CREATE TABLE IF NOT EXISTS events (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			funds_used INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by VARCHAR(255) NOT NULL
		)
	`);

	// Create coffer_movements table
	console.log('  - Creating coffer_movements table...');
	await query(`
		CREATE TABLE IF NOT EXISTS coffer_movements (
			id SERIAL PRIMARY KEY,
			type VARCHAR(50) NOT NULL,
			amount INTEGER NOT NULL,
			player_discord_id VARCHAR(255) NULL,
			event_id INTEGER NULL,
			donation_id INTEGER NULL,
			description TEXT,
			note TEXT NULL,
			balance_before INTEGER NOT NULL,
			balance_after INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by VARCHAR(255) NOT NULL,
			FOREIGN KEY (player_discord_id) REFERENCES members(discord_id) ON DELETE SET NULL,
			FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
			FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
		)
	`);

	// Create current_coffer_balance table
	console.log('  - Creating coffer_balance table...');
	await query(`
		CREATE TABLE IF NOT EXISTS coffer_balance (
			id SERIAL PRIMARY KEY,
			balance INTEGER DEFAULT 0,
			last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_by VARCHAR(255) NOT NULL
		)
	`);

	// Insert initial balance if not exists
	console.log('  - Setting initial coffer balance...');
	await query(`
		INSERT INTO coffer_balance (balance, updated_by)
		SELECT 0, 'system'
		WHERE NOT EXISTS (SELECT 1 FROM coffer_balance)
	`);

	// Create indexes for performance
	console.log('  - Creating indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_donations_player ON donations(player_discord_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_type ON coffer_movements(type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_created_at ON coffer_movements(created_at DESC)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)`);

	// Create functions and triggers for automatic balance updates
	console.log('  - Creating database functions and triggers...');

	// Function to update player donation stats
	await query(`
		CREATE OR REPLACE FUNCTION update_player_donation_stats()
		RETURNS TRIGGER AS $$
		BEGIN
			-- Update stats when donation is approved
			IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
				INSERT INTO members (discord_id, username, total_donated, donation_count)
				VALUES (NEW.player_discord_id, '', NEW.amount, 1)
				ON CONFLICT (discord_id)
				DO UPDATE SET
					total_donated = COALESCE(members.total_donated, 0) + NEW.amount,
					donation_count = COALESCE(members.donation_count, 0) + 1,
					updated_at = CURRENT_TIMESTAMP;
			END IF;

			-- If changing from approved to something else, subtract the donation
			IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
				UPDATE members
				SET total_donated = GREATEST(COALESCE(total_donated, 0) - OLD.amount, 0),
					donation_count = GREATEST(COALESCE(donation_count, 0) - 1, 0),
					updated_at = CURRENT_TIMESTAMP
				WHERE discord_id = OLD.player_discord_id;
			END IF;

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	// Function to update coffer balance
	await query(`
		CREATE OR REPLACE FUNCTION update_coffer_balance()
		RETURNS TRIGGER AS $$
		DECLARE
			balance_change INTEGER;
		BEGIN
			-- Calculate balance change based on movement type
			CASE NEW.type
				WHEN 'donation' THEN balance_change := NEW.amount;
				WHEN 'withdrawal' THEN balance_change := -NEW.amount;
				WHEN 'event_expenditure' THEN balance_change := -NEW.amount;
				WHEN 'manual_adjustment' THEN balance_change := NEW.amount;
				ELSE balance_change := 0;
			END CASE;

			-- Update the current balance
			UPDATE coffer_balance
			SET balance = balance + balance_change,
				last_updated = CURRENT_TIMESTAMP,
				updated_by = NEW.created_by
			WHERE id = 1;

			-- Update the movement record with before/after balances
			UPDATE coffer_movements
			SET balance_before = (SELECT balance - balance_change FROM coffer_balance WHERE id = 1),
				balance_after = (SELECT balance FROM coffer_balance WHERE id = 1)
			WHERE id = NEW.id;

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	// Create triggers
	await query(`DROP TRIGGER IF EXISTS update_player_stats_trigger ON donations`);
	await query(`
		CREATE TRIGGER update_player_stats_trigger
			AFTER UPDATE ON donations
			FOR EACH ROW
			EXECUTE FUNCTION update_player_donation_stats()
	`);

	await query(`DROP TRIGGER IF EXISTS update_coffer_balance_trigger ON coffer_movements`);
	await query(`
		CREATE TRIGGER update_coffer_balance_trigger
			AFTER INSERT ON coffer_movements
			FOR EACH ROW
			EXECUTE FUNCTION update_coffer_balance()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 006_add_coffer_system');

	// Drop triggers and functions
	await query(`DROP TRIGGER IF EXISTS update_coffer_balance_trigger ON coffer_movements`);
	await query(`DROP TRIGGER IF EXISTS update_player_stats_trigger ON donations`);
	await query(`DROP FUNCTION IF EXISTS update_coffer_balance()`);
	await query(`DROP FUNCTION IF EXISTS update_player_donation_stats()`);

	// Drop indexes
	await query(`DROP INDEX IF EXISTS idx_events_created_at`);
	await query(`DROP INDEX IF EXISTS idx_coffer_movements_created_at`);
	await query(`DROP INDEX IF EXISTS idx_coffer_movements_type`);
	await query(`DROP INDEX IF EXISTS idx_donations_status`);
	await query(`DROP INDEX IF EXISTS idx_donations_player`);

	// Drop tables (in reverse order due to foreign key constraints)
	await query(`DROP TABLE IF EXISTS coffer_balance`);
	await query(`DROP TABLE IF EXISTS coffer_movements`);
	await query(`DROP TABLE IF EXISTS donations`);
	await query(`DROP TABLE IF EXISTS events`);
	await query(`DROP TABLE IF EXISTS donation_categories`);

	// Remove donation fields from members table
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS total_donated`);
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS donation_count`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };
