const { query } = require('../index');

/**
 * Migration: Remove donation categories system
 * - Removes category_id column from donations table
 * - Drops donation_categories table entirely
 */
async function up() {
  console.log('🔄 Removing donation categories system...')

  // Drop foreign key constraint if it exists
  try {
    await query(`
      ALTER TABLE donations
      DROP CONSTRAINT IF EXISTS donations_category_id_fkey
    `)
    console.log('✅ Dropped foreign key constraint')
  } catch (error) {
    console.log('ℹ️  Foreign key constraint not found or already dropped')
  }

  // Drop category_id column from donations table
  try {
    await query(`
      ALTER TABLE donations
      DROP COLUMN IF EXISTS category_id
    `)
    console.log('✅ Dropped category_id column from donations table')
  } catch (error) {
    console.log('ℹ️  category_id column not found or already dropped')
  }

  // Drop indexes related to category_id
  try {
    await query(`DROP INDEX IF EXISTS idx_donations_category_id`)
    console.log('✅ Dropped category_id index')
  } catch (error) {
    console.log('ℹ️  category_id index not found or already dropped')
  }

  // Drop donation_categories table
  try {
    await query(`DROP TABLE IF EXISTS donation_categories`)
    console.log('✅ Dropped donation_categories table')
  } catch (error) {
    console.log('ℹ️  donation_categories table not found or already dropped')
  }

  console.log('✅ Donation categories system removal completed')
}

/**
 * Migration: Restore donation categories system
 * Note: This is a destructive migration that cannot be fully reversed
 * The category_id data will be lost
 */
async function down() {
  console.log('⚠️  Warning: This migration is destructive and cannot be fully reversed')
  console.log('⚠️  Category data has been permanently removed')

  // Recreate donation_categories table
  await query(`
    CREATE TABLE IF NOT EXISTS donation_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Recreate indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_donation_categories_is_active ON donation_categories(is_active)`)

  // Add category_id column back to donations (without data)
  await query(`
    ALTER TABLE donations
    ADD COLUMN category_id INTEGER DEFAULT 1
  `)

  // Create foreign key constraint
  await query(`
    ALTER TABLE donations
    ADD CONSTRAINT donations_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES donation_categories(id)
  `)

  // Create index for category_id
  await query(`CREATE INDEX IF NOT EXISTS idx_donations_category_id ON donations(category_id)`)

  console.log('✅ Donation categories system partially restored (without data)')
}

module.exports = {
  up,
  down
}

