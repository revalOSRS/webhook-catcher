/**
 * Migration: Remove OSRS fields from members table
 * 
 * Now that OSRS data is stored in osrs_accounts table,
 * we can remove the legacy OSRS fields from members table.
 * 
 * Removes:
 * - osrs_nickname
 * - osrs_rank
 * - wom_rank
 * - wom_player_id
 * 
 * And their associated indexes.
 */

const db = require('../index');

module.exports = {
	name: '004_remove_osrs_fields_from_members',
	
	async up() {
		console.log('📝 Running migration: Remove OSRS fields from members table...');
		
		// Drop indexes first
		console.log('  🗑️ Dropping OSRS-related indexes...');
		await db.query('DROP INDEX IF EXISTS idx_osrs_nickname');
		await db.query('DROP INDEX IF EXISTS idx_wom_player_id');
		console.log('  ✅ Indexes dropped');
		
		// Drop columns
		console.log('  🗑️ Dropping OSRS-related columns...');
		await db.query('ALTER TABLE members DROP COLUMN IF EXISTS osrs_nickname');
		await db.query('ALTER TABLE members DROP COLUMN IF EXISTS osrs_rank');
		await db.query('ALTER TABLE members DROP COLUMN IF EXISTS wom_rank');
		await db.query('ALTER TABLE members DROP COLUMN IF EXISTS wom_player_id');
		console.log('  ✅ Columns dropped');
		
		console.log('✅ Migration 004 complete');
		console.log('   ℹ️ OSRS data now lives in osrs_accounts table');
	},
	
	async down() {
		console.log('📝 Rolling back migration: Remove OSRS fields from members table...');
		
		// Re-add columns
		console.log('  ➕ Re-adding OSRS-related columns...');
		await db.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS osrs_nickname VARCHAR(12)');
		await db.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS osrs_rank VARCHAR(50)');
		await db.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS wom_rank VARCHAR(50)');
		await db.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS wom_player_id INTEGER');
		console.log('  ✅ Columns restored');
		
		// Re-create indexes
		console.log('  ➕ Re-creating indexes...');
		await db.query('CREATE INDEX IF NOT EXISTS idx_osrs_nickname ON members(osrs_nickname)');
		await db.query('CREATE INDEX IF NOT EXISTS idx_wom_player_id ON members(wom_player_id)');
		console.log('  ✅ Indexes restored');
		
		console.log('✅ Migration 004 rolled back');
	}
};

