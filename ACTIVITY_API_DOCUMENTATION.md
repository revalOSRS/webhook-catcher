# Activity Events API Documentation

## Endpoints

### 1. GET `/api/activity-events`

Get recent activity events from in-memory cache (Dink webhook events).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "type": "loot",
      "player": "PlayerName",
      "data": { ... },
      "timestamp": "2025-11-13T10:30:00Z"
    }
  ],
  "count": 7
}
```

**Query Parameters:**
- `limit` (optional): Number of events to return. Default: 7

---

### 2. GET `/api/activity-events/wom`

Get clan activity from WiseOldMan (member joins, leaves, and rank changes).

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "type": "joined",
      "player": {
        "id": 12345,
        "username": "PlayerName",
        "displayName": "PlayerName"
      },
      "createdAt": "2025-11-13T10:30:00.000Z"
    },
    {
      "type": "left",
      "player": {
        "id": 67890,
        "username": "OtherPlayer",
        "displayName": "OtherPlayer"
      },
      "createdAt": "2025-11-13T09:15:00.000Z"
    },
    {
      "type": "changed_role",
      "player": {
        "id": 11111,
        "username": "PromotedPlayer",
        "displayName": "PromotedPlayer"
      },
      "previousRole": "member",
      "role": "moderator",
      "createdAt": "2025-11-13T08:00:00.000Z"
    }
  ],
  "count": 3,
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

**Query Parameters:**
- `limit` (optional): Number of activity entries to return. Default: 20
- `offset` (optional): Number of entries to skip. Default: 0

**Activity Types:**
- `joined` - Player joined the clan
- `left` - Player left the clan
- `changed_role` - Player's rank/role changed in the clan

**Error Response (if WOM_GROUP_ID not configured):**
```json
{
  "status": "error",
  "message": "WiseOldMan group ID not configured. Set WOM_GROUP_ID environment variable."
}
```

---

## Configuration

Add your WiseOldMan group ID to your `.env` file:

```env
WOM_GROUP_ID=12345
```

You can find your group ID by visiting your clan's WiseOldMan page:
`https://wiseoldman.net/groups/{YOUR_GROUP_ID}`

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get recent Dink events
async function getRecentActivity() {
  const response = await fetch('/api/activity-events?limit=10')
  const data = await response.json()
  return data.data
}

// Get WiseOldMan clan activity
async function getClanActivity(limit = 20, offset = 0) {
  const response = await fetch(`/api/activity-events/wom?limit=${limit}&offset=${offset}`)
  const data = await response.json()
  return data.data
}

// Get recent joins
async function getRecentJoins() {
  const activity = await getClanActivity(50)
  return activity.filter(event => event.type === 'joined')
}

// Get recent leaves
async function getRecentLeaves() {
  const activity = await getClanActivity(50)
  return activity.filter(event => event.type === 'left')
}

// Get recent rank changes
async function getRecentPromotions() {
  const activity = await getClanActivity(50)
  return activity.filter(event => event.type === 'changed_role')
}
```

### cURL

```bash
# Get recent Dink events
curl "http://localhost:3000/api/activity-events?limit=5"

# Get WiseOldMan clan activity
curl "http://localhost:3000/api/activity-events/wom?limit=20&offset=0"

# Get more activity (pagination)
curl "http://localhost:3000/api/activity-events/wom?limit=20&offset=20"
```

### Python

```python
import requests

def get_clan_activity(limit=20, offset=0):
    response = requests.get(
        'http://localhost:3000/api/activity-events/wom',
        params={'limit': limit, 'offset': offset}
    )
    response.raise_for_status()
    return response.json()['data']

# Get recent activity
activity = get_clan_activity(limit=50)

# Filter by type
joins = [a for a in activity if a['type'] == 'joined']
leaves = [a for a in activity if a['type'] == 'left']
promotions = [a for a in activity if a['type'] == 'changed_role']

print(f"Recent joins: {len(joins)}")
print(f"Recent leaves: {len(leaves)}")
print(f"Recent promotions: {len(promotions)}")
```

---

## Frontend Display Example

```typescript
interface ClanActivity {
  type: 'joined' | 'left' | 'changed_role'
  player: {
    id: number
    username: string
    displayName: string
  }
  role?: string
  previousRole?: string
  createdAt: string
}

function ActivityFeed({ activities }: { activities: ClanActivity[] }) {
  return (
    <div className="activity-feed">
      {activities.map((activity, index) => (
        <div key={index} className="activity-item">
          {activity.type === 'joined' && (
            <div className="activity-join">
              <span className="icon">➕</span>
              <span className="player">{activity.player.displayName}</span>
              <span className="action">joined the clan</span>
              <span className="time">{formatTime(activity.createdAt)}</span>
            </div>
          )}
          
          {activity.type === 'left' && (
            <div className="activity-leave">
              <span className="icon">➖</span>
              <span className="player">{activity.player.displayName}</span>
              <span className="action">left the clan</span>
              <span className="time">{formatTime(activity.createdAt)}</span>
            </div>
          )}
          
          {activity.type === 'changed_role' && (
            <div className="activity-promotion">
              <span className="icon">⭐</span>
              <span className="player">{activity.player.displayName}</span>
              <span className="action">
                promoted from {activity.previousRole} to {activity.role}
              </span>
              <span className="time">{formatTime(activity.createdAt)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
```

---

## Notes

1. **Caching**: WiseOldMan data is fetched in real-time, consider adding caching if needed
2. **Rate Limits**: Be mindful of WiseOldMan API rate limits
3. **Pagination**: Use `offset` and `limit` to paginate through large activity histories
4. **Real-time**: For real-time updates, consider polling this endpoint or implementing WebSockets
5. **Group ID**: Make sure your WOM_GROUP_ID is correct in the environment variables

