<script setup>
import { computed } from 'vue'
import { useMarketStore } from '../store/market'

const store = useMarketStore()

const formatTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const uptime = computed(() => {
  if (!store.stats?.connected_at) return '-'
  const start = new Date(store.stats.connected_at)
  const now = new Date()
  const diff = Math.floor((now - start) / 1000)
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
})
</script>

<template>
  <footer class="bg-dark-900/80 border-t border-dark-700/50 px-3 py-1.5">
    <div class="flex items-center justify-between gap-4 text-xs">
      <!-- Connection Status -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <div 
            class="w-1.5 h-1.5 rounded-full"
            :class="store.isConnected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span class="text-dark-500 hidden sm:inline">
            {{ store.isConnected ? 'Live' : 'Disconnected' }}
          </span>
        </div>
        
        <span class="text-dark-600 hidden md:inline">|</span>
        
        <div class="hidden sm:flex items-center gap-1">
          <span class="text-dark-500">Updates:</span>
          <span class="text-dark-400 mono">{{ store.stats?.messages_per_second || 0 }}/s</span>
        </div>
      </div>
      
      <!-- Middle Stats -->
      <div class="flex items-center gap-4 text-dark-500">
        <span class="hidden lg:inline">
          Candles: <span class="text-dark-400 mono">{{ store.klineHistory?.length || 0 }}</span>
        </span>
        <span class="hidden lg:inline">
          Trades: <span class="text-dark-400 mono">{{ store.stats?.trades_received || 0 }}</span>
        </span>
        <span class="hidden md:inline">
          Uptime: <span class="text-dark-400 mono">{{ uptime }}</span>
        </span>
      </div>
      
      <!-- ML API Status -->
      <div class="flex items-center gap-3">
        <div v-if="store.stats?.last_ml_update" class="hidden sm:flex items-center gap-1">
          <span class="text-dark-500">ML:</span>
          <span class="text-dark-400 mono">{{ formatTime(store.stats.last_ml_update) }}</span>
        </div>
        
        <div class="flex items-center gap-1.5">
          <span 
            class="w-1.5 h-1.5 rounded-full"
            :class="{
              'bg-brand-500': store.mlApiStatus === 'connected',
              'bg-red-500': store.mlApiStatus === 'error',
              'bg-dark-600': store.mlApiStatus === 'not_configured' || store.mlApiStatus === 'unknown'
            }"
          ></span>
          <span class="text-dark-500 hidden sm:inline">
            ML {{ store.mlApiStatus === 'connected' ? 'OK' : 
                  store.mlApiStatus === 'error' ? 'Error' : 
                  store.mlApiStatus === 'not_configured' ? 'N/A' : '...' }}
          </span>
        </div>
      </div>
    </div>
  </footer>
</template>
