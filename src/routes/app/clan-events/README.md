# Clan Events User API Documentation

Complete API reference for users to view their clan events, team progress, and personal contributions.

## Base URL
```
/api/app/clan-events
```

## Directory Structure

```
src/routes/app/clan-events/
├── index.ts               # Main router - mounts all sub-routers
├── types.ts               # Shared types and auth helpers
├── events.routes.ts       # List events, my-events, event details
├── leaderboard.routes.ts  # Event team rankings
├── team.routes.ts         # Team progress, leaderboard, activity
├── contributions.routes.ts # User's tile contributions
├── tiles.routes.ts        # Tile detail view
└── README.md              # This documentation
```

## Authentication

All endpoints require authentication via headers:
```
x-member-code: <member_code>
x-discord-id: <discord_id>
```

These are provided after the user logs in via Discord OAuth.

---

## Table of Contents

1. [My Events](#my-events)
2. [Event List](#event-list)
3. [Event Details](#event-details)
4. [Event Leaderboard](#event-leaderboard)
5. [Team Progress](#team-progress)
6. [Team Leaderboard](#team-leaderboard)
7. [Team Activity](#team-activity)
8. [My Contributions](#my-contributions)
9. [Tile Details](#tile-details)
10. [Frontend Integration Flows](#frontend-integration-flows)

---

## My Events

### Get All My Events
```http
GET /events/my-events
```

Returns all events the user is participating in (past, present, and scheduled).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Bingo 2025",
      "eventType": "bingo",
      "status": "active",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-30T23:59:59.000Z",
      "team": {
        "id": "team-uuid",
        "name": "Team Alpha",
        "color": "#FF5733",
        "icon": "🔥",
        "score": 450
      },
      "myRole": "captain",
      "myScore": 125
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Event UUID |
| name | string | Event name |
| eventType | string | `bingo`, `battleship_bingo`, etc. |
| status | string | `draft`, `scheduled`, `active`, `paused`, `completed`, `cancelled` |
| startDate | string | ISO 8601 datetime |
| endDate | string | ISO 8601 datetime |
| team.id | string | Team UUID |
| team.name | string | Team name |
| team.color | string | Hex color code |
| team.icon | string | Emoji/icon |
| team.score | number | Team's total score |
| myRole | string | User's role: `captain` or `member` |
| myScore | number | User's individual contribution score |

---

## Event List

### Get Active Events
```http
GET /events
```

Returns all active events. Shows participation info for events the user is in.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Bingo 2025",
      "eventType": "bingo",
      "status": "active",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-30T23:59:59.000Z",
      "teamCount": 8,
      "isParticipating": true,
      "teamId": "team-uuid",
      "teamName": "Team Alpha",
      "teamScore": 450
    },
    {
      "id": "another-event-uuid",
      "name": "Mini Bingo Challenge",
      "eventType": "bingo",
      "status": "active",
      "startDate": "2025-06-15T00:00:00.000Z",
      "endDate": "2025-06-20T23:59:59.000Z",
      "teamCount": 4,
      "isParticipating": false,
      "teamId": null,
      "teamName": null,
      "teamScore": null
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| teamCount | number | Total number of teams in event |
| isParticipating | boolean | Whether user is on a team |
| teamId | string? | User's team ID (if participating) |
| teamName | string? | User's team name (if participating) |
| teamScore | number? | User's team score (if participating) |

---

## Event Details

### Get Event with Board
```http
GET /events/:eventId
```

Returns full event details including the bingo board. **Only available if user is participating.**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Summer Bingo 2025",
    "description": "Our summer clan event!",
    "eventType": "bingo",
    "status": "active",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-06-30T23:59:59.000Z",
    "config": {
      "board": { "columns": 7, "rows": 7 }
    },
    "team": {
      "id": "team-uuid",
      "name": "Team Alpha",
      "color": "#FF5733",
      "icon": "🔥",
      "score": 450,
      "members": [
        {
          "id": "member-uuid",
          "memberId": 123,
          "discordTag": "Player#1234",
          "role": "captain",
          "osrsAccountId": 456,
          "osrsAccountName": "PlayerRSN"
        }
      ]
    },
    "board": {
      "id": "board-uuid",
      "columns": 7,
      "rows": 7,
      "metadata": {
        "showTileEffects": true,
        "showRowColumnBuffs": false
      },
      "tiles": [
        {
          "id": "board-tile-uuid",
          "boardId": "board-uuid",
          "tileId": "get-fire-cape",
          "position": "A1",
          "isCompleted": true,
          "completedAt": "2025-06-05T15:30:00.000Z",
          "task": "Obtain a Fire Cape",
          "category": "combat",
          "difficulty": "medium",
          "icon": "🔥",
          "description": "Complete the Fight Caves",
          "points": 50,
          "requirements": {
            "matchType": "ALL",
            "requirements": [
              {
                "type": "ITEM_DROP",
                "items": [{ "itemId": 6570, "itemName": "Fire cape", "itemAmount": 1 }]
              }
            ],
            "tiers": []
          },
          "progressEntries": [
            {
              "id": "progress-uuid",
              "osrsAccountId": 456,
              "progressValue": 1,
              "progressMetadata": {
                "requirementType": "ITEM_DROP",
                "currentCount": 1,
                "targetCount": 1,
                "itemName": "Fire cape",
                "playerContributions": [
                  { "osrsAccountId": 456, "osrsNickname": "PlayerRSN", "count": 1 }
                ]
              },
              "completionType": "auto",
              "completedAt": "2025-06-05T15:30:00.000Z",
              "completedByOsrsAccountId": 456,
              "recordedAt": "2025-06-05T15:30:00.000Z"
            }
          ],
          "teamTotalXpGained": null,
          "tileEffects": [
            {
              "id": "effect-uuid",
              "buffName": "Double Points",
              "buffType": "buff",
              "effectType": "points_multiplier",
              "effectValue": 2,
              "buffIcon": "⭐",
              "isActive": true,
              "expiresAt": null
            }
          ]
        }
      ],
      "tileEffects": [...],
      "rowEffects": [...],
      "columnEffects": [...]
    }
  }
}
```

**Key Response Fields:**

| Path | Type | Description |
|------|------|-------------|
| `team.members[]` | array | All team members with their OSRS accounts |
| `board.tiles[]` | array | All board tiles with positions |
| `board.tiles[].position` | string | Grid position (e.g., "A1", "B3") |
| `board.tiles[].isCompleted` | boolean | Whether tile is complete |
| `board.tiles[].progressEntries[]` | array | Progress records for this tile |
| `board.tiles[].requirements` | object | What's needed to complete the tile |
| `board.tiles[].tileEffects[]` | array | Active buffs/debuffs on this tile |
| `board.metadata.showTileEffects` | boolean | Whether to display tile effects |
| `board.metadata.showRowColumnBuffs` | boolean | Whether to display row/column effects |

---

## Event Leaderboard

### Get All Teams Ranked
```http
GET /events/:eventId/leaderboard
```

Returns all teams in the event ranked by score. **Available to any authenticated user** (even non-participants can view).

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-uuid",
      "name": "Summer Bingo 2025",
      "status": "active"
    },
    "myTeamId": "team-uuid",
    "leaderboard": [
      {
        "rank": 1,
        "id": "team-uuid",
        "name": "Team Alpha",
        "color": "#FF5733",
        "icon": "🔥",
        "score": 450,
        "memberCount": 6,
        "tilesCompleted": 28,
        "totalTiles": 49,
        "isMyTeam": true
      },
      {
        "rank": 2,
        "id": "team-2-uuid",
        "name": "Team Beta",
        "color": "#33FF57",
        "icon": "💚",
        "score": 380,
        "memberCount": 5,
        "tilesCompleted": 24,
        "totalTiles": 49,
        "isMyTeam": false
      }
    ]
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| myTeamId | string? | User's team ID (null if not participating) |
| leaderboard[].rank | number | Team's rank (1-indexed) |
| leaderboard[].isMyTeam | boolean | Highlight user's team |
| leaderboard[].tilesCompleted | number | Number of completed tiles |
| leaderboard[].totalTiles | number | Total tiles on board |

---

## Team Progress

### Get Team Progress Summary
```http
GET /events/:eventId/team/progress
```

Returns summary of team's progress. **Only for participants.**

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTiles": 49,
    "completedTiles": 28,
    "completionPercentage": 57.14,
    "teamScore": 450
  }
}
```

---

## Team Leaderboard

### Get Team Members Ranked
```http
GET /events/:eventId/team/leaderboard
```

Returns team members ranked by individual contribution. **Only for participants.**

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Team Alpha",
      "score": 450
    },
    "myMemberId": 123,
    "leaderboard": [
      {
        "rank": 1,
        "id": "team-member-uuid",
        "memberId": 123,
        "discordTag": "Player#1234",
        "osrsAccountName": "PlayerRSN",
        "role": "captain",
        "individualScore": 125,
        "tilesCompleted": 8,
        "totalProgress": 2450.5,
        "isMe": true
      },
      {
        "rank": 2,
        "id": "team-member-2-uuid",
        "memberId": 124,
        "discordTag": "AnotherPlayer#5678",
        "osrsAccountName": "AnotherRSN",
        "role": "member",
        "individualScore": 95,
        "tilesCompleted": 6,
        "totalProgress": 1820.0,
        "isMe": false
      }
    ]
  }
}
```

---

## Team Activity

### Get Recent Team Activity
```http
GET /events/:eventId/team/activity
```

Returns recent tile completions and progress updates for the team. **Only for participants.**

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Number of entries to return |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "progress-uuid",
      "boardTileId": "board-tile-uuid",
      "position": "A1",
      "task": "Obtain a Fire Cape",
      "category": "combat",
      "icon": "🔥",
      "progressValue": 1,
      "progressMetadata": {...},
      "completionType": "auto",
      "completedAt": "2025-06-05T15:30:00.000Z",
      "updatedAt": "2025-06-05T15:30:00.000Z",
      "playerName": "PlayerRSN",
      "type": "completion"
    },
    {
      "id": "progress-uuid-2",
      "boardTileId": "board-tile-uuid-2",
      "position": "B2",
      "task": "Get 100 Barrows KC",
      "category": "combat",
      "icon": "⚔️",
      "progressValue": 45,
      "progressMetadata": {...},
      "completionType": null,
      "completedAt": null,
      "updatedAt": "2025-06-05T14:20:00.000Z",
      "playerName": "AnotherRSN",
      "type": "progress"
    }
  ]
}
```

**Entry Types:**
| type | Description |
|------|-------------|
| `completion` | Tile was completed (has `completedAt`) |
| `progress` | Progress was made but tile not yet complete |

---

## My Contributions

### Get My Tile Contributions
```http
GET /events/:eventId/my-contributions
```

Returns tiles the current user has contributed to. **Only for participants.**

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "boardTileId": "board-tile-uuid",
      "position": "A1",
      "task": "Obtain a Fire Cape",
      "category": "combat",
      "icon": "🔥",
      "progressValue": 1,
      "progressMetadata": {...},
      "completionType": "auto",
      "completedAt": "2025-06-05T15:30:00.000Z",
      "recordedAt": "2025-06-05T15:30:00.000Z"
    }
  ]
}
```

---

## Tile Details

### Get Single Tile Details
```http
GET /events/:eventId/tiles/:tileId
```

Returns detailed information about a specific tile including full progress history and effects. **Only for participants.**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "board-tile-uuid",
    "boardId": "board-uuid",
    "tileId": "get-fire-cape",
    "position": "A1",
    "isCompleted": true,
    "completedAt": "2025-06-05T15:30:00.000Z",
    "task": "Obtain a Fire Cape",
    "category": "combat",
    "difficulty": "medium",
    "icon": "🔥",
    "description": "Complete the Fight Caves and obtain a Fire Cape",
    "points": 50,
    "requirements": {
      "matchType": "ALL",
      "requirements": [
        {
          "type": "ITEM_DROP",
          "items": [{ "itemId": 6570, "itemName": "Fire cape", "itemAmount": 1 }]
        }
      ],
      "tiers": []
    },
    "progress": [
      {
        "id": "progress-uuid",
        "progressValue": 1,
        "progressMetadata": {
          "requirementType": "ITEM_DROP",
          "currentCount": 1,
          "targetCount": 1,
          "playerContributions": [
            { "osrsAccountId": 456, "osrsNickname": "PlayerRSN", "count": 1 }
          ]
        },
        "completionType": "auto",
        "completedAt": "2025-06-05T15:30:00.000Z",
        "playerName": "PlayerRSN",
        "updatedAt": "2025-06-05T15:30:00.000Z"
      }
    ],
    "effects": [
      {
        "id": "effect-uuid",
        "buffName": "Double Points",
        "buffType": "buff",
        "effectType": "points_multiplier",
        "effectValue": 2,
        "buffIcon": "⭐",
        "isActive": true,
        "expiresAt": null
      }
    ]
  }
}
```

---

## Frontend Integration Flows

### Flow 1: Initial App Load

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         APP INITIALIZATION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User opens the app (already authenticated)                          │
│                                                                          │
│  2. Fetch user's events:                                                │
│     GET /api/app/clan-events/events/my-events                           │
│                                                                          │
│  3. Display events dashboard:                                           │
│     ┌──────────────────────────────────────┐                            │
│     │  🎮 My Events                         │                            │
│     ├──────────────────────────────────────┤                            │
│     │  🔴 Summer Bingo 2025   [ACTIVE]      │                            │
│     │      Team Alpha • Score: 450          │                            │
│     │      My Role: Captain • My Score: 125 │                            │
│     ├──────────────────────────────────────┤                            │
│     │  ⏸️ Spring Event        [PAUSED]      │                            │
│     │      Team Beta • Score: 320           │                            │
│     ├──────────────────────────────────────┤                            │
│     │  ✅ Winter Bingo        [COMPLETED]   │                            │
│     │      Winners: Team Gamma              │                            │
│     └──────────────────────────────────────┘                            │
│                                                                          │
│  4. User clicks on active event → Flow 2                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Viewing Event Board

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      VIEWING BINGO BOARD                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Fetch event details with board:                                     │
│     GET /api/app/clan-events/events/:eventId                            │
│                                                                          │
│  2. Render board grid:                                                  │
│                                                                          │
│     const { board } = response.data;                                    │
│     const grid = Array(board.rows).fill(null).map((_, row) =>           │
│       Array(board.columns).fill(null)                                   │
│     );                                                                   │
│                                                                          │
│     // Place tiles in grid                                              │
│     board.tiles.forEach(tile => {                                       │
│       const col = tile.position.charCodeAt(0) - 65; // A=0, B=1...     │
│       const row = parseInt(tile.position.slice(1)) - 1; // 1=0, 2=1... │
│       grid[row][col] = tile;                                            │
│     });                                                                  │
│                                                                          │
│  3. Display board:                                                      │
│     ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                         │
│     │ ✅  │ 🔥  │ ⚔️  │ 💰  │ 🎯  │ 📦  │ ⭐  │  ← Row 1               │
│     ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                         │
│     │ 🗡️  │ 🏆  │ 75% │ 🎲  │ ✅  │ 🔮  │ 💎  │  ← Row 2               │
│     ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                         │
│     │ ...                                   ...│                         │
│     └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                         │
│       A     B     C     D     E     F     G                             │
│                                                                          │
│  4. For each tile, determine display state:                             │
│                                                                          │
│     function getTileState(tile) {                                       │
│       if (tile.is_completed) return 'completed';                        │
│       if (tile.progress_entries.length > 0) {                           │
│         const progress = tile.progress_entries[0];                      │
│         const pct = calculateProgress(tile, progress);                  │
│         return { state: 'in-progress', percentage: pct };               │
│       }                                                                  │
│       return 'not-started';                                             │
│     }                                                                    │
│                                                                          │
│  5. Poll for updates every 30-60 seconds:                               │
│     setInterval(() => refetch(), 30000);                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 3: Calculating Tile Progress

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   CALCULATING TILE PROGRESS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  function calculateProgress(tile, progressEntry) {                      │
│    const { requirements } = tile;                                       │
│    const { progress_metadata } = progressEntry;                         │
│                                                                          │
│    // For tiered requirements                                           │
│    if (requirements.tiers?.length > 0) {                                │
│      const completedTiers = progress_metadata.completedTiers || [];     │
│      const totalTiers = requirements.tiers.length;                      │
│      return {                                                           │
│        type: 'tiered',                                                  │
│        completed: completedTiers.length,                                │
│        total: totalTiers,                                               │
│        percentage: (completedTiers.length / totalTiers) * 100,          │
│        highestTier: Math.max(...completedTiers.map(t => t.tier), 0)     │
│      };                                                                  │
│    }                                                                     │
│                                                                          │
│    // For regular requirements based on type                            │
│    switch (progress_metadata.requirementType) {                         │
│      case 'ITEM_DROP':                                                  │
│        return {                                                         │
│          type: 'count',                                                 │
│          current: progress_metadata.currentCount,                       │
│          target: progress_metadata.targetCount,                         │
│          percentage: (current / target) * 100,                          │
│          label: `${current}/${target} items`                            │
│        };                                                               │
│                                                                          │
│      case 'VALUE_DROP':                                                 │
│        return {                                                         │
│          type: 'value',                                                 │
│          current: progress_metadata.currentHighestValue,                │
│          target: progress_metadata.targetValue,                         │
│          percentage: (current / target) * 100,                          │
│          label: `${formatGp(current)} / ${formatGp(target)}`            │
│        };                                                               │
│                                                                          │
│      case 'SPEEDRUN':                                                   │
│        const current = progress_metadata.currentBestTimeSeconds;        │
│        const goal = progress_metadata.goalSeconds;                      │
│        return {                                                         │
│          type: 'time',                                                  │
│          current,                                                       │
│          target: goal,                                                  │
│          isCompleted: current <= goal,                                  │
│          label: `${formatTime(current)} / ${formatTime(goal)}`          │
│        };                                                               │
│                                                                          │
│      case 'EXPERIENCE':                                                 │
│        return {                                                         │
│          type: 'xp',                                                    │
│          current: progress_metadata.currentXp,                          │
│          target: progress_metadata.targetXp,                            │
│          percentage: (current / target) * 100,                          │
│          label: `${formatXp(current)} / ${formatXp(target)} XP`         │
│        };                                                               │
│                                                                          │
│      case 'PET':                                                        │
│        return {                                                         │
│          type: 'boolean',                                               │
│          obtained: progress_metadata.obtained,                          │
│          label: progress_metadata.petName                               │
│        };                                                               │
│                                                                          │
│      case 'BA_GAMBLES':                                                 │
│        return {                                                         │
│          type: 'count',                                                 │
│          current: progress_metadata.currentCount,                       │
│          target: progress_metadata.targetCount,                         │
│          percentage: (current / target) * 100,                          │
│          label: `${current}/${target} gambles`                          │
│        };                                                               │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 4: Viewing Tile Details

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TILE DETAIL MODAL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User clicks on a tile                                               │
│                                                                          │
│  2. Fetch tile details:                                                 │
│     GET /api/app/clan-events/events/:eventId/tiles/:tileId              │
│                                                                          │
│  3. Display modal:                                                      │
│     ┌────────────────────────────────────────────────┐                  │
│     │  🔥 Obtain a Fire Cape                          │                  │
│     │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │                  │
│     │  Category: Combat | Difficulty: Medium          │                  │
│     │  Points: 50 ⭐                                   │                  │
│     │                                                  │                  │
│     │  📋 Description:                                │                  │
│     │  Complete the Fight Caves and obtain a Fire     │                  │
│     │  Cape as a drop.                                │                  │
│     │                                                  │                  │
│     │  ✅ COMPLETED                                    │                  │
│     │  Completed by: PlayerRSN                        │                  │
│     │  Completed at: June 5, 2025 3:30 PM             │                  │
│     │                                                  │                  │
│     │  📊 Progress History:                           │                  │
│     │  ┌──────────────────────────────────────────┐   │                  │
│     │  │ PlayerRSN obtained Fire cape             │   │                  │
│     │  │ June 5, 2025 3:30 PM                     │   │                  │
│     │  └──────────────────────────────────────────┘   │                  │
│     │                                                  │                  │
│     │  ⭐ Active Effects:                             │                  │
│     │  • Double Points (2x multiplier)                │                  │
│     │                                                  │                  │
│     │  👥 Contributors:                               │                  │
│     │  • PlayerRSN: 1 item                            │                  │
│     │                                                  │                  │
│     └────────────────────────────────────────────────┘                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 5: Viewing Leaderboards

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LEADERBOARD VIEWS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  EVENT LEADERBOARD (All Teams):                                         │
│  GET /api/app/clan-events/events/:eventId/leaderboard                   │
│                                                                          │
│     ┌────────────────────────────────────────────────────────┐          │
│     │  🏆 Summer Bingo 2025 - Leaderboard                     │          │
│     ├────────────────────────────────────────────────────────┤          │
│     │  #1  🔥 Team Alpha       450 pts  28/49 tiles  ← YOU   │          │
│     │  #2  💚 Team Beta        380 pts  24/49 tiles          │          │
│     │  #3  💜 Team Gamma       350 pts  22/49 tiles          │          │
│     │  #4  💙 Team Delta       290 pts  18/49 tiles          │          │
│     │  #5  🧡 Team Epsilon     245 pts  15/49 tiles          │          │
│     │  ...                                                    │          │
│     └────────────────────────────────────────────────────────┘          │
│                                                                          │
│  TEAM LEADERBOARD (Team Members):                                       │
│  GET /api/app/clan-events/events/:eventId/team/leaderboard              │
│                                                                          │
│     ┌────────────────────────────────────────────────────────┐          │
│     │  🔥 Team Alpha - Member Rankings                        │          │
│     ├────────────────────────────────────────────────────────┤          │
│     │  #1  👑 PlayerRSN      125 pts  8 tiles  ← YOU         │          │
│     │  #2     AnotherRSN     95 pts   6 tiles               │          │
│     │  #3     ThirdPlayer    85 pts   5 tiles               │          │
│     │  #4     FourthPlayer   75 pts   5 tiles               │          │
│     │  #5     FifthPlayer    70 pts   4 tiles               │          │
│     │  ...                                                    │          │
│     └────────────────────────────────────────────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 6: Activity Feed

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ACTIVITY FEED                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GET /api/app/clan-events/events/:eventId/team/activity?limit=20        │
│                                                                          │
│     ┌────────────────────────────────────────────────────────┐          │
│     │  📰 Team Alpha - Recent Activity                        │          │
│     ├────────────────────────────────────────────────────────┤          │
│     │  ✅ PlayerRSN completed "Fire Cape" (A1)               │          │
│     │     Just now                                            │          │
│     │                                                         │          │
│     │  📈 AnotherRSN progressed "100 Barrows KC" (B2)        │          │
│     │     45/100 kills • 5 minutes ago                        │          │
│     │                                                         │          │
│     │  ✅ ThirdPlayer completed "Get a Pet" (C3)             │          │
│     │     10 minutes ago                                      │          │
│     │                                                         │          │
│     │  📈 PlayerRSN progressed "5M Total XP" (D4)            │          │
│     │     2.5M/5M XP • 15 minutes ago                         │          │
│     │                                                         │          │
│     │  ✅ FourthPlayer completed "Speedrun CoX" (E5)         │          │
│     │     Tier 2 completed (1:45) • 30 minutes ago            │          │
│     └────────────────────────────────────────────────────────┘          │
│                                                                          │
│  Rendering activity entries:                                            │
│                                                                          │
│  function renderActivity(entry) {                                       │
│    const isCompletion = entry.type === 'completion';                    │
│    const icon = isCompletion ? '✅' : '📈';                             │
│    const action = isCompletion ? 'completed' : 'progressed';            │
│                                                                          │
│    return `                                                             │
│      ${icon} ${entry.playerName} ${action} "${entry.task}" (${entry.position})
│      ${formatRelativeTime(entry.completedAt || entry.updatedAt)}        │
│    `;                                                                    │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow 7: Polling Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME UPDATES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Since we don't have WebSocket, use smart polling:                      │
│                                                                          │
│  // In your React/Vue component                                         │
│                                                                          │
│  const POLL_INTERVALS = {                                               │
│    board: 30000,        // Full board every 30 seconds                  │
│    activity: 15000,     // Activity feed every 15 seconds               │
│    leaderboard: 60000   // Leaderboard every 60 seconds                 │
│  };                                                                      │
│                                                                          │
│  // Smart polling based on visibility                                   │
│  useEffect(() => {                                                      │
│    let interval;                                                        │
│                                                                          │
│    const startPolling = () => {                                         │
│      interval = setInterval(fetchBoard, POLL_INTERVALS.board);          │
│    };                                                                    │
│                                                                          │
│    const stopPolling = () => {                                          │
│      clearInterval(interval);                                           │
│    };                                                                    │
│                                                                          │
│    // Only poll when tab is visible                                     │
│    document.addEventListener('visibilitychange', () => {                │
│      if (document.hidden) {                                             │
│        stopPolling();                                                   │
│      } else {                                                           │
│        fetchBoard(); // Immediate fetch on return                       │
│        startPolling();                                                  │
│      }                                                                   │
│    });                                                                   │
│                                                                          │
│    startPolling();                                                      │
│    return stopPolling;                                                  │
│  }, [eventId]);                                                         │
│                                                                          │
│  // Optimistic updates for better UX                                    │
│  function handleTileUpdate(newTileData) {                               │
│    // Update local state immediately                                    │
│    setTiles(prev => prev.map(t =>                                       │
│      t.id === newTileData.id ? { ...t, ...newTileData } : t             │
│    ));                                                                   │
│                                                                          │
│    // Animation for newly completed tiles                               │
│    if (newTileData.is_completed && !previousState.is_completed) {       │
│      showCompletionAnimation(newTileData.position);                     │
│      playSound('tile-complete');                                        │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
| Code | Description | When |
|------|-------------|------|
| 401 | Unauthorized | Missing or invalid auth headers |
| 403 | Forbidden | User not participating in event |
| 404 | Not Found | Event or tile not found |
| 500 | Server Error | Internal error |

**Frontend error handling:**
```javascript
async function fetchEvent(eventId) {
  try {
    const response = await api.get(`/clan-events/${eventId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      // User not participating - show "Join Event" UI
      showJoinEventPrompt();
    } else if (error.response?.status === 401) {
      // Not logged in - redirect to login
      redirectToLogin();
    } else {
      // Generic error
      showErrorToast(error.response?.data?.message || 'Failed to load event');
    }
  }
}
```

---

## Summary of Endpoints

| Method | Endpoint | Description | Auth | Route File |
|--------|----------|-------------|------|------------|
| GET | `/events` | List active events | Required | `events.routes.ts` |
| GET | `/events/my-events` | Get all user's events | Required | `events.routes.ts` |
| GET | `/events/:eventId` | Get event with board | Participant | `events.routes.ts` |
| GET | `/events/:eventId/leaderboard` | Event team rankings | Required | `leaderboard.routes.ts` |
| GET | `/events/:eventId/team/progress` | Team progress summary | Participant | `team.routes.ts` |
| GET | `/events/:eventId/team/leaderboard` | Team member rankings | Participant | `team.routes.ts` |
| GET | `/events/:eventId/team/activity` | Recent team activity | Participant | `team.routes.ts` |
| GET | `/events/:eventId/my-contributions` | User's contributions | Participant | `contributions.routes.ts` |
| GET | `/events/:eventId/tiles/:tileId` | Tile detail view | Participant | `tiles.routes.ts` |

