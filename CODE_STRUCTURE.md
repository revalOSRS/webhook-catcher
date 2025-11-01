# Code Structure Documentation

## Overview

The webhook-catcher backend has been refactored into a clean, modular structure with organized routes, services, and middleware. This document explains the new architecture.

---

## Directory Structure

```
src/
├── index.ts                      # Main Express app (minimal, mounts routes)
├── middleware/                   # Express middleware
│   └── auth.ts                   # Authentication middleware (requireAdmin, requireMemberCode)
├── routes/                       # API route handlers
│   ├── auth.routes.ts            # /api/auth/* (Discord OAuth, login)
│   ├── members.routes.ts         # /api/member/*, /api/player/*, /api/admin/members/*
│   ├── wom.routes.ts             # /api/wom/* (WiseOldMan integration)
│   └── battleship/               # Battleship Bingo routes
│       ├── index.ts              # Aggregates all battleship routes
│       ├── events.routes.ts      # Event CRUD
│       ├── teams.routes.ts       # Team management
│       ├── tiles.routes.ts       # Tile claiming/completion/progress
│       ├── ships.routes.ts       # Ship placement
│       └── bombing.routes.ts     # Bomb attacks
├── services/                     # External service integrations
│   ├── wiseoldman.ts             # WiseOldMan API client
│   └── discord.ts                # Discord API client (avatar fetching)
├── db/                           # Database layer
│   ├── connection.ts             # PostgreSQL connection & query utilities
│   ├── types.ts                  # Database entity types (Member, Donation, etc.)
│   ├── types/
│   │   └── battleship.types.ts   # Battleship Bingo entity types
│   └── services/
│       ├── member.ts             # Member-related database operations
│       └── battleship.service.ts # Battleship Bingo database operations
└── dink/                         # Dink webhook handling
    ├── handler.ts                # Main webhook handler
    ├── util.ts                   # Utility functions
    └── events/                   # Event processors
        ├── event.ts
        ├── generic.ts
        ├── death.ts
        ├── loot.ts
        ├── collect-log.ts
        └── grand-exchange.ts
```

---

## Key Principles

### 1. **Separation of Concerns**
- **Routes:** Handle HTTP requests/responses, validate input, call services
- **Services:** Business logic, external API calls
- **Database Services:** Data access layer, SQL queries
- **Middleware:** Cross-cutting concerns (auth, logging)

### 2. **Modularity**
- Each feature group has its own route file
- Related routes are grouped in subdirectories (e.g., `battleship/`)
- Easy to find and modify specific functionality

### 3. **Type Safety**
- TypeScript interfaces for all database entities
- Proper typing throughout the codebase
- No `any` types except where necessary (JSONB fields)

### 4. **Consistent API Patterns**
- All responses follow: `{ status: 'success'|'error', data?: any, message?: string }`
- Error handling in every route
- Consistent HTTP status codes

---

## Main Application (`src/index.ts`)

The main file is now minimal and focused:

```typescript
import express from 'express'
import cors from 'cors'

// Import route modules
import authRoutes from './routes/auth.routes.js'
import membersRoutes from './routes/members.routes.js'
import womRoutes from './routes/wom.routes.js'
import battleshipRoutes from './routes/battleship/index.js'

const app = express()

// CORS configuration
app.use(cors({ ... }))
app.use(express.json())

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api/member', membersRoutes)
app.use('/api/player', membersRoutes)
app.use('/api/admin/members', membersRoutes)
app.use('/api/wom', womRoutes)
app.use('/api/battleship', battleshipRoutes)

export default app
```

**Benefits:**
- Easy to see all API route groups at a glance
- Adding new route groups is simple
- Configuration is centralized

---

## Middleware (`src/middleware/auth.ts`)

Reusable authentication middleware:

```typescript
// Admin authentication
export function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Unauthorized' 
    })
  }
  
  next()
}

// Member code authentication
export function requireMemberCode(req, res, next) {
  // Similar logic
}
```

**Usage in routes:**
```typescript
import { requireAdmin } from '../middleware/auth.js'

router.post('/admin-only', requireAdmin, async (req, res) => {
  // This only runs if admin key is valid
})
```

---

## Route Organization

### Auth Routes (`/api/auth/*`)
- `POST /discord` - Discord OAuth authentication
- `POST /login` - Member code login

### Member Routes (`/api/member/*`, `/api/player/*`)
- `GET /member/:id` - Get member profile by ID
- `GET /player/:discordId` - Get player profile by Discord ID
- `GET /admin/members/all` - Admin: Get all members

### WiseOldMan Routes (`/api/wom/*`)
- `GET /player/:username` - Get WOM player data
- `POST /player/:username/update` - Trigger hiscores update
- `GET /player/:username/gains` - Get player gains
- `GET /player/:username/achievements` - Get achievements
- `GET /player/:username/records` - Get records
- `GET /player/:username/snapshots` - Get snapshots
- `GET /player/:username/groups` - Get groups
- `GET /player/:username/comprehensive` - Get all WOM data

### Battleship Routes (`/api/battleship/*`)

**Events:**
- `POST /events` - Create event
- `GET /events` - Get all events
- `GET /events/:eventId` - Get event by ID
- `PATCH /events/:eventId/status` - Update status
- `GET /events/:eventId/logs` - Get event logs

**Teams:**
- `POST /teams` - Create team
- `GET /teams/event/:eventId` - Get event teams
- `GET /teams/:teamId` - Get team details
- `POST /teams/:teamId/members` - Add team member
- `GET /teams/:teamId/members` - Get team members
- `GET /teams/event/:eventId/leaderboard` - Team leaderboard
- `GET /teams/event/:eventId/players/leaderboard` - Player leaderboard

**Tiles:**
- `POST /tiles/initialize` - Initialize board
- `GET /tiles/event/:eventId` - Get all tiles
- `GET /tiles/event/:eventId/coordinate/:coord` - Get tile
- `POST /tiles/:tileId/claim` - Claim tile
- `POST /tiles/:tileId/progress` - Update progress
- `POST /tiles/:tileId/complete` - Complete tile
- `GET /tiles/:tileId/progress` - Get progress

**Ships:**
- `POST /ships` - Place ship
- `GET /ships/team/:teamId` - Get team ships

**Bombing:**
- `POST /bombing` - Execute bomb
- `GET /bombing/event/:eventId` - Get bomb history
- `GET /bombing/team/:teamId` - Get team bomb history

---

## Database Services

### Connection Layer (`src/db/connection.ts`)

Provides two main functions:

```typescript
// Execute query, return all rows
export async function query<T>(queryText: string, params: any[]): Promise<T[]>

// Execute query, return first row (or null)
export async function queryOne<T>(queryText: string, params: any[]): Promise<T | null>
```

**Always use parameterized queries:**
```typescript
// ✅ Good
const member = await queryOne<Member>(
  'SELECT * FROM members WHERE discord_id = $1',
  [discordId]
)

// ❌ Bad (SQL injection risk)
const member = await queryOne<Member>(
  `SELECT * FROM members WHERE discord_id = '${discordId}'`
)
```

### Member Service (`src/db/services/member.ts`)

Functions for member-related operations:
- `getMemberById()`
- `getMemberByDiscordId()`
- `getMemberProfile()`
- `loginWithCode()`
- `upsertMember()`
- `getOsrsAccountsByDiscordId()`
- `getDonationStats()`
- `getRecentDonations()`
- `getTokenMovements()`

### Battleship Service (`src/db/services/battleship.service.ts`)

Comprehensive functions for Battleship Bingo:
- Event management (create, get, update)
- Team management (create, get members, update score)
- Tile operations (initialize, claim, complete, progress)
- Ship operations (place, check, damage)
- Bombing operations (execute, log)
- Leaderboards and stats

---

## External Services

### WiseOldMan Service (`src/services/wiseoldman.ts`)

Client for WiseOldMan API:
```typescript
export async function searchPlayer(username: string)
export async function updatePlayer(username: string)
export async function getPlayerGains(username: string, period: string)
export async function getPlayerAchievements(username: string, limit: number)
// ... more functions
```

### Discord Service (`src/services/discord.ts`)

On-demand Discord data fetching:
```typescript
export async function getDiscordAvatar(discordId: string): Promise<string | null>
export function getDefaultDiscordAvatar(discordId: string): string
```

---

## Adding New Features

### Adding a New Route Group

1. **Create route file:**
```typescript
// src/routes/myfeature.routes.ts
import { Router } from 'express'
const router = Router()

router.get('/', async (req, res) => {
  // Handle request
})

export default router
```

2. **Mount in main app:**
```typescript
// src/index.ts
import myFeatureRoutes from './routes/myfeature.routes.js'
app.use('/api/myfeature', myFeatureRoutes)
```

### Adding a New Database Service

1. **Define types:**
```typescript
// src/db/types/myfeature.types.ts
export interface MyEntity {
  id: string
  name: string
  created_at: Date
}
```

2. **Create service:**
```typescript
// src/db/services/myfeature.service.ts
import { query, queryOne } from '../connection.js'
import type { MyEntity } from '../types/myfeature.types.js'

export async function getMyEntity(id: string): Promise<MyEntity | null> {
  return queryOne<MyEntity>('SELECT * FROM my_entities WHERE id = $1', [id])
}
```

3. **Use in routes:**
```typescript
import * as myFeatureService from '../db/services/myfeature.service.js'

router.get('/:id', async (req, res) => {
  const entity = await myFeatureService.getMyEntity(req.params.id)
  res.json({ status: 'success', data: entity })
})
```

### Adding Middleware

1. **Create middleware:**
```typescript
// src/middleware/rateLimit.ts
export function rateLimit(req, res, next) {
  // Rate limiting logic
  next()
}
```

2. **Apply globally:**
```typescript
// src/index.ts
app.use(rateLimit)
```

3. **Apply to specific routes:**
```typescript
// src/routes/myroute.ts
import { rateLimit } from '../middleware/rateLimit.js'
router.post('/expensive', rateLimit, async (req, res) => { ... })
```

---

## Best Practices

### 1. **Error Handling**
Always wrap route handlers in try-catch:
```typescript
router.get('/:id', async (req, res) => {
  try {
    // Logic here
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process request' 
    })
  }
})
```

### 2. **Input Validation**
Validate all inputs:
```typescript
if (!req.params.id || isNaN(parseInt(req.params.id))) {
  return res.status(400).json({ 
    status: 'error', 
    message: 'Valid ID is required' 
  })
}
```

### 3. **Consistent Responses**
```typescript
// Success
res.json({ 
  status: 'success', 
  data: result,
  message: 'Operation successful' // optional
})

// Error
res.status(400).json({ 
  status: 'error', 
  message: 'Human-readable error message' 
})
```

### 4. **Use TypeScript**
- Define interfaces for all data structures
- Use generic types for database queries
- Avoid `any` when possible

### 5. **Log Important Actions**
```typescript
await battleshipService.logEventAction({
  event_id,
  action_type: 'tile_completed',
  actor_discord_id: discordId,
  team_id,
  details: { ... }
})
```

---

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Use Postman/Thunder Client to test endpoints
3. Check responses and database state

### Automated Testing (Future)
```typescript
// tests/routes/auth.test.ts
import request from 'supertest'
import app from '../src/index'

describe('Auth Routes', () => {
  it('should login with valid code', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ code: '12345' })
    
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
  })
})
```

---

## Deployment

The refactored code maintains the same deployment process:

1. **Vercel (recommended):**
   - Push to GitHub
   - Auto-deploys from `main` branch
   - Environment variables in Vercel dashboard

2. **Manual:**
   ```bash
   npm run build
   npm start
   ```

---

## Migration Notes

### Breaking Changes
None! All existing endpoints maintain backward compatibility:
- `/api/auth/discord` → Still works
- `/api/member/:id` → Still works
- `/api/player/:discordId` → Still works
- `/api/wom/*` → Still works

### New Endpoints
All new Battleship Bingo endpoints are under `/api/battleship/*`

---

## Further Reading

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Original API documentation
- [BATTLESHIP_BINGO_API.md](./BATTLESHIP_BINGO_API.md) - Battleship Bingo API docs
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables
- Database schema documentation in the database migration files

---

## Questions?

If you have questions about the code structure, check:
1. This document
2. The API documentation files
3. Inline comments in the code
4. TypeScript types/interfaces




