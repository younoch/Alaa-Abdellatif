// composables/useWebSocket.ts
export const useWebSocket = () => {
    const ws = ref<WebSocket | null>(null)
    const isConnected = ref(false)
    const messages = ref<any[]>([])
  
    const connect = (userId: string) => {
      const wsUrl = `ws://localhost:3001`
      ws.value = new WebSocket(wsUrl)
  
      ws.value.onopen = () => {
        isConnected.value = true
        ws.value?.send(JSON.stringify({
          type: 'register',
          userId
        }))
      }
  
      ws.value.onmessage = (event) => {
        messages.value.push(JSON.parse(event.data))
      }
  
      ws.value.onclose = () => {
        isConnected.value = false
      }
    }
  
    const sendSignal = (targetId: string, signal: any) => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({
          type: 'signal',
          targetId,
          signal
        }))
        return true
      }
      return false
    }
  
    const disconnect = () => {
      ws.value?.close()
    }
  
    onBeforeUnmount(() => {
      disconnect()
    })
  
    return {
      ws,
      isConnected,
      messages,
      connect,
      sendSignal,
      disconnect
    }
  }