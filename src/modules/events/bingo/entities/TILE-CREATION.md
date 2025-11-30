# Bingo Tile Creation Guide

This document describes how to create bingo tiles and structure the JSON for different requirement types. Use this as a reference when building the tile creator form.

---

## Table of Contents

1. [Tile Structure Overview](#tile-structure-overview)
2. [Basic Tile Fields](#basic-tile-fields)
3. [Requirement Types](#requirement-types)
4. [Match Types](#match-types)
5. [Tiered Requirements](#tiered-requirements)
6. [Complete Examples](#complete-examples)
7. [Frontend Form Design Tips](#frontend-form-design-tips)

---

## Tile Structure Overview

A bingo tile consists of basic metadata and a `requirements` object that defines what players need to do to complete the tile.

```typescript
interface BingoTile {
  id: string;           // Auto-generated UUID
  task: string;         // Display name shown on the tile
  description?: string; // Optional detailed description
  category: string;     // Category for filtering/grouping
  difficulty: string;   // Difficulty level
  icon?: string;        // Optional icon URL or identifier
  requirements: {       // The completion requirements
    matchType: 'any' | 'all';
    requirements: RequirementDef[];
    tiers?: TieredRequirement[];
  };
  points: number;       // Points awarded for completion
}
```

---

## Basic Tile Fields

### Categories
```typescript
enum BingoTileCategory {
  SLAYER = 'slayer',
  PVM = 'pvm',
  RAIDS = 'raids',
  COLLECTION = 'collection',
  CLUES = 'clues',
  SKILLS = 'skills',
  QUESTS = 'quests',
  DIARIES = 'diaries',
  MINIGAMES = 'minigames',
  COMBAT = 'combat',
  PETS = 'pets',
  AGILITY = 'agility'
}
```

### Difficulties
```typescript
enum BingoTileDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXTREME = 'extreme'
}
```

---

## Requirement Types

### 1. ITEM_DROP

For collecting specific items from drops.

```typescript
interface ItemDropRequirementDef {
  type: 'ITEM_DROP';
  items: Array<{
    itemName: string;    // Display name of the item
    itemId: number;      // OSRS item ID
    itemAmount?: number; // Optional: specific amount needed per item
  }>;
  totalAmount?: number;  // Optional: total amount needed of ANY items in the list
}
```

#### Example: Get a specific item
```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemName": "Abyssal whip", "itemId": 4151 }
  ]
}
```

#### Example: Get multiple of a specific item
```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemName": "Dragon bones", "itemId": 536, "itemAmount": 100 }
  ]
}
```

#### Example: Get ANY 5 items from a list
```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemName": "Zenyte shard", "itemId": 19529 },
    { "itemName": "Ballista limbs", "itemId": 19592 },
    { "itemName": "Ballista spring", "itemId": 19601 },
    { "itemName": "Light frame", "itemId": 19586 },
    { "itemName": "Heavy frame", "itemId": 19589 }
  ],
  "totalAmount": 5
}
```

#### Example: Get ALL items from a list (one of each)
```json
{
  "type": "ITEM_DROP",
  "items": [
    { "itemName": "Dragon full helm", "itemId": 11335 },
    { "itemName": "Draconic visage", "itemId": 11286 },
    { "itemName": "Skeletal visage", "itemId": 22006 }
  ]
}
```

---

### 2. PET

For obtaining pets.

```typescript
interface PetRequirementDef {
  type: 'PET';
  petName: string;  // Name of the pet
  amount: number;   // Usually 1, but can be more for "get any X pets"
}
```

#### Example: Get a specific pet
```json
{
  "type": "PET",
  "petName": "Jad pet",
  "amount": 1
}
```

#### Example: Get any pet (use with multiple requirements + matchType: 'any')
```json
{
  "type": "PET",
  "petName": "Any",
  "amount": 1
}
```

---

### 3. VALUE_DROP

For accumulating total GP value from drops.

```typescript
interface ValueDropRequirementDef {
  type: 'VALUE_DROP';
  value: number;  // Total GP value needed
}
```

#### Example: Get 10M in drops
```json
{
  "type": "VALUE_DROP",
  "value": 10000000
}
```

#### Example: Get 100M in drops
```json
{
  "type": "VALUE_DROP",
  "value": 100000000
}
```

---

### 4. SPEEDRUN

For completing content within a time limit.

```typescript
interface SpeedrunRequirementDef {
  type: 'SPEEDRUN';
  location: string;    // The activity/boss name (must match Dink webhook source)
  goalSeconds: number; // Time limit in seconds
}
```

#### Example: Sub-30 minute Fight Caves
```json
{
  "type": "SPEEDRUN",
  "location": "Fight Caves",
  "goalSeconds": 1800
}
```

#### Example: Sub-20 minute Inferno
```json
{
  "type": "SPEEDRUN",
  "location": "Inferno",
  "goalSeconds": 1200
}
```

#### Example: Sub-15 minute CoX
```json
{
  "type": "SPEEDRUN",
  "location": "Chambers of Xeric",
  "goalSeconds": 900
}
```

---

### 5. EXPERIENCE

For gaining XP in a skill. Tracks XP gained during the event period.

```typescript
interface ExperienceRequirementDef {
  type: 'EXPERIENCE';
  skill: string;     // Skill name (e.g., "Slayer", "Woodcutting")
  experience: number; // Total XP to gain
}
```

#### Example: Gain 1M Slayer XP
```json
{
  "type": "EXPERIENCE",
  "skill": "Slayer",
  "experience": 1000000
}
```

#### Example: Gain 500K in any combat skill (use with matchType: 'any')
```json
{
  "type": "EXPERIENCE",
  "skill": "Attack",
  "experience": 500000
}
```

**Note:** For "gain XP in any skill", create multiple EXPERIENCE requirements with matchType: 'any'.

---

### 6. BA_GAMBLES

For Barbarian Assault high gambles.

```typescript
interface BaGamblesRequirementDef {
  type: 'BA_GAMBLES';
  amount: number;  // Number of high gambles
}
```

#### Example: Complete 10 high gambles
```json
{
  "type": "BA_GAMBLES",
  "amount": 10
}
```

---

## Match Types

The `matchType` field determines how multiple requirements are evaluated:

### `any` - Complete ANY ONE requirement
```json
{
  "matchType": "any",
  "requirements": [
    { "type": "ITEM_DROP", "items": [{ "itemName": "Twisted bow", "itemId": 20997 }] },
    { "type": "ITEM_DROP", "items": [{ "itemName": "Scythe of vitur", "itemId": 22325 }] },
    { "type": "ITEM_DROP", "items": [{ "itemName": "Tumeken's shadow", "itemId": 27275 }] }
  ]
}
```
*Tile completes when player gets any ONE of these items.*

### `all` - Complete ALL requirements
```json
{
  "matchType": "all",
  "requirements": [
    { "type": "ITEM_DROP", "items": [{ "itemName": "Dragon pickaxe", "itemId": 11920 }] },
    { "type": "ITEM_DROP", "items": [{ "itemName": "Dragon axe", "itemId": 6739 }] },
    { "type": "ITEM_DROP", "items": [{ "itemName": "Dragon harpoon", "itemId": 21028 }] }
  ]
}
```
*Tile completes when player gets ALL three items.*

---

## Tiered Requirements

Tiered tiles allow progressive completion with increasing rewards. Each tier has its own requirement and point value.

```typescript
interface TieredRequirementDef {
  tier: number;                    // Tier number (1, 2, 3, etc.)
  requirement: RequirementDef;     // The requirement for this tier
  points: number;                  // Points awarded for completing this tier
}
```

### Example: Tiered XP Tile
```json
{
  "matchType": "all",
  "requirements": [],
  "tiers": [
    {
      "tier": 1,
      "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 100000 },
      "points": 5
    },
    {
      "tier": 2,
      "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 500000 },
      "points": 10
    },
    {
      "tier": 3,
      "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 1000000 },
      "points": 20
    }
  ]
}
```
*Players earn 5 points at 100K XP, additional 10 points at 500K XP, additional 20 points at 1M XP.*

### Example: Tiered Value Drop
```json
{
  "matchType": "all",
  "requirements": [],
  "tiers": [
    {
      "tier": 1,
      "requirement": { "type": "VALUE_DROP", "value": 1000000 },
      "points": 3
    },
    {
      "tier": 2,
      "requirement": { "type": "VALUE_DROP", "value": 5000000 },
      "points": 7
    },
    {
      "tier": 3,
      "requirement": { "type": "VALUE_DROP", "value": 10000000 },
      "points": 15
    }
  ]
}
```

### Example: Tiered Item Collection
```json
{
  "matchType": "all",
  "requirements": [],
  "tiers": [
    {
      "tier": 1,
      "requirement": {
        "type": "ITEM_DROP",
        "items": [
          { "itemName": "Abyssal whip", "itemId": 4151 },
          { "itemName": "Dark bow", "itemId": 11235 },
          { "itemName": "Kraken tentacle", "itemId": 12004 }
        ],
        "totalAmount": 1
      },
      "points": 5
    },
    {
      "tier": 2,
      "requirement": {
        "type": "ITEM_DROP",
        "items": [
          { "itemName": "Abyssal whip", "itemId": 4151 },
          { "itemName": "Dark bow", "itemId": 11235 },
          { "itemName": "Kraken tentacle", "itemId": 12004 }
        ],
        "totalAmount": 3
      },
      "points": 10
    }
  ]
}
```

---

## Complete Examples

### Simple Item Drop Tile
```json
{
  "task": "Get an Abyssal Whip",
  "description": "Obtain an Abyssal whip from Abyssal demons",
  "category": "slayer",
  "difficulty": "medium",
  "icon": "abyssal_whip",
  "points": 10,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "ITEM_DROP",
        "items": [
          { "itemName": "Abyssal whip", "itemId": 4151 }
        ]
      }
    ]
  }
}
```

### Any Raid Drop Tile
```json
{
  "task": "Get a Raid Purple",
  "description": "Obtain any unique drop from CoX or ToB",
  "category": "raids",
  "difficulty": "hard",
  "points": 25,
  "requirements": {
    "matchType": "any",
    "requirements": [
      { "type": "ITEM_DROP", "items": [{ "itemName": "Twisted bow", "itemId": 20997 }] },
      { "type": "ITEM_DROP", "items": [{ "itemName": "Kodai insignia", "itemId": 21043 }] },
      { "type": "ITEM_DROP", "items": [{ "itemName": "Elder maul", "itemId": 21003 }] },
      { "type": "ITEM_DROP", "items": [{ "itemName": "Scythe of vitur", "itemId": 22325 }] },
      { "type": "ITEM_DROP", "items": [{ "itemName": "Ghrazi rapier", "itemId": 22324 }] },
      { "type": "ITEM_DROP", "items": [{ "itemName": "Justiciar faceguard", "itemId": 22326 }] }
    ]
  }
}
```

### Tiered Slayer XP Tile
```json
{
  "task": "Slayer Grind",
  "description": "Gain Slayer XP during the event",
  "category": "slayer",
  "difficulty": "medium",
  "icon": "slayer_icon",
  "points": 0,
  "requirements": {
    "matchType": "all",
    "requirements": [],
    "tiers": [
      {
        "tier": 1,
        "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 250000 },
        "points": 5
      },
      {
        "tier": 2,
        "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 500000 },
        "points": 10
      },
      {
        "tier": 3,
        "requirement": { "type": "EXPERIENCE", "skill": "Slayer", "experience": 1000000 },
        "points": 20
      }
    ]
  }
}
```

### Speedrun Tile
```json
{
  "task": "Speed Runner",
  "description": "Complete Fight Caves in under 30 minutes",
  "category": "pvm",
  "difficulty": "hard",
  "points": 15,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "SPEEDRUN",
        "location": "Fight Caves",
        "goalSeconds": 1800
      }
    ]
  }
}
```

### Combined Requirements Tile
```json
{
  "task": "Demonic Gorilla Master",
  "description": "Get all Zenyte jewelry components",
  "category": "pvm",
  "difficulty": "extreme",
  "points": 50,
  "requirements": {
    "matchType": "all",
    "requirements": [
      {
        "type": "ITEM_DROP",
        "items": [{ "itemName": "Zenyte shard", "itemId": 19529, "itemAmount": 4 }]
      },
      {
        "type": "ITEM_DROP",
        "items": [
          { "itemName": "Ballista limbs", "itemId": 19592 },
          { "itemName": "Ballista spring", "itemId": 19601 },
          { "itemName": "Light frame", "itemId": 19586 },
          { "itemName": "Heavy frame", "itemId": 19589 }
        ]
      }
    ]
  }
}
```

---

## Frontend Form Design Tips

### 1. Tile Creator Form Structure

```
┌─────────────────────────────────────────────────────────┐
│ BASIC INFO                                              │
├─────────────────────────────────────────────────────────┤
│ Task Name:        [________________________]            │
│ Description:      [________________________]            │
│ Category:         [Dropdown: slayer, pvm, raids...]    │
│ Difficulty:       [Dropdown: easy, medium, hard...]    │
│ Icon:             [________________________] (optional) │
│ Base Points:      [___] (0 for tiered tiles)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ REQUIREMENTS                                            │
├─────────────────────────────────────────────────────────┤
│ ○ Simple Requirements    ○ Tiered Requirements          │
│                                                         │
│ Match Type: [Dropdown: any, all]                        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Requirement 1                              [Remove] │ │
│ │ Type: [Dropdown: ITEM_DROP, PET, VALUE_DROP...]    │ │
│ │ [Dynamic fields based on type]                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Requirement]                                     │
└─────────────────────────────────────────────────────────┘
```

### 2. Dynamic Requirement Fields by Type

#### ITEM_DROP Fields:
- Items list (repeatable):
  - Item Name (text)
  - Item ID (number)
  - Item Amount (number, optional)
- Total Amount (number, optional) - "Get any X from the list"

#### PET Fields:
- Pet Name (text or dropdown of known pets)
- Amount (number, default 1)

#### VALUE_DROP Fields:
- Value (number with GP formatting helper)

#### SPEEDRUN Fields:
- Location (text or dropdown of known locations)
- Goal Time (time input, converted to seconds)

#### EXPERIENCE Fields:
- Skill (dropdown of all 23 skills)
- XP Amount (number)

#### BA_GAMBLES Fields:
- Amount (number)

### 3. Tiered Requirements UI

When "Tiered Requirements" is selected:

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1                                         [Remove] │
├─────────────────────────────────────────────────────────┤
│ Points for this tier: [___]                             │
│ Requirement Type: [Dropdown]                            │
│ [Dynamic fields based on type]                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TIER 2                                         [Remove] │
├─────────────────────────────────────────────────────────┤
│ Points for this tier: [___]                             │
│ Requirement Type: [Dropdown]                            │
│ [Dynamic fields based on type]                          │
└─────────────────────────────────────────────────────────┘

[+ Add Tier]
```

### 4. Validation Rules

- `task` is required
- `category` must be a valid enum value
- `difficulty` must be a valid enum value
- `points` >= 0
- For simple tiles: at least one requirement OR tiers
- For tiered tiles: `points` should be 0 (points come from tiers)
- For ITEM_DROP: at least one item required
- For items: `itemId` is required, `itemName` is required
- For SPEEDRUN: `goalSeconds` must be > 0
- For EXPERIENCE: `experience` must be > 0
- For VALUE_DROP: `value` must be > 0

### 5. Helper Utilities

Consider adding:
- **Item ID Lookup**: Search OSRS Wiki API for item IDs
- **GP Formatter**: Convert "10m" → 10000000
- **Time Formatter**: Convert "30:00" → 1800 seconds
- **Skill Dropdown**: All 23 OSRS skills
- **Template Tiles**: Pre-built common tiles to clone

---

## API Endpoints

### Create Tile
```
POST /api/admin/clan-events/bingo/tiles
Content-Type: application/json

{
  "task": "Get an Abyssal Whip",
  "category": "slayer",
  "difficulty": "medium",
  "points": 10,
  "requirements": { ... }
}
```

### Bulk Create Tiles
```
POST /api/admin/clan-events/bingo/tiles/bulk
Content-Type: application/json

{
  "tiles": [
    { "task": "...", ... },
    { "task": "...", ... }
  ]
}
```

### Update Tile
```
PATCH /api/admin/clan-events/bingo/tiles/:id
Content-Type: application/json

{
  "task": "Updated task name",
  "points": 15
}
```

### Get All Tiles
```
GET /api/admin/clan-events/bingo/tiles?category=slayer&difficulty=medium&limit=50
```

---

## Migration Notes

### Legacy Format Issues

If migrating from an older system, tiles may have these issues:

#### 1. Snake Case Keys
Old format used `snake_case`, new format uses `camelCase`:
```json
// OLD (invalid)
{ "match_type": "all", "item_id": 123, "item_name": "Item", "pet_name": "Pet" }

// NEW (valid)
{ "matchType": "all", "itemId": 123, "itemName": "Item", "petName": "Pet" }
```

#### 2. Flat ITEM_DROP Format
Old format used flat fields, new format uses `items` array:
```json
// OLD flat format (invalid)
{
  "type": "ITEM_DROP",
  "item_id": 626,
  "item_name": "Pink boots",
  "item_amount": 1
}

// NEW items array format (valid)
{
  "type": "ITEM_DROP",
  "items": [
    { "itemId": 626, "itemName": "Pink boots", "itemAmount": 1 }
  ]
}
```

#### 3. Invalid Requirement Types
The `UNIQUE_COLLECTION` type does not exist in the current schema. These tiles need manual conversion to use standard `ITEM_DROP` requirements with `matchType: "all"`.

### Running the Migration
```bash
npm run migrate
```

The migration `060_fix_bingo_tile_requirements_schema.js` will:
1. Convert all snake_case keys to camelCase
2. Normalize flat ITEM_DROP to items array format
3. Flag invalid types for manual review

