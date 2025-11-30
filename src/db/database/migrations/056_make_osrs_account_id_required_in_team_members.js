/**
 * Migration: Make osrs_account_id required in event_team_members
 * Created: 2025-11-30
 * 
 * Changes osrs_account_id from nullable to NOT NULL and updates FK to CASCADE
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 056_make_osrs_account_id_required_in_team_members');
  
  // First, delete any rows with NULL osrs_account_id (they're invalid now)
  console.log('  - Removing members with NULL osrs_account_id...');
  await query(`
    DELETE FROM event_team_members 
    WHERE osrs_account_id IS NULL
  `);
  
  // Drop existing FK constraint
  console.log('  - Dropping existing FK constraint...');
  await query(`
    ALTER TABLE event_team_members 
    DROP CONSTRAINT IF EXISTS event_team_members_osrs_account_id_fkey
  `);
  
  // Make column NOT NULL
  console.log('  - Setting osrs_account_id to NOT NULL...');
  await query(`
    ALTER TABLE event_team_members 
    ALTER COLUMN osrs_account_id SET NOT NULL
  `);
  
  // Add FK constraint with CASCADE (can't SET NULL if column is NOT NULL)
  console.log('  - Adding FK constraint with CASCADE...');
  await query(`
    ALTER TABLE event_team_members 
    ADD CONSTRAINT event_team_members_osrs_account_id_fkey 
    FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 056_make_osrs_account_id_required_in_team_members');
  
  // Drop existing FK constraint
  console.log('  - Dropping FK constraint...');
  await query(`
    ALTER TABLE event_team_members 
    DROP CONSTRAINT IF EXISTS event_team_members_osrs_account_id_fkey
  `);
  
  // Make column nullable again
  console.log('  - Allowing NULL for osrs_account_id...');
  await query(`
    ALTER TABLE event_team_members 
    ALTER COLUMN osrs_account_id DROP NOT NULL
  `);
  
  // Add FK constraint with SET NULL
  console.log('  - Adding FK constraint with SET NULL...');
  await query(`
    ALTER TABLE event_team_members 
    ADD CONSTRAINT event_team_members_osrs_account_id_fkey 
    FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE SET NULL
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

