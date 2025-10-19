import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

/**
 * Execute a parameterized query
 * @param query SQL query with $1, $2, etc. placeholders
 * @param params Array of parameter values
 */
export async function query<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await sql(query as any, params)
    return result as T[]
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

/**
 * Execute a query and return the first row
 */
export async function queryOne<T = any>(query: string, params: any[] = []): Promise<T | null> {
  const result = await sql(query as any, params)
  return result.length > 0 ? (result[0] as T) : null
}

