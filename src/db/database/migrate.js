#!/usr/bin/env node
/**
 * Database Migration CLI
 * Run this to apply database migrations
 * 
 * Usage:
 *   node src/connections/database/migrate.js up       - Run all pending migrations
 *   node src/connections/database/migrate.js down     - Rollback last migration
 *   node src/connections/database/migrate.js status   - Show migration status
 */

require('dotenv').config();
const { initializeDatabase, closeDatabase } = require('./index');
const { runMigrations, rollbackLastMigration, showMigrationStatus } = require('./migrations');

async function main() {
	const command = process.argv[2] || 'up';
	
	console.log('🗄️  Database Migration Tool\n');
	
	try {
		// Initialize database connection
		await initializeDatabase();
		
		switch (command) {
			case 'up':
				await runMigrations();
				break;
				
			case 'down':
				await rollbackLastMigration();
				break;
				
			case 'status':
				await showMigrationStatus();
				break;
				
			default:
				console.error(`Unknown command: ${command}`);
				console.log('\nAvailable commands:');
				console.log('  up     - Run all pending migrations');
				console.log('  down   - Rollback last migration');
				console.log('  status - Show migration status');
				process.exit(1);
		}
		
	} catch (error) {
		console.error('❌ Migration failed:', error.message);
		console.error(error);
		process.exit(1);
	} finally {
		await closeDatabase();
	}
}

main();

