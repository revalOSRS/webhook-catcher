import { Pool } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
/**
 * Convert a snake_case string to camelCase
 */
const toCamelCase = (str) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
/**
 * Recursively convert all keys in an object from snake_case to camelCase
 * Handles nested objects and arrays, preserves Date objects
 */
const convertKeysToCamelCase = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamelCase(item));
    }
    if (obj instanceof Date) {
        return obj;
    }
    if (typeof obj === 'object') {
        const converted = {};
        for (const key of Object.keys(obj)) {
            const camelKey = toCamelCase(key);
            converted[camelKey] = convertKeysToCamelCase(obj[key]);
        }
        return converted;
    }
    return obj;
};
/**
 * Execute a parameterized query
 * Automatically converts snake_case column names to camelCase
 * @param queryText SQL query with $1, $2, etc. placeholders
 * @param params Array of parameter values
 */
export async function query(queryText, params = []) {
    try {
        const result = await pool.query(queryText, params);
        return result.rows.map(row => convertKeysToCamelCase(row));
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
/**
 * Execute a query and return the first row
 * Automatically converts snake_case column names to camelCase
 */
export async function queryOne(queryText, params = []) {
    try {
        const result = await pool.query(queryText, params);
        return result.rows.length > 0 ? convertKeysToCamelCase(result.rows[0]) : null;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
/**
 * Execute a raw query without snake_case to camelCase conversion
 * Use this when you need the raw database column names
 * @param queryText SQL query with $1, $2, etc. placeholders
 * @param params Array of parameter values
 */
export async function queryRaw(queryText, params = []) {
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
 * Execute a raw query and return the first row without conversion
 */
export async function queryOneRaw(queryText, params = []) {
    try {
        const result = await pool.query(queryText, params);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
export { pool, toCamelCase, convertKeysToCamelCase };
