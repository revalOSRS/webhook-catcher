/**
 * Dink Event Adapter
 * Converts Dink events to UnifiedGameEvent format
 */
import { DinkEventType } from '../../../dink/events/event.js';
import { query } from '../../../../db/connection.js';
/**
 * Convert Dink event to UnifiedGameEvent
 */
export async function adaptDinkEvent(dinkEvent) {
    // Get OSRS account ID from player name
    const osrsAccountId = await getOsrsAccountIdFromPlayerName(dinkEvent.playerName);
    const timestamp = new Date(); // Dink events don't have explicit timestamp, use current time
    switch (dinkEvent.type) {
        case DinkEventType.LOOT:
            return adaptLootEvent(dinkEvent, osrsAccountId, timestamp);
        case DinkEventType.PET:
            return adaptPetEvent(dinkEvent, osrsAccountId, timestamp);
        case DinkEventType.SPEEDRUN:
            return adaptSpeedrunEvent(dinkEvent, osrsAccountId, timestamp);
        case DinkEventType.BARBARIAN_ASSAULT_GAMBLE:
            return adaptBaGambleEvent(dinkEvent, osrsAccountId, timestamp);
        case DinkEventType.LOGOUT:
            return adaptLogoutEvent(dinkEvent, osrsAccountId, timestamp);
        default:
            // Event type not supported for bingo tracking
            return null;
    }
}
function adaptLootEvent(event, osrsAccountId, timestamp) {
    const totalValue = event.extra.items.reduce((sum, item) => sum + (item.priceEach * item.quantity), 0);
    return {
        eventType: 'LOOT',
        playerName: event.playerName,
        osrsAccountId,
        timestamp,
        source: 'dink',
        data: {
            items: event.extra.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                name: item.name,
                priceEach: item.priceEach
            })),
            source: event.extra.source,
            totalValue
        }
    };
}
function adaptPetEvent(event, osrsAccountId, timestamp) {
    return {
        eventType: 'PET',
        playerName: event.playerName,
        osrsAccountId,
        timestamp,
        source: 'dink',
        data: {
            petName: event.extra.petName,
            milestone: event.extra.milestone
        }
    };
}
function adaptSpeedrunEvent(event, osrsAccountId, timestamp) {
    // Parse time string (e.g., "1:23:45" or "23:45") to seconds
    const timeSeconds = parseTimeStringToSeconds(event.extra.currentTime);
    return {
        eventType: 'SPEEDRUN',
        playerName: event.playerName,
        osrsAccountId,
        timestamp,
        source: 'dink',
        data: {
            location: event.extra.questName, // Dink uses questName for speedruns
            timeSeconds,
            isPersonalBest: event.extra.isPersonalBest
        }
    };
}
function adaptBaGambleEvent(event, osrsAccountId, timestamp) {
    return {
        eventType: 'BA_GAMBLE',
        playerName: event.playerName,
        osrsAccountId,
        timestamp,
        source: 'dink',
        data: {
            gambleCount: event.extra.gambleCount
        }
    };
}
function adaptLogoutEvent(event, osrsAccountId, timestamp) {
    return {
        eventType: 'LOGOUT',
        playerName: event.playerName,
        osrsAccountId,
        timestamp,
        source: 'dink',
        data: {} // XP data will be fetched from WiseOldMan API
    };
}
/**
 * Parse time string to seconds
 * Supports formats: "1:23:45" (hours:minutes:seconds), "23:45" (minutes:seconds), "45" (seconds)
 */
function parseTimeStringToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        // hours:minutes:seconds
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    else if (parts.length === 2) {
        // minutes:seconds
        return parts[0] * 60 + parts[1];
    }
    else {
        // seconds only
        return parts[0];
    }
}
/**
 * Get OSRS account ID from player name
 */
async function getOsrsAccountIdFromPlayerName(playerName) {
    try {
        const result = await query('SELECT id FROM osrs_accounts WHERE name = $1 LIMIT 1', [playerName]);
        return result.length > 0 ? result[0].id : undefined;
    }
    catch (error) {
        console.error(`Error looking up OSRS account for player ${playerName}:`, error);
        return undefined;
    }
}
