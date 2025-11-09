/**
 * Migration: Add Account Type Field
 * Adds account_type field to osrs_accounts table
 */

const db = require('../index');

async function up() {
	console.log('Running migration: 021_add_account_type');
	
	try {
		// Add account_type field (NORMAL, IRONMAN, HARDCORE_IRONMAN, ULTIMATE_IRONMAN, GROUP_IRONMAN)
		await db.query(`
			ALTER TABLE osrs_accounts 
			ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'NORMAL'
		`);
		
		console.log('✅ Added account_type column to osrs_accounts');
		
		// Create index for account type filtering
		await db.query(`
			CREATE INDEX IF NOT EXISTS idx_osrs_accounts_account_type 
			ON osrs_accounts(account_type)
		`);
		
		console.log('✅ Created index on account_type');
		
		console.log('✅ Migration 021_add_account_type completed successfully');
		
	} catch (error) {
		console.error('❌ Migration 021_add_account_type failed:', error);
		throw error;
	}
}

async function down() {
	console.log('Rolling back migration: 021_add_account_type');
	
	try {
		// Drop index
		await db.query('DROP INDEX IF EXISTS idx_osrs_accounts_account_type');
		
		// Remove column
		await db.query(`
			ALTER TABLE osrs_accounts 
			DROP COLUMN IF EXISTS account_type
		`);
		
		console.log('✅ Rollback completed');
		
	} catch (error) {
		console.error('❌ Rollback failed:', error);
		throw error;
	}
}

module.exports = { up, down };

