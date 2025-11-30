/**
 * Pet Progress Calculator
 *
 * Tracks team progress toward obtaining a specific pet or any pet.
 * Each pet drop is tracked per player, then counted for the team total.
 *
 * Completion: Team total pet count >= required amount (usually 1)
 */
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';
/**
 * Calculate pet progress for a team.
 *
 * Logic:
 * 1. Extract pet name from event
 * 2. Find or create player's contribution record
 * 3. Add this pet to player's collection with timestamp
 * 4. Count total pets obtained by team
 * 5. Compare against target to determine completion
 *
 * Note: For specific pet requirements, matching is done in the
 * requirement-matcher before this calculator is called.
 *
 * @param event - The unified game event containing pet data
 * @param requirement - The pet requirement (target amount, optional specific pet)
 * @param existing - Existing progress from database, or null if first event
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with new values and completion status
 */
export const calculatePetProgress = (event, requirement, existing, memberId, osrsAccountId, playerName) => {
    const petData = event.data;
    const petName = petData.petName;
    // Get existing metadata or create new
    const existingMetadata = existing?.progressMetadata;
    // Get or initialize player contributions
    const playerContributions = existingMetadata?.playerContributions ? [...existingMetadata.playerContributions] : [];
    // Find or create current player's contribution
    let playerContribution = playerContributions.find(p => p.osrsAccountId === osrsAccountId);
    if (!playerContribution && osrsAccountId && playerName) {
        playerContribution = {
            osrsAccountId,
            osrsNickname: playerName,
            memberId,
            pets: [],
            count: 0
        };
        playerContributions.push(playerContribution);
    }
    // Record this pet drop
    if (playerContribution && petName) {
        playerContribution.pets.push({
            petName,
            timestamp: event.timestamp.toISOString()
        });
        playerContribution.count += 1;
    }
    // Calculate team total
    const currentTotal = playerContributions.reduce((sum, p) => sum + p.count, 0);
    const progressMetadata = {
        requirementType: BingoTileRequirementType.PET,
        targetValue: requirement.amount,
        lastUpdateAt: event.timestamp.toISOString(),
        currentTotalCount: currentTotal,
        playerContributions,
        completedTiers: existingMetadata?.completedTiers,
        currentTier: existingMetadata?.currentTier
    };
    return {
        progressValue: currentTotal,
        progressMetadata,
        isCompleted: currentTotal >= requirement.amount
    };
};
