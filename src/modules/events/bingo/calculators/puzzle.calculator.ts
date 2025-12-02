/**
 * Puzzle Progress Calculator
 * 
 * Handles progress tracking for PUZZLE requirement types.
 * A puzzle wraps a hidden requirement and delegates progress calculation
 * to the appropriate calculator based on the hidden requirement's type.
 * 
 * The puzzle acts as a facade that:
 * 1. Routes events to the correct underlying calculator
 * 2. Wraps the result in puzzle-specific metadata
 * 3. Hides the actual requirement details from the public API
 */

import type { UnifiedGameEvent } from '../types/unified-event.type.js';
import type {
  PuzzleRequirement,
  PuzzleProgressMetadata,
  ProgressResult,
  ExistingProgress,
  ProgressMetadata,
  ItemDropRequirement,
  PetRequirement,
  ValueDropRequirement,
  SpeedrunRequirement,
  ExperienceRequirement,
  BaGamblesRequirement,
  ChatRequirement,
  HiddenRequirement
} from '../types/bingo-requirements.type.js';
import { BingoTileRequirementType } from '../types/bingo-requirements.type.js';

// Import all calculators
import { calculateItemDropProgress } from './item-drop.calculator.js';
import { calculatePetProgress } from './pet.calculator.js';
import { calculateValueDropProgress } from './value-drop.calculator.js';
import { calculateSpeedrunProgress } from './speedrun.calculator.js';
import { calculateExperienceProgress } from './experience.calculator.js';
import { calculateBaGamblesProgress } from './ba-gambles.calculator.js';
import { calculateChatProgress } from './chat.calculator.js';

/**
 * Extract the hidden progress metadata from a puzzle's progress
 */
const extractHiddenProgress = (
  existing: ExistingProgress | null
): ExistingProgress | null => {
  if (!existing) return null;
  
  const puzzleMetadata = existing.progressMetadata as PuzzleProgressMetadata;
  if (puzzleMetadata?.hiddenProgressMetadata) {
    return {
      progressValue: existing.progressValue,
      progressMetadata: puzzleMetadata.hiddenProgressMetadata
    };
  }
  
  return null;
};

/**
 * Calculate progress for a puzzle requirement.
 * 
 * Delegates to the appropriate calculator based on the hidden requirement type,
 * then wraps the result in puzzle-specific metadata.
 * 
 * @param event - The unified game event
 * @param requirement - The puzzle requirement containing the hidden requirement
 * @param existing - Existing progress from database, or null if first event
 * @param eventStartDate - Event start date (for experience tracking)
 * @param memberId - Discord member ID (optional)
 * @param osrsAccountId - OSRS account ID (required for tracking)
 * @param playerName - Player's OSRS name (required for display)
 * @returns Progress result with puzzle wrapper metadata
 */
export const calculatePuzzleProgress = async (
  event: UnifiedGameEvent,
  requirement: PuzzleRequirement,
  existing: ExistingProgress | null,
  eventStartDate: Date,
  memberId?: number,
  osrsAccountId?: number,
  playerName?: string
): Promise<ProgressResult> => {
  const hiddenReq = requirement.hiddenRequirement;
  const hiddenExisting = extractHiddenProgress(existing);
  
  // Delegate to the appropriate calculator based on hidden requirement type
  let hiddenResult: ProgressResult;
  
  switch (hiddenReq.type) {
    case BingoTileRequirementType.ITEM_DROP:
      hiddenResult = calculateItemDropProgress(
        event,
        hiddenReq as ItemDropRequirement,
        hiddenExisting,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.PET:
      hiddenResult = calculatePetProgress(
        event,
        hiddenReq as PetRequirement,
        hiddenExisting,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.VALUE_DROP:
      hiddenResult = calculateValueDropProgress(
        event,
        hiddenReq as ValueDropRequirement,
        hiddenExisting,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.SPEEDRUN:
      hiddenResult = calculateSpeedrunProgress(
        event,
        hiddenReq as SpeedrunRequirement,
        hiddenExisting,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.EXPERIENCE:
      hiddenResult = await calculateExperienceProgress(
        event,
        hiddenReq as ExperienceRequirement,
        hiddenExisting,
        eventStartDate,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.BA_GAMBLES:
      hiddenResult = calculateBaGamblesProgress(
        event,
        hiddenReq as BaGamblesRequirement,
        hiddenExisting,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    case BingoTileRequirementType.CHAT:
      hiddenResult = calculateChatProgress(
        event,
        hiddenReq as ChatRequirement,
        hiddenExisting,
        memberId,
        osrsAccountId,
        playerName
      );
      break;
      
    default:
      // Unknown requirement type - return empty progress
      return {
        progressValue: 0,
        progressMetadata: createEmptyPuzzleMetadata(requirement),
        isCompleted: false
      };
  }
  
  // Wrap the hidden result in puzzle metadata
  const puzzleMetadata: PuzzleProgressMetadata = {
    requirementType: BingoTileRequirementType.PUZZLE,
    hiddenRequirementType: hiddenReq.type,
    hiddenProgressMetadata: hiddenResult.progressMetadata as Exclude<ProgressMetadata, PuzzleProgressMetadata>,
    targetValue: hiddenResult.progressMetadata.targetValue,
    lastUpdateAt: new Date().toISOString(),
    isSolved: hiddenResult.isCompleted,
    solvedAt: hiddenResult.isCompleted ? new Date().toISOString() : undefined,
    puzzleCategory: requirement.puzzleCategory,
    completedTiers: hiddenResult.completedTiers,
    currentTier: hiddenResult.progressMetadata.currentTier
  };
  
  return {
    progressValue: hiddenResult.progressValue,
    progressMetadata: puzzleMetadata,
    isCompleted: hiddenResult.isCompleted,
    completedTiers: hiddenResult.completedTiers
  };
};

/**
 * Create empty puzzle metadata for initialization
 */
const createEmptyPuzzleMetadata = (requirement: PuzzleRequirement): PuzzleProgressMetadata => {
  const hiddenReq = requirement.hiddenRequirement;
  
  // Create a minimal hidden metadata based on type
  const baseHiddenMetadata = {
    targetValue: 0,
    lastUpdateAt: new Date().toISOString(),
    playerContributions: []
  };
  
  let hiddenMetadata: Exclude<ProgressMetadata, PuzzleProgressMetadata>;
  
  switch (hiddenReq.type) {
    case BingoTileRequirementType.ITEM_DROP:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.ITEM_DROP,
        currentTotalCount: 0
      };
      break;
    case BingoTileRequirementType.CHAT:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.CHAT,
        targetCount: 1,
        currentTotalCount: 0
      };
      break;
    case BingoTileRequirementType.PET:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.PET,
        currentTotalCount: 0
      };
      break;
    case BingoTileRequirementType.VALUE_DROP:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.VALUE_DROP,
        currentBestValue: 0
      };
      break;
    case BingoTileRequirementType.SPEEDRUN:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.SPEEDRUN,
        currentBestTimeSeconds: Infinity,
        goalSeconds: 0
      };
      break;
    case BingoTileRequirementType.EXPERIENCE:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.EXPERIENCE,
        skill: '',
        currentTotalXp: 0,
        targetXp: 0
      };
      break;
    case BingoTileRequirementType.BA_GAMBLES:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.BA_GAMBLES,
        currentTotalGambles: 0
      };
      break;
    default:
      hiddenMetadata = {
        ...baseHiddenMetadata,
        requirementType: BingoTileRequirementType.ITEM_DROP,
        currentTotalCount: 0
      };
  }
  
  return {
    requirementType: BingoTileRequirementType.PUZZLE,
    hiddenRequirementType: hiddenReq.type,
    hiddenProgressMetadata: hiddenMetadata,
    targetValue: 0,
    lastUpdateAt: new Date().toISOString(),
    isSolved: false,
    puzzleCategory: requirement.puzzleCategory
  };
};

