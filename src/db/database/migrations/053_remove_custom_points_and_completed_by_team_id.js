/**
 * Migration: Remove custom_points and completed_by_team_id from bingo_board_tiles
 * Created: 2025-11-29
 * 
 * Removes custom_points and completed_by_team_id columns from bingo_board_tiles table
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
  console.log('Running migration: 053_remove_custom_points_and_completed_by_team_id');
  
  // Drop index for completed_by_team_id if it exists
  console.log('  - Dropping index for completed_by_team_id...');
  await query(`
    DROP INDEX IF EXISTS idx_bingo_board_tiles_team
  `);
  
  // Drop the columns
  console.log('  - Dropping custom_points column...');
  await query(`
    ALTER TABLE bingo_board_tiles
    DROP COLUMN IF EXISTS custom_points
  `);
  
  console.log('  - Dropping completed_by_team_id column...');
  await query(`
    ALTER TABLE bingo_board_tiles
    DROP COLUMN IF EXISTS completed_by_team_id
  `);
  
  console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: 053_remove_custom_points_and_completed_by_team_id');
  
  // Re-add the columns
  console.log('  - Re-adding custom_points column...');
  await query(`
    ALTER TABLE bingo_board_tiles
    ADD COLUMN IF NOT EXISTS custom_points INTEGER
  `);
  
  console.log('  - Re-adding completed_by_team_id column...');
  await query(`
    ALTER TABLE bingo_board_tiles
    ADD COLUMN IF NOT EXISTS completed_by_team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL
  `);
  
  // Re-create index
  console.log('  - Re-creating index for completed_by_team_id...');
  await query(`
    CREATE INDEX IF NOT EXISTS idx_bingo_board_tiles_team ON bingo_board_tiles(completed_by_team_id)
  `);
  
  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

