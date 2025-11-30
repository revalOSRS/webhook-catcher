/**
 * Migration: Rename all table columns from snake_case to camelCase
 * Created: 2025-11-29
 * 
 * This migration:
 * 1. Identifies all tables and their columns
 * 2. Renames columns from snake_case to camelCase
 * 3. Updates all indexes, constraints, foreign keys, triggers, etc.
 * 4. Ensures no data is lost
 * 
 * WARNING: This is a massive migration that affects the entire database schema.
 * Make sure to backup your database before running this migration.
 */

const { query } = require('../index');

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str) {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Get all tables in the database
 */
async function getAllTables() {
	const result = await query(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_type = 'BASE TABLE'
			AND table_name NOT LIKE 'pg_%'
			AND table_name NOT LIKE '_%'
		ORDER BY table_name
	`);
	return result.map(row => row.table_name);
}

/**
 * Get all columns for a table
 */
async function getTableColumns(tableName) {
	const result = await query(`
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = $1
		ORDER BY ordinal_position
	`, [tableName]);
	return result;
}

/**
 * Get all foreign keys for a table (for dependency ordering)
 */
async function getForeignKeys(tableName) {
	const result = await query(`
		SELECT DISTINCT
			ccu.table_name AS foreign_table_name
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage AS ccu
			ON ccu.constraint_name = tc.constraint_name
			AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
			AND tc.table_name = $1
	`, [tableName]);
	return result.map(row => row.foreign_table_name);
}

/**
 * Rename column in a table
 */
async function renameColumn(tableName, oldName, newName) {
	console.log(`    Renaming ${tableName}.${oldName} -> ${newName}`);
	await query(`
		ALTER TABLE ${tableName}
		RENAME COLUMN ${oldName} TO ${newName}
	`);
}


/**
 * Get table processing order (tables with no foreign keys first)
 */
async function getTableProcessingOrder() {
	const tables = await getAllTables();
	const tableOrder = [];
	const processed = new Set();
	
	// Function to check if a table can be processed (all its referenced tables are processed)
	const canProcess = async (tableName) => {
		const referencedTables = await getForeignKeys(tableName);
		for (const refTable of referencedTables) {
			if (!processed.has(refTable)) {
				return false;
			}
		}
		return true;
	};
	
	// Process tables in rounds
	let remaining = [...tables];
	let round = 0;
	
	while (remaining.length > 0) {
		round++;
		const toProcess = [];
		
		for (const tableName of remaining) {
			if (await canProcess(tableName)) {
				toProcess.push(tableName);
			}
		}
		
		if (toProcess.length === 0) {
			// Circular dependency or error - process remaining tables anyway
			console.log(`⚠️  Warning: Circular dependency detected, processing remaining ${remaining.length} tables`);
			toProcess.push(...remaining);
		}
		
		for (const tableName of toProcess) {
			tableOrder.push(tableName);
			processed.add(tableName);
			remaining = remaining.filter(t => t !== tableName);
		}
	}
	
	return tableOrder;
}

/**
 * Apply migration
 */
async function up() {
	console.log('Running migration: 050_rename_all_columns_to_camelcase');
	console.log('⚠️  WARNING: This is a massive migration. Ensure you have a database backup!');
	
	const tables = await getTableProcessingOrder();
	console.log(`Found ${tables.length} tables to process`);
	
	// Process each table in dependency order
	for (const tableName of tables) {
		console.log(`\nProcessing table: ${tableName}`);
		
		const columns = await getTableColumns(tableName);
		const columnMappings = {};
		
		// Build column mappings (snake_case -> camelCase)
		for (const column of columns) {
			const oldName = column.column_name;
			const newName = snakeToCamel(oldName);
			
			// Only rename if different
			if (oldName !== newName) {
				columnMappings[oldName] = newName;
			}
		}
		
		if (Object.keys(columnMappings).length === 0) {
			console.log(`  No columns to rename in ${tableName}`);
			continue;
		}
		
		console.log(`  Found ${Object.keys(columnMappings).length} columns to rename`);
		
		// Rename columns
		// Note: PostgreSQL automatically updates indexes, foreign keys, and constraints
		// when columns are renamed, so we don't need to manually update them.
		for (const [oldName, newName] of Object.entries(columnMappings)) {
			await renameColumn(tableName, oldName, newName);
		}
		
		console.log(`  ✅ Completed ${tableName}`);
	}
	
	console.log('\n✅ Migration completed successfully');
	console.log('⚠️  IMPORTANT: Update your application code to use camelCase column names!');
}

/**
 * Rollback migration (rename back to snake_case)
 */
async function down() {
	console.log('Rolling back migration: 050_rename_all_columns_to_camelcase');
	console.log('⚠️  WARNING: This will rename all columns back to snake_case');
	
	const tables = await getAllTables();
	console.log(`Found ${tables.length} tables to process`);
	
	// Process each table in reverse
	for (const tableName of tables) {
		console.log(`\nProcessing table: ${tableName}`);
		
		const columns = await getTableColumns(tableName);
		const columnMappings = {};
		
		// Build reverse mappings (camelCase -> snake_case)
		for (const column of columns) {
			const camelName = column.column_name;
			// Convert camelCase back to snake_case
			const snakeName = camelName.replace(/([A-Z])/g, '_$1').toLowerCase();
			
			// Only rename if different and looks like it was converted from snake_case
			if (camelName !== snakeName && camelName.match(/[a-z][A-Z]/)) {
				columnMappings[camelName] = snakeName;
			}
		}
		
		if (Object.keys(columnMappings).length === 0) {
			console.log(`  No columns to rename back in ${tableName}`);
			continue;
		}
		
		console.log(`  Found ${Object.keys(columnMappings).length} columns to rename back`);
		
		// Rename columns back
		// Note: PostgreSQL automatically updates indexes, foreign keys, and constraints
		// when columns are renamed back.
		for (const [camelName, snakeName] of Object.entries(columnMappings)) {
			await renameColumn(tableName, camelName, snakeName);
		}
		
		console.log(`  ✅ Completed ${tableName}`);
	}
	
	console.log('\n✅ Rollback completed successfully');
}

module.exports = { up, down };

