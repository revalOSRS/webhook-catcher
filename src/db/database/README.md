# Database Connection

Neon Postgres serverless database connection and models for the RevalOSRS Discord bot.

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

The database initializes automatically when your bot starts. To manually create tables:

```javascript
const { initializeDatabase } = require('./src/connections/database');
const Member = require('./src/connections/database/models/Member');

// In your bot's startup code (already in src/events/ready.js)
await initializeDatabase();
await Member.createTable();
```

## Member Model

The `Member` model represents a clan member with both Discord and OSRS information.

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Auto-generated primary key |
| `discordId` | VARCHAR(20) | Discord user ID (unique) |
| `discordTag` | VARCHAR(37) | Discord username |
| `dinkHash` | VARCHAR(255) | Dink webhook hash for notifications |
| `osrsNickname` | VARCHAR(12) | OSRS username |
| `osrsRank` | VARCHAR(50) | Rank in OSRS clan |
| `discordRank` | VARCHAR(50) | Role in Discord server |
| `womPlayerId` | INTEGER | Wise Old Man player ID |
| `isActive` | BOOLEAN | Whether member is currently active |
| `notes` | TEXT | Admin notes about the member |
| `createdAt` | TIMESTAMP | When the member was added |
| `updatedAt` | TIMESTAMP | Last time the record was updated (auto-updated) |
| `lastSeen` | TIMESTAMP | Last time the member was seen/active |

### Usage Examples

#### Create a Member

```javascript
const Member = require('./src/connections/database/models/Member');

const memberId = await Member.create({
  discordId: '123456789012345678',
  discordTag: 'username',
  osrsNickname: 'Zezima',
  osrsRank: 'General',
  discordRank: 'Officer',
  womPlayerId: 1135,
  notes: 'Veteran member, very active'
});

console.log('Member created with ID:', memberId);
```

#### Find Members

```javascript
// By Discord ID
const member = await Member.findByDiscordId('123456789012345678');

// By Discord Tag
const member = await Member.findByDiscordTag('username');

// By OSRS nickname
const member = await Member.findByOSRSNickname('Zezima');

// By Dink Hash
const member = await Member.findByDinkHash('abc123');

// By WOM Player ID
const member = await Member.findByWOMPlayerId(1135);

// Get all members
const allMembers = await Member.findAll();

// Get only active members
const activeMembers = await Member.findAll({ activeOnly: true });

// Search by partial OSRS nickname
const matches = await Member.searchByOSRSNickname('zez', 10);
```

#### Update a Member

```javascript
// Update by ID
await Member.updateById(1, {
  osrsRank: 'Admin',
  discordRank: 'Administrator'
});

// Update by Discord ID
await Member.updateByDiscordId('123456789012345678', {
  osrsNickname: 'NewName',
  dinkHash: 'abc123xyz'
});

// Update last seen
await Member.updateLastSeen('123456789012345678');
```

#### Delete a Member

```javascript
// Delete by ID
await Member.deleteById(1);

// Delete by Discord ID
await Member.deleteByDiscordId('123456789012345678');
```

#### Count Members

```javascript
// Total members
const total = await Member.count();

// Active members only
const active = await Member.count(true);
```

## Integration Examples

### Discord Bot Integration

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { initializeDatabase } = require('./src/connections/database');
const Member = require('./src/connections/database/models/Member');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  // Initialize database
  await initializeDatabase();
  await Member.createTable();
  
  console.log('✅ Bot and database ready!');
});

// Track when members are active
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Update last seen
  await Member.updateLastSeen(message.author.id);
});

// Register new member command
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'register') {
    const osrsName = interaction.options.getString('osrs-name');
    
    try {
      // Check if already registered
      const existing = await Member.findByDiscordId(interaction.user.id);
      
      if (existing) {
        await interaction.reply('You are already registered!');
        return;
      }
      
      // Create new member
      await Member.create({
        discordId: interaction.user.id,
        osrsNickname: osrsName,
        discordRank: interaction.member.roles.highest.name
      });
      
      await interaction.reply(`✅ Registered as ${osrsName}!`);
    } catch (error) {
      console.error('Registration error:', error);
      await interaction.reply('❌ Registration failed!');
    }
  }
});
```

### Wise Old Man Integration

```javascript
const { WOMClient } = require('@wise-old-man/utils');
const Member = require('./src/connections/database/models/Member');

const womClient = new WOMClient();

async function syncMemberWithWOM(discordId) {
  const member = await Member.findByDiscordId(discordId);
  
  if (!member || !member.osrsNickname) {
    throw new Error('Member not found or no OSRS nickname set');
  }
  
  // Get player details from WOM
  const player = await womClient.players.getPlayerDetails(member.osrsNickname);
  
  // Update member with WOM player ID
  await Member.updateByDiscordId(discordId, {
    womPlayerId: player.id
  });
  
  return player;
}

async function updateAllMembers() {
  const members = await Member.findAll({ activeOnly: true });
  
  for (const member of members) {
    if (!member.osrsNickname) continue;
    
    try {
      // Update player in WOM
      await womClient.players.updatePlayer(member.osrsNickname);
      console.log(`✅ Updated ${member.osrsNickname}`);
    } catch (error) {
      console.error(`❌ Failed to update ${member.osrsNickname}:`, error.message);
    }
    
    // Rate limit: wait 1 second between updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Rank Syncing

```javascript
async function syncRanks(guild) {
  const members = await Member.findAll({ activeOnly: true });
  
  for (const member of members) {
    try {
      const guildMember = await guild.members.fetch(member.discordId);
      const highestRole = guildMember.roles.highest.name;
      
      // Update Discord rank if changed
      if (member.discordRank !== highestRole) {
        await Member.updateByDiscordId(member.discordId, {
          discordRank: highestRole
        });
        console.log(`Updated ${member.osrsNickname}'s Discord rank to ${highestRole}`);
      }
    } catch (error) {
      console.error(`Failed to sync ranks for ${member.osrsNickname}:`, error.message);
    }
  }
}
```

## Best Practices

1. **Initialize once**: Call `initializeDatabase()` and `Member.createTable()` once when your bot starts
2. **Serverless advantage**: Neon automatically handles connection pooling and scales to zero when idle
3. **Error handling**: Always wrap database calls in try-catch blocks
4. **Rate limiting**: When syncing with external APIs (like WOM), implement rate limiting
5. **Indexes**: The table includes indexes on frequently queried fields (discord_id, osrs_nickname, wom_player_id)
6. **Auto-update timestamp**: The `updated_at` field is automatically updated via Postgres trigger

## Cleanup

To gracefully shutdown the database connection when your bot stops:

```javascript
const { closeDatabase } = require('./src/connections/database');

process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});
```

