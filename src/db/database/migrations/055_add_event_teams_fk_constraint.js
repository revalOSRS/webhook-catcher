/**
 * Migration: Add foreign key constraint on event_teams.event_id
 * Created: 2025-11-30
 * 
 * Ensures event_id references events(id) with ON DELETE CASCADE
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 055_add_event_teams_fk_constraint');
  
  // Drop existing constraint if it exists (might have wrong config)
  console.log('  - Dropping existing FK constraint if present...');
  await query(`
    ALTER TABLE event_teams 
    DROP CONSTRAINT IF EXISTS event_teams_event_id_fkey
  `);
  
  // Add the proper FK constraint with CASCADE
  console.log('  - Adding FK constraint with CASCADE...');
  await query(`
    ALTER TABLE event_teams 
    ADD CONSTRAINT event_teams_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 055_add_event_teams_fk_constraint');
  
  // Drop the constraint
  console.log('  - Dropping FK constraint...');
  await query(`
    ALTER TABLE event_teams 
    DROP CONSTRAINT IF EXISTS event_teams_event_id_fkey
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

