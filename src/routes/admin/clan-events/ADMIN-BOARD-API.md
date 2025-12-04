# Admin Board Management API Documentation

This document describes all admin endpoints for managing bingo boards, tiles, progress, and effects.

**Base URL:** `/api/admin/clan-events/:eventId/teams/:teamId/board`

All endpoints require admin authentication.

---

## Table of Contents

1. [Get Board](#1-get-board)
2. [Update Board Config](#2-update-board-config)
3. [Add Tile](#3-add-tile)
4. [Update Tile](#4-update-tile)
5. [Delete Tile](#5-delete-tile)
6. [Complete Tile (Manual)](#6-complete-tile-manual)
7. [Revert Tile Completion](#7-revert-tile-completion)
8. [Tile Effects (Buffs/Debuffs)](#8-tile-effects)
9. [Line Effects (Row/Column Buffs)](#9-line-effects)
10. [Bulk Update](#10-bulk-update)
11. [TypeScript Types](#11-typescript-types)

---

## 1. Get Board

Retrieves the complete board with all tiles, progress, and effects.

### Request

```
GET /api/admin/clan-events/:eventId/teams/:teamId/board
```

### Response

```typescript
{
  success: true,
  data: {
    id: string;
    eventId: string;
    teamId: string;
    columns: number;
    rows: number;
    metadata: {
      showTileEffects?: boolean;
      showRowColumnBuffs?: boolean;
      // ... custom metadata
    };
    tiles: BoardTile[];
    tileEffects: TileEffect[];
    rowEffects: LineEffect[];
    columnEffects: LineEffect[];
  }
}
```

### Example Usage (React Query)

```typescript
const { data: board } = useQuery({
  queryKey: ['admin', 'board', eventId, teamId],
  queryFn: () => api.get(`/admin/clan-events/${eventId}/teams/${teamId}/board`),
});
```

---

## 2. Update Board Config

Updates board configuration (dimensions, metadata).

### Request

```
PATCH /api/admin/clan-events/:eventId/teams/:teamId/board
```

### Body

```typescript
{
  name?: string;
  description?: string;
  columns?: number;
  rows?: number;
  metadata?: {
    showTileEffects?: boolean;
    showRowColumnBuffs?: boolean;
    // ... any custom metadata
  };
}
```

### Response

```typescript
{
  success: true,
  data: Board, // Updated board object
  message: "Board updated successfully"
}
```

### Example

```typescript
await api.patch(`/admin/clan-events/${eventId}/teams/${teamId}/board`, {
  columns: 5,
  rows: 5,
  metadata: {
    showTileEffects: true,
    showRowColumnBuffs: false
  }
});
```

---

## 3. Add Tile

Adds a tile from the tile library to the board.

### Request

```
POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles
```

### Body

```typescript
{
  tileId: string;      // Required - ID from bingo_tiles library
  position: string;    // Required - e.g., "A1", "B3", "C5"
  metadata?: object;   // Optional - tile-specific metadata
}
```

### Response

```typescript
{
  success: true,
  data: BoardTile,
  message: "Tile added successfully"
}
```

### Example

```typescript
await api.post(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles`, {
  tileId: "obtain_goblin_mail",
  position: "A1",
  metadata: { customPoints: 10 }
});
```

---

## 4. Update Tile

Updates an existing tile on the board.

### Request

```
PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
```

**Note:** `:tileId` here is the `board_tile_id` (UUID), not the `tile_id` from the library.

### Body

```typescript
{
  position?: string;       // Move tile to new position
  isCompleted?: boolean;   // Set completion status
  completedAt?: string;    // ISO timestamp
  metadata?: object;       // Update metadata
}
```

### Response

```typescript
{
  success: true,
  data: BoardTile,
  message: "Tile updated successfully"
}
```

### Example

```typescript
// Move tile to new position
await api.patch(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${boardTileId}`, {
  position: "B2"
});
```

---

## 5. Delete Tile

Removes a tile from the board (and all associated progress/effects).

### Request

```
DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
```

### Response

```typescript
{
  success: true,
  message: "Tile deleted successfully",
  deletedTileId: string
}
```

### Example

```typescript
await api.delete(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${boardTileId}`);
```

---

## 6. Complete Tile (Manual)

Manually marks a tile as completed by admin.

### Request

```
POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/complete
```

### Body

```typescript
{
  completionType?: "manual_admin";     // Default: "manual_admin"
  completedByOsrsAccountId?: number;   // Optional - attribute to specific player
  notes?: string;                       // Optional - admin notes
}
```

### Response

```typescript
{
  success: true,
  data: {
    tile: BoardTile,
    progress: TileProgress
  },
  message: "Tile marked as completed"
}
```

### Example

```typescript
// Complete tile attributed to a specific player
await api.post(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${boardTileId}/complete`, {
  completedByOsrsAccountId: 123,
  notes: "Manually verified completion"
});
```

---

## 7. Revert Tile Completion

Reverts a completed tile back to incomplete.

### Request

```
POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/revert
```

### Body

None required.

### Response

```typescript
{
  success: true,
  data: BoardTile,
  message: "Tile reverted successfully"
}
```

### Errors

- `409 Conflict` - Tile is not completed

### Example

```typescript
await api.post(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${boardTileId}/revert`);
```

---

## 8. Tile Effects

Manage buffs/debuffs applied to specific tiles.

### 8.1 Add Tile Effect

```
POST /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs
```

**Body:**
```typescript
{
  boardTileId: string;     // Required - the board tile to affect
  buffDebuffId: string;    // Required - ID from bingo_buffs_debuffs table
  appliedBy?: string;      // Optional - admin ID or name
  expiresAt?: string;      // Optional - ISO timestamp for auto-expiry
  metadata?: object;       // Optional - effect metadata
}
```

**Response:**
```typescript
{
  success: true,
  data: TileEffect,
  message: "Buff/debuff applied successfully"
}
```

### 8.2 Update Tile Effect

```
PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
```

**Body:**
```typescript
{
  isActive?: boolean;
  expiresAt?: string;
  metadata?: object;
}
```

### 8.3 Remove Tile Effect

```
DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
```

---

## 9. Line Effects

Manage buffs/debuffs applied to entire rows or columns.

### 9.1 Add Line Effect

```
POST /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs
```

**Body:**
```typescript
{
  lineType: "row" | "column";  // Required
  lineIdentifier: string;       // Required - row number ("1", "2") or column letter ("A", "B")
  buffDebuffId: string;         // Required - ID from bingo_buffs_debuffs table
  appliedBy?: string;           // Optional
  expiresAt?: string;           // Optional - ISO timestamp
  metadata?: object;            // Optional
}
```

**Response:**
```typescript
{
  success: true,
  data: LineEffect,
  message: "Line buff/debuff applied successfully"
}
```

### 9.2 Update Line Effect

```
PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs/:effectId
```

**Body:**
```typescript
{
  isActive?: boolean;
  expiresAt?: string;
  metadata?: object;
}
```

### 9.3 Remove Line Effect

```
DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs/:effectId
```

---

## 10. Bulk Update

Comprehensive endpoint to update the entire board, tiles, and progress in one request.

### Request

```
PUT /api/admin/clan-events/:eventId/teams/:teamId/board/bulk
```

### Body

```typescript
{
  // Update board configuration
  board?: {
    columns?: number;
    rows?: number;
    metadata?: object;
  };
  
  // Create or update tiles
  tiles?: Array<{
    boardTileId?: string;       // If provided, updates existing tile
    tileId: string;             // Required - tile library ID
    position: string;           // Required - e.g., "A1"
    metadata?: object;
    isCompleted?: boolean;
    progress?: {
      progressValue?: number;
      progressMetadata?: object;
      completedByOsrsAccountId?: number;
      completionType?: "auto" | "manual_admin";
    };
  }>;
  
  // Remove tiles by board tile ID
  removeTileIds?: string[];
  
  // Reset ALL progress on the board
  resetAllProgress?: boolean;
}
```

### Response

```typescript
{
  success: true,
  message: "Board bulk update completed",
  summary: {
    boardUpdated: boolean;
    tilesCreated: number;
    tilesUpdated: number;
    tilesRemoved: number;
    progressUpdated: number;
    progressReset: boolean;
  };
  data: {
    board: {
      id: string;
      eventId: string;
      teamId: string;
      columns: number;
      rows: number;
      metadata: object;
    };
    tiles: Array<{
      id: string;
      position: string;
      tileId: string;
      isCompleted: boolean;
      task: string;
      progress: TileProgress | null;
      // ... more fields
    }>;
  };
}
```

### Example: Reset Board and Set New Tiles

```typescript
await api.put(`/admin/clan-events/${eventId}/teams/${teamId}/board/bulk`, {
  resetAllProgress: true,
  board: {
    columns: 5,
    rows: 5
  },
  tiles: [
    { tileId: "obtain_goblin_mail", position: "A1" },
    { tileId: "obtain_pet", position: "A2" },
    { tileId: "speedrun_scurrius", position: "A3" },
    // ... more tiles
  ]
});
```

### Example: Update Progress on Multiple Tiles

```typescript
await api.put(`/admin/clan-events/${eventId}/teams/${teamId}/board/bulk`, {
  tiles: [
    {
      boardTileId: "existing-tile-uuid-1",
      tileId: "obtain_goblin_mail",
      position: "A1",
      isCompleted: true,
      progress: {
        progressValue: 1,
        completionType: "manual_admin",
        progressMetadata: { note: "Manually verified" }
      }
    },
    {
      boardTileId: "existing-tile-uuid-2",
      tileId: "obtain_pet",
      position: "A2",
      progress: {
        progressValue: 0.5,
        progressMetadata: { attempts: 50 }
      }
    }
  ]
});
```

---

## 11. TypeScript Types

### BoardTile

```typescript
interface BoardTile {
  id: string;                    // Board tile UUID
  boardId: string;               // Board UUID
  tileId: string;                // Tile library ID
  position: string;              // e.g., "A1", "B3"
  isCompleted: boolean;
  completedAt: string | null;    // ISO timestamp
  metadata: Record<string, any>;
  
  // From joined tile library
  task: string;
  category: string;
  difficulty: string;
  icon: string | null;
  description: string | null;
  points: number;
  requirements: TileRequirements;
  
  // Progress data
  progressEntries: TileProgressEntry[];
  teamTotalXpGained?: number | null;
}
```

### TileProgressEntry

```typescript
interface TileProgressEntry {
  id: string;
  osrsAccountId: number | null;
  progressValue: number;
  progressMetadata: Record<string, any>;
  completionType: "auto" | "manual_admin" | null;
  completedAt: string | null;
  completedByOsrsAccountId: number | null;
  completedByMemberId: number | null;
  recordedAt: string;
}
```

### TileEffect

```typescript
interface TileEffect {
  id: string;
  boardTileId: string;
  buffDebuffId: string;
  isActive: boolean;
  expiresAt: string | null;
  buffName: string;
  buffType: "buff" | "debuff";
  effectType: string;
  effectValue: number;
  buffIcon: string | null;
}
```

### LineEffect

```typescript
interface LineEffect {
  id: string;
  boardId: string;
  lineType: "row" | "column";
  lineIdentifier: string;
  buffDebuffId: string;
  isActive: boolean;
  expiresAt: string | null;
  buffName: string;
  buffType: "buff" | "debuff";
  effectType: string;
  effectValue: number;
  buffIcon: string | null;
}
```

### Board Position Format

Positions use letter-number format:
- Column: A-Z (letter)
- Row: 1-N (number)

Examples: `"A1"`, `"B3"`, `"C5"`, `"G7"`

For a 5x5 board:
```
    A    B    C    D    E
1  A1   B1   C1   D1   E1
2  A2   B2   C2   D2   E2
3  A3   B3   C3   D3   E3
4  A4   B4   C4   D4   E4
5  A5   B5   C5   D5   E5
```

---

## Error Responses

All endpoints return errors in this format:

```typescript
{
  success: false,
  error: string;           // Error message
  message?: string;        // Additional details
  required?: string[];     // Missing required fields (for 400 errors)
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Missing required fields |
| 404 | Not Found - Team, board, tile, or effect not found |
| 409 | Conflict - Invalid state (e.g., completing already completed tile) |
| 500 | Internal Server Error |

---

## Frontend Implementation Tips

### 1. Board Editor Component

```tsx
function BoardEditor({ eventId, teamId }: Props) {
  const { data: board, refetch } = useQuery({
    queryKey: ['admin', 'board', eventId, teamId],
    queryFn: () => fetchBoard(eventId, teamId),
  });

  const updateTile = useMutation({
    mutationFn: ({ tileId, updates }) => 
      api.patch(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${tileId}`, updates),
    onSuccess: () => refetch(),
  });

  // Render grid based on board.columns and board.rows
  // Map tiles to positions
}
```

### 2. Drag and Drop Tiles

```tsx
function handleTileDrop(tileId: string, newPosition: string) {
  await api.patch(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${tileId}`, {
    position: newPosition
  });
}
```

### 3. Manual Completion Dialog

```tsx
function CompleteTileDialog({ tileId, onComplete }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<number>();
  const [notes, setNotes] = useState("");

  const handleComplete = async () => {
    await api.post(`/admin/clan-events/${eventId}/teams/${teamId}/board/tiles/${tileId}/complete`, {
      completedByOsrsAccountId: selectedPlayer,
      notes
    });
    onComplete();
  };
}
```

### 4. Bulk Operations

```tsx
// Reset entire board
async function resetBoard() {
  await api.put(`/admin/clan-events/${eventId}/teams/${teamId}/board/bulk`, {
    resetAllProgress: true
  });
}

// Copy board from template
async function applyTemplate(tiles: TemplateT[]) {
  await api.put(`/admin/clan-events/${eventId}/teams/${teamId}/board/bulk`, {
    removeTileIds: currentTiles.map(t => t.id),
    tiles: tiles.map(t => ({
      tileId: t.tileId,
      position: t.position,
      metadata: t.metadata
    }))
  });
}
```

