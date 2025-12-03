/**
 * Wise Old Man Service
 * Wise Old Man API integration and clan statistics
 */
import { WOMClient } from '@wise-old-man/utils';
const client = new WOMClient();
/**
 * Wise Old Man Service Class
 * Handles all interactions with the Wise Old Man API
 */
export class WiseOldManService {
    /**
     * Search for a player by username
     */
    static async searchPlayer(username) {
        try {
            const player = await client.players.getPlayerDetails(username);
            return player;
        }
        catch (error) {
            if (error?.response?.status === 404) {
                return null;
            }
            console.error('Error fetching WOM player:', error);
            throw error;
        }
    }
    /**
     * Get player details by ID
     */
    static async getPlayerById(playerId) {
        try {
            const player = await client.players.getPlayerDetailsById(playerId);
            return player;
        }
        catch (error) {
            if (error?.response?.status === 404) {
                return null;
            }
            console.error('Error fetching WOM player by ID:', error);
            throw error;
        }
    }
    /**
     * Update player (trigger a data refresh from OSRS hiscores)
     */
    static async updatePlayer(username) {
        try {
            const updatedPlayer = await client.players.updatePlayer(username);
            return updatedPlayer;
        }
        catch (error) {
            console.error('Error updating WOM player:', error);
            throw error;
        }
    }
    /**
     * Get player snapshots (historical data)
     */
    static async getPlayerSnapshots(username, limit = 10) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1); // Get snapshots from the last year
            const snapshots = await client.players.getPlayerSnapshots(username, { startDate, endDate });
            return snapshots.slice(0, limit);
        }
        catch (error) {
            console.error('Error fetching WOM snapshots:', error);
            throw error;
        }
    }
    /**
     * Get player gains for a specific period
     */
    static async getPlayerGains(username, period = 'week') {
        try {
            const gains = await client.players.getPlayerGains(username, { period });
            return gains;
        }
        catch (error) {
            console.error('Error fetching WOM gains:', error);
            throw error;
        }
    }
    /**
     * Get player achievements
     */
    static async getPlayerAchievements(username, limit = 20) {
        try {
            const achievements = await client.players.getPlayerAchievements(username);
            // Return limited results
            return achievements.slice(0, limit);
        }
        catch (error) {
            console.error('Error fetching WOM achievements:', error);
            throw error;
        }
    }
    /**
     * Get player records
     */
    static async getPlayerRecords(username, period = 'week', metric) {
        try {
            const records = await client.players.getPlayerRecords(username);
            // Filter by period and metric if needed
            return records;
        }
        catch (error) {
            console.error('Error fetching WOM records:', error);
            throw error;
        }
    }
    /**
     * Get player's groups/clans
     */
    static async getPlayerGroups(username) {
        try {
            const groups = await client.players.getPlayerGroups(username);
            return groups;
        }
        catch (error) {
            console.error('Error fetching WOM groups:', error);
            throw error;
        }
    }
    /**
     * Get group activity by group ID
     */
    static async getGroupActivity(groupId, limit, offset) {
        try {
            const activity = await client.groups.getGroupActivity(groupId);
            // Apply pagination manually if needed
            let result = activity;
            if (offset) {
                result = result.slice(offset);
            }
            if (limit) {
                result = result.slice(0, limit);
            }
            return result;
        }
        catch (error) {
            console.error('Error fetching WOM group activity:', error);
            throw error;
        }
    }
    /**
     * Get group members by group ID
     */
    static async getGroupMembers(groupId, limit, offset) {
        try {
            const groupDetails = await client.groups.getGroupDetails(groupId);
            let members = groupDetails.memberships || [];
            // Apply pagination manually if needed
            if (offset) {
                members = members.slice(offset);
            }
            if (limit) {
                members = members.slice(0, limit);
            }
            return members;
        }
        catch (error) {
            console.error('Error fetching WOM group members:', error);
            throw error;
        }
    }
    /**
     * Get comprehensive player data (combines multiple endpoints)
     */
    static async getComprehensivePlayerData(username) {
        try {
            const [player, gains, achievements, records, groups] = await Promise.allSettled([
                this.searchPlayer(username),
                this.getPlayerGains(username, 'week'),
                this.getPlayerAchievements(username, 10),
                this.getPlayerRecords(username, 'week'),
                this.getPlayerGroups(username)
            ]);
            return {
                player: player.status === 'fulfilled' ? player.value : null,
                gains: gains.status === 'fulfilled' ? gains.value : null,
                achievements: achievements.status === 'fulfilled' ? achievements.value : [],
                records: records.status === 'fulfilled' ? records.value : [],
                groups: groups.status === 'fulfilled' ? groups.value : []
            };
        }
        catch (error) {
            console.error('Error fetching comprehensive WOM data:', error);
            throw error;
        }
    }
    // Cache for group statistics
    static groupStatisticsCache = null;
    // Cache for failed member fetches (persists across requests until midnight)
    static failedMembersCache = null;
    /**
     * Check if cache should be refreshed (after 1 AM today)
     */
    static shouldRefreshCache() {
        if (!this.groupStatisticsCache) {
            return true;
        }
        const now = new Date();
        const lastRefresh = this.groupStatisticsCache.lastRefresh;
        // Get 1 AM today
        const oneAMToday = new Date(now);
        oneAMToday.setHours(1, 0, 0, 0);
        // If current time is before 1 AM, use 1 AM yesterday
        if (now < oneAMToday) {
            oneAMToday.setDate(oneAMToday.getDate() - 1);
        }
        // Refresh if last refresh was before 1 AM today
        return lastRefresh < oneAMToday;
    }
    /**
     * Background task to retry failed members without blocking the response
     */
    static async retryFailedMembersBackground(groupId) {
        if (!this.failedMembersCache || this.failedMembersCache.members.length === 0) {
            return;
        }
        const membersToRetry = [...this.failedMembersCache.members];
        const successfulRetries = [];
        const stillFailing = [];
        console.log(`[Background] Retrying ${membersToRetry.length} failed member(s)...`);
        const retryResults = await Promise.allSettled(membersToRetry.map(member => client.players.getPlayerDetailsById(member.player.id)));
        retryResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulRetries.push(membersToRetry[index]);
                console.log(`[Background] ✅ Successfully refetched ${membersToRetry[index].player.username}`);
            }
            else {
                stillFailing.push(membersToRetry[index]);
            }
        });
        if (successfulRetries.length > 0) {
            console.log(`[Background] Successfully refetched ${successfulRetries.length} member(s)`);
            // Update the cache to remove successful ones
            if (stillFailing.length > 0) {
                this.failedMembersCache = {
                    members: stillFailing,
                    lastRefresh: new Date()
                };
                console.log(`[Background] ${stillFailing.length} member(s) still failing`);
            }
            else {
                this.failedMembersCache = null;
                console.log('[Background] All previously failed members now fetched successfully!');
                // Trigger a cache refresh to include the newly fetched members
                console.log('[Background] Invalidating statistics cache to trigger refresh with new members...');
                this.groupStatisticsCache = null;
            }
        }
    }
    /**
     * Get comprehensive clan statistics for a group (with daily caching)
     */
    static async getGroupStatistics(groupId) {
        try {
            // Check if we need to clear caches (after 1 AM)
            const shouldRefresh = this.shouldRefreshCache();
            if (shouldRefresh) {
                console.log('Cache expired - clearing all caches');
                this.groupStatisticsCache = null;
                this.failedMembersCache = null;
            }
            // Check if we have valid cached data
            if (this.groupStatisticsCache && !shouldRefresh) {
                console.log('Returning cached clan statistics');
                // Try to refetch previously failed members in the background
                if (this.failedMembersCache && this.failedMembersCache.members.length > 0) {
                    console.log(`Attempting to refetch ${this.failedMembersCache.members.length} previously failed member(s) in background...`);
                    // Don't await - do it in background
                    this.retryFailedMembersBackground(groupId).catch(err => console.error('Background retry failed:', err));
                }
                return this.groupStatisticsCache.data;
            }
            console.log('Fetching fresh clan statistics...');
            // Get group details which includes all members
            const groupDetails = await client.groups.getGroupDetails(groupId);
            const members = groupDetails.memberships || [];
            console.log(`Found ${members.length} members in group ${groupDetails.name}`);
            // First, try to refetch any previously failed members
            let playerDetails = [];
            const newFailedMembers = [];
            if (this.failedMembersCache && this.failedMembersCache.members.length > 0) {
                console.log(`Retrying ${this.failedMembersCache.members.length} previously failed member(s) first...`);
                const retryResults = await Promise.allSettled(this.failedMembersCache.members.map(member => client.players.getPlayerDetailsById(member.player.id)));
                retryResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        playerDetails.push(result.value);
                        console.log(`✅ Successfully refetched ${this.failedMembersCache.members[index].player.username}`);
                    }
                    else {
                        newFailedMembers.push(this.failedMembersCache.members[index]);
                        console.error(`Still failing: ${this.failedMembersCache.members[index].player.username}`);
                    }
                });
            }
            // Fetch all player details in parallel (in batches to avoid overwhelming the API)
            const BATCH_SIZE = 20;
            const MAX_RETRIES = 2;
            for (let i = 0; i < members.length; i += BATCH_SIZE) {
                const batch = members.slice(i, i + BATCH_SIZE);
                console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)} (${batch.length} members)`);
                const batchResults = await Promise.allSettled(batch.map(member => client.players.getPlayerDetailsById(member.player.id)));
                // Process successful results
                const successfulResults = batchResults
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);
                playerDetails.push(...successfulResults);
                // Track failed requests for retry
                batchResults.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const member = batch[index];
                        console.error(`Failed to fetch player ${member.player.username} (ID: ${member.player.id}):`, result.reason);
                        newFailedMembers.push(member);
                    }
                });
            }
            // Retry newly failed members immediately
            if (newFailedMembers.length > 0) {
                console.log(`Retrying ${newFailedMembers.length} newly failed member(s)...`);
                for (let retry = 0; retry < MAX_RETRIES; retry++) {
                    if (newFailedMembers.length === 0)
                        break;
                    console.log(`Retry attempt ${retry + 1}/${MAX_RETRIES} for ${newFailedMembers.length} member(s)`);
                    const retryResults = await Promise.allSettled(newFailedMembers.map(member => client.players.getPlayerDetailsById(member.player.id)));
                    // Process successful retries
                    const successfulRetries = [];
                    const stillFailing = [];
                    retryResults.forEach((result, index) => {
                        if (result.status === 'fulfilled') {
                            successfulRetries.push(result.value);
                        }
                        else {
                            stillFailing.push(newFailedMembers[index]);
                            if (retry === MAX_RETRIES - 1) {
                                const member = newFailedMembers[index];
                                console.error(`❌ FINAL FAILURE: Could not fetch player ${member.player.username} (ID: ${member.player.id}) after ${MAX_RETRIES} retries`);
                            }
                        }
                    });
                    playerDetails.push(...successfulRetries);
                    newFailedMembers.length = 0;
                    newFailedMembers.push(...stillFailing);
                    // Wait a bit before next retry
                    if (stillFailing.length > 0 && retry < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            console.log(`Successfully fetched ${playerDetails.length}/${members.length} player details`);
            // Update failed members cache
            if (newFailedMembers.length > 0) {
                console.warn(`⚠️ WARNING: ${newFailedMembers.length} member(s) could not be fetched after retries:`);
                newFailedMembers.forEach(member => {
                    console.warn(`  - ${member.player.username} (ID: ${member.player.id})`);
                });
                this.failedMembersCache = {
                    members: newFailedMembers,
                    lastRefresh: new Date()
                };
                console.log(`Cached ${newFailedMembers.length} failed member(s) for future retry`);
            }
            else {
                // Clear failed members cache if all succeeded
                this.failedMembersCache = null;
                console.log('All members fetched successfully - cleared failed members cache');
            }
            // Calculate statistics
            const totalMembers = playerDetails.length;
            let totalLevel = 0;
            let totalXP = 0;
            let maxedCount = 0;
            let totalClues = 0;
            let totalBossKills = 0;
            let totalCox = 0;
            let totalToa = 0;
            let totalTob = 0;
            let totalEHP = 0;
            let totalEHB = 0;
            for (const player of playerDetails) {
                // Get total level from skills overall
                const skills = player.latestSnapshot?.data?.skills || {};
                const playerTotalLevel = skills.overall?.level || 0;
                totalLevel += playerTotalLevel;
                // Check if maxed (2376 total level - all skills at 99)
                if (playerTotalLevel >= 2376) {
                    maxedCount++;
                }
                // Total XP
                totalXP += player.exp || 0;
                // Total clues (sum of all clue types)
                const activities = player.latestSnapshot?.data?.activities || {};
                const clueTypes = ['clue_scrolls_all', 'clue_scrolls_beginner', 'clue_scrolls_easy',
                    'clue_scrolls_medium', 'clue_scrolls_hard', 'clue_scrolls_elite',
                    'clue_scrolls_master'];
                // Use the 'all' clue count if available, otherwise sum individual types
                if (activities['clue_scrolls_all']) {
                    totalClues += activities['clue_scrolls_all']?.score || 0;
                }
                // Total boss kills (sum all bosses)
                const bosses = player.latestSnapshot?.data?.bosses || {};
                for (const boss in bosses) {
                    totalBossKills += bosses[boss]?.kills || 0;
                }
                // Specific raid completions (including all variants)
                totalCox += (bosses['chambers_of_xeric']?.kills || 0) + (bosses['chambers_of_xeric_challenge_mode']?.kills || 0);
                totalToa += (bosses['tombs_of_amascut']?.kills || 0) + (bosses['tombs_of_amascut_expert']?.kills || 0);
                totalTob += (bosses['theatre_of_blood']?.kills || 0) + (bosses['theatre_of_blood_hard_mode']?.kills || 0);
                // EHP and EHB
                totalEHP += player.ehp || 0;
                totalEHB += player.ehb || 0;
            }
            const averageLevel = totalMembers > 0 ? Math.round(totalLevel / totalMembers) : 0;
            const averageXP = totalMembers > 0 ? Math.round(totalXP / totalMembers) : 0;
            const maxedPercentage = totalMembers > 0 ? ((maxedCount / totalMembers) * 100).toFixed(2) : '0.00';
            const statistics = {
                groupName: groupDetails.name,
                totalMembers,
                averageLevel,
                averageXP,
                maxedPlayers: {
                    count: maxedCount,
                    percentage: parseFloat(maxedPercentage)
                },
                totalStats: {
                    clues: totalClues,
                    bossKills: totalBossKills,
                    cox: totalCox,
                    toa: totalToa,
                    tob: totalTob,
                    ehp: Math.round(totalEHP),
                    ehb: Math.round(totalEHB)
                },
                lastUpdated: new Date().toISOString()
            };
            // Cache the result
            this.groupStatisticsCache = {
                data: statistics,
                lastRefresh: new Date()
            };
            console.log('Clan statistics cached successfully');
            return statistics;
        }
        catch (error) {
            console.error('Error fetching group statistics:', error);
            throw error;
        }
    }
    /**
     * Clear all caches manually (for testing or maintenance)
     */
    static clearCaches() {
        this.groupStatisticsCache = null;
        this.failedMembersCache = null;
        console.log('All WOM caches cleared');
    }
    /**
     * Get cache status for debugging
     */
    static getCacheStatus() {
        return {
            groupStatisticsCache: this.groupStatisticsCache ? {
                lastRefresh: this.groupStatisticsCache.lastRefresh,
                hasData: !!this.groupStatisticsCache.data
            } : null,
            failedMembersCache: this.failedMembersCache ? {
                count: this.failedMembersCache.members.length,
                lastRefresh: this.failedMembersCache.lastRefresh
            } : null
        };
    }
}
