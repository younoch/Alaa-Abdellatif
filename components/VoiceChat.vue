<template>
  <div class="voice-chat-container">
    <div class="connection-status">
      <span :class="{ connected: isReady }"></span>
      {{ isReady ? 'Ready' : 'Connecting...' }}
    </div>

    <div class="controls">
      <button @click="initiateCall" :disabled="!isReady || !targetUserId">
        Start Call
      </button>
      <button @click="endCall" :disabled="!isInCall">
        End Call
      </button>
      <button @click="toggleMute" :disabled="!isInCall">
        {{ isMuted ? 'Unmute' : 'Mute' }}
      </button>
    </div>

    <div class="user-input">
      <input 
        v-model="targetUserId" 
        placeholder="Enter target user ID"
        :disabled="isInCall"
      >
      <div v-if="currentPeerId" class="peer-id">
        <p>Your ID: <strong>{{ currentPeerId }}</strong></p>
        <button @click="copyPeerId">Copy</button>
      </div>
    </div>

    <div v-if="isInCall" class="call-status">
      <p>🔊 Call in progress with {{ targetUserId }}</p>
      <p>Duration: {{ callDuration }}</p>
    </div>

    <div class="call-history" v-if="callHistory.length > 0">
      <h3>Call History</h3>
      <ul>
        <li v-for="call in callHistory" :key="call.id">
          {{ formatCall(call) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface CallHistoryItem {
  id: number
  caller_id: string
  callee_id: string
  start_time: string
  end_time: string | null
  status: string
}

const emit = defineEmits(['peer-created', 'call-started', 'call-ended'])

// Refs
const localStream = ref<MediaStream | null>(null)
const remoteStream = ref<MediaStream | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const currentPeerId = ref('')
const targetUserId = ref('')
const isInCall = ref(false)
const isReady = ref(false)
const isMuted = ref(false)
const callHistory = ref<CallHistoryItem[]>([])
const callStartTime = ref<Date | null>(null)
const callDuration = ref('0s')
const socket = ref<WebSocket | null>(null)
const isWebSocketConnected = ref(false)
const connectionRetries = ref(0)
const MAX_RETRIES = 3

// Watch call status to update duration
watch(isInCall, (newVal) => {
  if (newVal) {
    const interval = setInterval(() => {
      if (callStartTime.value) {
        const seconds = Math.floor((new Date().getTime() - callStartTime.value.getTime()) / 1000)
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
        const secs = (seconds % 60).toString().padStart(2, '0')
        callDuration.value = `${mins}:${secs}`
      }
    }, 1000)
    
    onUnmounted(() => clearInterval(interval))
  } else {
    callDuration.value = '0s'
  }
})

// Generate random user ID
const generateUserId = () => {
  return `user-${Math.random().toString(36).substring(2, 11)}`
}

// Format call history item
const formatCall = (call: CallHistoryItem) => {
  const otherUser = call.caller_id === currentPeerId.value ? call.callee_id : call.caller_id
  const direction = call.caller_id === currentPeerId.value ? 'Outgoing' : 'Incoming'
  const duration = call.end_time 
    ? `${Math.round((new Date(call.end_time).getTime() - new Date(call.start_time).getTime()) / 1000)}s` 
    : 'N/A'
  
  return `${direction} call with ${otherUser} (${duration})`
}

// Fetch call history
const fetchCallHistory = async () => {
  try {
    const response = await $fetch(`http://localhost:3001/api/call-history/${currentPeerId.value}`)
    callHistory.value = response
  } catch (error) {
    console.error('Failed to fetch call history:', error)
    callHistory.value = []
  }
}


// Initialize WebRTC
const initializeWebRTC = async () => {
  try {
    currentPeerId.value = generateUserId()
    emit('peer-created', currentPeerId.value)
    
    // Try WebSocket first
    const wsSuccess = await connectToSignalingServer()
    
    if (!wsSuccess) {
      console.log("Falling back to HTTP signaling")
    }
    
    await fetchCallHistory()
    isReady.value = true
  } catch (error) {
    console.error("WebRTC initialization failed:", error)
    isReady.value = false
  }
}

// Connect to signaling server
const connectToSignalingServer = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Close existing connection if any
      if (socket.value) {
        socket.value.close()
      }

      const wsUrl = 'ws://localhost:3001' // Match your backend port
      socket.value = new WebSocket(wsUrl)

      socket.value.onopen = () => {
        console.log("WebSocket connection established for", currentPeerId.value)
        isWebSocketConnected.value = true
        connectionRetries.value = 0
        emit('connection-change', true)
        socket.value?.send(JSON.stringify({
          type: 'register',
          userId: currentPeerId.value
        }))
        resolve(true)
      }

      socket.value.onerror = (error) => {
        console.error("WebSocket error:", error)
        handleConnectionFailure()
        resolve(false)
      }

      socket.value.onclose = () => {
        console.log("WebSocket connection closed")
        handleConnectionFailure()
        resolve(false)
      }

      socket.value.onmessage = (event) => {
        console.log("Received message:", event.data)
        const message = JSON.parse(event.data)
        if (message.type === 'signal') {
          handleSignal(message.from, message.signal)
        }
      }

    } catch (error) {
      console.error("Error creating WebSocket:", error)
      handleConnectionFailure()
      resolve(false)
    }
  })
}

const handleConnectionFailure = () => {
  isWebSocketConnected.value = false
  emit('connection-change', false)
  
  // Implement retry logic with exponential backoff
  if (connectionRetries.value < MAX_RETRIES) {
    connectionRetries.value++
    const delay = Math.min(1000 * Math.pow(2, connectionRetries.value), 8000) // Max 8 seconds
    console.log(`Retrying connection in ${delay}ms...`)
    setTimeout(() => connectToSignalingServer(), delay)
  }
}

// Handle incoming signals
const handleSignal = async (from: string, signal: any) => {
  try {
    if (!peerConnection.value) {
      await createPeerConnection()
    }

    if (signal.type === 'offer') {
      await peerConnection.value?.setRemoteDescription(new RTCSessionDescription(signal))
      const answer = await peerConnection.value?.createAnswer()
      await peerConnection.value?.setLocalDescription(answer)
      await sendSignal(from, answer)
    } 
    else if (signal.type === 'answer') {
      await peerConnection.value?.setRemoteDescription(new RTCSessionDescription(signal))
    } 
    else if (signal.type === 'candidate') {
      // Fix candidate handling
      const candidateData = signal.candidate.candidate ? signal.candidate : signal
      try {
        await peerConnection.value?.addIceCandidate(new RTCIceCandidate({
          candidate: candidateData.candidate,
          sdpMid: candidateData.sdpMid || '0', // Default to '0' if missing
          sdpMLineIndex: candidateData.sdpMLineIndex || 0, // Default to 0
          usernameFragment: candidateData.usernameFragment
        }))
      } catch (iceError) {
        console.error('ICE candidate error:', iceError)
      }
    }
  } catch (error) {
    console.error('Error handling signal:', error)
  }
}

// Initiate a call
const initiateCall = async () => {
  console.log("Initiating call to", targetUserId.value)
  if (!targetUserId.value) {
    alert('Please enter a target user ID')
    return
  }

  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    await createPeerConnection()
    
    const offer = await peerConnection.value?.createOffer()
    await peerConnection.value?.setLocalDescription(offer)
    
    // Try WebSocket first, fallback to HTTP
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({
        type: 'signal',
        targetId: targetUserId.value,
        signal: offer
      }))
    } else {
      await sendSignal(targetUserId.value, offer)
    }
    
    isInCall.value = true
    callStartTime.value = new Date()
    emit('call-started', targetUserId.value)
    await startCallTracking()
  } catch (error) {
    console.error('Call initiation failed:', error)
    endCall()
  }
}

// End the current call
const endCall = async () => {
  try {
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach(track => track.stop())
      remoteStream.value = null
    }
    if (peerConnection.value) {
      peerConnection.value.close()
      peerConnection.value = null
    }
    
    isInCall.value = false
    isMuted.value = false
    callStartTime.value = null
    emit('call-ended')
    await endCallTracking()
  } catch (error) {
    console.error('Error ending call:', error)
  }
}

// Toggle mute
const toggleMute = () => {
  if (localStream.value) {
    localStream.value.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
    })
    isMuted.value = !isMuted.value
  }
}

// Copy peer ID to clipboard
const copyPeerId = () => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(currentPeerId.value)
      .then(() => alert('Peer ID copied to clipboard!'))
      .catch(err => alert('Failed to copy Peer ID: ' + err.message))
  } else {
    alert('Clipboard API is not available in this environment.')
  }
}


// Track call start
const startCallTracking = async () => {
  try {
    await $fetch('http://localhost:3001/api/calls', {
      method: 'POST',
      body: {
        caller_id: currentPeerId.value,
        callee_id: targetUserId.value,
        status: 'started'
      }
    })
  } catch (error) {
    console.error('Failed to track call start:', error)
  }
}

// Track call end
const endCallTracking = async () => {
  try {
    await $fetch('http://localhost:3001/api/calls', {
      method: 'PATCH',
      body: {
        caller_id: currentPeerId.value,
        callee_id: targetUserId.value,
        status: 'ended'
      }
    })
    await fetchCallHistory()
  } catch (error) {
    console.error('Failed to track call end:', error)
  }
}

// Create RTCPeerConnection
const createPeerConnection = async () => {
  console.log("Creating peer connection")
  const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  peerConnection.value = new RTCPeerConnection(configuration)

  // Add local stream to connection
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => {
      peerConnection.value?.addTrack(track, localStream.value!)
    })
  }

  // Handle ICE candidates
  peerConnection.value.onicecandidate = (event) => {
    console.log("ICE candidate generated:", event.candidate)
    if (event.candidate && targetUserId.value) {
      const signal = {
        type: 'candidate',
        candidate: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        }
      }
      
      // Try WebSocket first
      if (socket.value?.readyState === WebSocket.OPEN) {
        socket.value.send(JSON.stringify({
          type: 'signal',
          targetId: targetUserId.value,
          signal
        }))
      } else {
        sendSignal(targetUserId.value, signal)
      }
    }
  }
  peerConnection.value.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", peerConnection.value?.iceConnectionState)
  }

  peerConnection.value.onsignalingstatechange = () => {
    console.log("Signaling state:", peerConnection.value?.signalingState)
  }

  // Handle remote stream
  peerConnection.value.ontrack = (event) => {
    console.log("Received remote track:", event.streams[0])
    remoteStream.value = event.streams[0]
    // Here you would typically play the remote stream
    console.log('Received remote stream')
  }
}

// Send signal via HTTP fallback
const sendSignal = async (targetId: string, signal: any) => {
  try {
    // Try WebSocket first if available
    if (isWebSocketConnected.value && socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({
        type: 'signal',
        targetId,
        signal
      }))
      emit('call-started', {
        targetUserId: targetId,
        connectionType: 'WebSocket'
      })
      return
    }
    
    // Fallback to HTTP
    await $fetch(`http://localhost:3001/api/signal/${currentPeerId.value}`, {
      method: 'POST',
      body: { targetId, signal }
    })
    emit('call-started', {
      targetUserId: targetId,
      connectionType: 'HTTP'
    })
  } catch (error) {
    console.error('Failed to send signal:', error)
    throw error
  }
}

onMounted(() => {
  initializeWebRTC()
})

onUnmounted(() => {
  endCall()
  if (socket.value) {
    socket.value.close()
    socket.value = null
  }
})
</script>

<style scoped>
.voice-chat-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.connection-status {
  margin-bottom: 15px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.connection-status span {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ff5722;
  margin-right: 8px;
}

.connection-status .connected {
  background-color: #4caf50;
}

.controls {
  margin-bottom: 20px;
}

button {
  padding: 8px 16px;
  margin-right: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

input {
  padding: 8px;
  width: 100%;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.peer-id {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.peer-id button {
  padding: 4px 8px;
  font-size: 0.8em;
}

.call-status {
  margin: 15px 0;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.call-history {
  margin-top: 20px;
}

.call-history ul {
  list-style-type: none;
  padding: 0;
}

.call-history li {
  padding: 8px;
  border-bottom: 1px solid #eee;
}
</style>