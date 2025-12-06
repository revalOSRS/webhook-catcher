# Tile Progress Metadata - Frontend Documentation

This document describes the unified tile progress metadata structure used across all bingo endpoints. Understanding this structure is essential for:
- Displaying tile progress on the frontend
- Building manual tile completion payloads for the admin endpoint
- Understanding multi-requirement and tiered tiles

## Table of Contents

1. [Overview](#overview)
2. [Type Hierarchy](#type-hierarchy)
3. [TileProgressMetadata Structure](#tileprogressmetadata-structure)
4. [RequirementProgressEntry Structure](#requirementprogressentry-structure)
5. [RequirementProgressData Types](#requirementprogressdata-types)
6. [Examples by Tile Type](#examples-by-tile-type)
7. [Multi-Requirement Tiles](#multi-requirement-tiles)
8. [Tiered Tiles](#tiered-tiles)
9. [Manual Completion via Admin API](#manual-completion-via-admin-api)
10. [Endpoints Reference](#endpoints-reference)

---

## Overview

All tile progress is stored using a consistent structure that supports:
- **Single requirement tiles**: One task to complete
- **Multi-requirement tiles**: Multiple independent tasks that ALL must be completed
- **Tiered tiles**: Bonus point tiers with progressively harder goals

The structure separates:
- **Tile-level metadata** (`TileProgressMetadata`): Tracks overall tile state, which requirements are complete
- **Requirement-level metadata** (`RequirementProgressData`): Tracks progress for each individual requirement

---

## Type Hierarchy

```
TileProgressMetadata (stored in database)
├── totalRequirements: number              // How many requirements this tile has
├── completedRequirementIndices: number[]  // Which requirements are complete [0, 1, 2...]
└── requirementProgress: {                 // Progress for each requirement
      "0": RequirementProgressEntry,
      "1": RequirementProgressEntry,
      ...
    }

RequirementProgressEntry
├── isCompleted: boolean                   // Is this specific requirement done?
├── progressValue: number                  // Numeric progress (e.g., count, time)
└── progressMetadata: RequirementProgressData  // Type-specific progress details

RequirementProgressData (union of specific types)
├── ItemDropProgressMetadata
├── SpeedrunProgressMetadata
├── ExperienceProgressMetadata
├── PetProgressMetadata
├── ValueDropProgressMetadata
├── ChatProgressMetadata
├── BaGamblesProgressMetadata
└── PuzzleProgressMetadata
```

---

## TileProgressMetadata Structure

This is the top-level structure stored in the `progress_metadata` column.

```typescript
interface TileProgressMetadata {
  /** Total number of requirements in this tile */
  totalRequirements: number;
  
  /** Indices of completed requirements (e.g., [0] means first is done, [0, 1] means first two) */
  completedRequirementIndices: number[];
  
  /** Progress for each requirement, keyed by string index */
  requirementProgress: {
    [index: string]: RequirementProgressEntry;
  };
}
```

### Example - Single Requirement Tile

```json
{
  "totalRequirements": 1,
  "completedRequirementIndices": [],
  "requirementProgress": {
    "0": {
      "isCompleted": false,
      "progressValue": 3,
      "progressMetadata": { ... }
    }
  }
}
```

### Example - Multi-Requirement Tile (2 of 3 complete)

```json
{
  "totalRequirements": 3,
  "completedRequirementIndices": [0, 2],
  "requirementProgress": {
    "0": { "isCompleted": true, "progressValue": 1, "progressMetadata": { ... } },
    "1": { "isCompleted": false, "progressValue": 0, "progressMetadata": { ... } },
    "2": { "isCompleted": true, "progressValue": 1, "progressMetadata": { ... } }
  }
}
```

---

## RequirementProgressEntry Structure

Each requirement within a tile has its own entry:

```typescript
interface RequirementProgressEntry {
  /** Is this specific requirement complete? */
  isCompleted: boolean;
  
  /** Numeric progress value (count, time, XP gained, etc.) */
  progressValue: number;
  
  /** Type-specific progress details */
  progressMetadata: RequirementProgressData;
}
```

---

## RequirementProgressData Types

All requirement metadata types share a base structure:

```typescript
interface BaseRequirementProgress {
  /** The requirement type identifier */
  requirementType: 'ITEM_DROP' | 'SPEEDRUN' | 'EXPERIENCE' | 'PET' | 
                   'VALUE_DROP' | 'CHAT' | 'BA_GAMBLES' | 'PUZZLE';
  
  /** Target value to reach for completion */
  targetValue: number;
  
  /** Last time progress was updated (ISO string) */
  lastUpdateAt: string;
  
  /** For tiered requirements - which tiers are complete */
  completedTiers?: TierCompletion[];
  
  /** For tiered requirements - highest tier number completed */
  currentTier?: number;
}

interface TierCompletion {
  tier: number;
  completedAt: string;
  completedByOsrsAccountId: number;
}
```

### Type-Specific Fields

Each requirement type adds its own fields to the base:

---

### ITEM_DROP

Tracks items obtained from drops, chests, etc.

```typescript
interface ItemDropProgressMetadata extends BaseRequirementProgress {
  requirementType: 'ITEM_DROP';
  
  /** Total count of required items obtained */
  currentTotalCount: number;
  
  /** Last items that were obtained */
  lastItemsObtained?: Array<{
    itemId: number;
    itemName: string;
    quantity: number;
  }>;
  
  /** Per-player contribution tracking */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    items: Array<{
      itemId: number;
      itemName: string;
      quantity: number;
    }>;
    totalCount: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "ITEM_DROP",
  "targetValue": 2,
  "lastUpdateAt": "2025-12-06T14:30:00.000Z",
  "currentTotalCount": 1,
  "lastItemsObtained": [
    { "itemId": 30631, "itemName": "Fire element staff crown", "quantity": 1 }
  ],
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "items": [
        { "itemId": 30631, "itemName": "Fire element staff crown", "quantity": 1 }
      ],
      "totalCount": 1
    }
  ]
}
```

---

### SPEEDRUN

Tracks personal best times for bosses/raids.

```typescript
interface SpeedrunProgressMetadata extends BaseRequirementProgress {
  requirementType: 'SPEEDRUN';
  
  /** Best time achieved in seconds */
  currentBestTimeSeconds: number;
  
  /** Target time to beat */
  goalSeconds: number;
  
  /** All recorded attempts */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    attempts: Array<{
      timeSeconds: number;
      achievedAt: string;
      osrsAccountId: number;
      osrsNickname: string;
    }>;
    bestTimeSeconds: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "SPEEDRUN",
  "targetValue": 120,
  "goalSeconds": 120,
  "lastUpdateAt": "2025-12-06T15:00:00.000Z",
  "currentBestTimeSeconds": 95,
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "attempts": [
        {
          "timeSeconds": 95,
          "achievedAt": "2025-12-06T15:00:00.000Z",
          "osrsAccountId": 5,
          "osrsNickname": "Seichel"
        }
      ],
      "bestTimeSeconds": 95
    }
  ],
  "completedTiers": [
    { "tier": 1, "completedAt": "2025-12-06T15:00:00.000Z", "completedByOsrsAccountId": 5 }
  ],
  "currentTier": 1
}
```

---

### EXPERIENCE

Tracks XP gained in a skill during the event.

```typescript
interface ExperienceProgressMetadata extends BaseRequirementProgress {
  requirementType: 'EXPERIENCE';
  
  /** Skill being tracked */
  skill: string;
  
  /** Target XP to gain */
  targetXp: number;
  
  /** Total XP gained so far */
  currentTotalXp: number;
  
  /** Per-player XP contributions */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    xpGained: number;
    startXp: number;
    currentXp: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "EXPERIENCE",
  "targetValue": 500000,
  "targetXp": 500000,
  "skill": "mining",
  "lastUpdateAt": "2025-12-06T16:00:00.000Z",
  "currentTotalXp": 125000,
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "xpGained": 75000,
      "startXp": 5000000,
      "currentXp": 5075000
    },
    {
      "osrsAccountId": 10,
      "osrsNickname": "HabaGG",
      "xpGained": 50000,
      "startXp": 3200000,
      "currentXp": 3250000
    }
  ]
}
```

---

### PET

Tracks pet drops.

```typescript
interface PetProgressMetadata extends BaseRequirementProgress {
  requirementType: 'PET';
  
  /** Count of pets obtained */
  currentTotalCount: number;
  
  /** Specific pets obtained */
  petsObtained?: Array<{
    petId?: number;
    petName: string;
    obtainedAt: string;
    obtainedBy: string;
  }>;
  
  /** Per-player contributions */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    pets: Array<{
      petId?: number;
      petName: string;
      obtainedAt: string;
    }>;
    totalCount: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "PET",
  "targetValue": 1,
  "lastUpdateAt": "2025-12-06T17:00:00.000Z",
  "currentTotalCount": 1,
  "petsObtained": [
    { "petName": "Beaver", "obtainedAt": "2025-12-06T17:00:00.000Z", "obtainedBy": "Seichel" }
  ],
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "pets": [
        { "petName": "Beaver", "obtainedAt": "2025-12-06T17:00:00.000Z" }
      ],
      "totalCount": 1
    }
  ]
}
```

---

### VALUE_DROP

Tracks high-value drops (e.g., get a drop worth 1M+).

```typescript
interface ValueDropProgressMetadata extends BaseRequirementProgress {
  requirementType: 'VALUE_DROP';
  
  /** Best single drop value achieved */
  currentBestValue: number;
  
  /** Per-player contributions */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    drops: Array<{
      itemId: number;
      itemName: string;
      value: number;
      quantity: number;
      obtainedAt: string;
    }>;
    bestValue: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "VALUE_DROP",
  "targetValue": 5000000,
  "lastUpdateAt": "2025-12-06T18:00:00.000Z",
  "currentBestValue": 7500000,
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "drops": [
        {
          "itemId": 12073,
          "itemName": "Dragon warhammer",
          "value": 7500000,
          "quantity": 1,
          "obtainedAt": "2025-12-06T18:00:00.000Z"
        }
      ],
      "bestValue": 7500000
    }
  ]
}
```

---

### CHAT

Tracks game messages/chat triggers.

```typescript
interface ChatProgressMetadata extends BaseRequirementProgress {
  requirementType: 'CHAT';
  
  /** Target number of triggers */
  targetCount: number;
  
  /** Current trigger count */
  currentTotalCount: number;
  
  /** Last messages that triggered */
  lastMessages?: Array<{
    message: string;
    triggeredAt: string;
    triggeredBy: string;
  }>;
  
  /** Per-player contributions */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    triggerCount: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "CHAT",
  "targetValue": 1,
  "targetCount": 1,
  "lastUpdateAt": "2025-12-06T19:00:00.000Z",
  "currentTotalCount": 1,
  "lastMessages": [
    {
      "message": "Congratulations, you have completed a master clue scroll!",
      "triggeredAt": "2025-12-06T19:00:00.000Z",
      "triggeredBy": "Seichel"
    }
  ],
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "triggerCount": 1
    }
  ]
}
```

---

### BA_GAMBLES

Tracks Barbarian Assault high gamble attempts.

```typescript
interface BaGamblesProgressMetadata extends BaseRequirementProgress {
  requirementType: 'BA_GAMBLES';
  
  /** Total gambles completed */
  currentTotalGambles: number;
  
  /** Per-player contributions */
  playerContributions: Array<{
    osrsAccountId: number;
    osrsNickname: string;
    memberId?: number;
    gambleCount: number;
  }>;
}
```

**Example:**
```json
{
  "requirementType": "BA_GAMBLES",
  "targetValue": 50,
  "lastUpdateAt": "2025-12-06T20:00:00.000Z",
  "currentTotalGambles": 23,
  "playerContributions": [
    {
      "osrsAccountId": 5,
      "osrsNickname": "Seichel",
      "gambleCount": 15
    },
    {
      "osrsAccountId": 10,
      "osrsNickname": "HabaGG",
      "gambleCount": 8
    }
  ]
}
```

---

### PUZZLE

Wraps another requirement type with custom display. The hidden progress is tracked internally.

```typescript
interface PuzzleProgressMetadata extends BaseRequirementProgress {
  requirementType: 'PUZZLE';
  
  /** The actual hidden requirement type */
  hiddenRequirementType: string;
  
  /** Progress for the hidden requirement */
  hiddenProgressMetadata: RequirementProgressData;
  
  /** Has the puzzle been solved? */
  isSolved: boolean;
  
  /** When was it solved? */
  solvedAt?: string;
  
  /** Puzzle category for grouping */
  puzzleCategory?: string;
}
```

**Example:**
```json
{
  "requirementType": "PUZZLE",
  "hiddenRequirementType": "ITEM_DROP",
  "targetValue": 1,
  "lastUpdateAt": "2025-12-06T21:00:00.000Z",
  "isSolved": true,
  "solvedAt": "2025-12-06T21:00:00.000Z",
  "puzzleCategory": "anagrams",
  "hiddenProgressMetadata": {
    "requirementType": "ITEM_DROP",
    "targetValue": 1,
    "currentTotalCount": 1,
    "playerContributions": [
      {
        "osrsAccountId": 5,
        "osrsNickname": "Seichel",
        "items": [{ "itemId": 1739, "itemName": "Cowhide", "quantity": 1 }],
        "totalCount": 1
      }
    ]
  }
}
```

---

## Examples by Tile Type

### Simple Item Drop (Get 1 Dragon Warhammer)

```json
{
  "totalRequirements": 1,
  "completedRequirementIndices": [0],
  "requirementProgress": {
    "0": {
      "isCompleted": true,
      "progressValue": 1,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 1,
        "lastUpdateAt": "2025-12-06T10:00:00.000Z",
        "currentTotalCount": 1,
        "lastItemsObtained": [
          { "itemId": 13576, "itemName": "Dragon warhammer", "quantity": 1 }
        ],
        "playerContributions": [
          {
            "osrsAccountId": 5,
            "osrsNickname": "Seichel",
            "items": [{ "itemId": 13576, "itemName": "Dragon warhammer", "quantity": 1 }],
            "totalCount": 1
          }
        ]
      }
    }
  }
}
```

### Unique Items (Get 2 different items from a list of 3)

Tile requires getting 2 unique items from: Hammer, Cowhide, Raw Beef

```json
{
  "totalRequirements": 1,
  "completedRequirementIndices": [0],
  "requirementProgress": {
    "0": {
      "isCompleted": true,
      "progressValue": 2,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 2,
        "lastUpdateAt": "2025-12-06T11:00:00.000Z",
        "currentTotalCount": 2,
        "lastItemsObtained": [
          { "itemId": 1739, "itemName": "Cowhide", "quantity": 1 }
        ],
        "playerContributions": [
          {
            "osrsAccountId": 5,
            "osrsNickname": "Seichel",
            "items": [
              { "itemId": 2347, "itemName": "Hammer", "quantity": 1 },
              { "itemId": 1739, "itemName": "Cowhide", "quantity": 1 }
            ],
            "totalCount": 2
          }
        ]
      }
    }
  }
}
```

### Speedrun with Tiers (Scurrius under 2:00 / 1:30 / 1:00)

```json
{
  "totalRequirements": 1,
  "completedRequirementIndices": [0],
  "requirementProgress": {
    "0": {
      "isCompleted": true,
      "progressValue": 85,
      "progressMetadata": {
        "requirementType": "SPEEDRUN",
        "targetValue": 60,
        "goalSeconds": 60,
        "lastUpdateAt": "2025-12-06T12:00:00.000Z",
        "currentBestTimeSeconds": 85,
        "playerContributions": [
          {
            "osrsAccountId": 5,
            "osrsNickname": "Seichel",
            "attempts": [
              { "timeSeconds": 110, "achievedAt": "2025-12-06T11:00:00.000Z", "osrsAccountId": 5, "osrsNickname": "Seichel" },
              { "timeSeconds": 85, "achievedAt": "2025-12-06T12:00:00.000Z", "osrsAccountId": 5, "osrsNickname": "Seichel" }
            ],
            "bestTimeSeconds": 85
          }
        ],
        "completedTiers": [
          { "tier": 1, "completedAt": "2025-12-06T11:00:00.000Z", "completedByOsrsAccountId": 5 },
          { "tier": 2, "completedAt": "2025-12-06T12:00:00.000Z", "completedByOsrsAccountId": 5 }
        ],
        "currentTier": 2
      }
    }
  }
}
```

---

## Multi-Requirement Tiles

Tiles with `matchType: "all"` require ALL requirements to be completed.

### Example: Get Cowhide AND Get Raw Chicken (2 requirements)

**Before any progress:**
```json
{
  "totalRequirements": 2,
  "completedRequirementIndices": [],
  "requirementProgress": {
    "0": {
      "isCompleted": false,
      "progressValue": 0,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 1,
        "currentTotalCount": 0,
        "playerContributions": []
      }
    },
    "1": {
      "isCompleted": false,
      "progressValue": 0,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 1,
        "currentTotalCount": 0,
        "playerContributions": []
      }
    }
  }
}
```

**After getting Cowhide (1 of 2 done):**
```json
{
  "totalRequirements": 2,
  "completedRequirementIndices": [0],
  "requirementProgress": {
    "0": {
      "isCompleted": true,
      "progressValue": 1,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 1,
        "currentTotalCount": 1,
        "lastItemsObtained": [{ "itemId": 1739, "itemName": "Cowhide", "quantity": 1 }],
        "playerContributions": [
          { "osrsAccountId": 5, "osrsNickname": "Seichel", "items": [...], "totalCount": 1 }
        ]
      }
    },
    "1": {
      "isCompleted": false,
      "progressValue": 0,
      "progressMetadata": { ... }
    }
  }
}
```

**After getting both items (tile complete):**
```json
{
  "totalRequirements": 2,
  "completedRequirementIndices": [0, 1],
  "requirementProgress": {
    "0": { "isCompleted": true, ... },
    "1": { "isCompleted": true, ... }
  }
}
```

**Determining tile completion:**
```typescript
const isComplete = metadata.completedRequirementIndices.length >= metadata.totalRequirements;
```

---

## Tiered Tiles

Tiered tiles have bonus point tiers. When a higher tier is completed, all lower tiers auto-complete.

### Reading Tier Info

Tier information is stored on the first requirement's metadata:

```typescript
const reqProgress = metadata.requirementProgress["0"];
const completedTiers = reqProgress.progressMetadata.completedTiers || [];
const currentTier = reqProgress.progressMetadata.currentTier;
```

### Example Structure

```json
{
  "totalRequirements": 1,
  "completedRequirementIndices": [0],
  "requirementProgress": {
    "0": {
      "isCompleted": true,
      "progressValue": 4,
      "progressMetadata": {
        "requirementType": "ITEM_DROP",
        "targetValue": 4,
        "currentTotalCount": 4,
        "completedTiers": [
          { "tier": 1, "completedAt": "2025-12-06T10:00:00.000Z", "completedByOsrsAccountId": 5 },
          { "tier": 2, "completedAt": "2025-12-06T11:00:00.000Z", "completedByOsrsAccountId": 10 }
        ],
        "currentTier": 2,
        "playerContributions": [...]
      }
    }
  }
}
```

---

## Manual Completion via Admin API

The frontend can build the complete `TileProgressMetadata` structure to manually mark tiles as complete or add entries via the admin API.

### Endpoint

```
PUT /api/admin/clan-events/events/:eventId/teams/:teamId/board/bulk
```

### Request Body

```typescript
interface BulkUpdateRequest {
  tiles: Array<{
    boardTileId?: string;       // ID of existing board tile (for updates)
    tileId: string;             // Reference to bingo_tiles.id
    position: string;           // e.g., "A1", "B3"
    metadata?: object;          // Optional board tile metadata
    isCompleted?: boolean;      // Mark tile as complete
    progress?: {
      progressValue: number;
      progressMetadata: TileProgressMetadata;  // THE FULL STRUCTURE
      completedByOsrsAccountId?: number;
      completionType?: 'auto' | 'manual_admin';
    };
  }>;
}
```

### Building Manual Completion Payload

**Example: Manually mark an ITEM_DROP tile as complete**

```typescript
const progressPayload = {
  progressValue: 1,
  progressMetadata: {
    totalRequirements: 1,
    completedRequirementIndices: [0],
    requirementProgress: {
      "0": {
        isCompleted: true,
        progressValue: 1,
        progressMetadata: {
          requirementType: "ITEM_DROP",
          targetValue: 1,
          lastUpdateAt: new Date().toISOString(),
          currentTotalCount: 1,
          lastItemsObtained: [
            { itemId: 13576, itemName: "Dragon warhammer", quantity: 1 }
          ],
          playerContributions: [
            {
              osrsAccountId: 5,
              osrsNickname: "Seichel",
              items: [
                { itemId: 13576, itemName: "Dragon warhammer", quantity: 1 }
              ],
              totalCount: 1
            }
          ]
        }
      }
    }
  },
  completedByOsrsAccountId: 5,
  completionType: "manual_admin"
};

// Full request
const request = {
  tiles: [{
    boardTileId: "existing-board-tile-uuid",
    tileId: "obtain_dwh",
    position: "A1",
    isCompleted: true,
    progress: progressPayload
  }]
};
```

**Example: Manually mark a multi-requirement tile as partially complete**

```typescript
const progressPayload = {
  progressValue: 1,
  progressMetadata: {
    totalRequirements: 2,
    completedRequirementIndices: [0],  // Only first requirement done
    requirementProgress: {
      "0": {
        isCompleted: true,
        progressValue: 1,
        progressMetadata: {
          requirementType: "ITEM_DROP",
          targetValue: 1,
          lastUpdateAt: new Date().toISOString(),
          currentTotalCount: 1,
          playerContributions: [
            { osrsAccountId: 5, osrsNickname: "Seichel", items: [...], totalCount: 1 }
          ]
        }
      },
      "1": {
        isCompleted: false,
        progressValue: 0,
        progressMetadata: {
          requirementType: "ITEM_DROP",
          targetValue: 1,
          lastUpdateAt: new Date().toISOString(),
          currentTotalCount: 0,
          playerContributions: []
        }
      }
    }
  },
  completionType: "manual_admin"
};
```

**Example: Add speedrun time with tier completion**

```typescript
const progressPayload = {
  progressValue: 85,  // Time in seconds
  progressMetadata: {
    totalRequirements: 1,
    completedRequirementIndices: [0],
    requirementProgress: {
      "0": {
        isCompleted: true,
        progressValue: 85,
        progressMetadata: {
          requirementType: "SPEEDRUN",
          targetValue: 60,
          goalSeconds: 60,
          lastUpdateAt: new Date().toISOString(),
          currentBestTimeSeconds: 85,
          playerContributions: [
            {
              osrsAccountId: 5,
              osrsNickname: "Seichel",
              attempts: [
                {
                  timeSeconds: 85,
                  achievedAt: new Date().toISOString(),
                  osrsAccountId: 5,
                  osrsNickname: "Seichel"
                }
              ],
              bestTimeSeconds: 85
            }
          ],
          completedTiers: [
            { tier: 1, completedAt: new Date().toISOString(), completedByOsrsAccountId: 5 },
            { tier: 2, completedAt: new Date().toISOString(), completedByOsrsAccountId: 5 }
          ],
          currentTier: 2
        }
      }
    }
  },
  completedByOsrsAccountId: 5,
  completionType: "manual_admin"
};
```

---

## Endpoints Reference

### Public Endpoint (no auth)

```
GET /api/public/bingo/:eventId
```

Returns `progress` on each tile with:
- `progressValue`
- `targetValue`
- `completedTiers` (tier numbers only)
- `currentTier`
- `completedRequirementIndices`
- `totalRequirements`
- `requirementProgress`

### App Endpoint (authenticated users)

```
GET /api/app/clan-events/events/:eventId
```

Returns full event data including boards and tile progress.

### Contributions Endpoint

```
GET /api/app/clan-events/events/:eventId/my-contributions
GET /api/app/clan-events/events/:eventId/contributions/team
```

Returns extracted player contributions from the progress metadata.

### Admin Endpoints

```
GET  /api/admin/clan-events/events/:eventId/teams/:teamId/board
PUT  /api/admin/clan-events/events/:eventId/teams/:teamId/board/bulk
POST /api/admin/clan-events/events/:eventId/teams/:teamId/board/tiles/:tileId/complete
POST /api/admin/clan-events/events/:eventId/teams/:teamId/board/tiles/:tileId/revert
```

---

## TypeScript Types Reference

For complete TypeScript types, see:
- `src/modules/events/bingo/types/bingo-requirements.type.ts`

Key exports:
```typescript
import type {
  TileProgressMetadata,
  RequirementProgressEntry,
  RequirementProgressData,
  ItemDropProgressMetadata,
  SpeedrunProgressMetadata,
  ExperienceProgressMetadata,
  PetProgressMetadata,
  ValueDropProgressMetadata,
  ChatProgressMetadata,
  BaGamblesProgressMetadata,
  PuzzleProgressMetadata,
  TierCompletion
} from './types/bingo-requirements.type.js';

// Helper functions
import {
  getRequirementProgress,
  createEmptyTileProgress,
  getCompletedTiers,
  getCurrentTier
} from './types/bingo-requirements.type.js';
```

---

## Summary

1. **All progress uses `TileProgressMetadata`** as the top-level structure
2. **Each requirement has its own `RequirementProgressEntry`** in `requirementProgress`
3. **Check `completedRequirementIndices.length >= totalRequirements`** to determine if tile is complete
4. **Tier info is on the first requirement** (`requirementProgress["0"].progressMetadata.completedTiers`)
5. **Frontend can build complete metadata** for manual entries via the admin bulk endpoint
6. **All endpoints return the same structure** - consistent data model everywhere

