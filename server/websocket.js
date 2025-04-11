import { WebSocketServer } from 'ws'
import { database } from './db.js'

class WebSocketManager {
  constructor(server) {
    this.activeConnections = new Map()
    this.connectionTimeout = 30000 // 30 seconds
    this.debug = true // Toggle for production
    
    this.wss = new WebSocketServer({ 
      server,
      clientTracking: true // Enable built-in tracking
    })

    this.setupConnectionHandlers()
    this.setupPingInterval()
    this.logServerStart()
  }

  log(...args) {
    if (this.debug) {
      console.log('[WebSocket]', ...args)
    }
  }

  logError(...args) {
    console.error('[WebSocket ERROR]', ...args)
  }

  logServerStart() {
    this.log(`Server started. ${this.wss.clients.size} initial clients`)
  }

  setupPingInterval() {
    this.pingInterval = setInterval(() => {
      this.log(`Running health check (${this.activeConnections.size} connections)`)
      
      this.activeConnections.forEach((ws, userId) => {
        if (!ws.isAlive) {
          this.log(`Terminating dead connection for ${userId}`)
          this.cleanupConnection(ws, userId)
          return
        }
        
        ws.isAlive = false
        try {
          ws.ping(null, false, (err) => {
            if (err) this.logError('Ping failed:', userId, err)
          })
        } catch (err) {
          this.logError('Ping error:', userId, err)
        }
      })
    }, this.connectionTimeout)
  }

  setupConnectionHandlers() {
    this.wss.on('connection', (ws) => {
      let userId = null
      this.log(`New connection (${this.wss.clients.size} total clients)`)

      // Connection health tracking
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
        this.log(`Pong received from ${userId || 'unregistered client'}`)
      })

      // Message handler
      ws.on('message', async (message) => {
        try {
          const rawMessage = message.toString()
          this.log(`Received raw message from ${userId || 'unknown'}:`, rawMessage)
          
          const data = this.parseMessage(rawMessage)
          if (!data) return

          if (data.type === 'register') {
            userId = data.userId
            await this.handleRegistration(ws, userId)
          } else if (data.type === 'signal') {
            this.handleSignalMessage(ws, userId, data)
          } else {
            this.log(`Unknown message type from ${userId}:`, data.type)
          }
        } catch (err) {
          this.logError('Message handling error:', err)
        }
      })

      // Cleanup on close
      ws.on('close', () => {
        this.log(`Connection closed for ${userId || 'unregistered client'}`)
        this.cleanupConnection(ws, userId)
      })

      // Error handling
      ws.on('error', (err) => {
        this.logError('Connection error:', userId, err)
        this.cleanupConnection(ws, userId)
      })
    })
  }

  parseMessage(rawMessage) {
    try {
      const data = JSON.parse(rawMessage)
      if (!data.type) {
        this.logError('Message missing type field:', rawMessage)
        return null
      }
      return data
    } catch (err) {
      this.logError('Message parsing failed:', rawMessage, err)
      return null
    }
  }

  async handleRegistration(ws, userId) {
    this.log(`Registering user ${userId}`)
    
    // Validate user ID format
    if (!/^user-[a-z0-9]{9}$/.test(userId)) {
      this.logError('Invalid user ID format:', userId)
      ws.close(4000, 'Invalid user ID format')
      return
    }

    // Check for existing connection
    if (this.activeConnections.has(userId)) {
      this.log(`Closing duplicate connection for ${userId}`)
      this.activeConnections.get(userId).close(4001, 'New connection replacing existing one')
    }

    // Register new connection
    this.activeConnections.set(userId, ws)
    this.log(`User ${userId} registered successfully. Active users:`, [...this.activeConnections.keys()])

    // Update last seen in DB
    try {
      await database.run(
        'INSERT OR REPLACE INTO users (id, last_seen) VALUES (?, CURRENT_TIMESTAMP)',
        [userId]
      )
    } catch (err) {
      this.logError('Database update failed for', userId, err)
    }
  }

  handleSignalMessage(ws, userId, data) {
    if (!userId) {
      this.logError('Unregistered client attempted to send signal')
      ws.close(4002, 'Register first')
      return
    }

    if (!data.targetId || !data.signal) {
      this.logError('Invalid signal format from', userId)
      return
    }

    this.log(`Routing signal from ${userId} to ${data.targetId}`)
    this.sendSignal(data.targetId, {
      type: 'signal',
      from: userId,
      signal: data.signal
    })
  }

  sendSignal(targetId, signal) {
    this.log(`Attempting to send ${signal.type} to ${targetId}`)
    
    const targetWs = this.activeConnections.get(targetId)
    if (!targetWs) {
      this.logError(`Target ${targetId} not found in active connections`)
      return false
    }

    this.log(`Target ${targetId} found. Connection state: ${targetWs.readyState}`)
    if (targetWs.readyState !== targetWs.OPEN) {
      this.logError(`Target ${targetId} connection not open (state: ${targetWs.readyState})`)
      return false
    }

    try {
      const signalJson = JSON.stringify(signal)
      targetWs.send(signalJson, (err) => {
        if (err) {
          this.logError('Signal send error:', targetId, err)
          this.cleanupConnection(targetWs, targetId)
        } else {
          this.log(`Signal successfully sent to ${targetId}`)
        }
      })
      return true
    } catch (err) {
      this.logError('Signal serialization/send failed:', targetId, err)
      return false
    }
  }

  cleanupConnection(ws, userId) {
    try {
      if (ws.readyState !== ws.CLOSED) {
        ws.terminate()
      }
      
      if (userId) {
        this.activeConnections.delete(userId)
        this.log(`Cleaned up connection for ${userId}`)
      }
    } catch (err) {
      this.logError('Cleanup failed:', userId, err)
    }
  }

  shutdown() {
    clearInterval(this.pingInterval)
    this.wss.clients.forEach(client => client.close())
    this.log('WebSocket server shutdown complete')
  }
}

let webSocketManager

export function initializeWebSocket(server) {
  webSocketManager = new WebSocketManager(server)
  return webSocketManager
}

export { webSocketManager }