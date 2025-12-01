# Bingo Effects API Documentation

Complete API reference for the bingo effects system. This document covers both admin and user-facing endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Data Types](#data-types)
4. [Admin API](#admin-api)
   - [Effects Library](#effects-library-admin)
   - [Team Effects Management](#team-effects-management)
   - [Effect History & Analytics](#effect-history--analytics)
5. [User API](#user-api)
   - [View Team Effects](#view-team-effects)
   - [Use Effects](#use-effects)
   - [Target Selection](#target-selection)
   - [Effect History](#effect-history-user)
   - [Line Completions](#line-completions)
6. [Workflows](#workflows)
7. [Frontend Implementation](#frontend-implementation)
8. [Error Handling](#error-handling)

---

## Overview

The effects system adds strategic gameplay to bingo events. Teams can:
- **Earn effects** by completing rows, columns, or specific tiles
- **Use effects** to boost their score or manipulate boards
- **Attack other teams** with offensive effects
- **Defend** with shields and reflects

### Effect Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Line/Tile      │ ──► │  Effect Earned  │ ──► │  Effect Used    │
│  Completed      │     │  (available)    │     │  (used/expired) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  If Immediate:  │
                        │  Auto-Applied   │
                        └─────────────────┘
```

---

## Authentication

### Admin Routes
All admin routes require the `x-discord-id` header with a valid admin Discord ID.

```
x-discord-id: 123456789012345678
```

### User Routes
User routes require both headers:

```
x-discord-id: 123456789012345678
x-member-code: ABC123
```

---

## Data Types

### EffectDefinition (Library Entry)

```typescript
interface EffectDefinition {
  id: string;                    // Unique slug (e.g., "shield", "point-bonus-50")
  name: string;                  // Display name
  description: string;           // Detailed description
  type: "buff" | "debuff";       // Visual categorization
  category: EffectCategory;      // Functional category
  target: EffectTarget;          // Who it affects
  trigger: EffectTrigger;        // When/how it activates
  config: EffectConfig;          // Type-specific configuration
  icon?: string;                 // Icon identifier/emoji
  isActive: boolean;             // Whether available in system
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

type EffectCategory = "points" | "board_manipulation" | "defense" | "offense" | "passive";
type EffectTarget = "self" | "enemy" | "all";
type EffectTrigger = "immediate" | "manual" | "reactive";
```

### EffectConfig (Typed by effect type)

```typescript
// Points
interface PointBonusConfig {
  type: "point_bonus";
  points: number;
}

interface PointMultiplierConfig {
  type: "point_multiplier";
  multiplier: number;           // e.g., 2 for double
  completionsAffected: number;  // How many tile completions
}

// Board Manipulation
interface TileSwapConfig {
  type: "tile_swap_self" | "tile_swap_enemy";
  tilesCount: number;           // Usually 2
}

interface TileLockConfig {
  type: "tile_lock";
  durationSeconds: number;      // How long the lock lasts
}

// Defense
interface ShieldConfig {
  type: "shield";
  charges: number;              // How many attacks it blocks
}

interface UnoReverseConfig {
  type: "uno_reverse";
  charges: number;              // How many reflects available
}
```

### TeamEarnedEffect

```typescript
interface TeamEarnedEffect {
  id: string;                   // UUID
  teamId: string;               // Owner team
  eventId: string;              // Event context
  buffDebuffId: string;         // Reference to library entry
  source: EffectSource;         // How it was earned
  sourceIdentifier?: string;    // e.g., "row_3", "column_B"
  status: EffectStatus;         // Current state
  earnedAt: string;             // When earned
  usedAt?: string;              // When used (if used)
  usedOnTeamId?: string;        // Target team (if offensive)
  expiresAt?: string;           // Expiration time (if timed)
  remainingUses: number;        // Uses left
  metadata: object;             // Additional data
}

type EffectSource = "row_completion" | "column_completion" | "tile_completion" | "admin" | "reflected";
type EffectStatus = "available" | "used" | "expired" | "negated";
```

---

## Admin API

Base path: `/api/admin/clan-events/effects`

### Effects Library (Admin)

#### List All Effects

```http
GET /api/admin/clan-events/effects/library
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by "buff" or "debuff" |
| `category` | string | Filter by category |
| `target` | string | Filter by "self", "enemy", or "all" |
| `trigger` | string | Filter by "immediate", "manual", or "reactive" |
| `effectType` | string | Filter by specific effect type (e.g., "point_bonus") |
| `isActive` | boolean | Filter by active status |
| `search` | string | Search in name, description, id |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "shield",
      "name": "Shield",
      "description": "Block the next incoming attack",
      "type": "buff",
      "category": "defense",
      "target": "self",
      "trigger": "reactive",
      "effectType": "shield",
      "config": { "type": "shield", "charges": 1 },
      "icon": "🛡️",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "stats": {
    "total": 10,
    "active": 8,
    "buffs": 6,
    "debuffs": 4,
    "points": 3,
    "boardManipulation": 3,
    "defense": 2,
    "offense": 2
  },
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

---

#### Get Effect by ID

```http
GET /api/admin/clan-events/effects/library/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "shield",
    "name": "Shield",
    "description": "Block the next incoming attack",
    "type": "buff",
    "category": "defense",
    "target": "self",
    "trigger": "reactive",
    "effectType": "shield",
    "config": { "type": "shield", "charges": 1 },
    "icon": "🛡️",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "usageStats": {
      "timesEarned": 45,
      "timesUsed": 32,
      "appliedToTiles": 0,
      "appliedToLines": 5
    }
  }
}
```

---

#### Create Effect

```http
POST /api/admin/clan-events/effects/library
```

**Request Body:**

```json
{
  "id": "mega-shield",
  "name": "Mega Shield",
  "description": "Block up to 3 incoming attacks",
  "type": "buff",
  "category": "defense",
  "target": "self",
  "trigger": "reactive",
  "config": {
    "type": "shield",
    "charges": 3
  },
  "icon": "🛡️🛡️🛡️",
  "isActive": true
}
```

**Required Fields:**
- `id` - Unique identifier (slug format)
- `name` - Display name
- `type` - "buff" or "debuff"
- `config` - Effect configuration with `config.type`

**Response (201 Created):**

```json
{
  "success": true,
  "data": { /* created effect */ },
  "message": "Effect created successfully"
}
```

---

#### Update Effect

```http
PATCH /api/admin/clan-events/effects/library/:id
```

**Request Body (partial update):**

```json
{
  "name": "Super Shield",
  "description": "Updated description",
  "config": {
    "type": "shield",
    "charges": 5
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": { /* updated effect */ },
  "message": "Effect updated successfully"
}
```

---

#### Delete Effect

```http
DELETE /api/admin/clan-events/effects/library/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Effect deleted successfully",
  "deletedId": "mega-shield"
}
```

**Error (409 Conflict - Effect in use):**

```json
{
  "success": false,
  "error": "Cannot delete effect",
  "message": "Effect is in use 15 time(s). Remove references first."
}
```

---

### Team Effects Management

#### Get Team's Effects

```http
GET /api/admin/clan-events/effects/events/:eventId/teams/:teamId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "available": [ /* manual trigger effects */ ],
      "activePassive": [ /* reactive effects */ ],
      "activeDefense": [ /* shields, reverses */ ],
      "recentlyUsed": [ /* last 10 used */ ]
    },
    "effects": [
      {
        "id": "abc123-def456",
        "teamId": "team-uuid",
        "eventId": "event-uuid",
        "buffDebuffId": "shield",
        "source": "row_completion",
        "sourceIdentifier": "row_3",
        "status": "available",
        "earnedAt": "2025-01-01T12:00:00Z",
        "usedAt": null,
        "usedOnTeamId": null,
        "expiresAt": null,
        "remainingUses": 1,
        "metadata": {},
        "name": "Shield",
        "description": "Block the next incoming attack",
        "type": "buff",
        "category": "defense",
        "effectType": "shield",
        "effectValue": 1,
        "icon": "🛡️",
        "target": "self",
        "trigger": "reactive"
      }
    ]
  }
}
```

---

#### Grant Effect to Team (Admin Action)

```http
POST /api/admin/clan-events/effects/events/:eventId/teams/:teamId/grant
```

**Request Body:**

```json
{
  "buffDebuffId": "shield",
  "reason": "Compensation for bug"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "abc123-def456",
    "teamId": "team-uuid",
    "eventId": "event-uuid",
    "buffDebuffId": "shield",
    "source": "admin",
    "sourceIdentifier": "Compensation for bug",
    "status": "available",
    "earnedAt": "2025-01-01T12:00:00Z",
    "remainingUses": 1,
    "metadata": { "grantedBy": "admin", "reason": "Compensation for bug" }
  },
  "message": "Effect granted successfully"
}
```

---

#### Remove Earned Effect

```http
DELETE /api/admin/clan-events/effects/earned/:earnedEffectId
```

**Response:**

```json
{
  "success": true,
  "message": "Earned effect removed",
  "deletedId": "abc123-def456"
}
```

---

### Effect History & Analytics

#### Get Effect Activation History

```http
GET /api/admin/clan-events/effects/events/:eventId/history
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `action` | string | Filter by action type |
| `teamId` | string | Filter by team (source or target) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "eventId": "event-uuid",
      "sourceTeamId": "team-1-uuid",
      "targetTeamId": "team-2-uuid",
      "buffDebuffId": "tile-swap-enemy",
      "earnedEffectId": "effect-uuid",
      "action": "activated",
      "success": true,
      "blockedByEffectId": null,
      "result": {
        "tilesAffected": ["tile-1", "tile-2"],
        "message": "Swapped tiles at A1 and B3"
      },
      "timestamp": "2025-01-01T12:00:00Z",
      "effectName": "Chaos Swap",
      "effectType": "tile_swap_enemy",
      "effectIcon": "💥",
      "sourceTeamName": "Team Alpha",
      "targetTeamName": "Team Beta"
    }
  ],
  "stats": {
    "actionCounts": {
      "earned": 45,
      "activated": 32,
      "auto_triggered": 8,
      "reflected": 3,
      "blocked": 5,
      "expired": 2
    }
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

---

#### Get Line Completions

```http
GET /api/admin/clan-events/effects/events/:eventId/line-completions
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "completion-uuid",
      "boardId": "board-uuid",
      "teamId": "team-uuid",
      "eventId": "event-uuid",
      "lineType": "row",
      "lineIdentifier": "3",
      "completedAt": "2025-01-01T12:00:00Z",
      "tileIds": ["tile-1", "tile-2", "tile-3", "tile-4", "tile-5"],
      "tilePoints": 250,
      "effectsGranted": true,
      "metadata": {},
      "teamName": "Team Alpha"
    }
  ]
}
```

---

#### Trigger Effect Expiration Check

```http
POST /api/admin/clan-events/effects/expire
```

**Response:**

```json
{
  "success": true,
  "message": "Expired 3 effect(s)"
}
```

---

## User API

Base path: `/api/app/clan-events/events/:eventId/effects`

### View Team Effects

#### Get My Team's Effects

```http
GET /api/app/clan-events/events/:eventId/effects
```

**Response:**

```json
{
  "success": true,
  "data": {
    "teamId": "team-uuid",
    "teamName": "Team Alpha",
    "available": [
      {
        "id": "effect-uuid",
        "buffDebuffId": "tile-swap",
        "name": "Tile Rearrange",
        "description": "Swap the positions of two tiles on your board",
        "icon": "🔄",
        "effectType": "tile_swap_self",
        "target": "self",
        "trigger": "manual",
        "source": "column_completion",
        "sourceIdentifier": "column_B",
        "remainingUses": 1,
        "expiresAt": null,
        "earnedAt": "2025-01-01T12:00:00Z"
      }
    ],
    "defensive": [
      {
        "id": "effect-uuid-2",
        "buffDebuffId": "shield",
        "name": "Shield",
        "description": "Block the next incoming attack",
        "icon": "🛡️",
        "effectType": "shield",
        "target": "self",
        "trigger": "reactive",
        "remainingUses": 2,
        "earnedAt": "2025-01-01T11:00:00Z"
      }
    ],
    "stats": {
      "totalAvailable": 5,
      "usable": 3,
      "defensive": 2
    }
  }
}
```

---

### Use Effects

#### Use an Effect

```http
POST /api/app/clan-events/events/:eventId/effects/:effectId/use
```

**Request Body (varies by effect type):**

For **self-targeting** effects (point bonus, tile swap self):
```json
{}
```

For **tile swap** effects:
```json
{
  "targetTileIds": ["tile-uuid-1", "tile-uuid-2"]
}
```

For **enemy-targeting** effects:
```json
{
  "targetTeamId": "enemy-team-uuid"
}
```

For **enemy tile manipulation** effects:
```json
{
  "targetTeamId": "enemy-team-uuid",
  "targetTileIds": ["tile-uuid-1", "tile-uuid-2"]
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "action": "activated",
    "result": {
      "tilesAffected": ["tile-1", "tile-2"],
      "message": "Swapped tiles at A1 and B3"
    },
    "effect": {
      "id": "effect-uuid",
      "status": "used",
      "usedAt": "2025-01-01T12:00:00Z",
      "remainingUses": 0
    },
    "newEffects": []
  }
}
```

**Blocked Response (Shield):**

```json
{
  "success": true,
  "data": {
    "action": "blocked",
    "blocked": true,
    "blockedBy": {
      "effectId": "shield-effect-uuid",
      "teamId": "target-team-uuid",
      "effectName": "Shield"
    },
    "message": "Effect was blocked by shield!"
  }
}
```

**Reflected Response (Uno Reverse):**

```json
{
  "success": true,
  "data": {
    "action": "reflected",
    "blocked": true,
    "blockedBy": {
      "effectId": "reverse-effect-uuid",
      "teamId": "target-team-uuid",
      "effectName": "Uno Reverse"
    },
    "message": "Effect was reflected!"
  }
}
```

---

### Target Selection

#### Get Targetable Teams

```http
GET /api/app/clan-events/events/:eventId/effects/targets
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "team-uuid-1",
      "name": "Team Beta",
      "color": "#FF5733",
      "icon": "🔥",
      "score": 1250,
      "memberCount": 5
    },
    {
      "id": "team-uuid-2",
      "name": "Team Gamma",
      "color": "#33FF57",
      "icon": "🌿",
      "score": 1100,
      "memberCount": 4
    }
  ]
}
```

---

### Effect History (User)

#### Get Effect Activity Feed

```http
GET /api/app/clan-events/events/:eventId/effects/history
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 20) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "action": "activated",
      "success": true,
      "result": { "message": "Swapped tiles at A1 and B3" },
      "timestamp": "2025-01-01T12:00:00Z",
      "effectName": "Chaos Swap",
      "effectIcon": "💥",
      "effectType": "tile_swap_enemy",
      "sourceTeamId": "team-1-uuid",
      "sourceTeamName": "Team Alpha",
      "sourceTeamColor": "#FF5733",
      "targetTeamId": "team-2-uuid",
      "targetTeamName": "Team Beta",
      "targetTeamColor": "#33FF57",
      "involvesMyTeam": true
    }
  ]
}
```

---

### Line Completions

#### Get My Team's Line Completions

```http
GET /api/app/clan-events/events/:eventId/effects/line-completions
```

**Response:**

```json
{
  "success": true,
  "data": {
    "completions": [
      {
        "id": "completion-uuid",
        "lineType": "row",
        "lineIdentifier": "3",
        "completedAt": "2025-01-01T12:00:00Z",
        "tilePoints": 250,
        "effectsGranted": true
      },
      {
        "id": "completion-uuid-2",
        "lineType": "column",
        "lineIdentifier": "B",
        "completedAt": "2025-01-01T13:00:00Z",
        "tilePoints": 300,
        "effectsGranted": true
      }
    ],
    "summary": {
      "rowsCompleted": 2,
      "columnsCompleted": 1,
      "totalRows": 5,
      "totalColumns": 5
    }
  }
}
```

---

## Workflows

### 1. Admin: Setting Up Effects for an Event

```
Step 1: Create effects in the library
POST /api/admin/clan-events/effects/library
{
  "id": "row-bonus-50",
  "name": "Row Bonus",
  "type": "buff",
  "category": "points",
  "target": "self",
  "trigger": "immediate",
  "config": { "type": "point_bonus", "points": 50 }
}

Step 2: Configure line effects in the event board config
PATCH /api/admin/clan-events/events/:eventId
{
  "config": {
    "board": {
      "rowEffects": [
        { "lineIdentifier": "1", "buffDebuffId": "row-bonus-50" },
        { "lineIdentifier": "2", "buffDebuffId": "shield" },
        { "lineIdentifier": "3", "buffDebuffId": "tile-swap" }
      ],
      "columnEffects": [
        { "lineIdentifier": "A", "buffDebuffId": "column-bonus-75" },
        { "lineIdentifier": "B", "buffDebuffId": "uno-reverse" }
      ]
    }
  }
}

Step 3: Activate the event
POST /api/admin/clan-events/events/:eventId/activate

→ Boards are created with line effects configured
```

---

### 2. Automatic Effect Earning (Line Completion)

```
Player completes tile A3, completing Row 3:

┌─────────────────────────────────────────┐
│ 1. Tile completion recorded              │
│    POST /webhook/dink (game event)       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 2. System detects Row 3 complete         │
│    All tiles A3, B3, C3, D3, E3 done     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 3. Line completion recorded              │
│    INSERT INTO bingo_line_completions    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 4. Effects granted                       │
│    - If row_3 has "shield" configured    │
│    - Shield added to team's effects      │
│    INSERT INTO bingo_team_earned_effects │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ 5. If immediate trigger (point_bonus):   │
│    Points added immediately to team      │
│    Effect marked as "used"               │
└─────────────────────────────────────────┘

Frontend: Poll or use WebSocket to detect new effects
GET /api/app/clan-events/events/:eventId/effects
```

---

### 3. Using a Manual Effect

```
Step 1: User views available effects
GET /api/app/clan-events/events/:eventId/effects

Response shows: "Tile Rearrange" (tile_swap_self) available

Step 2: User clicks "Use" button
→ Frontend shows tile selection UI

Step 3: User selects 2 tiles to swap
POST /api/app/clan-events/events/:eventId/effects/:effectId/use
{
  "targetTileIds": ["tile-uuid-1", "tile-uuid-2"]
}

Step 4: Effect applied
Response: { "success": true, "result": { "tilesAffected": [...] } }

Step 5: Frontend refreshes board to show new positions
GET /api/app/clan-events/events/:eventId
```

---

### 4. Using an Offensive Effect

```
Step 1: User has "Chaos Swap" effect available
GET /api/app/clan-events/events/:eventId/effects

Step 2: User clicks "Use" on Chaos Swap
→ Frontend shows target team selection

Step 3: Get available targets
GET /api/app/clan-events/events/:eventId/effects/targets

Step 4: User selects Team Beta
→ Frontend shows Team Beta's board for tile selection

Step 5: User selects 2 tiles on enemy board
POST /api/app/clan-events/events/:eventId/effects/:effectId/use
{
  "targetTeamId": "team-beta-uuid",
  "targetTileIds": ["tile-uuid-1", "tile-uuid-2"]
}

Step 6a: SUCCESS - Effect applied
Response: { "success": true, "action": "activated", ... }

Step 6b: BLOCKED - Target had a shield
Response: {
  "success": true,
  "data": {
    "action": "blocked",
    "blocked": true,
    "blockedBy": { "effectName": "Shield" }
  }
}

Step 6c: REFLECTED - Target had Uno Reverse
Response: {
  "success": true,
  "data": {
    "action": "reflected",
    "blocked": true,
    "blockedBy": { "effectName": "Uno Reverse" }
  }
}
→ The effect comes back at the attacker!
→ Check if attacker now has a new "reflected" effect to deal with
```

---

### 5. Real-time Effect Feed

```
Frontend: Poll effect history regularly

GET /api/app/clan-events/events/:eventId/effects/history?limit=10

Show in a live feed panel:
┌─────────────────────────────────────────────────────────────┐
│ 📢 Effect Activity                                          │
├─────────────────────────────────────────────────────────────┤
│ 🔃 Team Beta reflected Team Alpha's attack!    Just now    │
│ 💥 Team Alpha used Chaos Swap on Team Beta     2 min ago   │
│ 🛡️ Team Beta earned Shield (Row 4 complete)   5 min ago   │
│ 💎 Team Gamma earned Row Bonus (+50 points)   10 min ago   │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### 1. Effects Panel Component

Display the team's available effects in a sidebar or modal.

```tsx
interface EffectsPanelProps {
  eventId: string;
}

function EffectsPanel({ eventId }: EffectsPanelProps) {
  const { data } = useQuery(['effects', eventId], () => 
    fetch(`/api/app/clan-events/events/${eventId}/effects`).then(r => r.json())
  );

  return (
    <div className="effects-panel">
      {/* Defensive Effects Section - Always visible */}
      <section className="defensive-effects">
        <h3>🛡️ Active Defenses</h3>
        {data?.defensive.map(effect => (
          <DefenseIndicator key={effect.id} effect={effect} />
        ))}
      </section>

      {/* Usable Effects Section */}
      <section className="available-effects">
        <h3>⚡ Available Effects</h3>
        {data?.available.map(effect => (
          <EffectCard 
            key={effect.id} 
            effect={effect}
            onUse={() => openUseDialog(effect)}
          />
        ))}
      </section>
    </div>
  );
}
```

### 2. Effect Card

```tsx
function EffectCard({ effect, onUse }) {
  const isExpiring = effect.expiresAt && 
    new Date(effect.expiresAt) < new Date(Date.now() + 300000); // 5 min

  return (
    <div className={`effect-card ${effect.target}`}>
      <span className="icon">{effect.icon}</span>
      <div className="info">
        <h4>{effect.name}</h4>
        <p>{effect.description}</p>
        {effect.remainingUses > 1 && (
          <span className="uses">×{effect.remainingUses}</span>
        )}
        {isExpiring && (
          <Countdown expiresAt={effect.expiresAt} />
        )}
      </div>
      <button onClick={onUse} className="use-btn">
        Use
      </button>
    </div>
  );
}
```

### 3. Use Effect Dialog

```tsx
function UseEffectDialog({ effect, eventId, onClose }) {
  const [step, setStep] = useState('initial');
  const [targetTeamId, setTargetTeamId] = useState(null);
  const [selectedTiles, setSelectedTiles] = useState([]);

  const needsTarget = effect.target === 'enemy';
  const needsTileSelection = effect.effectType.includes('tile_swap') || 
                             effect.effectType === 'tile_lock';

  async function handleUse() {
    const body = {};
    if (needsTarget) body.targetTeamId = targetTeamId;
    if (needsTileSelection) body.targetTileIds = selectedTiles;

    const response = await fetch(
      `/api/app/clan-events/events/${eventId}/effects/${effect.id}/use`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const result = await response.json();

    if (result.data.blocked) {
      // Show blocked/reflected animation
      showBlockedAnimation(result.data.blockedBy);
    } else {
      // Show success animation
      showSuccessAnimation(result.data.result);
    }

    onClose();
  }

  // Step-by-step UI based on effect requirements
  if (step === 'initial' && needsTarget) {
    return <TeamSelector onSelect={team => {
      setTargetTeamId(team.id);
      setStep(needsTileSelection ? 'selectTiles' : 'confirm');
    }} />;
  }

  if (step === 'selectTiles') {
    return <TileSelector 
      boardId={targetTeamId ? getEnemyBoardId(targetTeamId) : myBoardId}
      maxTiles={effect.config.tilesCount || 2}
      onSelect={tiles => {
        setSelectedTiles(tiles);
        setStep('confirm');
      }}
    />;
  }

  return <ConfirmDialog 
    effect={effect}
    targetTeam={targetTeamId}
    tiles={selectedTiles}
    onConfirm={handleUse}
    onCancel={onClose}
  />;
}
```

### 4. Defense Indicators

```tsx
function DefenseIndicators({ effects }) {
  const shields = effects.filter(e => e.effectType === 'shield');
  const reverses = effects.filter(e => e.effectType === 'uno_reverse');

  return (
    <div className="defense-indicators">
      {shields.length > 0 && (
        <div className="shield-indicator">
          🛡️ × {shields.reduce((sum, s) => sum + s.remainingUses, 0)}
        </div>
      )}
      {reverses.length > 0 && (
        <div className="reverse-indicator">
          🔃 × {reverses.length}
        </div>
      )}
    </div>
  );
}
```

### 5. Activity Feed

```tsx
function EffectActivityFeed({ eventId }) {
  const { data } = useQuery(
    ['effectHistory', eventId],
    () => fetch(`/api/app/clan-events/events/${eventId}/effects/history`).then(r => r.json()),
    { refetchInterval: 5000 } // Poll every 5 seconds
  );

  return (
    <div className="activity-feed">
      <h3>📢 Effect Activity</h3>
      {data?.data.map(entry => (
        <ActivityEntry 
          key={entry.id}
          entry={entry}
          isMyTeam={entry.involvesMyTeam}
        />
      ))}
    </div>
  );
}

function ActivityEntry({ entry, isMyTeam }) {
  const actionMessages = {
    earned: `${entry.sourceTeamName} earned ${entry.effectName}`,
    activated: `${entry.sourceTeamName} used ${entry.effectName}${entry.targetTeamName ? ` on ${entry.targetTeamName}` : ''}`,
    reflected: `${entry.sourceTeamName} reflected ${entry.effectName} back to ${entry.targetTeamName}!`,
    blocked: `${entry.sourceTeamName}'s ${entry.effectName} was blocked by ${entry.targetTeamName}`
  };

  return (
    <div className={`activity-entry ${isMyTeam ? 'involves-me' : ''}`}>
      <span className="icon">{entry.effectIcon}</span>
      <span className="message">{actionMessages[entry.action]}</span>
      <span className="time">{formatRelativeTime(entry.timestamp)}</span>
    </div>
  );
}
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You are not participating in this event"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Effect not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required fields",
  "required": ["targetTeamId"]
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": "Effect ID already exists"
}
```

### Effect-Specific Errors

**Effect not available:**
```json
{
  "success": false,
  "action": "activated",
  "result": { "message": "Effect not found or not available" }
}
```

**Target required:**
```json
{
  "success": false,
  "action": "activated",
  "result": { "message": "Target team required for this effect" }
}
```

**Invalid tiles:**
```json
{
  "success": false,
  "result": { "message": "Must specify exactly 2 tiles to swap" }
}
```

---

## Summary

The effects system provides a rich strategic layer to bingo events. Key points for frontend:

1. **Poll `/effects` regularly** to show current available effects
2. **Show defensive effects prominently** (shields/reverses) as they auto-trigger
3. **Handle all use responses** (success, blocked, reflected)
4. **Animate effect activations** for better UX
5. **Show activity feed** for event awareness
6. **Track line completions** to celebrate achievements

For the best UX, consider adding:
- Toast notifications for effect events
- Animations when effects are earned/used
- Sound effects for different effect types
- WebSocket integration for real-time updates

