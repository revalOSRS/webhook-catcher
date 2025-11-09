/**
 * Database Migration Runner
 * Manages schema changes and tracks applied migrations
 */

const { query, queryOne } = require('../index');
const fs = require('fs');
const path = require('path');

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
	await query(`
		CREATE TABLE IF NOT EXISTS migrations (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

/**
 * Get list of applied migrations
 * @returns {Promise<string[]>} Array of migration names
 */
async function getAppliedMigrations() {
	await createMigrationsTable();
	const results = await query(`SELECT name FROM migrations ORDER BY name ASC`);
	return results.map(r => r.name);
}

/**
 * Record a migration as applied
 * @param {string} name - Migration name
 */
async function recordMigration(name) {
	await query(`INSERT INTO migrations (name) VALUES ($1)`, [name]);
}

/**
 * Remove a migration record
 * @param {string} name - Migration name
 */
async function removeMigration(name) {
	await query(`DELETE FROM migrations WHERE name = $1`, [name]);
}

/**
 * Get all migration files
 * @returns {Array<{name: string, file: string}>} Migration files
 */
function getMigrationFiles() {
	const migrationsDir = __dirname;
	const files = fs.readdirSync(migrationsDir)
		.filter(f => f.endsWith('.js') && f !== 'index.js')
		.sort();
	
	return files.map(file => ({
		name: file.replace('.js', ''),
		file: path.join(migrationsDir, file)
	}));
}

/**
 * Run all pending migrations
 * @returns {Promise<number>} Number of migrations applied
 */
async function runMigrations() {
	console.log('🔄 Running database migrations...\n');
	
	const appliedMigrations = await getAppliedMigrations();
	const migrationFiles = getMigrationFiles();
	
	let applied = 0;
	
	for (const { name, file } of migrationFiles) {
		if (appliedMigrations.includes(name)) {
			console.log(`⏭️  Skipping ${name} (already applied)`);
			continue;
		}
		
		console.log(`⚡ Applying ${name}...`);
		const migration = require(file);
		
		try {
			await migration.up();
			await recordMigration(name);
			applied++;
			console.log(`✅ ${name} applied\n`);
		} catch (error) {
			console.error(`❌ Failed to apply ${name}:`, error.message);
			throw error;
		}
	}
	
	if (applied === 0) {
		console.log('✅ No pending migrations\n');
	} else {
		console.log(`✅ Applied ${applied} migration(s)\n`);
	}
	
	return applied;
}

/**
 * Rollback the last migration
 * @returns {Promise<boolean>} True if rolled back, false if no migrations to rollback
 */
async function rollbackLastMigration() {
	console.log('🔄 Rolling back last migration...\n');
	
	const appliedMigrations = await getAppliedMigrations();
	
	if (appliedMigrations.length === 0) {
		console.log('⚠️  No migrations to rollback');
		return false;
	}
	
	const lastMigration = appliedMigrations[appliedMigrations.length - 1];
	const migrationFiles = getMigrationFiles();
	const migrationFile = migrationFiles.find(m => m.name === lastMigration);
	
	if (!migrationFile) {
		console.error(`❌ Migration file not found: ${lastMigration}`);
		return false;
	}
	
	console.log(`⚡ Rolling back ${lastMigration}...`);
	const migration = require(migrationFile.file);
	
	try {
		await migration.down();
		await removeMigration(lastMigration);
		console.log(`✅ ${lastMigration} rolled back\n`);
		return true;
	} catch (error) {
		console.error(`❌ Failed to rollback ${lastMigration}:`, error.message);
		throw error;
	}
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
	console.log('📊 Migration Status:\n');
	
	const appliedMigrations = await getAppliedMigrations();
	const migrationFiles = getMigrationFiles();
	
	for (const { name } of migrationFiles) {
		const isApplied = appliedMigrations.includes(name);
		const status = isApplied ? '✅ Applied' : '⏳ Pending';
		console.log(`  ${status}  ${name}`);
	}
	
	console.log(`\nTotal: ${migrationFiles.length} migration(s)`);
	console.log(`Applied: ${appliedMigrations.length}`);
	console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}\n`);
}

module.exports = {
	runMigrations,
	rollbackLastMigration,
	showMigrationStatus,
	getAppliedMigrations
};

