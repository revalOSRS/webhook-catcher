/**
 * Migration: Fix coffer balance trigger
 * 
 * Problem: The trigger was trying to UPDATE the coffer_movements record after INSERT,
 * but balance_before/after are NOT NULL and provided by the application.
 * This caused duplicate balance updates.
 * 
 * Solution: Simplify the trigger to ONLY update coffer_balance table.
 * The application code will handle balance_before/after values.
 */

const { query } = require('../index');

async function up() {
	console.log('Running migration: 007_fix_coffer_trigger');

	// Drop the old trigger
	await query(`DROP TRIGGER IF EXISTS update_coffer_balance_trigger ON coffer_movements`);
	
	// Recreate the function - simplified to only update coffer_balance
	console.log('  - Updating update_coffer_balance function...');
	await query(`
		CREATE OR REPLACE FUNCTION update_coffer_balance()
		RETURNS TRIGGER AS $$
		DECLARE
			balance_change INTEGER;
		BEGIN
			-- Calculate balance change based on movement type
			CASE NEW.type
				WHEN 'donation' THEN balance_change := NEW.amount;
				WHEN 'withdrawal' THEN balance_change := NEW.amount; -- amount is already negative
				WHEN 'event_expenditure' THEN balance_change := NEW.amount; -- amount is already negative
				WHEN 'manual_adjustment' THEN balance_change := NEW.amount;
				ELSE balance_change := 0;
			END CASE;

			-- Update the current balance
			UPDATE coffer_balance
			SET balance = balance + balance_change,
				last_updated = CURRENT_TIMESTAMP,
				updated_by = NEW.created_by
			WHERE id = 1;

			-- Note: balance_before and balance_after are now provided by the application
			-- No need to update the coffer_movements record

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	// Recreate the trigger
	console.log('  - Recreating trigger...');
	await query(`
		CREATE TRIGGER update_coffer_balance_trigger
			AFTER INSERT ON coffer_movements
			FOR EACH ROW
			EXECUTE FUNCTION update_coffer_balance()
	`);

	console.log('  ✅ Migration completed successfully');
}

async function down() {
	console.log('Rolling back migration: 007_fix_coffer_trigger');

	// Drop the trigger
	await query(`DROP TRIGGER IF EXISTS update_coffer_balance_trigger ON coffer_movements`);
	
	// Restore the old function (with the UPDATE coffer_movements logic)
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

	// Recreate the trigger
	await query(`
		CREATE TRIGGER update_coffer_balance_trigger
			AFTER INSERT ON coffer_movements
			FOR EACH ROW
			EXECUTE FUNCTION update_coffer_balance()
	`);

	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

