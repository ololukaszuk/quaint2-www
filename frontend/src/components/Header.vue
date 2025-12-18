<script setup>
import { computed } from 'vue'
import { useMarketStore } from '../store/market'

const store = useMarketStore()

const emit = defineEmits(['toggle-sidebar'])

const connectionStatus = computed(() => {
  if (store.isConnecting) return { text: 'Connecting...', class: 'bg-yellow-500', pulse: true }
  if (store.isConnected) return { text: 'Live', class: 'bg-green-500', pulse: false }
  return { text: 'Disconnected', class: 'bg-red-500', pulse: false }
})

const mlStatus = computed(() => {
  switch (store.mlApiStatus) {
    case 'connected': return { text: 'ML API', class: 'bg-brand-500', icon: '🤖' }
    case 'error': return { text: 'ML Error', class: 'bg-red-500', icon: '⚠️' }
    case 'not_configured': return { text: 'ML N/A', class: 'bg-dark-600', icon: '⚙️' }
    default: return { text: 'ML...', class: 'bg-dark-600', icon: '⏳' }
  }
})
</script>

<template>
  <header class="bg-dark-900 border-b border-dark-700/50 px-3 lg:px-6 py-2 lg:py-3">
    <div class="flex items-center justify-between gap-3">
      <!-- Logo & Symbol -->
      <div class="flex items-center gap-3">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 17l6-6 4 4 8-8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="21" cy="7" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div class="hidden sm:block">
            <span class="font-bold text-lg">QuAInt<span class="text-brand-400">²</span></span>
            <span class="hidden md:inline text-xs text-dark-500 ml-2">BTCUSDT</span>
          </div>
        </div>
        
        <!-- Current Price (Mobile) -->
        <div class="sm:hidden flex items-center gap-1">
          <span class="font-mono font-bold text-sm" :class="store.isPriceUp ? 'text-green-400' : 'text-red-400'">
            ${{ store.lastPrice?.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
          </span>
          <span 
            class="text-xs"
            :class="store.isPriceUp ? 'text-green-400' : 'text-red-400'"
          >
            {{ store.isPriceUp ? '↑' : '↓' }}{{ Math.abs(store.priceChangePercent).toFixed(2) }}%
          </span>
        </div>
      </div>
      
      <!-- Right Side: Interval & Status -->
      <div class="flex items-center gap-2 lg:gap-3">
        <!-- Interval Selector (Desktop) -->
        <div class="hidden md:flex items-center gap-1 bg-dark-800 rounded-lg p-1">
          <button
            v-for="int in ['1m', '5m', '15m', '1h', '4h']"
            :key="int"
            @click="store.changeInterval(int)"
            class="px-2 py-1 text-xs font-medium rounded transition-colors"
            :class="store.interval === int 
              ? 'bg-brand-600 text-white' 
              : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'"
          >
            {{ int }}
          </button>
        </div>
        
        <!-- Mobile Interval -->
        <select 
          :value="store.interval"
          @change="store.changeInterval($event.target.value)"
          class="md:hidden select text-xs py-1 px-2"
        >
          <option v-for="int in ['1m', '5m', '15m', '30m', '1h', '4h', '1d']" :key="int" :value="int">
            {{ int }}
          </option>
        </select>
        
        <!-- ML API Status -->
        <div 
          class="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md"
          :class="mlStatus.class === 'bg-brand-500' ? 'bg-brand-500/20' : 'bg-dark-800'"
        >
          <span class="text-xs">{{ mlStatus.icon }}</span>
          <span class="text-xs text-dark-300">{{ mlStatus.text }}</span>
        </div>
        
        <!-- Connection Status -->
        <div class="flex items-center gap-1.5">
          <div 
            class="w-2 h-2 rounded-full"
            :class="[connectionStatus.class, connectionStatus.pulse ? 'animate-pulse' : '']"
          ></div>
          <span class="hidden sm:block text-xs text-dark-400">{{ connectionStatus.text }}</span>
        </div>
        
        <!-- Refresh Button -->
        <button
          @click="store.refreshMLData"
          class="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
          title="Refresh ML Data"
        >
          <svg class="w-4 h-4 text-dark-400 hover:text-dark-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
