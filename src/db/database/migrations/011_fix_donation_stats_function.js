/**
 * Migration: Fix donation stats function - remove non-existent username column
 * 
 * Problem: The update_player_donation_stats() function was trying to insert
 * into a 'username' column that doesn't exist in the members table.
 * The members table uses 'discord_tag' instead.
 * 
 * Solution: Update the function to not insert username at all since
 * the member record should already exist when approving donations.
 */

const { query } = require('../index');

async function up() {
	console.log('Running migration: 011_fix_donation_stats_function');

	// Recreate the function without the username column
	console.log('  - Updating update_player_donation_stats function...');
	await query(`
		CREATE OR REPLACE FUNCTION update_player_donation_stats()
		RETURNS TRIGGER AS $$
		BEGIN
			-- Update stats when donation is approved
			IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
				-- Member should already exist, just update their donation stats
				UPDATE members
				SET total_donated = COALESCE(total_donated, 0) + NEW.amount,
					donation_count = COALESCE(donation_count, 0) + 1,
					updated_at = CURRENT_TIMESTAMP
				WHERE discord_id = NEW.player_discord_id;
				
				-- If member doesn't exist for some reason, log a warning but don't fail
				IF NOT FOUND THEN
					RAISE WARNING 'Member not found for discord_id: %', NEW.player_discord_id;
				END IF;
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

	console.log('  ✅ Migration completed successfully');
}

async function down() {
	console.log('Rolling back migration: 011_fix_donation_stats_function');
	
	// Revert to the old (broken) version for completeness
	await query(`
		CREATE OR REPLACE FUNCTION update_player_donation_stats()
		RETURNS TRIGGER AS $$
		BEGIN
			IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
				INSERT INTO members (discord_id, username, total_donated, donation_count)
				VALUES (NEW.player_discord_id, '', NEW.amount, 1)
				ON CONFLICT (discord_id)
				DO UPDATE SET
					total_donated = COALESCE(members.total_donated, 0) + NEW.amount,
					donation_count = COALESCE(members.donation_count, 0) + 1,
					updated_at = CURRENT_TIMESTAMP;
			END IF;

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
	
	console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

