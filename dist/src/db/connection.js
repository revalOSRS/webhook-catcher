import { Pool } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
/**
 * Execute a parameterized query
 * @param queryText SQL query with $1, $2, etc. placeholders
 * @param params Array of parameter values
 */
export async function query(queryText, params = []) {
    try {
        const result = await pool.query(queryText, params);
        return result.rows;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
/**
 * Execute a query and return the first row
 */
export async function queryOne(queryText, params = []) {
    try {
        const result = await pool.query(queryText, params);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
export { pool };
