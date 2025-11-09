/**
 * Migration: Move dink_hash from members to osrs_accounts
 * 
 * Dink webhooks are OSRS account-specific, not Discord user-specific.
 * This migration:
 * 1. Adds dink_hash column to osrs_accounts
 * 2. Migrates existing dink_hash data to osrs_accounts (if applicable)
 * 3. Removes dink_hash column from members
 */

const db = require('../index');

module.exports = {
	name: '005_move_dink_hash_to_osrs_accounts',
	
	async up() {
		console.log('📝 Running migration: Move dink_hash to osrs_accounts...');
		
		// Note: dink_hash column should already exist from migration 003
		// This migration just ensures it exists and removes it from members
		
		// Add dink_hash column to osrs_accounts (if not exists from migration 003)
		console.log('  ✅ Ensuring dink_hash exists in osrs_accounts...');
		await db.query('ALTER TABLE osrs_accounts ADD COLUMN IF NOT EXISTS dink_hash VARCHAR(255)');
		
		// Create index on dink_hash (if not exists from migration 003)
		console.log('  ✅ Ensuring dink_hash index exists...');
		await db.query('CREATE INDEX IF NOT EXISTS idx_osrs_accounts_dink_hash ON osrs_accounts(dink_hash)');
		
		// Note: Cannot migrate data here because migration 004 already removed osrs_nickname from members
		// If you have existing dink_hash data in members, it should be migrated manually before running migration 004
		console.log('  ℹ️ Skipping data migration (osrs fields already removed from members in migration 004)');
		
		// Drop dink_hash column from members
		console.log('  🗑️ Removing dink_hash from members...');
		await db.query('ALTER TABLE members DROP COLUMN IF EXISTS dink_hash');
		console.log('  ✅ Column removed');
		
		console.log('✅ Migration 005 complete');
		console.log('   ℹ️ dink_hash now belongs to osrs_accounts');
	},
	
	async down() {
		console.log('📝 Rolling back migration: Move dink_hash to osrs_accounts...');
		
		// Re-add dink_hash column to members
		console.log('  ➕ Re-adding dink_hash to members...');
		await db.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS dink_hash VARCHAR(255)');
		console.log('  ✅ Column restored');
		
		// Migrate dink_hash back to members (for primary accounts only)
		console.log('  📦 Migrating dink_hash back to members...');
		const result = await db.query(`
			UPDATE members m
			SET dink_hash = oa.dink_hash
			FROM osrs_accounts oa
			WHERE oa.discord_id = m.discord_id
			  AND oa.is_primary = true
			  AND oa.dink_hash IS NOT NULL
			RETURNING m.discord_id
		`);
		
		if (result && result.length > 0) {
			console.log(`  ✅ Migrated dink_hash for ${result.length} member(s)`);
		}
		
		// Drop dink_hash column from osrs_accounts
		console.log('  🗑️ Removing dink_hash from osrs_accounts...');
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_dink_hash');
		await db.query('ALTER TABLE osrs_accounts DROP COLUMN IF EXISTS dink_hash');
		console.log('  ✅ Column removed');
		
		console.log('✅ Migration 005 rolled back');
	}
};

