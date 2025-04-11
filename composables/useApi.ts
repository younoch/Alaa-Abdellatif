// composables/useApi.ts
export const useApi = () => {
    const callHistory = ref<any[]>([])
  
    const fetchCallHistory = async (userId: string) => {
      try {
        const response = await $fetch(`http://localhost:3001/api/call-history/${userId}`)
        callHistory.value = response
      } catch (error) {
        console.error('Failed to fetch call history:', error)
      }
    }
  
    const startCall = async (callerId: string, calleeId: string) => {
      try {
        await $fetch('http://localhost:3001/api/calls', {
          method: 'POST',
          body: {
            caller_id: callerId,
            callee_id: calleeId,
            status: 'started'
          }
        })
      } catch (error) {
        console.error('Failed to start call tracking:', error)
      }
    }
  
    const endCall = async (callerId: string, calleeId: string) => {
      try {
        await $fetch('http://localhost:3001/api/calls', {
          method: 'PATCH',
          body: {
            caller_id: callerId,
            callee_id: calleeId,
            status: 'ended'
          }
        })
        await fetchCallHistory(callerId)
      } catch (error) {
        console.error('Failed to end call tracking:', error)
      }
    }
  
    return {
      callHistory,
      fetchCallHistory,
      startCall,
      endCall
    }
  }