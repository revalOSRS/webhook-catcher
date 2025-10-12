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

// Function to create Discord webhook payload from Dink data
async function createDiscordPayload(fields, imageBuffer, imageFilename) {
  const playerName = fields.playerName || fields.player_name || 'Unknown Player'
  const itemName = fields.itemName || fields.item_name || 'Unknown Item'
  const quantity = parseInt(fields.quantity) || 1
  const price = parseInt(fields.price) || 0
  const status = fields.status || 'Completed'
  const type = fields.type || 'grand_exchange'

  // Format price with commas
  const formattedPrice = price.toLocaleString()

  // Create description
  let description = ''
  if (type === 'grand_exchange') {
    const action = fields.action || 'bought'
    description = `${playerName} ${action} ${quantity} x [${itemName}](https://oldschool.runescape.wiki/w/Special:Search?search=${encodeURIComponent(itemName)}) on the GE`
  }

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
          text: 'Powered by Tark Vanamees',
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

  // Add image if available
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
