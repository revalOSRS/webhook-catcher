/**
 * Database Setup Script
 * Run this to initialize the Neon Postgres database and run migrations
 * 
 * Usage: node src/db/database/setup.js
 */

require('dotenv').config();
const { initializeDatabase, closeDatabase } = require('./index');
const { runMigrations } = require('./migrations');

async function setup() {
	console.log('🔧 Starting Neon Postgres database setup...\n');
	
	try {
		// Initialize database connection
		console.log('1. Connecting to Neon database...');
		await initializeDatabase();
		console.log('   ✅ Connected successfully\n');
		
		// Run all pending migrations (this creates/updates all tables)
		console.log('2. Running database migrations...');
		const migrationsApplied = await runMigrations();
		if (migrationsApplied === 0) {
			console.log('   ✅ Database schema is up to date\n');
		}
		
		// Display schema info
		console.log('📊 Database Schema (managed by migrations):');
		console.log('\n   Core Tables:');
		console.log('   ├─ members (Discord user data)');
		console.log('   ├─ member_movements (join/leave tracking)');
		console.log('   ├─ osrs_accounts (OSRS account data)');
		console.log('   ├─ donations (donation tracking)');
		console.log('   └─ token_movements (token balance changes)');
		
		console.log('\n   Achievement Tables:');
		console.log('   ├─ achievement_diary_tiers');
		console.log('   ├─ combat_achievements');
		console.log('   ├─ collection_log_items');
		console.log('   ├─ osrs_account_diary_completions');
		console.log('   ├─ osrs_account_combat_achievements');
		console.log('   ├─ osrs_account_collection_log');
		console.log('   └─ osrs_account_killcounts');
		
		console.log('\n   Coffer Tables:');
		console.log('   ├─ coffer_balance');
		console.log('   └─ coffer_movements');
		
		console.log('\n   Points Tables:');
		console.log('   ├─ point_rules');
		console.log('   └─ osrs_account_points_breakdown');
		
		console.log('\n   Event Tables:');
		console.log('   ├─ events');
		console.log('   ├─ event_teams');
		console.log('   ├─ event_team_members');
		console.log('   └─ event_registrations');
		
		console.log('\n   Bingo Tables:');
		console.log('   ├─ bingo_tiles');
		console.log('   ├─ bingo_boards');
		console.log('   ├─ bingo_board_tiles');
		console.log('   └─ bingo_tile_progress');
		
		console.log('\n✅ Database setup complete!\n');
		console.log('🚀 You can now start your application.');
		console.log('\n💡 Tip: To run migrations separately, use:');
		console.log('   node src/db/database/migrate.js up');
	} catch (error) {
		console.error('\n❌ Setup failed:', error.message);
		console.error('\nTroubleshooting:');
		console.error('  1. Make sure your .env file is configured correctly:');
		console.error('     NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require');
		console.error('\n  2. Get your connection string from:');
		console.error('     https://console.neon.tech/');
		console.error('\n  3. Make sure your Neon project is active');
		console.error('\n  4. Check that your connection string includes "?sslmode=require"');
		process.exit(1);
	} finally {
		await closeDatabase();
	}
}

// Run setup if this file is executed directly
if (require.main === module) {
	setup();
}

module.exports = { setup };
