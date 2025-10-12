import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Busboy from 'busboy'

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

app.post('/webhook', (req, res) => {
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

    bb.on('field', (name, val) => {
      // capture fields like type, playerName, dinkAccountHash, etc.
      fields[name] = val
    })

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info
      let size = 0
      file.on('data', (chunk) => {
        size += chunk.length
      })
      file.on('end', () => {
        files.push({ field: name, filename, mimeType, size })
      })
    })

    bb.on('error', (err) => {
      console.error('Busboy error:', err)
      res.status(400).json({ status: 'error', message: 'Invalid multipart payload' })
    })

    bb.on('finish', () => {
      console.log('Fields:', JSON.stringify(fields, null, 2))
      console.log('Files:', JSON.stringify(files, null, 2))
      res.status(200).json({ status: 'ok', message: 'Webhook received', fields, files })
    })

    req.pipe(bb)
    return
  }

  // Fallback: JSON or other content-type
  console.log('Received Dink webhook (non-multipart)')
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Body:', JSON.stringify(req.body, null, 2))
  res.status(200).json({ status: 'ok', message: 'Webhook received' })
})

export default app
