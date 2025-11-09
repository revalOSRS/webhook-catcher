# Member Movement Tracking

Automatic tracking of Discord server join and leave events for all members.

## Overview

The `MemberMovement` model tracks when members join or leave the Discord server. This is automatically handled by the daily sync task (`syncDiscordMembers`), which runs at midnight Estonian time.

## Features

- ✅ **Automatic Tracking**: Runs daily without manual intervention
- ✅ **Join Events**: Records when members first join or rejoin after leaving
- ✅ **Leave Events**: Records when members leave the server
- ✅ **Historical Data**: Maintains complete history of all movements
- ✅ **Member Context**: Links to member records and stores previous ranks

## Database Schema

### Table: `member_movements`

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Auto-generated primary key |
| `member_id` | INTEGER | Reference to member ID (nullable) |
| `discord_id` | VARCHAR(20) | Discord user ID |
| `event_type` | VARCHAR(20) | Event type: 'joined' or 'left' |
| `previous_rank` | VARCHAR(50) | Previous Discord rank (for leave events) |
| `notes` | TEXT | Additional notes about the event |
| `timestamp` | TIMESTAMP | When the event occurred |

### Indexes

- `idx_movements_member_id` - Fast lookups by member ID
- `idx_movements_discord_id` - Fast lookups by Discord ID
- `idx_movements_timestamp` - Time-based queries
- `idx_movements_event_type` - Filter by event type

## How It Works

### Daily Sync Process

Every day at midnight (Estonian time), the `syncDiscordMembers` task:

1. **Fetches all Discord server members**
2. **For each Discord member**:
   - If **new**: Creates member record + records "joined" event
   - If **existing**: Updates Discord info (tag, rank)
   - If **rejoining**: Records "joined" event (after previous "left")
3. **For database members not in Discord**:
   - Marks `in_discord = false`
   - Records "left" event with their previous rank

### Member Fields Updated

During sync, these fields are automatically updated:
- `discord_tag` - Current username
- `discord_rank` - Highest role
- `in_discord` - Boolean flag
- `last_seen` - Current timestamp

## API Usage

### Record a Movement

```javascript
const MemberMovement = require('./models/MemberMovement');

// Record a join event
await MemberMovement.record({
    memberId: 123,
    discordId: '123456789012345678',
    eventType: 'joined',
    notes: 'New member from recruitment'
});

// Record a leave event
await MemberMovement.record({
    memberId: 123,
    discordId: '123456789012345678',
    eventType: 'left',
    previousRank: 'Officer',
    notes: 'Left voluntarily'
});
```

### Get Movement History

```javascript
// Get all movements for a specific member
const movements = await MemberMovement.getByDiscordId('123456789012345678');

// Get movements by member ID
const movements = await MemberMovement.getByMemberId(123);

// Get recent movements (last 7 days)
const recent = await MemberMovement.getRecent(7, 100);

// Get only joins in last 30 days
const joins = await MemberMovement.getByEventType('joined', 30);

// Get only leaves in last 30 days
const leaves = await MemberMovement.getByEventType('left', 30);

// Get the last movement for a member
const lastMovement = await MemberMovement.getLastMovement('123456789012345678');
```

### Count Movements

```javascript
// Count joins in last 30 days
const joinCount = await MemberMovement.count('joined', 30);

// Count leaves in last 30 days
const leaveCount = await MemberMovement.count('left', 30);
```

### Cleanup Old Records

```javascript
// Delete movements older than 1 year (365 days)
const deleted = await MemberMovement.cleanup(365);
console.log(`Deleted ${deleted} old movement records`);
```

## Integration Examples

### Display Movement History in Command

```javascript
const Member = require('./connections/database/models/Member');
const MemberMovement = require('./connections/database/models/MemberMovement');

// In your lookup command
const member = await Member.findByDiscordId(discordId);
const movements = await MemberMovement.getByDiscordId(discordId, 10);

let historyText = '';
for (const movement of movements) {
    const icon = movement.eventType === 'joined' ? '🎉' : '➖';
    const time = `<t:${Math.floor(new Date(movement.timestamp).getTime() / 1000)}:R>`;
    historyText += `${icon} ${movement.eventType} ${time}\n`;
}

embed.addFields({
    name: 'Movement History',
    value: historyText || 'No history recorded',
    inline: false
});
```

### Weekly Join/Leave Report

```javascript
const joins = await MemberMovement.getByEventType('joined', 7);
const leaves = await MemberMovement.getByEventType('left', 7);

const embed = new EmbedBuilder()
    .setTitle('Weekly Member Movement')
    .addFields(
        { name: '🎉 Joined', value: joins.length.toString(), inline: true },
        { name: '➖ Left', value: leaves.length.toString(), inline: true },
        { name: '📊 Net Change', value: (joins.length - leaves.length).toString(), inline: true }
    );
```

### Find Frequent Leavers

```javascript
// Get all movements
const allMovements = await MemberMovement.getRecent(90);

// Count leaves per member
const leaveCounts = {};
allMovements
    .filter(m => m.eventType === 'left')
    .forEach(m => {
        leaveCounts[m.discordId] = (leaveCounts[m.discordId] || 0) + 1;
    });

// Find members who left multiple times
const frequentLeavers = Object.entries(leaveCounts)
    .filter(([_, count]) => count > 2)
    .sort((a, b) => b[1] - a[1]);
```

## Console Output Examples

### First-Time Join
```
🔄 Syncing Discord members with database...
   ➕ newplayer added to database
   ✅ Sync complete: 1 created, 45 updated, 1 joined, 0 left
```

### Member Rejoins
```
🔄 Syncing Discord members with database...
   🎉 returningplayer rejoined the server
   ✅ Sync complete: 0 created, 46 updated, 1 joined, 0 left
```

### Member Leaves
```
🔄 Syncing Discord members with database...
   ➖ leavingplayer left the server
   ✅ Sync complete: 0 created, 45 updated, 0 joined, 1 left
```

## Manual Triggers

For testing or immediate sync (not waiting for daily cron):

```javascript
const { syncDiscordMembers } = require('./src/cron/daily');

// In a command or event handler
await syncDiscordMembers(client);
```

## Best Practices

1. **Don't delete movements**: Keep historical data for analytics
2. **Use cleanup sparingly**: Only delete very old records (1+ year)
3. **Check `in_discord` flag**: Use this to filter currently active members
4. **Combine with other data**: Cross-reference with WOM stats, activity, etc.
5. **Respect privacy**: Don't publicly display sensitive movement patterns

## Database Queries

### Most Active Periods
```sql
SELECT 
    DATE_TRUNC('day', timestamp) as day,
    event_type,
    COUNT(*) as count
FROM member_movements
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY day, event_type
ORDER BY day DESC;
```

### Retention Rate
```sql
-- Members who joined and are still here
SELECT 
    COUNT(DISTINCT m.discord_id) as still_here
FROM member_movements m
JOIN members mem ON m.discord_id = mem.discord_id
WHERE m.event_type = 'joined'
AND m.timestamp > NOW() - INTERVAL '30 days'
AND mem.in_discord = true;
```

### Average Stay Duration
```sql
SELECT 
    AVG(leave_time - join_time) as avg_duration
FROM (
    SELECT 
        discord_id,
        MIN(CASE WHEN event_type = 'joined' THEN timestamp END) as join_time,
        MAX(CASE WHEN event_type = 'left' THEN timestamp END) as leave_time
    FROM member_movements
    GROUP BY discord_id
    HAVING MAX(CASE WHEN event_type = 'left' THEN timestamp END) IS NOT NULL
) durations;
```

## See Also

- [Member Model Documentation](../README.md)
- [Daily Cron Tasks](../../cron/README.md)
- [Database Setup](../setup.js)

