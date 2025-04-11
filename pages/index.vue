<template>
  <div class="container">
    <!-- Tab Navigation -->
    <div class="tabs">
      <button 
        @click="activeTab = 'voiceChat'" 
        :class="{ active: activeTab === 'voiceChat' }"
      >
        Voice Chat
      </button>
      <button 
        @click="activeTab = 'profile'" 
        :class="{ active: activeTab === 'profile' }"
      >
        My Profile
      </button>
    </div>

    <!-- Voice Chat Tab -->
    <div v-if="activeTab === 'voiceChat'" class="tab-content">
      <h1>Voice Chat Application</h1>
      <div class="status-indicator" :class="{ connected: isReady }">
        Status: {{ statusMessage }}
      </div>
      <ClientOnly>
        <VoiceChat 
          @peer-created="handlePeerCreated"
          @call-started="handleCallStarted"
          @call-ended="handleCallEnded"
          @connection-change="handleConnectionChange"
        />
      </ClientOnly>
      
      <div v-if="currentPeerId" class="peer-info">
        <h3>Your Connection Info</h3>
        <p>Your ID: <strong>{{ currentPeerId }}</strong></p>
        <p>Share this ID with others to receive calls</p>
        
        <div class="copy-section">
          <input :value="currentPeerId" ref="peerIdInput" readonly />
          <button @click="copyPeerId">Copy ID</button>
        </div>
      </div>
      <pre>{{ activeCall }}</pre>
      <div v-if="activeCall" class="call-status">
        <h3>Active Call</h3>
        <p>With: {{ activeCall.withUserId }}</p>
        <p>Duration: {{ formatDuration(activeCall.startTime) }}</p>
        <p>Connection: {{ activeCall.connectionType }}</p>
      </div>
    </div>

    <!-- Profile Tab -->
    <div v-if="activeTab === 'profile'" class="tab-content">
      <h1>My Profile</h1>
      
      <ProfileImageUpload 
        :current-image="user.profileImage" 
        @upload-success="handleUploadSuccess"
      />
      
      <ProfileImageGallery :galleryKey="galleryKey" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Tab state
const activeTab = ref<'voiceChat' | 'profile'>('voiceChat')

// Voice Chat State
const currentPeerId = ref('')
const isReady = ref(false)
const isConnected = ref(false)
const activeCall = ref<{
  withUserId: string
  startTime: Date
  connectionType: 'WebSocket' | 'HTTP'
} | null>(null)

// Profile State
const user = ref({
  profileImage: ''
})
const galleryKey = ref(0)

// Computed properties
const statusMessage = computed(() => {
  if (!isReady.value) return 'Initializing...'
  return isConnected.value ? 'Connected (WebSocket)' : 'Connected (HTTP Fallback)'
})

// Voice Chat Methods
const handlePeerCreated = (peerId: string) => {
  currentPeerId.value = peerId
  isReady.value = true
}

const handleCallStarted = (payload: { targetUserId: string, connectionType: 'WebSocket' | 'HTTP' }) => {
  activeCall.value = {
    withUserId: payload.targetUserId,
    startTime: new Date(),
    connectionType: payload.connectionType
  }
}

const handleCallEnded = () => {
  activeCall.value = null
}

const handleConnectionChange = (connected: boolean) => {
  isConnected.value = connected
}

const copyPeerId = () => {
  navigator.clipboard.writeText(currentPeerId.value)
    .then(() => alert('Peer ID copied to clipboard!'))
    .catch(err => console.error('Failed to copy:', err))
}

const formatDuration = (startTime: Date) => {
  const seconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

// Profile Methods
const handleUploadSuccess = (result: any) => {
  user.value.profileImage = result.imageUrl;
  galleryKey.value += 1; // Force re-render
  
  useToast().add({
    title: 'Success',
    description: 'Profile image updated successfully',
    icon: 'i-heroicons-check-circle',
    color: 'green'
  });
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
}

.tabs button {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin-right: 5px;
  border-bottom: 3px solid transparent;
}

.tabs button.active {
  border-bottom: 3px solid #2196f3;
  color: #2196f3;
  font-weight: bold;
}

.tab-content {
  padding: 12px 0;
}

.status-indicator {
  padding: 8px 12px;
  background-color: #ff9800;
  color: white;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 20px;
}

.status-indicator.connected {
  background-color: #4caf50;
}

.peer-info {
  margin-top: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.copy-section {
  display: flex;
  margin-top: 10px;
}

.copy-section input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}

.copy-section button {
  padding: 8px 16px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.call-status {
  margin-top: 30px;
  padding: 20px;
  background-color: #e8f5e9;
  border-radius: 8px;
}

.call-status p {
  margin: 5px 0;
}
</style>