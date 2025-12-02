# Puzzle Tiles & Public API - Frontend Documentation

## Overview

Puzzle tiles are a special tile type that **hides the actual tracking requirement** from users. Instead of showing "Obtain Goblin mail", you can show "Solve the Anagram: NOBGIL LIAM" - and the system secretly tracks when a player obtains a Goblin mail.

This enables creative, engaging gameplay mechanics like:
- **Anagrams**: Scrambled item/NPC names players must decode
- **Riddles**: Cryptic clues that hint at specific actions
- **Scavenger Hunts**: Hidden objectives players discover through play
- **Mystery Tasks**: Completely hidden objectives (reveal on completion)
- **Cipher Puzzles**: Encoded messages that reveal tasks

## API Response Structure

### Public API (`GET /api/public/bingo/:eventId`)

#### Time-Based Tile Visibility

**Important**: Tiles are **hidden** if the current time is more than 3 hours before the event start time. During this period:
- `board.tiles` will be `null`
- `board.tilesHidden` will be `true`
- Row and column effects are still visible
- Team info (scores, members) is still visible

```typescript
interface PublicBoard {
  id: string;
  rows: number;
  columns: number;
  tiles: PublicBoardTile[] | null;  // null if hidden
  tilesHidden: boolean;              // true if tiles are hidden
  tilesHiddenMessage?: string;       // "Tiles will be revealed 3 hours before the event starts"
  tilesRevealAt?: string;            // ISO timestamp when tiles will be revealed
  rowEffects: PublicLineEffect[];    // Always visible
  columnEffects: PublicLineEffect[]; // Always visible
}
```

#### Tile Structure (when visible)

```typescript
interface PublicBoardTile {
  id: string;
  position: string;
  isCompleted: boolean;
  completedAt: string | null;
  task: string;                      // Overridden with first puzzle's displayName if exists
  category: string;
  difficulty: string;
  icon: string | null;               // Overridden with first puzzle's displayIcon if exists
  points: number;
  progress: PublicTileProgress | null;
  effects: PublicEffect[];
  
  // ALL requirements (sanitized for public view)
  requirements: PublicRequirementInfo[];
  
  // Tier info (if tile has tiers)
  tiers?: PublicTierInfo[];
  
  // Whether any requirement is a puzzle
  hasPuzzle: boolean;
}

interface PublicRequirementInfo {
  type: string;  // 'PUZZLE', 'ITEM_DROP', 'PET', etc.
  
  // For PUZZLE type only:
  puzzle?: {
    displayName: string;
    displayDescription: string;
    displayHint?: string;
    displayIcon?: string;
    puzzleCategory?: string;
    isSolved: boolean;
    revealAnswer?: boolean;
  };
  
  // For non-puzzle types (basic description without revealing targets):
  description?: string;  // e.g., "Obtain 3 different items", "Complete speedrun"
}

interface PublicTierInfo {
  tier: number;
  points: number;
  isCompleted: boolean;
  requirement: PublicRequirementInfo;
}

interface PublicTileProgress {
  progressValue: number;
  targetValue: number | null;
  completedTiers: number[];
  currentTier: number | null;
}
```

### Example Response - Tiles Hidden (> 3 hours before start)

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-uuid",
      "name": "Winter Bingo 2025",
      "startDate": "2025-12-15T18:00:00.000Z",
      "status": "scheduled"
    },
    "teams": [
      {
        "id": "team-uuid",
        "name": "Team Red",
        "score": 0,
        "memberCount": 5,
        "completedTiles": 0,
        "members": [{ "osrsName": "Player1" }],
        "board": {
          "id": "board-uuid",
          "rows": 5,
          "columns": 5,
          "tiles": null,
          "tilesHidden": true,
          "tilesHiddenMessage": "Tiles will be revealed 3 hours before the event starts",
          "tilesRevealAt": "2025-12-15T15:00:00.000Z",
          "rowEffects": [
            {
              "lineType": "row",
              "lineIdentifier": "A",
              "name": "Double Points Row",
              "description": "All tiles in row A give double points",
              "icon": "⭐",
              "type": "buff",
              "effectType": "points_multiplier",
              "effectValue": 2.0
            }
          ],
          "columnEffects": []
        }
      }
    ]
  }
}
```

### Example Response - Tiles Visible (within 3 hours of start or after)

```json
{
  "success": true,
  "data": {
    "event": { "..." },
    "teams": [
      {
        "id": "team-uuid",
        "name": "Team Red",
        "board": {
          "id": "board-uuid",
          "rows": 5,
          "columns": 5,
          "tiles": [
            {
              "id": "tile-uuid",
              "position": "A1",
              "isCompleted": false,
              "completedAt": null,
              "task": "Solve the Anagram",
              "category": "pvm",
              "difficulty": "easy",
              "icon": "🧩",
              "points": 10,
              "progress": null,
              "effects": [],
              "requirements": [
                {
                  "type": "PUZZLE",
                  "puzzle": {
                    "displayName": "Solve the Anagram",
                    "displayDescription": "Unscramble: NOBGIL LIAM",
                    "displayHint": "A piece of armor from a small green creature",
                    "displayIcon": "🧩",
                    "puzzleCategory": "anagram",
                    "isSolved": false,
                    "revealAnswer": false
                  }
                },
                {
                  "type": "ITEM_DROP",
                  "description": "Obtain an item"
                }
              ],
              "tiers": [
                {
                  "tier": 1,
                  "points": 5,
                  "isCompleted": false,
                  "requirement": {
                    "type": "ITEM_DROP",
                    "description": "Obtain an item"
                  }
                },
                {
                  "tier": 2,
                  "points": 10,
                  "isCompleted": false,
                  "requirement": {
                    "type": "ITEM_DROP",
                    "description": "Obtain an item"
                  }
                }
              ],
              "hasPuzzle": true,
              "tilesHidden": false
            }
          ],
          "tilesHidden": false,
          "rowEffects": [],
          "columnEffects": []
        }
      }
    ]
  }
}
```

## Frontend Implementation Guide

### 1. Handling Hidden Tiles

```typescript
const BingoBoard = ({ board }: { board: PublicBoard }) => {
  // Check if tiles are hidden (more than 3 hours before event start)
  if (board.tilesHidden) {
    return (
      <div className="board-hidden">
        <div className="hidden-message">
          <h3>🔒 Tiles Hidden</h3>
          <p>{board.tilesHiddenMessage}</p>
          {board.tilesRevealAt && (
            <p>Reveals at: {new Date(board.tilesRevealAt).toLocaleString()}</p>
          )}
        </div>
        
        {/* Row/Column effects are still visible */}
        <EffectsPreview 
          rowEffects={board.rowEffects} 
          columnEffects={board.columnEffects} 
        />
      </div>
    );
  }
  
  // Tiles are visible
  return (
    <div className="board-grid">
      {board.tiles?.map(tile => <TileCard key={tile.id} tile={tile} />)}
    </div>
  );
};
```

### 2. Detecting Puzzle Tiles

```typescript
const isPuzzleTile = (tile: PublicBoardTile): boolean => {
  return tile.hasPuzzle === true;
};

// Get all puzzle requirements from a tile
const getPuzzleRequirements = (tile: PublicBoardTile) => {
  return tile.requirements.filter(r => r.type === 'PUZZLE');
};
```

### 3. Rendering Tiles with Multiple Requirements

```tsx
const TileCard = ({ tile }: { tile: PublicBoardTile }) => {
  return (
    <div className={`tile ${tile.hasPuzzle ? 'has-puzzle' : ''}`}>
      <h3>{tile.task}</h3>
      <span className="points">{tile.points} pts</span>
      
      {/* Render all requirements */}
      <div className="requirements">
        {tile.requirements.map((req, i) => (
          <RequirementDisplay key={i} requirement={req} />
        ))}
      </div>
      
      {/* Render tiers if present */}
      {tile.tiers && tile.tiers.length > 0 && (
        <div className="tiers">
          <h4>Bonus Tiers</h4>
          {tile.tiers.map(tier => (
            <TierDisplay key={tier.tier} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
};

const RequirementDisplay = ({ requirement }: { requirement: PublicRequirementInfo }) => {
  if (requirement.type === 'PUZZLE' && requirement.puzzle) {
    return <PuzzleRequirement puzzle={requirement.puzzle} />;
  }
  
  return (
    <div className="requirement">
      <span className="type-badge">{requirement.type}</span>
      <span className="description">{requirement.description}</span>
    </div>
  );
};

const PuzzleRequirement = ({ puzzle }) => {
  return (
    <div className={`puzzle-requirement ${puzzle.puzzleCategory || 'mystery'}`}>
      <div className="puzzle-icon">{puzzle.displayIcon || '🧩'}</div>
      <h4>{puzzle.displayName}</h4>
      <p className="puzzle-description">{puzzle.displayDescription}</p>
      
      {puzzle.displayHint && (
        <HintSection hint={puzzle.displayHint} />
      )}
      
      <div className="puzzle-status">
        {puzzle.isSolved ? '✅ Solved!' : '🔒 Unsolved'}
      </div>
    </div>
  );
};

const TierDisplay = ({ tier }: { tier: PublicTierInfo }) => {
  return (
    <div className={`tier ${tier.isCompleted ? 'completed' : ''}`}>
      <span className="tier-number">Tier {tier.tier}</span>
      <span className="tier-points">+{tier.points} pts</span>
      <RequirementDisplay requirement={tier.requirement} />
      {tier.isCompleted && <span className="checkmark">✓</span>}
    </div>
  );
};
```

### 3. Puzzle Categories & Styling

```typescript
const PUZZLE_CATEGORIES = {
  anagram: {
    icon: '🔤',
    label: 'Anagram',
    color: '#4A90D9',
    description: 'Unscramble the letters'
  },
  riddle: {
    icon: '❓',
    label: 'Riddle',
    color: '#9B59B6',
    description: 'Solve the riddle'
  },
  scavenger: {
    icon: '🔍',
    label: 'Scavenger Hunt',
    color: '#27AE60',
    description: 'Find the hidden item'
  },
  mystery: {
    icon: '❔',
    label: 'Mystery',
    color: '#7F8C8D',
    description: 'Unknown objective'
  },
  cipher: {
    icon: '🔐',
    label: 'Cipher',
    color: '#E74C3C',
    description: 'Decode the message'
  }
} as const;

const getPuzzleStyle = (category?: string) => {
  return PUZZLE_CATEGORIES[category as keyof typeof PUZZLE_CATEGORIES] 
    || PUZZLE_CATEGORIES.mystery;
};
```

### 4. Hint System

Consider implementing a progressive hint reveal:

```tsx
const HintSection = ({ hint }: { hint: string }) => {
  const [showHint, setShowHint] = useState(false);
  
  return (
    <div className="hint-section">
      <button 
        onClick={() => setShowHint(!showHint)}
        className="hint-toggle"
      >
        {showHint ? '🔓 Hide Hint' : '💡 Show Hint'}
      </button>
      
      {showHint && (
        <p className="hint-text">{hint}</p>
      )}
    </div>
  );
};
```

### 5. Progress Display for Puzzles

Puzzle progress can be displayed without revealing the actual requirement:

```tsx
const PuzzleProgress = ({ progress, puzzle }: Props) => {
  if (!progress) return null;
  
  // For puzzles, just show solved/unsolved status
  // Don't show specific progress values that might reveal the answer
  if (puzzle.isSolved) {
    return <Badge color="green">Solved ✓</Badge>;
  }
  
  // Optionally show "In Progress" if there's any progress
  if (progress.progressValue > 0) {
    return <Badge color="yellow">In Progress...</Badge>;
  }
  
  return <Badge color="gray">Not Started</Badge>;
};
```

## Admin/Creation API

### Creating a Puzzle Tile

When creating tiles via the admin API, use this structure for puzzle requirements:

```typescript
interface PuzzleRequirementDef {
  type: 'PUZZLE';
  
  // What users see
  displayName: string;           // "Solve the Anagram"
  displayDescription: string;    // "NOBGIL LIAM"
  displayHint?: string;          // "A piece of armor from a small green creature"
  displayIcon?: string;          // "🧩" or item icon
  puzzleCategory?: string;       // 'anagram' | 'riddle' | 'scavenger' | 'mystery' | 'cipher'
  
  // What the system tracks (hidden from users)
  hiddenRequirement: {
    type: 'ITEM_DROP' | 'CHAT' | 'PET' | 'VALUE_DROP' | 'SPEEDRUN' | 'EXPERIENCE' | 'BA_GAMBLES';
    // ... requirement-specific fields
  };
  
  // Whether to reveal the answer after completion
  revealOnComplete?: boolean;    // default: false
}
```

### Example: Creating an Anagram Puzzle

```json
{
  "id": "puzzle_anagram_goblin_mail",
  "task": "Solve the Anagram",
  "category": "pvm",
  "difficulty": "easy",
  "icon": "🧩",
  "points": 10,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "PUZZLE",
        "displayName": "Solve the Anagram",
        "displayDescription": "Unscramble: NOBGIL LIAM",
        "displayHint": "A piece of armor from a small green creature",
        "displayIcon": "🧩",
        "puzzleCategory": "anagram",
        "revealOnComplete": true,
        "hiddenRequirement": {
          "type": "ITEM_DROP",
          "items": [
            {
              "itemId": 288,
              "itemName": "Goblin mail",
              "itemAmount": 1
            }
          ]
        }
      }
    ]
  }
}
```

### Example: Chat-Based Riddle

```json
{
  "id": "puzzle_riddle_quest",
  "task": "Solve the Riddle",
  "category": "quests",
  "difficulty": "medium",
  "points": 15,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "PUZZLE",
        "displayName": "Ancient Wisdom",
        "displayDescription": "\"Speak to the one who guards the maze, where monkeys play their ancient ways.\"",
        "displayHint": "A quest on Ape Atoll...",
        "puzzleCategory": "riddle",
        "revealOnComplete": false,
        "hiddenRequirement": {
          "type": "CHAT",
          "message": "Congratulations! Quest complete",
          "source": "GAMEMESSAGE"
        }
      }
    ]
  }
}
```

## Chat Event Filtering

**Important**: For `CHAT` type hidden requirements, only these sources are tracked:
- `GAMEMESSAGE` - In-game system messages
- `ENGINE` - Engine-generated messages (quest completions, etc.)

Player chat messages (public chat, private chat, clan chat, etc.) are **NOT** tracked for security and fairness reasons.

## Best Practices

### For Event Organizers

1. **Balance difficulty**: Make puzzles challenging but solvable
2. **Provide fair hints**: Hints should guide without giving away the answer
3. **Test your puzzles**: Ensure the hidden requirement actually completes the puzzle
4. **Consider categories**: Use appropriate puzzle categories for theming
5. **Decide on reveal**: Choose whether to reveal answers after completion

### For Frontend Developers

1. **Always check `isPuzzle`**: Don't assume tile structure
2. **Handle missing puzzle data**: Gracefully handle edge cases
3. **Style consistently**: Use puzzle categories for theming
4. **Preserve mystery**: Don't show hidden requirement details
5. **Accessibility**: Ensure puzzles are accessible to all players

## Summary

| Field | Source | Visible to Users? |
|-------|--------|-------------------|
| `task` | Overridden by `displayName` | Yes |
| `icon` | Overridden by `displayIcon` | Yes |
| `puzzle.displayName` | Admin-defined | Yes |
| `puzzle.displayDescription` | Admin-defined | Yes |
| `puzzle.displayHint` | Admin-defined | Yes (optional reveal) |
| `puzzle.puzzleCategory` | Admin-defined | Yes |
| `puzzle.isSolved` | Progress tracking | Yes |
| `hiddenRequirement` | - | **NO** (never exposed) |

