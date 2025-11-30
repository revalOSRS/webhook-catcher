/**
 * Migration: Remove name and description from bingo_boards
 * 
 * The bingo_boards table had name and description columns that are no longer used.
 * Board configuration is now derived from the event's config.board settings.
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 059_remove_name_description_from_bingo_boards');

  // Check if columns exist before dropping
  const columnsExist = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'bingo_boards' 
    AND column_name IN ('name', 'description')
  `);

  const existingColumns = columnsExist.map(c => c.column_name);

  if (existingColumns.includes('name')) {
    await query('ALTER TABLE bingo_boards DROP COLUMN IF EXISTS name');
    console.log('  ✓ Dropped name column');
  } else {
    console.log('  - name column does not exist, skipping');
  }

  if (existingColumns.includes('description')) {
    await query('ALTER TABLE bingo_boards DROP COLUMN IF EXISTS description');
    console.log('  ✓ Dropped description column');
  } else {
    console.log('  - description column does not exist, skipping');
  }

  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 059_remove_name_description_from_bingo_boards');

  // Add columns back
  await query(`
    ALTER TABLE bingo_boards 
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS description TEXT
  `);

  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };
