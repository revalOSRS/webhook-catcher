# RuneLite Plugin Event Handling Implementation

## Overview
Created a comprehensive event handling system for RuneLite plugin webhooks, similar to the existing Dink webhook system but separate and purpose-built for RuneLite's data structure.

## Files Created

### 1. Type Definitions

#### `src/runelite/types/sync.types.ts`
Comprehensive TypeScript types for the SYNC event payload, including:
- **RuneLiteBaseEvent**: Base structure for all RuneLite events
- **PlayerInfo**: Player account information
- **QuestsData**: Quest completion tracking with quest points
- **AchievementDiariesData**: Achievement diary progress (Easy/Medium/Hard/Elite)
- **CombatAchievementsData**: Combat achievement tracking across all tiers
- **CollectionLogData**: Collection log items and completion tracking
- **SyncEventPayload**: Complete SYNC event structure
- **SyncSummary**: Processed summary response

#### `src/runelite/types/index.ts`
Central export file for all RuneLite event types with extensibility for future event types.

### 2. Event Handlers

#### `src/runelite/events/sync.ts`
Processes SYNC events from RuneLite plugin:
- Logs comprehensive player statistics
- Extracts and displays progress across all achievement categories
- Returns structured summary
- Includes TODO comments for database integration

#### `src/runelite/handler.ts`
Main event router for RuneLite webhooks:
- **handleRuneLiteEvent**: Routes events to appropriate handlers based on eventType
- **validateRuneLiteEvent**: Validates event structure and required fields
- **validateSyncEvent**: SYNC-specific validation
- Extensible switch statement for adding new event types

### 3. Updated Main Application

#### `src/index.ts`
Updated the `/reval-webhook` endpoint to:
1. Still log the entire raw request body (as requested)
2. Validate the event structure
3. Route to appropriate event handler based on eventType
4. Return structured response with event processing result
5. Handle errors gracefully with proper error messages

## Event Flow

1. **Request received** → `/reval-webhook` endpoint
2. **Log raw data** → Complete JSON body logged to console
3. **Validate** → Check for required fields (eventType, eventTimestamp, etc.)
4. **Route** → Send to appropriate handler based on eventType
5. **Process** → Handler extracts and processes data
6. **Respond** → Return success/error with processing details

## SYNC Event Structure

```typescript
{
  eventType: 'SYNC',
  eventTimestamp: number,
  player: {
    username: string,
    accountType: 'NORMAL' | 'IRONMAN' | ...,
    world?: number,
    combatLevel?: number,
    totalLevel?: number,
    totalXp?: number
  },
  quests: {
    quests: [...],
    questPoints: number,
    totalQuests: number,
    completedQuests: number
  },
  achievementDiaries: {
    diaries: [...],
    summary: { easy, medium, hard, elite, totals }
  },
  combatAchievements: {
    tasks: [...],
    byTier: [...],
    summary: { easy, medium, hard, elite, master, grandmaster },
    points: number
  },
  collectionLog: {
    tabs: [...],
    summary: { uniqueObtained, uniqueTotal, completionPercentage }
  }
}
```

## Extensibility

The system is designed to easily add new event types:

1. Create new type file in `src/runelite/types/`
2. Export from `src/runelite/types/index.ts`
3. Create handler in `src/runelite/events/`
4. Add case to switch statement in `src/runelite/handler.ts`

## Next Steps

- Implement database storage for SYNC events
- Create additional event handlers (ACHIEVEMENT, LOOT, DEATH, LEVELUP)
- Add event filtering and rate limiting
- Implement event deduplication
- Create leaderboards and statistics endpoints

