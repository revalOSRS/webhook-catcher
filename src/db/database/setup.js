/**
 * Database Setup Script
 * Run this to initialize the Neon Postgres database and create tables
 * 
 * Usage: node src/connections/database/setup.js
 */

require('dotenv').config();
const { initializeDatabase, closeDatabase } = require('./index');
const Member = require('./models/Member');
const MemberMovement = require('./models/MemberMovement');
const { runMigrations } = require('./migrations');

async function setup() {
	console.log('🔧 Starting Neon Postgres database setup...\n');
	
	try {
		// Initialize database connection
		console.log('1. Connecting to Neon database...');
		await initializeDatabase();
		console.log('   ✅ Connected successfully\n');
		
		// Create base tables (if first time)
		console.log('2. Creating database tables...');
		console.log('   - Creating Member table');
		console.log('   - Adding indexes (discord_id, osrs_nickname, wom_player_id)');
		console.log('   - Setting up auto-update trigger');
		await Member.createTable();
		console.log('   ✅ Members table ready');
		
		console.log('   - Creating MemberMovement table');
		console.log('   - Adding indexes (member_id, discord_id, timestamp, event_type)');
		await MemberMovement.createTable();
		console.log('   ✅ Member movements table ready\n');
		
		// Run any pending migrations
		console.log('3. Running database migrations...');
		const migrationsApplied = await runMigrations();
		if (migrationsApplied === 0) {
			console.log('   ✅ Database schema is up to date\n');
		}
		
		// Display table info
		console.log('📊 Database Schema:');
		console.log('\n   Table: members (Discord user data)');
		console.log('   ├─ id (SERIAL PRIMARY KEY)');
		console.log('   ├─ discord_id (VARCHAR(20) UNIQUE)');
		console.log('   ├─ discord_tag (VARCHAR(37))');
		console.log('   ├─ is_active (BOOLEAN)');
		console.log('   ├─ in_discord (BOOLEAN)');
		console.log('   ├─ notes (TEXT)');
		console.log('   ├─ created_at (TIMESTAMP)');
		console.log('   ├─ updated_at (TIMESTAMP - auto-updated)');
		console.log('   └─ last_seen (TIMESTAMP)');
		
		console.log('\n   Table: osrs_accounts (OSRS account data)');
		console.log('   ├─ id (SERIAL PRIMARY KEY)');
		console.log('   ├─ discord_id (VARCHAR(255) FK → members.discord_id)');
		console.log('   ├─ osrs_nickname (VARCHAR(12) UNIQUE)');
		console.log('   ├─ dink_hash (VARCHAR(255))');
		console.log('   ├─ wom_player_id (INTEGER)');
		console.log('   ├─ wom_rank (VARCHAR(50))');
		console.log('   ├─ ehp (DECIMAL)');
		console.log('   ├─ ehb (DECIMAL)');
		console.log('   ├─ is_primary (BOOLEAN)');
		console.log('   ├─ last_synced_at (TIMESTAMP)');
		console.log('   ├─ created_at (TIMESTAMP)');
		console.log('   └─ updated_at (TIMESTAMP)');
		
		console.log('\n   Table: member_movements');
		console.log('   ├─ id (SERIAL PRIMARY KEY)');
		console.log('   ├─ member_id (INTEGER)');
		console.log('   ├─ discord_id (VARCHAR(20))');
		console.log('   ├─ event_type (VARCHAR(20) - joined/left)');
		console.log('   ├─ previous_rank (VARCHAR(50))');
		console.log('   ├─ notes (TEXT)');
		console.log('   └─ timestamp (TIMESTAMP)');
		
		console.log('✅ Database setup complete!\n');
		console.log('🚀 You can now start your Discord bot.');
		console.log('\n💡 Tip: To run migrations separately, use:');
		console.log('   node src/connections/database/migrate.js up');
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

