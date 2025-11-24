/**
 * Event Filters Type Definitions
 *
 * Configuration types for RuneLite plugin event filtering
 */
export const DEFAULT_EVENT_FILTERS = {
    loot: {
        minValue: 1000, // 1k GP minimum during peak hours
        whitelist: [
            526,
        ],
        blacklist: [
            592, // Ashes
        ]
    },
    enabled: {
        loot: true,
        pet: true,
        quest: true,
        level: true,
        killCount: true,
        clue: true,
        diary: true,
        combatAchievement: true,
        collection: true,
        death: true,
        detailedKill: true,
        areaEntry: true,
        emote: true
    }
};
/**
 * Get appropriate event filters based on current time
 */
export function getEventFilters() {
    return {
        loot: {
            minValue: 1000, // 1k GP minimum during peak hours
            whitelist: [
                526,
            ],
            blacklist: [
                592, // Ashes
            ]
        },
        enabled: {
            loot: true,
            pet: true,
            quest: true,
            level: true,
            killCount: true,
            clue: true,
            diary: true,
            combatAchievement: true,
            collection: true,
            death: true,
            detailedKill: true,
            areaEntry: true,
            emote: true
        }
    };
}
