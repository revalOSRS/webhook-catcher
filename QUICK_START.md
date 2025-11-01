# Quick Start Guide - Battleship Bingo Backend

## 🚀 Getting Started

This guide will help you quickly understand and use the new Battleship Bingo API.

---

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon)
- Environment variables configured (see `ENV_SETUP.md`)

---

## Installation

```bash
# Install dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit
```

---

## Environment Variables

Ensure you have these environment variables set:

```env
# Database
DATABASE_URL=postgresql://...

# Discord OAuth
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=...
DISCORD_BOT_TOKEN=...

# Admin
ADMIN_API_KEY=your-secret-key
```

---

## Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000` (or configured PORT)

---

## Testing the API

### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

---

## Creating Your First Event

### Step 1: Create Event (Admin)

```bash
curl -X POST http://localhost:3000/api/battleship/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "event_type": "battleship_bingo",
    "name": "Test Event",
    "description": "My first Battleship Bingo game",
    "start_time": "2025-02-01T00:00:00Z",
    "end_time": "2025-02-28T23:59:59Z",
    "created_by_discord_id": "123456789012345678",
    "board_config": {
      "columns": 10,
      "rows": 5
    },
    "rules_config": {
      "pointsPerTile": 100,
      "maxShipsPerTeam": 3
    },
    "total_tiles": 50
  }'
```

**Save the `event_id` from the response!**

---

### Step 2: Create Teams

```bash
# Team 1
curl -X POST http://localhost:3000/api/battleship/teams \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "name": "Team Fire",
    "color": "#FF5733"
  }'

# Team 2
curl -X POST http://localhost:3000/api/battleship/teams \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "name": "Team Water",
    "color": "#3498DB"
  }'
```

**Save both `team_id` values!**

---

### Step 3: Add Team Members

```bash
curl -X POST http://localhost:3000/api/battleship/teams/TEAM_ID_HERE/members \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "discord_id": "123456789012345678",
    "member_code": "12345",
    "role": "captain"
  }'
```

---

### Step 4: Initialize Board

```bash
curl -X POST http://localhost:3000/api/battleship/tiles/initialize \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "tiles": [
      {
        "coordinate": "A1",
        "task_id": "boss_zulrah_25",
        "base_points": 100
      },
      {
        "coordinate": "A2",
        "task_id": "clue_hard_30",
        "buff_debuff_id": "buff_double_points",
        "base_points": 150
      }
    ]
  }'
```

---

### Step 5: Place Ships

```bash
curl -X POST http://localhost:3000/api/battleship/ships \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "team_id": "TEAM_ID_HERE",
    "ship_name": "Battleship Alpha",
    "size": 5,
    "coordinates": ["A1", "A2", "A3", "A4", "A5"],
    "discord_id": "123456789012345678"
  }'
```

---

### Step 6: Start Event

```bash
curl -X PATCH http://localhost:3000/api/battleship/events/EVENT_ID_HERE/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{
    "status": "active"
  }'
```

---

## Player Actions

### Claim a Tile

```bash
curl -X POST http://localhost:3000/api/battleship/tiles/TILE_ID_HERE/claim \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "TEAM_ID_HERE",
    "discord_id": "123456789012345678"
  }'
```

---

### Update Progress

```bash
curl -X POST http://localhost:3000/api/battleship/tiles/TILE_ID_HERE/progress \
  -H "Content-Type: application/json" \
  -d '{
    "discord_id": "123456789012345678",
    "progress_amount": 15,
    "progress_percentage": 60,
    "contribution_type": "kill_count",
    "proof_url": "https://example.com/proof.png"
  }'
```

---

### Complete Tile

```bash
curl -X POST http://localhost:3000/api/battleship/tiles/TILE_ID_HERE/complete \
  -H "Content-Type: application/json" \
  -d '{
    "completed_by_discord_id": "123456789012345678",
    "total_points_awarded": 100,
    "proof_url": "https://example.com/completion-proof.png"
  }'
```

---

### Fire Bomb

```bash
curl -X POST http://localhost:3000/api/battleship/bombing \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVENT_ID_HERE",
    "bombing_team_id": "TEAM_ID_HERE",
    "target_coordinate": "B5",
    "bombed_by_discord_id": "123456789012345678"
  }'
```

**Response will indicate:** `hit`, `miss`, `sunk_ship`, or `blocked`

---

## Viewing Data

### Get Leaderboard

```bash
# Team leaderboard
curl http://localhost:3000/api/battleship/teams/event/EVENT_ID_HERE/leaderboard

# Player leaderboard
curl http://localhost:3000/api/battleship/teams/event/EVENT_ID_HERE/players/leaderboard
```

---

### Get All Tiles

```bash
# All tiles
curl http://localhost:3000/api/battleship/tiles/event/EVENT_ID_HERE

# Only unclaimed tiles
curl http://localhost:3000/api/battleship/tiles/event/EVENT_ID_HERE?status=unclaimed

# Only completed tiles
curl http://localhost:3000/api/battleship/tiles/event/EVENT_ID_HERE?status=completed
```

---

### Get Event Logs

```bash
curl http://localhost:3000/api/battleship/events/EVENT_ID_HERE/logs
```

---

## Common Workflows

### Admin Setup Workflow
1. Create event → Save `event_id`
2. Create teams (2+) → Save `team_id` for each
3. Add members to teams
4. Initialize board tiles
5. Allow teams to place ships
6. Update event status to `active`

---

### Player Gameplay Workflow
1. View available tiles
2. Claim unclaimed tile
3. Work on task (update progress)
4. Submit completion with proof
5. Attack enemy ships with bombs
6. Check leaderboard

---

### Team Strategy Workflow
1. Review board and identify high-value tiles
2. Place ships strategically
3. Coordinate tile claims with team
4. Track progress on collaborative tiles
5. Use bombs to disrupt enemy ships
6. Monitor enemy positions

---

## Integration Examples

### JavaScript/TypeScript Frontend

```typescript
// Create a service
class BattleshipAPI {
  private baseURL = 'https://your-domain.com/api/battleship'
  
  async getEvent(eventId: string) {
    const res = await fetch(`${this.baseURL}/events/${eventId}`)
    return res.json()
  }
  
  async claimTile(tileId: string, teamId: string, discordId: string) {
    const res = await fetch(`${this.baseURL}/tiles/${tileId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, discord_id: discordId })
    })
    return res.json()
  }
  
  async fireBomb(eventId: string, teamId: string, coordinate: string, discordId: string) {
    const res = await fetch(`${this.baseURL}/bombing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        bombing_team_id: teamId,
        target_coordinate: coordinate,
        bombed_by_discord_id: discordId
      })
    })
    return res.json()
  }
}
```

---

### Discord Bot Integration

```javascript
// Discord.js example
client.on('messageCreate', async message => {
  if (message.content === '!leaderboard') {
    const eventId = 'YOUR_EVENT_ID'
    const response = await fetch(
      `https://your-domain.com/api/battleship/teams/event/${eventId}/leaderboard`
    )
    const data = await response.json()
    
    const embed = new EmbedBuilder()
      .setTitle('Battleship Bingo Leaderboard')
      .setDescription(
        data.data.map((team, i) => 
          `${i+1}. ${team.name}: ${team.score} points`
        ).join('\n')
      )
    
    message.reply({ embeds: [embed] })
  }
})
```

---

## Troubleshooting

### "Unauthorized" Error
- Check that `X-Admin-Key` header is set correctly
- Verify `ADMIN_API_KEY` environment variable

### "Event not found"
- Verify the `event_id` is correct
- Check that event was created successfully

### "Tile cannot be claimed"
- Tile may already be claimed by another team
- Check tile status: `GET /tiles/event/:eventId`

### "No bombs remaining"
- Teams have limited bombs per period
- Check team data: `GET /teams/:teamId`

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Check database is accessible
- Ensure tables are migrated

---

## Next Steps

1. **Read Full Documentation:**
   - `BATTLESHIP_BINGO_API.md` - Complete API reference
   - `CODE_STRUCTURE.md` - Architecture guide

2. **Implement Frontend:**
   - Build board visualization
   - Create team management UI
   - Add real-time updates (WebSockets)

3. **Add Features:**
   - Notifications for tile completions
   - Chat system for teams
   - Achievements and badges
   - Analytics dashboard

---

## Support

- Check documentation files in the repo
- Review code comments
- Test endpoints with curl/Postman
- Check server logs for errors

---

**You're all set! Start building your Battleship Bingo game! 🎮🚀**




