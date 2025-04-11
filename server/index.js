import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createServer } from 'http'
import path from 'path'
import fs from 'fs';
import { fileURLToPath } from 'url'
import { database } from './db.js'
import { config } from './config.js'
import { initializeWebSocket } from './websocket.js'
import {
  signalHandler,
  connectHandler,
  callHistoryHandler,
  startCallHandler,
  endCallHandler,
  healthCheckHandler
} from './handlers.js'
import { loggerMiddleware, enhancedErrorHandler, uploadProfileImage } from './middleware.js'
import profileImageRouter from './routes/profileImage.js';

// Initialize __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express and HTTP server
const app = express()
const server = createServer(app)

// Initialize WebSocket
initializeWebSocket(server)

// Middleware
app.use(cors(config.corsOptions))
app.use(bodyParser.json())
app.use(loggerMiddleware)

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')))

// Wrap async handlers to properly handle errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// API Routes
app.post('/api/signal/:id', asyncHandler(signalHandler))
app.get('/api/connect/:id', asyncHandler(connectHandler))
app.get('/api/call-history/:userId', asyncHandler(callHistoryHandler))
app.post('/api/calls', asyncHandler(startCallHandler))
app.patch('/api/calls', asyncHandler(endCallHandler))
app.get('/api/health', asyncHandler(healthCheckHandler))

// Profile Image Routes
app.use('/api/profile', profileImageRouter);

// Error handling middleware (using enhanced handler)
app.use(enhancedErrorHandler)

// Initialize database and start server
async function initialize() {
  try {
    await database.initialize()
    console.log('Database initialized successfully')

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'profile_images')
    await fs.promises.mkdir(uploadDir, { recursive: true })

    server.listen(config.port, () => {
      console.log(`HTTP Server running on http://localhost:${config.port}`)
      console.log(`WebSocket Server running on ws://localhost:${config.port}`)
      console.log(`Profile images will be stored in: ${uploadDir}`)
    })
  } catch (error) {
    console.error('Failed to initialize server:', error)
    process.exit(1)
  }
}

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  try {
    await database.close()
    server.close()
    console.log('Server shutdown gracefully')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
})

// Start the server
initialize()