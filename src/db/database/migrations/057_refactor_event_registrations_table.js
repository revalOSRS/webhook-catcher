/**
 * Migration: Refactor event_registrations table
 * Created: 2025-11-30
 * 
 * - Removes registered_at and registered_by columns
 * - Adds created_at and updated_at columns
 * - Makes osrs_account_id NOT NULL with CASCADE delete
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 057_refactor_event_registrations_table');
  
  // Remove registered_at column
  console.log('  - Removing registered_at column...');
  await query(`
    ALTER TABLE event_registrations 
    DROP COLUMN IF EXISTS registered_at
  `);
  
  // Remove registered_by column
  console.log('  - Removing registered_by column...');
  await query(`
    ALTER TABLE event_registrations 
    DROP COLUMN IF EXISTS registered_by
  `);
  
  // Add created_at if not exists
  console.log('  - Adding created_at column...');
  await query(`
    ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  
  // Add updated_at if not exists
  console.log('  - Adding updated_at column...');
  await query(`
    ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  
  // Delete rows with NULL osrs_account_id
  console.log('  - Removing registrations with NULL osrs_account_id...');
  await query(`
    DELETE FROM event_registrations 
    WHERE osrs_account_id IS NULL
  `);
  
  // Drop existing FK constraint for osrs_account_id
  console.log('  - Dropping existing FK constraint for osrs_account_id...');
  await query(`
    ALTER TABLE event_registrations 
    DROP CONSTRAINT IF EXISTS event_registrations_osrs_account_id_fkey
  `);
  
  // Make osrs_account_id NOT NULL
  console.log('  - Setting osrs_account_id to NOT NULL...');
  await query(`
    ALTER TABLE event_registrations 
    ALTER COLUMN osrs_account_id SET NOT NULL
  `);
  
  // Add FK constraint with CASCADE
  console.log('  - Adding FK constraint with CASCADE...');
  await query(`
    ALTER TABLE event_registrations 
    ADD CONSTRAINT event_registrations_osrs_account_id_fkey 
    FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE
  `);
  
  // Add index on osrs_account_id
  console.log('  - Adding index on osrs_account_id...');
  await query(`
    CREATE INDEX IF NOT EXISTS idx_event_registrations_osrs_account_id 
    ON event_registrations(osrs_account_id)
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 057_refactor_event_registrations_table');
  
  // Drop osrs_account_id index
  console.log('  - Dropping osrs_account_id index...');
  await query(`
    DROP INDEX IF EXISTS idx_event_registrations_osrs_account_id
  `);
  
  // Drop FK constraint
  console.log('  - Dropping FK constraint...');
  await query(`
    ALTER TABLE event_registrations 
    DROP CONSTRAINT IF EXISTS event_registrations_osrs_account_id_fkey
  `);
  
  // Make osrs_account_id nullable again
  console.log('  - Allowing NULL for osrs_account_id...');
  await query(`
    ALTER TABLE event_registrations 
    ALTER COLUMN osrs_account_id DROP NOT NULL
  `);
  
  // Add FK constraint with SET NULL
  console.log('  - Adding FK constraint with SET NULL...');
  await query(`
    ALTER TABLE event_registrations 
    ADD CONSTRAINT event_registrations_osrs_account_id_fkey 
    FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE SET NULL
  `);
  
  // Re-add registered_at column
  console.log('  - Re-adding registered_at column...');
  await query(`
    ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  
  // Re-add registered_by column
  console.log('  - Re-adding registered_by column...');
  await query(`
    ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS registered_by VARCHAR(255)
  `);
  
  // Remove created_at and updated_at columns
  console.log('  - Removing created_at column...');
  await query(`
    ALTER TABLE event_registrations 
    DROP COLUMN IF EXISTS created_at
  `);
  
  console.log('  - Removing updated_at column...');
  await query(`
    ALTER TABLE event_registrations 
    DROP COLUMN IF EXISTS updated_at
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

