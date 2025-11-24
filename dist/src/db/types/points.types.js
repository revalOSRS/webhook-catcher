/**
 * Points System Type Definitions
 *
 * Covers: Point Rules, Points Breakdown, Leaderboards
 */
export const DEFAULT_POINT_RULES = [
    // Quest difficulties
    { rule_type: 'quest_difficulty', rule_key: 'novice', points: 10, description: 'Completing a novice quest' },
    { rule_type: 'quest_difficulty', rule_key: 'intermediate', points: 25, description: 'Completing an intermediate quest' },
    { rule_type: 'quest_difficulty', rule_key: 'experienced', points: 50, description: 'Completing an experienced quest' },
    { rule_type: 'quest_difficulty', rule_key: 'master', points: 100, description: 'Completing a master quest' },
    { rule_type: 'quest_difficulty', rule_key: 'grandmaster', points: 200, description: 'Completing a grandmaster quest' },
    // Diary tiers
    { rule_type: 'diary_tier', rule_key: 'easy', points: 50, description: 'Completing an easy achievement diary' },
    { rule_type: 'diary_tier', rule_key: 'medium', points: 100, description: 'Completing a medium achievement diary' },
    { rule_type: 'diary_tier', rule_key: 'hard', points: 200, description: 'Completing a hard achievement diary' },
    { rule_type: 'diary_tier', rule_key: 'elite', points: 400, description: 'Completing an elite achievement diary' },
    // Combat achievement tiers
    { rule_type: 'combat_achievement_tier', rule_key: 'easy', points: 10, description: 'Completing an easy combat achievement' },
    { rule_type: 'combat_achievement_tier', rule_key: 'medium', points: 25, description: 'Completing a medium combat achievement' },
    { rule_type: 'combat_achievement_tier', rule_key: 'hard', points: 50, description: 'Completing a hard combat achievement' },
    { rule_type: 'combat_achievement_tier', rule_key: 'elite', points: 100, description: 'Completing an elite combat achievement' },
    { rule_type: 'combat_achievement_tier', rule_key: 'master', points: 200, description: 'Completing a master combat achievement' },
    { rule_type: 'combat_achievement_tier', rule_key: 'grandmaster', points: 400, description: 'Completing a grandmaster combat achievement' },
    // Collection log rarities
    { rule_type: 'collection_log_rarity', rule_key: 'common', points: 5, description: 'Obtaining a common collection log item' },
    { rule_type: 'collection_log_rarity', rule_key: 'rare', points: 25, description: 'Obtaining a rare collection log item' },
    { rule_type: 'collection_log_rarity', rule_key: 'very_rare', points: 100, description: 'Obtaining a very rare collection log item' },
    { rule_type: 'collection_log_rarity', rule_key: 'pet', points: 500, description: 'Obtaining a pet' },
    // Boss KC milestones
    { rule_type: 'boss_kc_milestone', rule_key: '50', points: 50, description: 'Reaching 50 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '100', points: 100, description: 'Reaching 100 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '250', points: 250, description: 'Reaching 250 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '500', points: 500, description: 'Reaching 500 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '1000', points: 1000, description: 'Reaching 1000 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '2500', points: 2000, description: 'Reaching 2500 KC on a boss' },
    { rule_type: 'boss_kc_milestone', rule_key: '5000', points: 3000, description: 'Reaching 5000 KC on a boss' },
    // Level milestones
    { rule_type: 'skill_99', rule_key: '99', points: 200, description: 'Reaching level 99 in a skill' },
    { rule_type: 'skill_200m', rule_key: '200m_xp', points: 1000, description: 'Reaching 200M XP in a skill' },
    // Total level milestones
    { rule_type: 'total_level_milestone', rule_key: '1500', points: 500, description: 'Reaching total level 1500' },
    { rule_type: 'total_level_milestone', rule_key: '2000', points: 1000, description: 'Reaching total level 2000' },
    { rule_type: 'total_level_milestone', rule_key: '2200', points: 2000, description: 'Reaching total level 2200' },
    { rule_type: 'total_level_milestone', rule_key: '2277', points: 5000, description: 'Maxing all skills (2277)' },
];
