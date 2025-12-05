# Public Bingo API

## Overview

The public bingo API provides read-only access to bingo event data for spectators and landing pages. No authentication is required.

**The public endpoint returns the same requirement data as the authenticated app endpoint**, with only one difference: `hiddenRequirement` is removed from PUZZLE types to keep puzzle solutions hidden.

## Endpoints

### GET `/api/public/bingo/:eventId`

Returns comprehensive public data about a bingo event, including teams, scores, boards, and tile progress.

## Response Structure

```typescript
{
  success: boolean;
  data: {
    event: EventInfo;
    teams: PublicTeam[];
    summary: {
      totalTeams: number;
      totalCompletedTiles: number;
    };
    visibility: {
      tilesVisible: boolean;
      tilesRevealAt?: string;  // ISO timestamp (UTC)
      message?: string;
    };
  }
}
```

## Time-Based Tile Visibility

Tiles are **hidden** until 3 hours before the event starts. This prevents early strategy planning and maintains excitement.

- When `visibility.tilesVisible = false`:
  - `board.tiles` will be `null`
  - `board.tilesHidden` will be `true`
  - Row and column effects are still visible
  - `visibility.tilesRevealAt` shows when tiles will become visible

## Requirements Format

Requirements are passed through exactly as stored in the database. The structure matches the app endpoint.

### Standard Requirements

```json
{
  "matchType": "all",
  "requirements": [
    {
      "type": "ITEM_DROP",
      "items": [
        { "itemId": 30085, "itemName": "Hueycoatl hide", "itemAmount": 1 },
        { "itemId": 30066, "itemName": "Tome of earth", "itemAmount": 1 },
        { "itemId": 30070, "itemName": "Dragon hunter wand", "itemAmount": 1 }
      ],
      "totalAmount": 2
    }
  ]
}
```

### Tiered Requirements

```json
{
  "matchType": "any",
  "tiers": [
    {
      "tier": 1,
      "points": 1,
      "requirement": {
        "type": "SPEEDRUN",
        "location": "Scurrius",
        "time": 180
      }
    },
    {
      "tier": 2,
      "points": 2,
      "requirement": {
        "type": "SPEEDRUN",
        "location": "Scurrius",
        "time": 120
      }
    }
  ]
}
```

### PUZZLE Requirements (Sanitized)

For PUZZLE types, the `hiddenRequirement` is removed. Only public display fields are included:

```json
{
  "type": "PUZZLE",
  "displayName": "Obtain RYLE",
  "displayDescription": "Figure out the anagram - RYLE - to know what you need to obtain.",
  "displayHint": "",
  "displayIcon": "🧩",
  "puzzleCategory": "anagram",
  "revealOnComplete": true
}
```

**Note:** The actual tracking requirement (e.g., which item to obtain) is hidden from the public API.

## Requirement Types Reference

| Type | Key Fields |
|------|------------|
| `ITEM_DROP` | `items[]`, `totalAmount`, `sources[]` (optional - limits to specific NPCs/bosses) |
| `SPEEDRUN` | `location`, `time` (seconds) |
| `EXPERIENCE` | `skill`, `experience` |
| `VALUE_DROP` | `value` (min GP value) |
| `PET` | `petName` |
| `KILL_COUNT` | `npcName`, `count` |
| `COMBAT_ACHIEVEMENT` | `tier`, `count` |
| `COLLECTION_LOG` | `count` |
| `BA_GAMBLES` | `amount` |
| `LEVEL` | `skill`, `level` |
| `TOTAL_LEVEL` | `level` |
| `QUEST` | `questName` |
| `CHAT` | `message`, `exactMatch` |
| `PUZZLE` | `displayName`, `displayDescription`, `displayHint`, `displayIcon`, `puzzleCategory` |

## Full Type Definitions

### PublicTeam

```typescript
interface PublicTeam {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  score: number;
  memberCount: number;
  completedTiles: number;
  members: PublicTeamMember[];
  board: PublicBoard | null;
}

interface PublicTeamMember {
  osrsName: string;
  role: "captain" | "member";
}
```

### PublicBoard

```typescript
interface PublicBoard {
  id: string;
  rows: number;
  columns: number;
  tiles: PublicBoardTile[] | null;  // null if hidden
  tilesHidden: boolean;
  tilesHiddenMessage?: string;
  tilesRevealAt?: string;           // ISO timestamp (UTC)
  rowEffects: PublicLineEffect[];
  columnEffects: PublicLineEffect[];
}
```

### PublicBoardTile

```typescript
interface PublicBoardTile {
  id: string;
  position: string;              // e.g., "A1", "B3"
  isCompleted: boolean;
  completedAt: string | null;    // ISO timestamp (UTC)
  task: string;
  category: string;
  difficulty: string;
  icon: string | null;
  points: number;
  progress: PublicTileProgress | null;
  effects: PublicEffect[];
  requirements: any;             // Full requirements object (sanitized)
}

interface PublicTileProgress {
  progressValue: number;
  targetValue: number | null;
  completedTiers: number[];
  currentTier: number | null;
  // For multi-requirement tiles (matchType: "all"):
  completedRequirementIndices: number[];  // Which requirements are done
  totalRequirements: number | null;       // How many total
  requirementProgress: {                  // Individual progress per requirement
    [index: string]: {
      isCompleted: boolean;
      progressValue: number;
      progressMetadata: any;
    }
  } | null;
}
```

### PublicLineEffect

```typescript
interface PublicLineEffect {
  lineType: "row" | "column";
  lineIdentifier: string;        // Row number or column letter
  name: string;
  description: string | null;
  icon: string | null;
  type: "buff" | "debuff";
  effectType: string;
  effectValue: number | null;
}
```

### PublicEffect (Tile Effect)

```typescript
interface PublicEffect {
  name: string;
  description: string | null;
  icon: string | null;
  type: "buff" | "debuff";
  effectType: string;
  effectValue: number | null;
}
```

## Example Response

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "ea410306-02cf-458e-b489-c65dba4ff4be",
      "name": "Winter Bingo 2025",
      "description": "Compete for glory!",
      "eventType": "bingo",
      "status": "active",
      "startDate": "2025-12-06T18:00:00.000Z",
      "endDate": "2025-12-13T18:00:00.000Z"
    },
    "teams": [
      {
        "id": "team-uuid",
        "name": "The Champions",
        "color": "#FF5733",
        "icon": "🏆",
        "score": 42,
        "memberCount": 4,
        "completedTiles": 8,
        "members": [
          { "osrsName": "Lightroom CC", "role": "captain" },
          { "osrsName": "Rust Pure", "role": "member" }
        ],
        "board": {
          "id": "board-uuid",
          "rows": 5,
          "columns": 5,
          "tilesHidden": false,
          "tiles": [
            {
              "id": "tile-uuid",
              "position": "A1",
              "isCompleted": true,
              "completedAt": "2025-12-07T10:30:00.000Z",
              "task": "Obtain 2 uniques from Hueycoatl",
              "category": "pvm",
              "difficulty": "medium",
              "icon": "Hueycoatl_hide",
              "points": 3,
              "progress": {
                "progressValue": 2,
                "targetValue": 2,
                "completedTiers": [],
                "currentTier": null
              },
              "effects": [],
              "requirements": {
                "matchType": "all",
                "requirements": [
                  {
                    "type": "ITEM_DROP",
                    "items": [
                      { "itemId": 30085, "itemName": "Hueycoatl hide", "itemAmount": 1 },
                      { "itemId": 30066, "itemName": "Tome of earth", "itemAmount": 1 },
                      { "itemId": 30070, "itemName": "Dragon hunter wand", "itemAmount": 1 }
                    ],
                    "totalAmount": 2
                  }
                ]
              }
            }
          ],
          "rowEffects": [
            {
              "lineType": "row",
              "lineIdentifier": "1",
              "name": "Bonus Points: 10",
              "description": "Awards 10 extra points",
              "icon": "✨",
              "type": "buff",
              "effectType": "point_bonus",
              "effectValue": 10
            }
          ],
          "columnEffects": []
        }
      }
    ],
    "summary": {
      "totalTeams": 6,
      "totalCompletedTiles": 45
    },
    "visibility": {
      "tilesVisible": true
    }
  }
}
```

## Error Responses

### Event Not Found (404)

```json
{
  "success": false,
  "error": "Event not found"
}
```

### Wrong Event Type (400)

```json
{
  "success": false,
  "error": "This endpoint only supports bingo events"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Failed to fetch event data",
  "message": "Detailed error message"
}
```

## Frontend Implementation Tips

1. **Check `visibility.tilesVisible`** before rendering the board
2. **Handle `tilesRevealAt`** - show countdown timer if tiles are hidden
3. **Sort teams by `score`** - response is already sorted DESC
4. **Highlight captains** - members with `role: "captain"` should be distinguished
5. **All dates are UTC** - convert to local time for display
6. **Use `requirements.matchType`** to understand if all requirements must be met or just one
7. **For `ITEM_DROP` with `totalAmount`** - this means "get X unique items from the list"
8. **For `SPEEDRUN`** - `time` is in seconds, format for display (e.g., 180 → "3:00")
