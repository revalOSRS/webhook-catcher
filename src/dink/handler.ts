import Busboy from 'busboy'

import { createDeathEmbed } from './events/death.js'
import { createGenericEmbed } from './events/generic.js'
import { sendToDiscord } from './util.js'
import { createGrandExchangeEmbed } from './events/grand-exchange.js'

const typeHandlers = {
  GRAND_EXCHANGE: createGrandExchangeEmbed,
  DEATH: createDeathEmbed,
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

  const { type = 'UNKNOWN' } = payloadData

  const handler = typeHandlers[type] || createGenericEmbed

  return await handler(payloadData, imageBuffer, imageFilename)
}

export const handler = async (req, res) => {
  const ct = req.headers['content-type'] || ''

  console.log('0')


  if (ct.includes('multipart/form-data')) {
    console.log('1')
    const bb = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB, adjust if needed (Vercel limit ~4.5MB request)
        files: 10,
        fields: 200,
      },
    })

    console.log('2')


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
  console.log('3')
  console.log('Received Dink webhook (non-multipart)')
  console.log('Body:', JSON.stringify(req.body, null, 2))

  try {
    // Transform JSON data to Discord webhook format
    const discordPayload = await createDiscordPayload(req.body, null, null)
    await sendToDiscord(discordPayload)
    console.log('Successfully sent to Discord')
  } catch (error) {
    console.error('Error sending to Discord:', error)
  }
}
