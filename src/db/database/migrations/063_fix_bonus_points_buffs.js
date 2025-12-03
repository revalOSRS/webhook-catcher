/**
 * Migration: Update bonus points buffs to new values
 * 
 * New bonus point values needed: 3, 4, 5, 6, 10, 12, 15
 * 
 * Changes:
 * - point-bonus-10 → bonus-points-10 (rename for consistency)
 * - bonus-points-8 → bonus-points-3 (change value from 8 to 3)
 * - bonus-points-18 → bonus-points-4 (change value from 18 to 4)
 * - bonus-points-25 → bonus-points-5 (change value from 25 to 5)
 * - bonus-points-6 → keep as is
 * - bonus-points-12 → keep, fix description
 * - bonus-points-15 → keep as is
 * 
 * Strategy: INSERT new buff → UPDATE references → DELETE old buff
 * (to avoid FK constraint issues when changing primary keys)
 */

const { query } = require('../index');

async function up() {
    console.log('Updating bonus points buffs...');

    // ============================================
    // 1. Rename point-bonus-10 → bonus-points-10
    // ============================================
    
    // Insert new buff (copy from old)
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-10', 'Completion bonus: 10', 'Awards the team 10 extra points', type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config
        FROM bingo_buffs_debuffs WHERE id = 'point-bonus-10'
        ON CONFLICT (id) DO NOTHING
    `);
    // Update references to new ID
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-10' WHERE buff_debuff_id = 'point-bonus-10'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-10' WHERE buff_debuff_id = 'point-bonus-10'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"point-bonus-10"', '"bonus-points-10"')::jsonb WHERE config::text LIKE '%point-bonus-10%'`);
    // Delete old buff
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'point-bonus-10'`);
    console.log('Renamed point-bonus-10 → bonus-points-10');

    // ============================================
    // 2. Change bonus-points-8 → bonus-points-3
    // ============================================
    
    // Insert new buff with updated values
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-3', 'Completion bonus: 3', 'Awards the team 3 extra points', type, effect_type, 3.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 3}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-8'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-3' WHERE buff_debuff_id = 'bonus-points-8'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-3' WHERE buff_debuff_id = 'bonus-points-8'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-8"', '"bonus-points-3"')::jsonb WHERE config::text LIKE '%bonus-points-8%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-8'`);
    console.log('Changed bonus-points-8 → bonus-points-3');

    // ============================================
    // 3. Change bonus-points-18 → bonus-points-4
    // ============================================
    
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-4', 'Completion bonus: 4', 'Awards the team 4 extra points', type, effect_type, 4.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 4}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-18'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-4' WHERE buff_debuff_id = 'bonus-points-18'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-4' WHERE buff_debuff_id = 'bonus-points-18'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-18"', '"bonus-points-4"')::jsonb WHERE config::text LIKE '%bonus-points-18%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-18'`);
    console.log('Changed bonus-points-18 → bonus-points-4');

    // ============================================
    // 4. Change bonus-points-25 → bonus-points-5
    // ============================================
    
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-5', 'Completion bonus: 5', 'Awards the team 5 extra points', type, effect_type, 5.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 5}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-25'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-5' WHERE buff_debuff_id = 'bonus-points-25'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-5' WHERE buff_debuff_id = 'bonus-points-25'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-25"', '"bonus-points-5"')::jsonb WHERE config::text LIKE '%bonus-points-25%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-25'`);
    console.log('Changed bonus-points-25 → bonus-points-5');

    // ============================================
    // 5. Fix description for bonus-points-12
    // ============================================
    await query(`
        UPDATE bingo_buffs_debuffs
        SET 
            description = 'Awards the team 12 extra points',
            updated_at = NOW()
        WHERE id = 'bonus-points-12'
    `);
    console.log('Fixed description for bonus-points-12');

    console.log('Bonus points buffs updated successfully!');
    console.log('Final set: bonus-points-3, bonus-points-4, bonus-points-5, bonus-points-6, bonus-points-10, bonus-points-12, bonus-points-15');
}

async function down() {
    console.log('Reverting bonus points buff changes...');

    // Revert bonus-points-5 → bonus-points-25
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-25', 'Completion bonus: 25', 'Awards the team 25 extra points', type, effect_type, 25.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 25}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-5'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-25' WHERE buff_debuff_id = 'bonus-points-5'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-25' WHERE buff_debuff_id = 'bonus-points-5'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-5"', '"bonus-points-25"')::jsonb WHERE config::text LIKE '%bonus-points-5%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-5'`);

    // Revert bonus-points-4 → bonus-points-18
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-18', 'Completion bonus: 18', 'Awards the team 18 extra points', type, effect_type, 18.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 18}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-4'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-18' WHERE buff_debuff_id = 'bonus-points-4'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-18' WHERE buff_debuff_id = 'bonus-points-4'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-4"', '"bonus-points-18"')::jsonb WHERE config::text LIKE '%bonus-points-4%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-4'`);

    // Revert bonus-points-3 → bonus-points-8
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'bonus-points-8', 'Completion bonus: 8', 'Awards the team 8 extra points', type, effect_type, 8.00, icon, metadata, is_active, category, target, trigger, '{"type": "point_bonus", "points": 8}'::jsonb
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-3'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'bonus-points-8' WHERE buff_debuff_id = 'bonus-points-3'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'bonus-points-8' WHERE buff_debuff_id = 'bonus-points-3'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-3"', '"bonus-points-8"')::jsonb WHERE config::text LIKE '%bonus-points-3%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-3'`);

    // Revert bonus-points-10 → point-bonus-10
    await query(`
        INSERT INTO bingo_buffs_debuffs (id, name, description, type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config)
        SELECT 'point-bonus-10', 'Completion bonus: 10', 'Awards the team 10 extra points', type, effect_type, effect_value, icon, metadata, is_active, category, target, trigger, config
        FROM bingo_buffs_debuffs WHERE id = 'bonus-points-10'
        ON CONFLICT (id) DO NOTHING
    `);
    await query(`UPDATE bingo_board_line_effects SET buff_debuff_id = 'point-bonus-10' WHERE buff_debuff_id = 'bonus-points-10'`);
    await query(`UPDATE bingo_board_tile_effects SET buff_debuff_id = 'point-bonus-10' WHERE buff_debuff_id = 'bonus-points-10'`);
    await query(`UPDATE events SET config = REPLACE(config::text, '"bonus-points-10"', '"point-bonus-10"')::jsonb WHERE config::text LIKE '%bonus-points-10%'`);
    await query(`DELETE FROM bingo_buffs_debuffs WHERE id = 'bonus-points-10'`);

    console.log('Buff changes reverted');
}

module.exports = { up, down };
