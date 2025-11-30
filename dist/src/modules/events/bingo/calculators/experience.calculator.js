/**
 * Experience Progress Calculator
 *
 * Tracks team progress toward XP goals in a specific skill.
 * Uses WiseOldMan API to fetch current XP and calculate XP gained since event start.
 *
 * This calculator:
 * 1. Updates the player in WOM to ensure latest data
 * 2. Fetches current XP from WOM API
 * 3. Retrieves baseline XP from event start (or first tracking)
 * 4. Calculates XP gained = current - baseline
 * 5. Sums all player contributions for team total
 *
 * Completion: Team total XP gained >= required experience
 */
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';
import { WiseOldManService } from '../../../wiseoldman/index.js';
/**
 * Calculate experience progress for a team.
 *
 * Logic:
 * 1. Update player in WOM to get fresh data
 * 2. Fetch current XP from WOM API for the target skill
 * 3. For new players: fetch historical XP at event start as baseline
 * 4. For existing players: update current XP and recalculate contribution
 * 5. Sum all player XP contributions for team total
 * 6. Compare against target to determine completion
 *
 * Note: This is async because it makes external API calls to WOM.
 *
 * @param event - The unified game event (used for player name and timestamp)
 * @param requirement - The XP requirement (skill and target experience)
 * @param existing - Existing progress from database, or null if first event
 * @param eventStartDate - Event start date for baseline XP calculation
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for WOM lookup)
 * @returns Progress result with new values and completion status
 */
export const calculateExperienceProgress = async (event, requirement, existing, eventStartDate, memberId, osrsAccountId, playerName) => {
    // Get existing metadata or create new
    const existingMetadata = existing?.progressMetadata;
    // Update player in WOM to ensure we have latest data
    await updatePlayerInWom(event.playerName);
    // Fetch current XP from WOM
    const currentXp = await fetchCurrentXp(event.playerName, requirement.skill);
    if (currentXp === null) {
        // Can't fetch XP - return existing progress unchanged
        if (existingMetadata) {
            return {
                progressValue: existing?.progressValue ?? 0,
                progressMetadata: existingMetadata,
                isCompleted: false
            };
        }
        // Create empty metadata if none exists
        const emptyMetadata = {
            requirementType: BingoTileRequirementType.EXPERIENCE,
            targetValue: requirement.experience,
            lastUpdateAt: event.timestamp.toISOString(),
            skill: requirement.skill,
            currentTotalXp: 0,
            targetXp: requirement.experience,
            playerContributions: []
        };
        return {
            progressValue: 0,
            progressMetadata: emptyMetadata,
            isCompleted: false
        };
    }
    // Get or initialize player contributions
    const playerContributions = existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
    // Find or create player's contribution
    let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
    if (!playerContribution && osrsAccountId && playerName) {
        // First time tracking - get historical XP at event start
        const historicalXp = await fetchHistoricalXp(event.playerName, requirement.skill, eventStartDate);
        const baseline = historicalXp ?? currentXp;
        playerContribution = {
            osrsAccountId,
            osrsNickname: playerName,
            memberId,
            baselineXp: baseline,
            currentXp: currentXp,
            xpContribution: currentXp - baseline
        };
        playerContributions.push(playerContribution);
    }
    else if (playerContribution) {
        // Update existing player's contribution
        playerContribution.currentXp = currentXp;
        playerContribution.xpContribution = currentXp - playerContribution.baselineXp;
    }
    // Calculate team total XP gained
    const currentTotalXp = playerContributions.reduce((sum, p) => sum + p.xpContribution, 0);
    const progressMetadata = {
        requirementType: BingoTileRequirementType.EXPERIENCE,
        targetValue: requirement.experience,
        lastUpdateAt: event.timestamp.toISOString(),
        skill: requirement.skill,
        currentTotalXp,
        targetXp: requirement.experience,
        playerContributions,
        completedTiers: existingMetadata?.completedTiers,
        currentTier: existingMetadata?.currentTier
    };
    return {
        progressValue: currentTotalXp,
        progressMetadata,
        isCompleted: currentTotalXp >= requirement.experience
    };
};
/**
 * Update player in WiseOldMan to ensure we have latest data.
 * Fails silently - we may still have cached data.
 */
const updatePlayerInWom = async (playerName) => {
    try {
        await WiseOldManService.updatePlayer(playerName);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ExperienceCalculator] Error updating ${playerName} in WOM:`, message);
    }
};
/**
 * Fetch current XP from WiseOldMan API for a specific skill.
 *
 * @param playerName - Player's OSRS name
 * @param skill - Skill name (e.g., "attack", "strength")
 * @returns Current XP or null if unavailable
 */
const fetchCurrentXp = async (playerName, skill) => {
    try {
        const player = await WiseOldManService.searchPlayer(playerName);
        if (!player?.latestSnapshot?.data?.skills) {
            return null;
        }
        const skillKey = mapSkillName(skill);
        if (!skillKey) {
            console.warn(`[ExperienceCalculator] Unknown skill: ${skill}`);
            return null;
        }
        const skillData = player.latestSnapshot.data.skills[skillKey];
        return skillData?.experience ?? null;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ExperienceCalculator] Error fetching XP for ${playerName}:`, message);
        return null;
    }
};
/**
 * Fetch historical XP from WiseOldMan at a specific date.
 * Uses player snapshots to find XP at or before the target date.
 *
 * @param playerName - Player's OSRS name
 * @param skill - Skill name
 * @param date - Target date (event start)
 * @returns Historical XP or null if unavailable
 */
const fetchHistoricalXp = async (playerName, skill, date) => {
    try {
        const snapshots = await WiseOldManService.getPlayerSnapshots(playerName, 100);
        if (!snapshots?.length) {
            return null;
        }
        const skillKey = mapSkillName(skill);
        if (!skillKey) {
            return null;
        }
        // Find snapshot closest to (but before or at) the target date
        const validSnapshots = snapshots
            .filter(s => {
            if (!s.createdAt)
                return false;
            const snapshotDate = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
            return snapshotDate <= date;
        })
            .sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt ?? 0).getTime();
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt ?? 0).getTime();
            return dateB - dateA; // Newest first
        });
        if (validSnapshots.length === 0) {
            // No snapshot before event start - use oldest available
            const oldest = snapshots[snapshots.length - 1];
            return oldest.data?.skills?.[skillKey]?.experience ?? null;
        }
        const closestSnapshot = validSnapshots[0];
        return closestSnapshot.data?.skills?.[skillKey]?.experience ?? null;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ExperienceCalculator] Error fetching historical XP for ${playerName}:`, message);
        return null;
    }
};
/**
 * Map skill name to WiseOldMan skill key.
 * WOM uses lowercase skill names.
 */
const mapSkillName = (skillName) => {
    const validSkills = [
        'attack', 'strength', 'defence', 'ranged', 'prayer', 'magic',
        'runecraft', 'construction', 'hitpoints', 'agility', 'herblore',
        'thieving', 'crafting', 'fletching', 'slayer', 'hunter',
        'mining', 'smithing', 'fishing', 'cooking', 'firemaking',
        'woodcutting', 'farming', 'overall'
    ];
    const normalized = skillName.toLowerCase();
    return validSkills.includes(normalized) ? normalized : null;
};
