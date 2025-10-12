import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Busboy from 'busboy'
import axios from 'axios'
import FormData from 'form-data'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(express.json())

// Home route - HTML
app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/api-data">API Data</a>
          <a href="/healthz">Health</a>
        </nav>
        <h1>Welcome to Express on Vercel 🚀</h1>
        <p>This is a minimal example without a database or forms.</p>
        <img src="/logo.png" alt="Logo" width="120" />
      </body>
    </html>
  `)
})

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

// Example API endpoint - JSON
app.get('/api-data', (req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
})

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/webhook', async (req, res) => {
  const ct = req.headers['content-type'] || ''

  // If multipart/form-data (Dink with image), parse with Busboy
  if (ct.includes('multipart/form-data')) {
    console.log('Received Dink webhook (multipart)')
    console.log('Headers:', JSON.stringify(req.headers, null, 2))

    const bb = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB, adjust if needed (Vercel limit ~4.5MB request)
        files: 10,
        fields: 200,
      },
    })

    const fields = {}
    const files = []
    let imageBuffer = null
    let imageFilename = null

    bb.on('field', (name, val) => {
      // capture fields like type, playerName, dinkAccountHash, etc.
      fields[name] = val
    })

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info
      const chunks = []

      file.on('data', (chunk) => {
        chunks.push(chunk)
      })

      file.on('end', () => {
        const buffer = Buffer.concat(chunks)
        files.push({ field: name, filename, mimeType, size: buffer.length })

        // Store image data for Discord upload
        if (mimeType.startsWith('image/')) {
          imageBuffer = buffer
          imageFilename = filename
        }
      })
    })

    bb.on('error', (err) => {
      console.error('Busboy error:', err)
      res.status(400).json({ status: 'error', message: 'Invalid multipart payload' })
    })

    bb.on('finish', async () => {
      console.log('Fields:', JSON.stringify(fields, null, 2))
      console.log('Files:', JSON.stringify(files, null, 2))

      try {
        // Transform Dink data to Discord webhook format
        const discordPayload = await createDiscordPayload(fields, imageBuffer, imageFilename)
        await sendToDiscord(discordPayload)
        console.log('Successfully sent to Discord')
      } catch (error) {
        console.error('Error sending to Discord:', error)
      }

      res.status(200).json({ status: 'ok', message: 'Webhook received and forwarded to Discord' })
    })

    req.pipe(bb)
    return
  }

  // Fallback: JSON or other content-type
  console.log('Received Dink webhook (non-multipart)')
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Body:', JSON.stringify(req.body, null, 2))

  try {
    // Transform JSON data to Discord webhook format
    const discordPayload = await createDiscordPayload(req.body, null, null)
    await sendToDiscord(discordPayload)
    console.log('Successfully sent to Discord')
  } catch (error) {
    console.error('Error sending to Discord:', error)
  }

  res.status(200).json({ status: 'ok', message: 'Webhook received and forwarded to Discord' })
})

const typeHandlers = {
  GRAND_EXCHANGE: createGrandExchangeEmbed,
}

// Function to create Discord webhook payload from Dink data
async function createDiscordPayload(fields, imageBuffer, imageFilename) {
  const { type = 'UNKNOWN' } = fields.payload_json as any

  // Get the appropriate handler, default to a generic handler if type not found
  const handler = typeHandlers[type] || createGenericEmbed

  return await handler(fields, imageBuffer, imageFilename)
}

// Grand Exchange specific embed creator
async function createGrandExchangeEmbed(fields, imageBuffer, imageFilename) {

  console.log(fields.payload_json)
  const {
    playerName,
    accountType,
    dinkAccountHash,
    clanName,
    seasonalWorld,
    world,
    regionId,
    extra: {
      slot,
      status,
      item: {
        id,
        quantity,
        priceEach,
        name
      },
      marketPrice,
      targetPrice,
      targetQuantity,
    },
    discordUser: {
      id: discordUserId,
      name: discordUserName,
      avatar: discordUserAvatarHash,
    },
    embeds
  } = fields.payload_json as any

  const formattedPrice = (parseInt(priceEach) || 0).toLocaleString()

  const description = `${playerName} ${status} ${quantity} x [${name}](https://oldschool.runescape.wiki/w/Special:Search?search=${encodeURIComponent(name)}) on the GE`

  const payload = {
    embeds: [
      {
        type: 'rich',
        title: 'Grand Exchange',
        timestamp: new Date().toISOString(),
        thumbnail: {
          url: 'https://oldschool.runescape.wiki/images/Grand_Exchange_icon.png'
        },
        footer: {
          text: 'Pane friikad kotti',
          icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
        },
        fields: [
          {
            name: 'Status',
            value: `\`\`\`\n${status}\n\`\`\``,
            inline: true
          },
          {
            name: 'Market Unit Price',
            value: `\`\`\`ldif\n${formattedPrice} gp\n\`\`\``,
            inline: true
          }
        ],
        description: description,
        color: 15990936, // Same color as in the example
        author: {
          name: playerName,
          url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        }
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}

// Generic embed creator for unknown or unhandled types
async function createGenericEmbed(fields, imageBuffer, imageFilename) {
  const playerName = fields.playerName || fields.player_name || 'Unknown Player'
  const type = fields.type || fields.payload_json?.type || 'UNKNOWN'

  // Create a basic description from all available fields
  let description = `**Type:** ${type}\n`
  if (playerName !== 'Unknown Player') {
    description += `**Player:** ${playerName}\n`
  }

  // Add other relevant fields
  const relevantFields = ['itemName', 'item_name', 'quantity', 'price', 'status', 'action', 'message', 'level', 'xp']
  for (const field of relevantFields) {
    if (fields[field]) {
      const displayName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      description += `**${displayName}:** ${fields[field]}\n`
    }
  }

  const payload = {
    embeds: [
      {
        type: 'rich',
        title: `Dink Notification - ${type}`,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Pane friikad kotti',
          icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
        },
        description: description,
        color: 16776960, // Yellow color for generic notifications
        author: playerName !== 'Unknown Player' ? {
          name: playerName,
          url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        } : undefined
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}

// Helper function to add image to payload if available
function addImageToPayload(payload, imageBuffer, imageFilename) {
  if (imageBuffer && imageFilename) {
    // For Discord webhooks, we need to upload the image as an attachment
    // and reference it in the embed
    const formData = new FormData()
    formData.append('payload_json', JSON.stringify({
      ...payload,
      embeds: [{
        ...payload.embeds[0],
        image: {
          url: 'attachment://' + imageFilename
        }
      }]
    }))
    formData.append('file', imageBuffer, imageFilename)

    return formData
  }

  return payload
}

// Example: Level Up notification handler
// Uncomment and modify as needed
/*
async function createLevelUpEmbed(fields, imageBuffer, imageFilename) {
  const playerName = fields.playerName || fields.player_name || 'Unknown Player'
  const skill = fields.skill || 'Unknown Skill'
  const level = parseInt(fields.level) || 0
  const xp = parseInt(fields.xp) || 0

  const description = `${playerName} reached level ${level} in ${skill}!`

  const payload = {
    embeds: [{
      type: 'rich',
      title: '🎉 Level Up!',
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Pane friikad kotti',
        icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
      },
      fields: [
        {
          name: 'Skill',
          value: `\`\`\`\n${skill}\n\`\`\``,
          inline: true
        },
        {
          name: 'Level',
          value: `\`\`\`\n${level}\n\`\`\``,
          inline: true
        },
        {
          name: 'XP',
          value: `\`\`\`\n${xp.toLocaleString()}\n\`\`\``,
          inline: true
        }
      ],
      description: description,
      color: 5763719, // Green color for level ups
      author: {
        name: playerName,
        url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
      }
    }]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}

// Example: Loot Drop notification handler
async function createLootDropEmbed(fields, imageBuffer, imageFilename) {
  const playerName = fields.playerName || fields.player_name || 'Unknown Player'
  const itemName = fields.itemName || fields.item_name || 'Unknown Item'
  const quantity = parseInt(fields.quantity) || 1
  const value = parseInt(fields.value) || 0
  const source = fields.source || 'Unknown'

  const description = `${playerName} received ${quantity}x [${itemName}](https://oldschool.runescape.wiki/w/Special:Search?search=${encodeURIComponent(itemName)}) from ${source}`

  const payload = {
    embeds: [{
      type: 'rich',
      title: '💰 Loot Drop',
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: 'https://oldschool.runescape.wiki/images/Coins_10000.png' // Coin icon
      },
      footer: {
        text: 'Pane friikad kotti',
        icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
      },
      fields: [
        {
          name: 'Item',
          value: `\`\`\`\n${itemName}\n\`\`\``,
          inline: true
        },
        {
          name: 'Quantity',
          value: `\`\`\`\n${quantity}\n\`\`\``,
          inline: true
        },
        {
          name: 'Value',
          value: `\`\`\`ldif\n${value.toLocaleString()} gp\n\`\`\``,
          inline: true
        }
      ],
      description: description,
      color: 16776960, // Gold color for loot
      author: {
        name: playerName,
        url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
      }
    }]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}
*/

// Function to send payload to Discord webhook
async function sendToDiscord(payload) {
  const discordWebhookUrl = 'https://discord.com/api/webhooks/1426849646675886152/A9R_7-FCacRkeCdtLLzHL4d8qCuRQFf_q26vBuBj-f2JF128usremCGbYTR7heav7Mhn'

  if (payload instanceof FormData) {
    // Multipart form data with image
    await axios.post(discordWebhookUrl, payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    // JSON payload
    await axios.post(discordWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export default app
