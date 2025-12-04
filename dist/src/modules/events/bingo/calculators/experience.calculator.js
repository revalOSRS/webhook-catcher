/**
 * Experience Progress Calculator
 *
 * Tracks team progress toward XP goals in a specific skill.
 * Uses Dink LOGIN event snapshots to track XP gained since event start.
 *
 * How it works:
 * 1. Player logs into OSRS during an active bingo event
 * 2. Dink sends LOGIN event with current skills XP
 * 3. First login captures baseline XP, subsequent logins update current XP
 * 4. XP gained = current XP - baseline XP
 * 5. Team total = sum of all player contributions
 *
 * Benefits over WiseOldMan:
 * - Real-time data directly from the game client
 * - No API rate limits or delays
 * - Accurate baseline captured on first login after event start
 * - Works regardless of WOM tracking status
 *
 * Completion: Team total XP gained >= required experience
 */
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';
import { BingoXpSnapshotsService } from '../xp-snapshots.service.js';
/**
 * Calculate experience progress for a team.
 *
 * Uses LOGIN snapshots captured by Dink to track XP gains.
 * If no snapshot exists for a player, they need to log in to start tracking.
 *
 * @param event - The unified game event (used for player name and timestamp)
 * @param requirement - The XP requirement (skill and target experience)
 * @param existing - Existing progress from database, or null if first event
 * @param eventStartDate - Event start date (unused, kept for API compatibility)
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @param eventId - Event ID for XP snapshot lookup (required for snapshot-based tracking)
 * @returns Progress result with new values and completion status
 */
export const calculateExperienceProgress = async (event, requirement, existing, eventStartDate, memberId, osrsAccountId, playerName, eventId) => {
    // Get existing metadata or create new
    const existingMetadata = existing?.progressMetadata;
    // Get or initialize player contributions
    const playerContributions = existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
    // Try to get XP data from LOGIN snapshots
    if (eventId && osrsAccountId && playerName) {
        const snapshotBaseline = await BingoXpSnapshotsService.getBaselineSkillXp(eventId, osrsAccountId, requirement.skill);
        const snapshotCurrent = await BingoXpSnapshotsService.getCurrentSkillXp(eventId, osrsAccountId, requirement.skill);
        if (snapshotCurrent !== null && snapshotBaseline !== null) {
            const xpGained = snapshotCurrent - snapshotBaseline;
            console.log(`[ExperienceCalc] Using LOGIN snapshot for ${playerName} - ${requirement.skill}: baseline=${snapshotBaseline}, current=${snapshotCurrent}, gained=${xpGained}`);
            // Find or create player's contribution
            let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
            if (!playerContribution) {
                // New player contribution
                playerContribution = {
                    osrsAccountId,
                    osrsNickname: playerName,
                    memberId,
                    baselineXp: snapshotBaseline,
                    currentXp: snapshotCurrent,
                    xpContribution: xpGained
                };
                playerContributions.push(playerContribution);
            }
            else {
                // Update existing player's contribution
                playerContribution.currentXp = snapshotCurrent;
                playerContribution.xpContribution = snapshotCurrent - playerContribution.baselineXp;
            }
        }
        else {
            // No snapshot yet - player needs to log in
            console.log(`[ExperienceCalc] No LOGIN snapshot for ${playerName} - ${requirement.skill}. Player needs to log in to start tracking.`);
        }
    }
    // Calculate team total XP gained
    const currentTotalXp = playerContributions.reduce((sum, p) => sum + Math.max(0, p.xpContribution), 0);
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
