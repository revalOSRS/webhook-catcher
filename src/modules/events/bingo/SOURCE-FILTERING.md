# Source Filtering for ITEM_DROP Requirements

## Overview

The `sources` field allows you to restrict item drop tracking to specific NPCs, bosses, or activities. When specified, only drops from matching sources will count toward tile progress.

This is useful for tiles like:
- "Get a Dragon Pickaxe from King Black Dragon" (not from Callisto)
- "Get an Abyssal Whip from Abyssal Demons" (not from a trade)
- "Get Barrows items from Barrows" (not from other sources)

## The `sources` Field

```typescript
interface ItemDropRequirementDef {
  type: 'ITEM_DROP';
  items: Array<{
    itemName: string;
    itemId: number;
    itemAmount?: number;
  }>;
  totalAmount?: number;
  sources?: string[];  // NEW: Optional source filter
}
```

### Behavior

| `sources` Value | Behavior |
|-----------------|----------|
| `undefined` or not set | Drops from ANY source count |
| `[]` (empty array) | **Invalid** - validation will fail |
| `["Boss Name"]` | Only drops from "Boss Name" count |
| `["Boss1", "Boss2"]` | Drops from either boss count |

### Source Matching

- **Case-insensitive**: `"Zulrah"` matches `"zulrah"`, `"ZULRAH"`, etc.
- **Exact match required**: `"Abyssal"` does NOT match `"Abyssal demon"`
- **Multiple sources**: Any matching source counts

---

## Affected Endpoints

### 1. Create/Update Tiles (Admin)

**Endpoints:**
- `POST /api/admin/clan-events/bingo/tiles` - Create tile
- `PATCH /api/admin/clan-events/bingo/tiles/:tileId` - Update tile

**Request Body Example:**

```json
{
  "id": "dragon-pickaxe-from-kbd",
  "task": "Get a Dragon Pickaxe from King Black Dragon",
  "category": "pvm",
  "difficulty": "hard",
  "icon": "Dragon_pickaxe",
  "points": 5,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "ITEM_DROP",
        "items": [
          { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
        ],
        "sources": ["King Black Dragon"]
      }
    ]
  }
}
```

**Validation:**
- `sources` must be an array if provided
- `sources` cannot be empty if provided
- Each source must be a non-empty string

---

### 2. Get Tile Details (Admin)

**Endpoint:** `GET /api/admin/clan-events/bingo/tiles/:tileId`

**Response includes `sources`:**

```json
{
  "success": true,
  "data": {
    "id": "dragon-pickaxe-from-kbd",
    "task": "Get a Dragon Pickaxe from King Black Dragon",
    "requirements": {
      "matchType": "all",
      "requirements": [
        {
          "type": "ITEM_DROP",
          "items": [
            { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
          ],
          "sources": ["King Black Dragon"]
        }
      ]
    }
  }
}
```

---

### 3. Get Team Board (Admin)

**Endpoint:** `GET /api/admin/clan-events/events/:eventId/teams/:teamId/board`

**Response includes full requirement data with `sources`:**

```json
{
  "success": true,
  "data": {
    "tiles": [
      {
        "id": "abc-123",
        "position": "A1",
        "task": "Get a Dragon Pickaxe from King Black Dragon",
        "requirements": {
          "matchType": "all",
          "requirements": [
            {
              "type": "ITEM_DROP",
              "items": [
                { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
              ],
              "sources": ["King Black Dragon"]
            }
          ]
        }
      }
    ]
  }
}
```

---

### 4. Get Event Details (App - Authenticated)

**Endpoint:** `GET /api/app/clan-events/events/:eventId`

**Response includes `sources` in tile requirements:**

```json
{
  "board": {
    "tiles": [
      {
        "position": "A1",
        "task": "Get a Dragon Pickaxe from King Black Dragon",
        "requirements": {
          "matchType": "all",
          "requirements": [
            {
              "type": "ITEM_DROP",
              "items": [
                { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
              ],
              "sources": ["King Black Dragon"]
            }
          ]
        }
      }
    ]
  }
}
```

---

### 5. Public Bingo Board

**Endpoint:** `GET /api/public/bingo/:eventId`

**Response includes `sources` in tile requirements (visible to all):**

```json
{
  "teams": [
    {
      "board": {
        "tiles": [
          {
            "position": "A1",
            "task": "Get a Dragon Pickaxe from King Black Dragon",
            "requirements": {
              "matchType": "all",
              "requirements": [
                {
                  "type": "ITEM_DROP",
                  "items": [
                    { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
                  ],
                  "sources": ["King Black Dragon"]
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

---

### 6. Bulk Board Update (Admin)

**Endpoint:** `PUT /api/admin/clan-events/events/:eventId/teams/:teamId/board/bulk`

When updating tiles via bulk update, `sources` is preserved:

```json
{
  "tiles": [
    {
      "tileId": "dragon-pickaxe-from-kbd",
      "position": "A1"
    }
  ]
}
```

The tile's `sources` configuration comes from the tile definition in `bingo_tiles`.

---

## How Source Filtering Works

### Event Processing Flow

```
1. Dink webhook received (LOOT event)
   └── source: "King Black Dragon"
   └── items: [{ id: 11920, name: "Dragon pickaxe", quantity: 1 }]

2. Matcher checks requirement
   └── matchesItemDrop() called
   
3. Source check (if sources specified)
   └── requirement.sources = ["King Black Dragon"]
   └── event.source = "King Black Dragon"
   └── Match? YES ✓
   
4. Item check
   └── Required item 11920 found in event? YES ✓
   
5. Forward to calculator
   └── Progress updated, tile may complete
```

### Rejection Example

```
1. Dink webhook received (LOOT event)
   └── source: "Callisto"
   └── items: [{ id: 11920, name: "Dragon pickaxe", quantity: 1 }]

2. Matcher checks requirement
   └── matchesItemDrop() called
   
3. Source check
   └── requirement.sources = ["King Black Dragon"]
   └── event.source = "Callisto"
   └── Match? NO ✗
   
4. Event rejected - no progress recorded
```

---

## Common Use Cases

### 1. Single Boss Restriction

```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemId": 4151, "itemName": "Abyssal whip", "itemAmount": 1 }
  ],
  "sources": ["Abyssal demon"]
}
```

### 2. Multiple Allowed Sources

```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
  ],
  "sources": ["King Black Dragon", "Callisto", "Venenatis", "Vet'ion"]
}
```

### 3. Raid-Specific Drops

```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemId": 20997, "itemName": "Twisted bow", "itemAmount": 1 }
  ],
  "sources": ["Chambers of Xeric"]
}
```

### 4. Combined with totalAmount

```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemId": 26219, "itemName": "Osmumten's fang" },
    { "itemId": 25975, "itemName": "Lightbearer" },
    { "itemId": 25985, "itemName": "Elidinis' ward" }
  ],
  "totalAmount": 2,
  "sources": ["Tombs of Amascut"]
}
```

---

## Finding Source Names

The source name must match exactly what Dink sends. Common sources:

| Activity | Source Name |
|----------|-------------|
| Zulrah | `Zulrah` |
| Vorkath | `Vorkath` |
| Chambers of Xeric | `Chambers of Xeric` |
| Theatre of Blood | `Theatre of Blood` |
| Tombs of Amascut | `Tombs of Amascut` |
| Barrows | `Barrows` |
| King Black Dragon | `King Black Dragon` |
| Slayer (Abyssal demons) | `Abyssal demon` |
| Gauntlet | `The Gauntlet` or `The Corrupted Gauntlet` |

**Tip:** Check your server logs when drops occur to see the exact source names being sent by Dink.

---

## Tiered Requirements with Sources

Sources work with tiered requirements too:

```json
{
  "matchType": "all",
  "requirements": [
    {
      "type": "ITEM_DROP",
      "items": [
        { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
      ],
      "sources": ["King Black Dragon"]
    }
  ],
  "tiers": [
    {
      "tier": 1,
      "points": 3,
      "requirement": {
        "type": "ITEM_DROP",
        "items": [
          { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 2 }
        ],
        "sources": ["King Black Dragon"]
      }
    }
  ]
}
```

---

## PUZZLE Tiles with Source Filtering

For PUZZLE tiles that hide the actual requirement, the `sources` filter is applied to the `hiddenRequirement`:

```json
{
  "type": "PUZZLE",
  "displayName": "Mystery Drop",
  "displayDescription": "Get the mystery item from the right place!",
  "displayHint": "Think black and fiery...",
  "displayIcon": "🐉",
  "puzzleCategory": "riddle",
  "revealOnComplete": true,
  "hiddenRequirement": {
    "type": "ITEM_DROP",
    "items": [
      { "itemId": 11920, "itemName": "Dragon pickaxe", "itemAmount": 1 }
    ],
    "sources": ["King Black Dragon"]
  }
}
```

The `sources` filter is hidden from players (part of `hiddenRequirement`) but still enforced during tracking.

---

## Summary

| Endpoint | Shows `sources`? | Accepts `sources`? |
|----------|------------------|-------------------|
| `POST /admin/.../tiles` | - | ✅ Yes |
| `PATCH /admin/.../tiles/:id` | - | ✅ Yes |
| `GET /admin/.../tiles/:id` | ✅ Yes | - |
| `GET /admin/.../teams/:id/board` | ✅ Yes | - |
| `PUT /admin/.../board/bulk` | ✅ Yes | Via tile reference |
| `GET /app/.../events/:id` | ✅ Yes | - |
| `GET /public/bingo/:id` | ✅ Yes | - |

The `sources` field is:
- **Stored** in the `bingo_tiles.requirements` JSONB column
- **Validated** when creating/updating tiles
- **Checked** during event matching in the requirement matcher
- **Displayed** in all board/tile responses

