import Busboy from 'busboy'

import { createDeathEmbed } from './events/death.js'
import { createGenericEmbed } from './events/generic.js'
import { sendToDeathChannelDiscord, sendToMeenedChannelDiscord } from './util.js'
import { createGrandExchangeEmbed } from './events/grand-exchange.js'
import { createCollectLogEmbed } from './events/collect-log.js'
import { createLootEmbed } from './events/loot.js'

const typeHandlers = {
  GRAND_EXCHANGE: createGrandExchangeEmbed,
  DEATH: createDeathEmbed,
  LOOT: createLootEmbed,
  COLLECTION: createCollectLogEmbed,
  CHAT: createGenericEmbed,
  UNKNOWN: createGenericEmbed,
}

const createDiscordPayload = async (fields, imageBuffer, imageFilename) => {
  let payloadData = fields.payload_json
  if (typeof payloadData === 'string') {
    try {
      payloadData = JSON.parse(payloadData)
    } catch (e) {
      console.error('Failed to parse payload_json:', e)
      payloadData = {}
    }
  }

  const { type = 'UNKNOWN', world } = payloadData

  // Filter out events from worlds greater than 625 (special/tournament worlds)
  if (world && world > 625) {
    console.log(`Event filtered out because world ${world} is greater than 625, not sending to Discord`)
    return null;
  }

  if (type === 'UNKNOWN') {
    console.log('Event filtered out because the type is UNKNOWN, not sending to Discord')
    return null;
  }

  // Filter out COMBAT_ACHIEVEMENT events
  if (type === 'COMBAT_ACHIEVEMENT') {
    console.log('Event filtered out because the type is COMBAT_ACHIEVEMENT, not sending to Discord')
    return null;
  }

  // Only send CHAT events if the message is "::triggerdink"
  if (type === 'CHAT') {
    const message = payloadData?.extra?.message
    if (message !== '::triggerdink') {
      console.log(`Chat event filtered out because message "${message}" is not "::triggerdink"`)
      return null;
    }
  }

  const handler = typeHandlers[type] || createGenericEmbed

  return await handler(payloadData, imageBuffer, imageFilename)
}

// Helper function to get the appropriate send function based on event type
const getSendFunction = (eventType) => {
  switch (eventType) {
    case 'LOOT':
    case 'COLLECTION':
    case 'CHAT':
      return sendToMeenedChannelDiscord
    case 'DEATH':
      return sendToDeathChannelDiscord
    default:
      return null
  }
}

export const handler = async (req) => {
  const ct = req.headers['content-type'] || ''

  if (ct.includes('multipart/form-data')) {
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

    // Return a promise that resolves when processing is complete
    return new Promise((resolve, reject) => {
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
        reject(new Error('Invalid multipart payload'))
      })

      bb.on('finish', async () => {
        console.log('Fields:', JSON.stringify(fields, null, 2))

        try {
          // Transform Dink data to Discord webhook format
          const discordPayload = await createDiscordPayload(fields, imageBuffer, imageFilename)

          // If no payload (e.g., filtered out low-value loot), skip sending
          if (!discordPayload) {
            console.log('Event filtered out, not sending to Discord')
            resolve({ status: 'ok', message: 'Webhook received but filtered out' })
            return
          }

          // Route to appropriate Discord channel based on event type
          let payloadData = (fields as any).payload_json
          if (typeof payloadData === 'string') {
            payloadData = JSON.parse(payloadData)
          }
          const eventType = payloadData?.type || 'UNKNOWN'

          const sendFunction = getSendFunction(eventType)
          await sendFunction(discordPayload)

          console.log('Successfully sent to Discord')
          resolve({ status: 'ok', message: 'Webhook received and forwar ded to Discord' })
        } catch (error) {
          console.error('Error sending to Discord:', error)
          reject(error)
        }
      })

      req.pipe(bb)
    })
  }

  console.log('Received Dink webhook (non-multipart)')
  console.log('Body:', JSON.stringify(req.body, null, 2))

  try {
    // Transform JSON data to Discord webhook format
    const discordPayload = await createDiscordPayload(req.body, null, null)

    // If no payload (e.g., filtered out low-value loot), skip sending
    if (!discordPayload) {
      console.log('Event filtered out, not sending to Discord')
      return { status: 'ok', message: 'Webhook received but filtered out' }
    }

    // Route to appropriate Discord channel based on event type
    const eventType = req.body?.type || 'UNKNOWN'
    const sendFunction = getSendFunction(eventType)
    await sendFunction(discordPayload)

    console.log('Successfully sent to Discord')
    return { status: 'ok', message: 'Webhook received and forwarded to Discord' }
  } catch (error) {
    console.error('Error sending to Discord:', error)
    throw error
  }
}
