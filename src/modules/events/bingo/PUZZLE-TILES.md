# Puzzle Tiles - Frontend Documentation

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

For puzzle tiles, the response includes additional fields:

```typescript
interface PublicBoardTile {
  id: string;
  position: string;
  isCompleted: boolean;
  completedAt: string | null;
  task: string;              // Overridden with puzzle.displayName for puzzles
  category: string;
  difficulty: string;
  icon: string | null;       // Overridden with puzzle.displayIcon if provided
  points: number;
  progress: PublicTileProgress | null;
  effects: PublicEffect[];
  
  // PUZZLE-SPECIFIC FIELDS (only present for puzzle tiles)
  isPuzzle?: boolean;        // true if this is a puzzle tile
  puzzle?: {
    displayName: string;         // The puzzle title (e.g., "Solve the Anagram")
    displayDescription: string;  // The puzzle content (e.g., "NOBGIL LIAM")
    displayHint?: string;        // Optional hint (e.g., "A small green creature's armor")
    displayIcon?: string;        // Custom icon for the puzzle
    puzzleCategory?: string;     // Category: 'anagram', 'riddle', 'scavenger', 'mystery', 'cipher'
    isSolved: boolean;           // Whether the puzzle has been solved
    revealAnswer?: boolean;      // If true AND isSolved, the hidden requirement can be shown
  };
}
```

### Example Response

```json
{
  "id": "tile-uuid",
  "position": "A1",
  "isCompleted": true,
  "completedAt": "2025-12-02T14:30:00.000Z",
  "task": "Solve the Anagram",
  "category": "pvm",
  "difficulty": "easy",
  "icon": "🧩",
  "points": 10,
  "progress": {
    "progressValue": 1,
    "targetValue": 1,
    "completedTiers": [],
    "currentTier": null
  },
  "effects": [],
  "isPuzzle": true,
  "puzzle": {
    "displayName": "Solve the Anagram",
    "displayDescription": "Unscramble: NOBGIL LIAM",
    "displayHint": "A piece of armor from a small green creature",
    "displayIcon": "🧩",
    "puzzleCategory": "anagram",
    "isSolved": true,
    "revealAnswer": true
  }
}
```

## Frontend Implementation Guide

### 1. Detecting Puzzle Tiles

```typescript
const isPuzzleTile = (tile: PublicBoardTile): boolean => {
  return tile.isPuzzle === true && tile.puzzle !== undefined;
};
```

### 2. Rendering Puzzle Tiles

```tsx
const TileCard = ({ tile }: { tile: PublicBoardTile }) => {
  if (tile.isPuzzle && tile.puzzle) {
    return <PuzzleTileCard tile={tile} puzzle={tile.puzzle} />;
  }
  return <RegularTileCard tile={tile} />;
};

const PuzzleTileCard = ({ tile, puzzle }) => {
  return (
    <div className={`puzzle-tile ${puzzle.puzzleCategory || 'mystery'}`}>
      {/* Puzzle Icon */}
      <div className="puzzle-icon">
        {puzzle.displayIcon || '🧩'}
      </div>
      
      {/* Puzzle Title */}
      <h3 className="puzzle-title">{puzzle.displayName}</h3>
      
      {/* Puzzle Content (the actual puzzle to solve) */}
      <div className="puzzle-content">
        <p className="puzzle-description">{puzzle.displayDescription}</p>
      </div>
      
      {/* Optional Hint (can be hidden behind a toggle) */}
      {puzzle.displayHint && (
        <HintSection hint={puzzle.displayHint} />
      )}
      
      {/* Status */}
      <div className="puzzle-status">
        {puzzle.isSolved ? (
          <span className="solved">✅ Solved!</span>
        ) : (
          <span className="unsolved">🔒 Unsolved</span>
        )}
      </div>
      
      {/* Reveal Answer (only if configured and solved) */}
      {puzzle.revealAnswer && puzzle.isSolved && (
        <div className="puzzle-answer-reveal">
          <p>The answer was: Obtain Goblin mail</p>
        </div>
      )}
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

