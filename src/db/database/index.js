/**
 * Neon Postgres Database Connection
 * Handles serverless database connection and queries
 */

// Load environment variables
require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

/**
 * Neon SQL client
 */
let sql = null;

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
	if (sql) {
		return;
	}

	try {
		const databaseUrl = process.env.NEON_DATABASE_URL;
		
		if (!databaseUrl) {
			throw new Error('NEON_DATABASE_URL environment variable is not set');
		}

		sql = neon(databaseUrl);
		
		// Test the connection
		await sql`SELECT NOW()`;
		
		console.log('✅ Database connected successfully');
		console.log('   Provider: Neon Postgres (Serverless)');
		
	} catch (error) {
		console.error('❌ Database connection failed:', error.message);
		throw error;
	}
}

/**
 * Get SQL client
 * @returns {Function} SQL client
 */
function getSql() {
	if (!sql) {
		throw new Error('Database not initialized. Call initializeDatabase() first.');
	}
	return sql;
}

/**
 * Execute a raw SQL query with parameters
 * Note: Neon uses tagged template literals for queries
 * @param {string} queryString - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(queryString, params = []) {
	if (!sql) {
		throw new Error('Database not initialized. Call initializeDatabase() first.');
	}
	
	// Convert positional parameters to Postgres format ($1, $2, etc.)
	let pgQuery = queryString.replace(/\?/g, () => {
		const index = (queryString.match(/\$/g) || []).length + 1;
		return `$${index}`;
	});
	
	// For Neon, we need to use the sql function with parameters
	// Build the query dynamically
	if (params.length === 0) {
		return await sql([pgQuery]);
	}
	
	// Convert to Postgres parameter format
	let paramIndex = 1;
	pgQuery = queryString.replace(/\?/g, () => `$${paramIndex++}`);
	
	// Execute query with parameters
	const result = await sql(pgQuery, params);
	return result;
}

/**
 * Execute a query and return the first result
 * @param {string} queryString - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @returns {Promise<Object|null>} First result or null
 */
async function queryOne(queryString, params = []) {
	const results = await query(queryString, params);
	return results.length > 0 ? results[0] : null;
}

/**
 * Close database connection
 * Note: Neon serverless doesn't require explicit connection closing
 * @returns {Promise<void>}
 */
async function closeDatabase() {
	if (sql) {
		sql = null;
		console.log('✅ Database connection closed');
	}
}

module.exports = {
	initializeDatabase,
	getSql,
	query,
	queryOne,
	closeDatabase
};

