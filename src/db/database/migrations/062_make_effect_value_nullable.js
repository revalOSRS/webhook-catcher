/**
 * Migration: Make effect_value nullable
 * Created: 2025-12-01
 * 
 * The effects system now uses 'config' JSONB instead of 'effect_value'.
 * This migration makes effect_value nullable and sets a default value.
 */

const { query } = require('../index');

async function up() {
  console.log('Running migration: 062_make_effect_value_nullable');

  // Drop NOT NULL constraint from effect_value and set default
  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ALTER COLUMN effect_value DROP NOT NULL
  `);

  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ALTER COLUMN effect_value SET DEFAULT 0
  `);

  console.log('  ✅ effect_value is now nullable with default 0');
}

async function down() {
  console.log('Rolling back migration: 062_make_effect_value_nullable');

  // Update any NULL values before adding NOT NULL constraint back
  await query(`
    UPDATE bingo_buffs_debuffs
    SET effect_value = COALESCE((config->>'points')::numeric, (config->>'multiplier')::numeric, (config->>'charges')::numeric, 0)
    WHERE effect_value IS NULL
  `);

  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ALTER COLUMN effect_value SET NOT NULL
  `);

  console.log('  ✅ effect_value NOT NULL constraint restored');
}

module.exports = { up, down };

