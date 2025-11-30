/**
 * Migration: Make start_date and end_date required in events table
 * Created: 2025-11-30
 * 
 * Changes start_date and end_date columns from nullable to NOT NULL
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 054_make_event_dates_required');
  
  // First, update any existing NULL values to a default (current timestamp for start, +30 days for end)
  console.log('  - Updating NULL start_date values...');
  await query(`
    UPDATE events 
    SET start_date = CURRENT_TIMESTAMP 
    WHERE start_date IS NULL
  `);
  
  console.log('  - Updating NULL end_date values...');
  await query(`
    UPDATE events 
    SET end_date = CURRENT_TIMESTAMP + INTERVAL '30 days' 
    WHERE end_date IS NULL
  `);
  
  // Now alter columns to NOT NULL
  console.log('  - Altering start_date to NOT NULL...');
  await query(`
    ALTER TABLE events 
    ALTER COLUMN start_date SET NOT NULL
  `);
  
  console.log('  - Altering end_date to NOT NULL...');
  await query(`
    ALTER TABLE events 
    ALTER COLUMN end_date SET NOT NULL
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 054_make_event_dates_required');
  
  // Remove NOT NULL constraints
  console.log('  - Allowing NULL for start_date...');
  await query(`
    ALTER TABLE events 
    ALTER COLUMN start_date DROP NOT NULL
  `);
  
  console.log('  - Allowing NULL for end_date...');
  await query(`
    ALTER TABLE events 
    ALTER COLUMN end_date DROP NOT NULL
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

