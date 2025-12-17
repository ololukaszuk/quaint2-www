<script setup>
import { ref, computed } from 'vue'
import { useMarketStore } from '../store/market'

const store = useMarketStore()

const symbolInput = ref('')
const showSymbolDropdown = ref(false)

const popularSymbols = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'SOLUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT'
]

const connectionStatus = computed(() => {
  if (store.isConnecting) return { text: 'Connecting...', class: 'bg-yellow-500', pulse: true }
  if (store.isConnected) return { text: 'Connected', class: 'bg-green-500', pulse: false }
  return { text: 'Disconnected', class: 'bg-red-500', pulse: false }
})

function handleSymbolChange() {
  if (symbolInput.value.trim()) {
    store.changeSymbol(symbolInput.value.trim())
    symbolInput.value = ''
  }
  showSymbolDropdown.value = false
}

function selectSymbol(sym) {
  store.changeSymbol(sym)
  showSymbolDropdown.value = false
}
</script>

<template>
  <header class="bg-dark-900 border-b border-dark-700/50 px-4 lg:px-6 py-3">
    <div class="flex items-center justify-between gap-4">
      <!-- Logo & Symbol -->
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 17l6-6 4 4 8-8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="21" cy="7" r="2" fill="currentColor"/>
            </svg>
          </div>
          <span class="hidden sm:block font-semibold text-lg">Binance<span class="text-brand-500">RT</span></span>
        </div>
        
        <!-- Symbol Selector -->
        <div class="relative">
          <button 
            @click="showSymbolDropdown = !showSymbolDropdown"
            class="flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <span class="font-semibold text-brand-400">{{ store.symbol }}</span>
            <svg class="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          <!-- Dropdown -->
          <div 
            v-if="showSymbolDropdown"
            class="absolute top-full left-0 mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 animate-in"
          >
            <div class="p-2 border-b border-dark-700">
              <input 
                v-model="symbolInput"
                @keydown.enter="handleSymbolChange"
                type="text" 
                placeholder="Enter symbol..."
                class="input text-sm"
              />
            </div>
            <div class="py-1 max-h-60 overflow-y-auto">
              <button
                v-for="sym in popularSymbols"
                :key="sym"
                @click="selectSymbol(sym)"
                class="w-full px-3 py-2 text-left text-sm hover:bg-dark-700 transition-colors"
                :class="{ 'text-brand-400': sym === store.symbol }"
              >
                {{ sym }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Side: Interval & Status -->
      <div class="flex items-center gap-3">
        <!-- Interval Selector -->
        <div class="hidden sm:flex items-center gap-1 bg-dark-800 rounded-lg p-1">
          <button
            v-for="int in ['1m', '5m', '15m', '1h', '4h', '1d']"
            :key="int"
            @click="store.changeInterval(int)"
            class="px-2 py-1 text-xs font-medium rounded transition-colors"
            :class="store.interval === int ? 'bg-brand-600 text-white' : 'text-dark-400 hover:text-dark-200'"
          >
            {{ int }}
          </button>
        </div>
        
        <!-- Mobile Interval -->
        <select 
          :value="store.interval"
          @change="store.changeInterval($event.target.value)"
          class="sm:hidden select text-sm"
        >
          <option v-for="int in ['1m', '5m', '15m', '1h', '4h', '1d']" :key="int" :value="int">
            {{ int }}
          </option>
        </select>
        
        <!-- Connection Status -->
        <div class="flex items-center gap-2">
          <div 
            class="w-2 h-2 rounded-full"
            :class="[connectionStatus.class, connectionStatus.pulse ? 'animate-pulse' : '']"
          ></div>
          <span class="hidden sm:block text-xs text-dark-400">{{ connectionStatus.text }}</span>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Click outside to close dropdown -->
  <div 
    v-if="showSymbolDropdown" 
    @click="showSymbolDropdown = false"
    class="fixed inset-0 z-40"
  ></div>
</template>
