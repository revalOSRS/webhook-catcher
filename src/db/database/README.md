# Database Connection

Neon Postgres serverless database connection for the webhook-catcher service.

## Setup

### 1. Install Dependencies

```bash
npm install @neondatabase/serverless
```

### 2. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string

### 3. Configure Environment Variables

Add your Neon database URL to `.env` file in the project root:

```env
# Neon Postgres Database
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### 4. Initialize Database

Run the setup script to create tables and run migrations:

```bash
node src/db/database/setup.js
```

Or run migrations directly:

```bash
node src/db/database/migrate.js up
```

## Architecture

Database operations are organized into TypeScript entity and service files within the `src/modules/` directory.

### Module Structure

```
src/modules/
├── members/
│   ├── members.entity.ts         # Member CRUD operations
│   ├── member-movements.entity.ts # Join/leave tracking
│   └── members.service.ts        # Business logic
├── osrs-accounts/
│   ├── osrs-accounts.entity.ts   # OSRS account CRUD
│   ├── osrs-accounts.service.ts  # Account lookup & management
│   └── entities/
│       ├── collection-log.entity.ts
│       ├── killcounts.entity.ts
│       └── ...
├── achievements/
│   ├── achievements.service.ts
│   └── entities/
│       ├── achievement-diary-tiers.entity.ts
│       ├── combat-achievements.entity.ts
│       └── collection-log-items.entity.ts
├── coffer/
│   ├── coffer-balance.entity.ts
│   ├── coffer-movements.entity.ts
│   └── coffer.service.ts
├── donations/
│   ├── donations.entity.ts
│   └── donations.service.ts
├── points/
│   ├── points.entity.ts
│   └── points.service.ts
└── events/
    ├── events.service.ts
    ├── entities/
    │   ├── events.entity.ts
    │   ├── event-teams.entity.ts
    │   ├── event-team-members.entity.ts
    │   └── event-registrations.entity.ts
    └── bingo/
        ├── bingo.service.ts
        └── entities/
            ├── bingo-tiles.entity.ts
            ├── bingo-boards.entity.ts
            └── ...
```

### Entity Pattern

Each entity extends `BaseEntity` and provides:
- Type-safe CRUD operations
- Automatic camelCase ↔ snake_case conversion
- Static `createTable()` method for migrations

Example:

```typescript
import { MembersEntity } from './modules/members/members.entity.js';

const membersEntity = new MembersEntity();

// Create
const member = await membersEntity.create({
  discordId: '123456789012345678',
  discordTag: 'username'
});

// Find
const found = await membersEntity.findByDiscordId('123456789012345678');

// Update
await membersEntity.update(found.id, { discordTag: 'newname' });

// Delete
await membersEntity.delete(found.id);
```

### Service Pattern

Services provide business logic and complex operations:

```typescript
import { MembersService } from './modules/members/members.service.js';

// Get member profile with related data
const profile = await MembersService.getMemberProfile('123456789012345678');

// Add tokens with movement tracking
await MembersService.addTokens('123456789012345678', 100, {
  type: 'earned',
  description: 'Event reward',
  createdBy: 'admin'
});
```

## Direct Query Access

For custom queries, use the connection module:

```typescript
import { query, queryOne } from './db/connection.js';

// Multiple rows
const results = await query('SELECT * FROM members WHERE is_active = $1', [true]);

// Single row
const member = await queryOne('SELECT * FROM members WHERE discord_id = $1', [discordId]);
```

## Migrations

Migrations are stored in `src/db/database/migrations/` and run in order:

```bash
# Run pending migrations
node src/db/database/migrate.js up

# Rollback last migration
node src/db/database/migrate.js down
```

See `MIGRATIONS.md` for migration conventions and guidelines.

## Database Tables

### Core Tables
- `members` - Discord member data
- `member_movements` - Join/leave tracking
- `osrs_accounts` - OSRS account linking
- `token_movements` - Token balance changes

### Achievement Tables
- `achievement_diary_tiers` - Diary tier definitions
- `combat_achievements` - CA definitions
- `collection_log_items` - Collection log item definitions
- `osrs_account_diary_completions` - Player diary completions
- `osrs_account_combat_achievements` - Player CA completions
- `osrs_account_collection_log` - Player collection log entries
- `osrs_account_killcounts` - Player killcounts

### Coffer Tables
- `coffer_balance` - Current treasury balance
- `coffer_movements` - Treasury transaction log

### Points Tables
- `point_rules` - Point value definitions
- `osrs_account_points_breakdown` - Player points by category

### Event Tables
- `events` - Clan events
- `event_teams` - Teams within events
- `event_team_members` - Team membership
- `event_registrations` - Event registration

### Bingo Tables
- `bingo_tiles` - Tile library
- `bingo_boards` - Team boards
- `bingo_board_tiles` - Tiles placed on boards
- `bingo_tile_progress` - Tile completion tracking

## Best Practices

1. **Use entities for CRUD** - Entity classes handle type safety and field mapping
2. **Use services for business logic** - Services combine multiple entities and add validation
3. **Use migrations for schema changes** - Never modify tables directly in production
4. **Handle errors** - Wrap database calls in try-catch blocks
5. **Connection pooling** - Neon automatically handles connection pooling
6. **Serverless-friendly** - Connections scale to zero when idle

## Shutdown

Gracefully close database connections:

```typescript
import { closeDatabase } from './db/connection.js';

process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});
```
