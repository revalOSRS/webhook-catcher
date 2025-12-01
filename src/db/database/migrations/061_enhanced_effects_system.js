/**
 * Migration: Enhanced Effects System
 * Created: 2025-12-01
 * 
 * Enhances the bingo effects system with:
 * - Extended bingo_buffs_debuffs columns for new effect types
 * - team_earned_effects table for effects teams have earned
 * - effect_activation_log for audit trail
 * - line_completions table to track completed rows/columns
 */

const { query } = require('../index');

async function up() {
  console.log('Running migration: 061_enhanced_effects_system');

  // =========================================================================
  // 1. Extend bingo_buffs_debuffs table with new columns
  // =========================================================================
  console.log('  - Extending bingo_buffs_debuffs table...');

  // Add category column (for UI grouping)
  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'points'
  `);

  // Add target column (self, enemy, all)
  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ADD COLUMN IF NOT EXISTS target VARCHAR(20) DEFAULT 'self'
  `);

  // Add trigger column (immediate, manual, reactive)
  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ADD COLUMN IF NOT EXISTS trigger VARCHAR(20) DEFAULT 'manual'
  `);

  // Add config column (typed JSONB based on effect_type)
  // This replaces effect_value and metadata with a structured config
  await query(`
    ALTER TABLE bingo_buffs_debuffs
    ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'
  `);

  // Create indexes for new columns
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_category ON bingo_buffs_debuffs(category)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_target ON bingo_buffs_debuffs(target)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_trigger ON bingo_buffs_debuffs(trigger)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_buffs_debuffs_config ON bingo_buffs_debuffs USING gin(config)`);

  // =========================================================================
  // 2. Create bingo_team_earned_effects table
  // =========================================================================
  console.log('  - Creating bingo_team_earned_effects table...');

  await query(`
    CREATE TABLE IF NOT EXISTS bingo_team_earned_effects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
      source VARCHAR(50) NOT NULL,
      source_identifier VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP,
      used_on_team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL,
      expires_at TIMESTAMP,
      remaining_uses INTEGER DEFAULT 1,
      metadata JSONB DEFAULT '{}',
      CONSTRAINT chk_bingo_effect_source CHECK (source IN ('row_completion', 'column_completion', 'tile_completion', 'admin', 'reflected')),
      CONSTRAINT chk_bingo_effect_status CHECK (status IN ('available', 'used', 'expired', 'negated'))
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_team_earned_effects_team_id ON bingo_team_earned_effects(team_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_team_earned_effects_event_id ON bingo_team_earned_effects(event_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_team_earned_effects_status ON bingo_team_earned_effects(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_team_earned_effects_buff_debuff ON bingo_team_earned_effects(buff_debuff_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_team_earned_effects_expires_at ON bingo_team_earned_effects(expires_at) WHERE expires_at IS NOT NULL`);

  // =========================================================================
  // 3. Create bingo_effect_activation_log table
  // =========================================================================
  console.log('  - Creating bingo_effect_activation_log table...');

  await query(`
    CREATE TABLE IF NOT EXISTS bingo_effect_activation_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      source_team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
      target_team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL,
      buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id) ON DELETE CASCADE,
      earned_effect_id UUID REFERENCES bingo_team_earned_effects(id) ON DELETE SET NULL,
      action VARCHAR(30) NOT NULL,
      success BOOLEAN NOT NULL DEFAULT true,
      blocked_by_effect_id UUID REFERENCES bingo_team_earned_effects(id) ON DELETE SET NULL,
      result JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_bingo_effect_action CHECK (action IN ('earned', 'activated', 'auto_triggered', 'reflected', 'blocked', 'expired', 'removed'))
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_effect_activation_log_event_id ON bingo_effect_activation_log(event_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_effect_activation_log_source_team ON bingo_effect_activation_log(source_team_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_effect_activation_log_target_team ON bingo_effect_activation_log(target_team_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_effect_activation_log_timestamp ON bingo_effect_activation_log(timestamp)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_effect_activation_log_action ON bingo_effect_activation_log(action)`);

  // =========================================================================
  // 4. Create bingo_line_completions table
  // =========================================================================
  console.log('  - Creating bingo_line_completions table...');

  await query(`
    CREATE TABLE IF NOT EXISTS bingo_line_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
      team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      line_type VARCHAR(10) NOT NULL,
      line_identifier VARCHAR(10) NOT NULL,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      tile_ids UUID[] NOT NULL,
      tile_points INTEGER DEFAULT 0,
      effects_granted BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      CONSTRAINT chk_bingo_line_type CHECK (line_type IN ('row', 'column')),
      CONSTRAINT unique_bingo_board_line UNIQUE (board_id, line_type, line_identifier)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_line_completions_board_id ON bingo_line_completions(board_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_line_completions_team_id ON bingo_line_completions(team_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_line_completions_event_id ON bingo_line_completions(event_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bingo_line_completions_effects_granted ON bingo_line_completions(effects_granted) WHERE effects_granted = false`);

  // =========================================================================
  // 5. Migrate existing buffs to new structure
  // =========================================================================
  console.log('  - Migrating existing buffs to new config structure...');

  // Update category, target, trigger based on effect_type
  await query(`
    UPDATE bingo_buffs_debuffs
    SET 
      category = CASE 
        WHEN effect_type IN ('point_bonus', 'point_multiplier', 'line_completion_bonus') THEN 'points'
        WHEN effect_type IN ('tile_swap_self', 'tile_auto_complete', 'tile_progress_copy') THEN 'board_manipulation'
        WHEN effect_type IN ('tile_swap_enemy', 'tile_lock', 'tile_progress_reset', 'progress_steal') THEN 'offense'
        WHEN effect_type IN ('shield', 'uno_reverse', 'effect_immunity', 'effect_negate') THEN 'defense'
        ELSE 'points'
      END,
      target = CASE 
        WHEN effect_type IN ('tile_swap_enemy', 'tile_lock', 'tile_progress_reset', 'progress_steal', 'reveal_progress') THEN 'enemy'
        ELSE 'self'
      END,
      trigger = CASE 
        WHEN effect_type = 'point_bonus' THEN 'immediate'
        WHEN effect_type IN ('shield', 'uno_reverse') THEN 'reactive'
        ELSE 'manual'
      END
    WHERE category IS NULL OR category = 'points'
  `);

  // Migrate effect_value into config JSONB
  // Build config based on effect_type
  await query(`
    UPDATE bingo_buffs_debuffs
    SET config = CASE effect_type
      WHEN 'point_bonus' THEN jsonb_build_object('type', effect_type, 'points', effect_value)
      WHEN 'point_multiplier' THEN jsonb_build_object('type', effect_type, 'multiplier', effect_value, 'completionsAffected', COALESCE((metadata->>'completionsAffected')::int, 1))
      WHEN 'line_completion_bonus' THEN jsonb_build_object('type', effect_type, 'bonusPerLine', effect_value)
      WHEN 'tile_swap_self' THEN jsonb_build_object('type', effect_type, 'tilesCount', COALESCE(effect_value, 2))
      WHEN 'tile_swap_enemy' THEN jsonb_build_object('type', effect_type, 'tilesCount', COALESCE(effect_value, 2))
      WHEN 'tile_auto_complete' THEN jsonb_build_object('type', effect_type, 'tilesCount', COALESCE(effect_value, 1))
      WHEN 'tile_lock' THEN jsonb_build_object('type', effect_type, 'durationSeconds', COALESCE(effect_value, 3600))
      WHEN 'shield' THEN jsonb_build_object('type', effect_type, 'charges', COALESCE(effect_value, 1))
      WHEN 'uno_reverse' THEN jsonb_build_object('type', effect_type, 'charges', COALESCE(effect_value, 1))
      WHEN 'effect_immunity' THEN jsonb_build_object('type', effect_type, 'durationSeconds', COALESCE(effect_value, 3600))
      WHEN 'reveal_progress' THEN jsonb_build_object('type', effect_type, 'durationSeconds', COALESCE(effect_value, 300))
      ELSE jsonb_build_object('type', COALESCE(effect_type, 'point_bonus'), 'points', COALESCE(effect_value, 0))
    END
    WHERE config = '{}'::jsonb OR config IS NULL
  `);

  console.log('  ✅ Migration completed successfully');
}

async function down() {
  console.log('Rolling back migration: 061_enhanced_effects_system');

  // Drop tables in reverse order
  await query(`DROP TABLE IF EXISTS bingo_line_completions CASCADE`);
  await query(`DROP TABLE IF EXISTS bingo_effect_activation_log CASCADE`);
  await query(`DROP TABLE IF EXISTS bingo_team_earned_effects CASCADE`);

  // Remove added columns from bingo_buffs_debuffs
  await query(`ALTER TABLE bingo_buffs_debuffs DROP COLUMN IF EXISTS category`);
  await query(`ALTER TABLE bingo_buffs_debuffs DROP COLUMN IF EXISTS target`);
  await query(`ALTER TABLE bingo_buffs_debuffs DROP COLUMN IF EXISTS trigger`);
  await query(`ALTER TABLE bingo_buffs_debuffs DROP COLUMN IF EXISTS config`);

  console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };

                        