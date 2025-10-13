import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

import { handler as dinkHandler } from './dink/handler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(express.json())

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

app.get('/api-data', (req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/webhook', async (req, res) => {
  try {
    let result;

    if (req.headers['user-agent'].includes('Dink')) {
      console.log('Received Dink webhook')
      result = await dinkHandler(req)
    } else {
      console.log('Received non-Dink webhook')
      result = await dinkHandler(req)
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ status: 'error', message: 'Failed to process webhook' })
  }
})

export default app
