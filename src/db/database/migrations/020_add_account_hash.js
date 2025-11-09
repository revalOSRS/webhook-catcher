/**
 * Migration: Add Account Hash Field
 * Adds account_hash field to osrs_accounts table for RuneLite plugin integration
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 020_add_account_hash');
	
	try {
		// Add account_hash field for RuneLite plugin
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS account_hash VARCHAR(255)
		`);
		
		console.log('✅ Added account_hash column to osrs_accounts');
		
		// Create index for fast lookups by hash
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_account_hash 
			ON osrs_accounts(account_hash)
		`);
		
		console.log('✅ Created index on account_hash');
		
		console.log('✅ Migration 020_add_account_hash completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 020_add_account_hash failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 020_add_account_hash');
	
	try {
		// Drop index
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_account_hash');
		
		// Remove column
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS account_hash
		`);
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

