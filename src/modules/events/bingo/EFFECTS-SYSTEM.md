# Bingo Effects System

Comprehensive documentation for the bingo board effects system - row/column completion bonuses, team abilities, and interactive effects.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Effect Types](#effect-types)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Effect Flow](#effect-flow)
7. [Frontend Implementation Guide](#frontend-implementation-guide)
8. [Example Effects Library](#example-effects-library)

---

## Overview

The effects system adds a strategic layer to bingo events. When teams complete rows, columns, or specific tiles, they earn effects that can:

- **Boost their score** (point bonuses, multipliers)
- **Modify their board** (swap tiles, auto-complete)
- **Attack other teams** (swap their tiles, lock tiles)
- **Defend against attacks** (shields, reflects)

### Key Features

- **Line Completion Detection**: Automatically detects when a row/column is fully completed
- **Effect Granting**: Assigns effects to teams based on configured line effects
- **Immediate vs Manual**: Some effects apply instantly, others are held for strategic use
- **Attack & Defense**: Teams can target each other with offensive effects and defend with shields
- **Uno Reverse**: Reflects incoming attacks back to the attacker
- **Full Audit Trail**: All effect activations are logged

---

## Core Concepts

### Effect Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `points` | Affect team score | Point bonus, multiplier |
| `board_manipulation` | Modify board tiles | Tile swap, auto-complete |
| `defense` | Protect against attacks | Shield, Uno Reverse |
| `offense` | Target other teams | Enemy tile swap, tile lock |
| `passive` | Always-active effects | Line completion bonus |

### Effect Targets

| Target | Description |
|--------|-------------|
| `self` | Affects your own team |
| `enemy` | Must select another team to target |
| `all` | Affects all teams in the event |

### Effect Triggers

| Trigger | Description | Example |
|---------|-------------|---------|
| `immediate` | Applies as soon as earned | Point bonus |
| `manual` | Team chooses when to use | Tile swap |
| `reactive` | Auto-triggers when attacked | Uno Reverse |

### Effect Sources

| Source | Description |
|--------|-------------|
| `row_completion` | Earned by completing a row |
| `column_completion` | Earned by completing a column |
| `tile_completion` | Earned by completing a specific tile |
| `admin` | Granted by an administrator |
| `reflected` | Reflected from an attack |

---

## Effect Types

### Points Effects

```typescript
// POINT_BONUS - Immediate points
{
  id: "row-bonus-100",
  name: "Row Completion Bonus",
  type: "buff",
  category: "points",
  target: "self",
  trigger: "immediate",
  config: {
    type: "point_bonus",
    points: 100
  }
}

// POINT_MULTIPLIER - Multiply next N tile completions
{
  id: "double-points",
  name: "Double Points",
  type: "buff",
  category: "points",
  target: "self",
  trigger: "manual",
  config: {
    type: "point_multiplier",
    multiplier: 2,
    completionsAffected: 3
  }
}
```

### Board Manipulation (Self)

```typescript
// TILE_SWAP_SELF - Swap two tiles on your board
{
  id: "tile-swap-self",
  name: "Tile Rearrange",
  type: "buff",
  category: "board_manipulation",
  target: "self",
  trigger: "manual",
  config: {
    type: "tile_swap_self",
    tilesCount: 2
  }
}

// TILE_AUTO_COMPLETE - Complete a tile instantly
{
  id: "auto-complete",
  name: "Instant Complete",
  type: "buff",
  category: "board_manipulation",
  target: "self",
  trigger: "manual",
  config: {
    type: "tile_auto_complete",
    tilesCount: 1
  }
}
```

### Board Manipulation (Enemy)

```typescript
// TILE_SWAP_ENEMY - Shuffle enemy's tiles
{
  id: "chaos-swap",
  name: "Chaos Swap",
  type: "debuff",
  category: "offense",
  target: "enemy",
  trigger: "manual",
  config: {
    type: "tile_swap_enemy",
    tilesCount: 2
  }
}

// TILE_LOCK - Lock an enemy tile (prevent completion)
{
  id: "tile-lock",
  name: "Tile Lock",
  type: "debuff",
  category: "offense",
  target: "enemy",
  trigger: "manual",
  config: {
    type: "tile_lock",
    durationSeconds: 3600  // 1 hour
  }
}
```

### Defense Effects

```typescript
// SHIELD - Block the next incoming attack
{
  id: "shield",
  name: "Shield",
  type: "buff",
  category: "defense",
  target: "self",
  trigger: "reactive",
  config: {
    type: "shield",
    charges: 1  // blocks 1 attack
  }
}

// UNO_REVERSE - Reflect attack back to sender
{
  id: "uno-reverse",
  name: "Uno Reverse",
  type: "buff",
  category: "defense",
  target: "self",
  trigger: "reactive",
  config: {
    type: "uno_reverse",
    charges: 1
  }
}
```

---

## Database Schema

### Table: `bingo_buffs_debuffs` (Effect Library)

```sql
CREATE TABLE bingo_buffs_debuffs (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(10) NOT NULL,      -- 'buff' | 'debuff'
  category VARCHAR(50),           -- 'points' | 'board_manipulation' | 'defense' | 'offense'
  target VARCHAR(20),             -- 'self' | 'enemy' | 'all'
  trigger VARCHAR(20),            -- 'immediate' | 'manual' | 'reactive'
  effect_type VARCHAR(50) NOT NULL,  -- Denormalized from config.type for querying
  config JSONB NOT NULL,          -- Typed config based on effect_type
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true
);
```

### Effect Config Types

Each effect type has a specific config structure:

```typescript
// Point effects
{ type: "point_bonus", points: number }
{ type: "point_multiplier", multiplier: number, completionsAffected: number }
{ type: "line_completion_bonus", bonusPerLine: number }

// Board manipulation
{ type: "tile_swap_self", tilesCount: number }
{ type: "tile_swap_enemy", tilesCount: number }
{ type: "tile_auto_complete", tilesCount: number }
{ type: "tile_lock", durationSeconds: number }
{ type: "tile_progress_reset", resetPercentage: number }
{ type: "progress_steal", stealPercentage: number }

// Defense
{ type: "shield", charges: number }
{ type: "uno_reverse", charges: number }
{ type: "effect_immunity", durationSeconds: number }

// Utility
{ type: "reveal_progress", durationSeconds: number }
{ type: "tile_unlock", tilesCount: number }
```

### Table: `bingo_team_earned_effects`

```sql
CREATE TABLE bingo_team_earned_effects (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES event_teams(id),
  event_id UUID NOT NULL REFERENCES events(id),
  buff_debuff_id VARCHAR(100) NOT NULL REFERENCES bingo_buffs_debuffs(id),
  source VARCHAR(50) NOT NULL,      -- 'row_completion', 'column_completion', etc.
  source_identifier VARCHAR(50),    -- 'row_3', 'column_B'
  status VARCHAR(20) DEFAULT 'available',  -- 'available', 'used', 'expired', 'negated'
  earned_at TIMESTAMP,
  used_at TIMESTAMP,
  used_on_team_id UUID,
  expires_at TIMESTAMP,
  remaining_uses INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'
);
```

### Table: `bingo_effect_activation_log`

```sql
CREATE TABLE bingo_effect_activation_log (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,
  source_team_id UUID NOT NULL,
  target_team_id UUID,
  buff_debuff_id VARCHAR(100) NOT NULL,
  earned_effect_id UUID,
  action VARCHAR(30) NOT NULL,  -- 'earned', 'activated', 'reflected', 'blocked', etc.
  success BOOLEAN DEFAULT true,
  blocked_by_effect_id UUID,
  result JSONB DEFAULT '{}',
  timestamp TIMESTAMP
);
```

### Table: `bingo_line_completions`

```sql
CREATE TABLE bingo_line_completions (
  id UUID PRIMARY KEY,
  board_id UUID NOT NULL,
  team_id UUID NOT NULL,
  event_id UUID NOT NULL,
  line_type VARCHAR(10) NOT NULL,  -- 'row' | 'column'
  line_identifier VARCHAR(10) NOT NULL,  -- '1', '2', 'A', 'B'
  completed_at TIMESTAMP,
  tile_ids UUID[] NOT NULL,
  tile_points INTEGER DEFAULT 0,
  effects_granted BOOLEAN DEFAULT false
);
```

---

## API Endpoints

### Admin Endpoints

#### Effect Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/effects/library` | List all effects |
| GET | `/api/admin/clan-events/effects/library/:id` | Get effect details |
| POST | `/api/admin/clan-events/effects/library` | Create new effect |
| PATCH | `/api/admin/clan-events/effects/library/:id` | Update effect |
| DELETE | `/api/admin/clan-events/effects/library/:id` | Delete effect |

#### Team Effects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/effects/events/:eventId/teams/:teamId` | Get team's effects |
| POST | `/api/admin/clan-events/effects/events/:eventId/teams/:teamId/grant` | Grant effect to team |
| DELETE | `/api/admin/clan-events/effects/earned/:earnedEffectId` | Remove earned effect |

#### History & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/effects/events/:eventId/history` | Effect activation history |
| GET | `/api/admin/clan-events/effects/events/:eventId/line-completions` | Line completions |
| POST | `/api/admin/clan-events/effects/expire` | Expire timed effects |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/app/clan-events/events/:eventId/effects` | Get my team's effects |
| POST | `/api/app/clan-events/events/:eventId/effects/:effectId/use` | Use an effect |
| GET | `/api/app/clan-events/events/:eventId/effects/targets` | Get targetable teams |
| GET | `/api/app/clan-events/events/:eventId/effects/history` | View effect history |
| GET | `/api/app/clan-events/events/:eventId/effects/line-completions` | My line completions |

---

## Effect Flow

### 1. Line Completion Detection

```
Tile Completed
     │
     ▼
┌─────────────────────┐
│ Check Row Complete  │
│ (All tiles in row?) │
└─────────────────────┘
     │
     ├── Yes ─► Record Line Completion ─► Grant Row Effects
     │
     ▼
┌───────────────────────┐
│ Check Column Complete │
│ (All tiles in column?)│
└───────────────────────┘
     │
     ├── Yes ─► Record Line Completion ─► Grant Column Effects
     │
     ▼
     Done
```

### 2. Effect Granting

```
Line Completed
     │
     ▼
┌──────────────────────────────┐
│ Look up configured effects   │
│ (bingo_board_line_effects)   │
└──────────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ For each effect:             │
│ - Create team_earned_effects │
│ - Log the earning            │
│ - Apply if immediate trigger │
└──────────────────────────────┘
```

### 3. Effect Usage

```
User Requests Effect Use
     │
     ▼
┌─────────────────────────┐
│ Validate Effect Owned   │
│ & Status = 'available'  │
└─────────────────────────┘
     │
     ▼ (If enemy-targeting)
┌─────────────────────────┐
│ Check Target's Defenses │
│ - Uno Reverse?          │
│ - Shield?               │
└─────────────────────────┘
     │
     ├── Reflected ─► Effect bounces back to attacker
     ├── Blocked ─► Effect cancelled, shield consumed
     │
     ▼
┌─────────────────────────┐
│ Apply Effect            │
│ - Modify board/score    │
│ - Update effect status  │
│ - Log activation        │
└─────────────────────────┘
```

---

## Frontend Implementation Guide

### 1. Effects Panel Component

Display the team's available effects in a sidebar or modal.

```typescript
interface EffectPanelProps {
  teamId: string;
  eventId: string;
}

// API Response structure
interface EffectsResponse {
  teamId: string;
  teamName: string;
  available: TeamEffect[];    // Manual trigger effects
  defensive: TeamEffect[];    // Shields, Uno Reverse (show as active)
  stats: {
    totalAvailable: number;
    usable: number;
    defensive: number;
  };
}

interface TeamEffect {
  id: string;
  buffDebuffId: string;
  name: string;
  description: string;
  icon: string;
  effectType: string;
  target: 'self' | 'enemy';
  remainingUses: number;
  expiresAt?: string;
  sourceIdentifier?: string;  // "row_3", "column_B"
}
```

**UI Elements:**
- Effect cards with icon, name, uses remaining
- "Use" button (opens targeting dialog if enemy-targeting)
- Expiration countdown for timed effects
- Badge showing how many shields/reverses are active

### 2. Target Selection Dialog

For enemy-targeting effects, show a team picker.

```typescript
// GET /api/app/clan-events/events/:eventId/effects/targets
interface TargetTeam {
  id: string;
  name: string;
  color: string;
  icon: string;
  score: number;
  memberCount: number;
}
```

**For tile manipulation effects:**
- Show board preview
- Allow selecting tiles to swap
- Highlight valid swap targets

### 3. Tile Swap Selection

```typescript
interface UseEffectRequest {
  targetTeamId?: string;        // For enemy effects
  targetTileIds?: string[];     // For tile swaps [tile1, tile2]
  targetPositions?: string[];   // Alternative: positions ["A1", "B3"]
}
```

**UI Flow for Tile Swap:**
1. User clicks "Use" on tile swap effect
2. If self-targeting: Show own board, let user click 2 tiles
3. If enemy-targeting: First pick team, then show their board
4. Confirm swap → POST to use endpoint

### 4. Effect History Feed

Show recent effect activations as a live feed.

```typescript
interface HistoryEntry {
  id: string;
  action: 'earned' | 'activated' | 'reflected' | 'blocked';
  effectName: string;
  effectIcon: string;
  sourceTeamName: string;
  sourceTeamColor: string;
  targetTeamName?: string;
  targetTeamColor?: string;
  timestamp: string;
  involvesMyTeam: boolean;
}
```

**UI Elements:**
- Timeline of events
- Highlight entries involving user's team
- Different icons/colors for different actions
- Animate new entries sliding in

### 5. Line Completion Celebration

When a row/column is completed:

```typescript
interface LineCompletion {
  lineType: 'row' | 'column';
  lineIdentifier: string;  // "3" or "B"
  tilePoints: number;
  effectsGranted: boolean;
}
```

**UI Flow:**
1. Detect line completion (watch board state)
2. Show celebration animation
3. Display earned effects
4. Flash the completed line on board

### 6. Defense Indicators

Show active defensive effects prominently.

```typescript
// In team header/sidebar
const defenseDisplay = {
  shields: team.activeDefense.filter(e => e.effectType === 'shield'),
  reverses: team.activeDefense.filter(e => e.effectType === 'uno_reverse'),
  immunity: team.activeDefense.filter(e => e.effectType === 'effect_immunity')
};
```

**Visual Elements:**
- Shield icon with count
- Reverse card icon if held
- "Protected" badge on board

### 7. Attack Feedback

When using an offensive effect, handle all outcomes:

```typescript
// POST response
interface UseEffectResult {
  success: boolean;
  action: string;
  blocked?: boolean;
  blockedBy?: {
    effectId: string;
    teamId: string;
    effectName: string;  // "Shield" or "Uno Reverse"
  };
  result: {
    message: string;
    tilesAffected?: string[];
    pointsChanged?: number;
  };
}
```

**Animations:**
- Success: Show effect hitting target
- Blocked: Shield animation, bounce back
- Reflected: Uno Reverse animation, effect comes back

---

## Example Effects Library

Here's a starter set of effects to seed the database:

```json
[
  {
    "id": "row-bonus-50",
    "name": "Row Bonus",
    "description": "Earn 50 bonus points for completing a row",
    "type": "buff",
    "category": "points",
    "target": "self",
    "trigger": "immediate",
    "config": { "type": "point_bonus", "points": 50 },
    "icon": "💎"
  },
  {
    "id": "column-bonus-75",
    "name": "Column Bonus",
    "description": "Earn 75 bonus points for completing a column",
    "type": "buff",
    "category": "points",
    "target": "self",
    "trigger": "immediate",
    "config": { "type": "point_bonus", "points": 75 },
    "icon": "💰"
  },
  {
    "id": "tile-swap",
    "name": "Tile Rearrange",
    "description": "Swap the positions of two tiles on your board",
    "type": "buff",
    "category": "board_manipulation",
    "target": "self",
    "trigger": "manual",
    "config": { "type": "tile_swap_self", "tilesCount": 2 },
    "icon": "🔄"
  },
  {
    "id": "chaos-swap",
    "name": "Chaos Swap",
    "description": "Swap two tiles on another team's board",
    "type": "debuff",
    "category": "offense",
    "target": "enemy",
    "trigger": "manual",
    "config": { "type": "tile_swap_enemy", "tilesCount": 2 },
    "icon": "💥"
  },
  {
    "id": "shield",
    "name": "Shield",
    "description": "Block the next negative effect targeting your team",
    "type": "buff",
    "category": "defense",
    "target": "self",
    "trigger": "reactive",
    "config": { "type": "shield", "charges": 1 },
    "icon": "🛡️"
  },
  {
    "id": "uno-reverse",
    "name": "Uno Reverse",
    "description": "Reflect the next attack back to the attacker!",
    "type": "buff",
    "category": "defense",
    "target": "self",
    "trigger": "reactive",
    "config": { "type": "uno_reverse", "charges": 1 },
    "icon": "🔃"
  },
  {
    "id": "double-points",
    "name": "Double Points",
    "description": "Double points for your next 3 tile completions",
    "type": "buff",
    "category": "points",
    "target": "self",
    "trigger": "manual",
    "config": { "type": "point_multiplier", "multiplier": 2, "completionsAffected": 3 },
    "icon": "✨"
  },
  {
    "id": "tile-lock",
    "name": "Tile Lock",
    "description": "Lock a tile on another team's board for 1 hour",
    "type": "debuff",
    "category": "offense",
    "target": "enemy",
    "trigger": "manual",
    "config": { "type": "tile_lock", "durationSeconds": 3600 },
    "icon": "🔒"
  }
]
```

---

## Configuring Line Effects

When setting up an event, configure which effects are earned for each line:

### In Event Config

```typescript
// Event config structure
{
  board: {
    rows: 5,
    columns: 5,
    rowEffects: [
      { lineIdentifier: "1", buffDebuffId: "row-bonus-50" },
      { lineIdentifier: "2", buffDebuffId: "shield" },
      { lineIdentifier: "3", buffDebuffId: "tile-swap" },
      { lineIdentifier: "4", buffDebuffId: "uno-reverse" },
      { lineIdentifier: "5", buffDebuffId: "row-bonus-50" }
    ],
    columnEffects: [
      { lineIdentifier: "A", buffDebuffId: "column-bonus-75" },
      { lineIdentifier: "B", buffDebuffId: "chaos-swap" },
      { lineIdentifier: "C", buffDebuffId: "double-points" },
      { lineIdentifier: "D", buffDebuffId: "shield" },
      { lineIdentifier: "E", buffDebuffId: "column-bonus-75" }
    ]
  }
}
```

### Admin UI for Configuration

The admin should be able to:
1. Create effects in the library
2. Assign effects to specific rows/columns in the board configuration
3. View which lines have which effects
4. Grant effects manually to teams
5. View full effect history and analytics

---

## WebSocket Events (Future Enhancement)

For real-time updates, emit these events:

```typescript
// When effect is earned
{ type: 'EFFECT_EARNED', teamId, effectId, effectName }

// When effect is used
{ type: 'EFFECT_USED', sourceTeamId, targetTeamId?, effectId, action }

// When effect is blocked/reflected
{ type: 'EFFECT_BLOCKED', targetTeamId, blockedBy, effectName }
{ type: 'EFFECT_REFLECTED', originalAttackerId, reflectedTo, effectName }

// When line is completed
{ type: 'LINE_COMPLETED', teamId, lineType, lineIdentifier, effectsEarned }
```

---

## Summary

The effects system transforms bingo from a simple tile-completion game into a strategic experience where teams must:

1. **Race to complete lines** for valuable effects
2. **Hold effects strategically** for maximum impact
3. **Defend against attacks** with shields and reverses
4. **Attack at the right moment** when enemies are undefended
5. **Manage their "hand"** of available effects

This creates dynamic gameplay with comebacks, surprises, and memorable moments!

