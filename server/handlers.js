import express from 'express'
import { database } from './db.js'
import { webSocketManager } from './websocket.js'

// === Helper ===
const isValidUserId = (id) => /^user-[a-z0-9]{9}$/.test(id)

const respondWithError = (res, status, message) => {
  return res.status(status).json({ error: message })
}

// === Signal Endpoint ===
export async function signalHandler(req, res) {
  console.log('Signal request received:', { // Debug 12
    id: req.params.id,
    targetId: req.body.targetId,
    signalType: req.body.signal?.type
  })

  // ... existing validation ...

  try {
    // Add debug before WebSocket attempt
    console.log('Attempting WebSocket delivery...') // Debug 13
    const wsSuccess = webSocketManager.sendSignal(targetId, {
      type: 'signal',
      from: id,
      signal
    })

    if (wsSuccess) {
      console.log('WebSocket delivery successful') // Debug 14
      return res.json({ success: true, transport: 'websocket' })
    }

    console.log('WebSocket failed, falling back to database') // Debug 15
    // ... rest of database fallback code ...
  } catch (err) {
    console.error('Full signaling error:', { // Debug 16
      error: err,
      stack: err.stack,
      request: { id, targetId }
    })
    // ... existing error handling ...
  }
}

// === Long Polling Endpoint ===
export async function connectHandler(req, res) {
  const { id } = req.params

  if (!isValidUserId(id)) {
    return respondWithError(res, 400, 'Invalid user ID format')
  }

  try {
    await database.run(
      'INSERT OR REPLACE INTO users (id, last_seen) VALUES (?, CURRENT_TIMESTAMP)',
      [id]
    )

    const pending = await database.all(
      'SELECT id, sender_id, signal_data FROM signals WHERE receiver_id = ?',
      [id]
    )

    if (pending.length > 0) {
      const signal = pending[0]
      await database.run('DELETE FROM signals WHERE id = ?', [signal.id])
      return res.json({
        from: signal.sender_id,
        signal: JSON.parse(signal.signal_data)
      })
    }

    const interval = setInterval(async () => {
      try {
        const newSignals = await database.all(
          'SELECT id, sender_id, signal_data FROM signals WHERE receiver_id = ?',
          [id]
        )

        if (newSignals.length > 0) {
          const signal = newSignals[0]
          await database.run('DELETE FROM signals WHERE id = ?', [signal.id])
          clearInterval(interval)
          return res.json({
            from: signal.sender_id,
            signal: JSON.parse(signal.signal_data)
          })
        }
      } catch (err) {
        console.error('Polling error:', err)
        clearInterval(interval)
        return respondWithError(res, 500, 'Internal server error')
      }
    }, 1000)

    req.on('close', () => clearInterval(interval))
  } catch (err) {
    console.error('Connection error:', err)
    return respondWithError(res, 500, 'Internal server error')
  }
}

// === Call History ===
export async function callHistoryHandler(req, res) {
  const { userId } = req.params

  if (!isValidUserId(userId)) {
    return respondWithError(res, 400, 'Invalid user ID format')
  }

  try {
    const history = await database.all(
      `SELECT * FROM calls 
       WHERE caller_id = ? OR callee_id = ?
       ORDER BY start_time DESC
       LIMIT 20`,
      [userId, userId]
    )

    return res.json(history)
  } catch (err) {
    console.error('Failed to fetch call history:', err)
    return respondWithError(res, 500, 'Internal server error')
  }
}

// === Start Call ===
export async function startCallHandler(req, res) {
  const { caller_id, callee_id, status = 'started' } = req.body

  if (!isValidUserId(caller_id) || !isValidUserId(callee_id)) {
    return respondWithError(res, 400, 'Invalid user ID format')
  }

  if (caller_id === callee_id) {
    return respondWithError(res, 400, 'Cannot call yourself')
  }

  try {
    await database.run(
      'INSERT INTO calls (caller_id, callee_id, status) VALUES (?, ?, ?)',
      [caller_id, callee_id, status]
    )
    return res.json({ success: true })
  } catch (err) {
    console.error('Failed to create call record:', err)
    return respondWithError(res, 500, 'Internal server error')
  }
}

// === End Call ===
export async function endCallHandler(req, res) {
  const { caller_id, callee_id, status = 'ended' } = req.body

  if (!isValidUserId(caller_id) || !isValidUserId(callee_id)) {
    return respondWithError(res, 400, 'Invalid user ID format')
  }

  try {
    // First, find the most recent active call
    const latestCall = await database.get(
      `SELECT id FROM calls 
       WHERE caller_id = ? AND callee_id = ? AND end_time IS NULL
       ORDER BY start_time DESC
       LIMIT 1`,
      [caller_id, callee_id]
    )

    if (!latestCall) {
      return respondWithError(res, 404, 'No active call found')
    }

    // Then update that specific call
    const result = await database.run(
      `UPDATE calls 
       SET end_time = CURRENT_TIMESTAMP, status = ?
       WHERE id = ?`,
      [status, latestCall.id]
    )

    return res.json({ success: true })
  } catch (err) {
    console.error('Failed to update call record:', err)
    return respondWithError(res, 500, 'Internal server error')
  }
}

// === Health Check ===
export async function healthCheckHandler(req, res) {
  try {
    await database.get('SELECT 1')
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeConnections: webSocketManager.activeConnections.size
    })
  } catch (err) {
    console.error('Health check failed:', err)
    return res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' })
  }
}
