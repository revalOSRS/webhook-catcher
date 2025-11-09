/**
 * Migration: Add token balance system for member earnings
 * Created: 2025-10-21
 * 
 * Adds token_balance to members table and creates token_movements table
 * Each token = 1M OSRS GP
 * Used for tracking earnings from events, especially for Ironman accounts
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 009_add_token_system');

	// Add token_balance field to members table
	console.log('  - Adding token_balance to members table...');
	await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0`);

	// Set default value for existing members
	console.log('  - Setting default token balance for existing members...');
	await query(`UPDATE members SET token_balance = 0 WHERE token_balance IS NULL`);

	// Make token_balance NOT NULL
	await query(`ALTER TABLE members ALTER COLUMN token_balance SET NOT NULL`);

	// Create token_movements table
	console.log('  - Creating token_movements table...');
	await query(`
		CREATE TABLE IF NOT EXISTS token_movements (
			id SERIAL PRIMARY KEY,
			member_id INTEGER NOT NULL,
			discord_id VARCHAR(20) NOT NULL,
			type VARCHAR(50) NOT NULL,
			amount INTEGER NOT NULL,
			balance_before INTEGER NOT NULL,
			balance_after INTEGER NOT NULL,
			event_id INTEGER NULL,
			description TEXT,
			note TEXT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by VARCHAR(255) NOT NULL,
			FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
			FOREIGN KEY (discord_id) REFERENCES members(discord_id) ON DELETE CASCADE,
			FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
		)
	`);

	// Create indexes for performance
	console.log('  - Creating indexes...');
	await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_member_id ON token_movements(member_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_discord_id ON token_movements(discord_id)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_type ON token_movements(type)`);
	await query(`CREATE INDEX IF NOT EXISTS idx_token_movements_created_at ON token_movements(created_at DESC)`);

	// Create function to automatically update member token balance
	console.log('  - Creating database function for token balance updates...');
	await query(`
		CREATE OR REPLACE FUNCTION update_member_token_balance()
		RETURNS TRIGGER AS $$
		BEGIN
			-- Update member's token balance
			UPDATE members
			SET token_balance = NEW.balance_after
			WHERE id = NEW.member_id;
			
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	// Create trigger
	console.log('  - Creating trigger for token balance updates...');
	await query(`DROP TRIGGER IF EXISTS update_token_balance_trigger ON token_movements`);
	await query(`
		CREATE TRIGGER update_token_balance_trigger
			AFTER INSERT ON token_movements
			FOR EACH ROW
			EXECUTE FUNCTION update_member_token_balance()
	`);

	console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
	console.log('Rolling back migration: 009_add_token_system');

	// Drop trigger and function
	await query(`DROP TRIGGER IF EXISTS update_token_balance_trigger ON token_movements`);
	await query(`DROP FUNCTION IF EXISTS update_member_token_balance()`);

	// Drop indexes
	await query(`DROP INDEX IF EXISTS idx_token_movements_created_at`);
	await query(`DROP INDEX IF EXISTS idx_token_movements_type`);
	await query(`DROP INDEX IF EXISTS idx_token_movements_discord_id`);
	await query(`DROP INDEX IF EXISTS idx_token_movements_member_id`);

	// Drop table
	await query(`DROP TABLE IF EXISTS token_movements`);

	// Remove token_balance column from members
	await query(`ALTER TABLE members DROP COLUMN IF EXISTS token_balance`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

