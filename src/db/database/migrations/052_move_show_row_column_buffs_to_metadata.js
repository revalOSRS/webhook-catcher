/**
 * Migration: Move show_row_column_buffs to metadata
 * Created: 2025-11-29
 * 
 * Moves show_row_column_buffs column from bingo_boards table to metadata JSONB field
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 052_move_show_row_column_buffs_to_metadata');
  
  // First, migrate existing data: copy show_row_column_buffs value to metadata
  console.log('  - Migrating existing show_row_column_buffs values to metadata...');
  await query(`
    UPDATE bingo_boards
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{showRowColumnBuffs}',
      to_jsonb(show_row_column_buffs)
    )
    WHERE metadata->>'showRowColumnBuffs' IS NULL
  `);
  
  // Drop the column
  console.log('  - Dropping show_row_column_buffs column...');
  await query(`
    ALTER TABLE bingo_boards
    DROP COLUMN IF EXISTS show_row_column_buffs
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 052_move_show_row_column_buffs_to_metadata');
  
  // Re-add the column
  console.log('  - Re-adding show_row_column_buffs column...');
  await query(`
    ALTER TABLE bingo_boards
    ADD COLUMN IF NOT EXISTS show_row_column_buffs BOOLEAN DEFAULT false
  `);
  
  // Migrate data back from metadata
  console.log('  - Migrating showRowColumnBuffs from metadata back to column...');
  await query(`
    UPDATE bingo_boards
    SET show_row_column_buffs = COALESCE(
      (metadata->>'showRowColumnBuffs')::boolean,
      false
    )
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

