<script setup>
import { ref } from 'vue'
import { useMarketStore } from '../store/market'

const store = useMarketStore()
const isExpanded = ref(false)

const depthOptions = [5, 10, 15, 20]
const tradesOptions = [5, 10, 15, 20, 30]
</script>

<template>
  <div class="card">
    <!-- Clickable Header -->
    <button 
      @click="isExpanded = !isExpanded"
      class="card-header w-full cursor-pointer hover:bg-dark-800/50 transition-colors"
    >
      <h3 class="card-title">⚙️ Display Settings</h3>
      <div class="flex items-center gap-2">
        <!-- Connection indicator -->
        <span class="w-2 h-2 rounded-full" :class="store.isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
        <!-- Chevron -->
        <svg 
          class="w-4 h-4 text-dark-400 transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </button>
    
    <!-- Collapsible Content -->
    <div 
      class="overflow-hidden transition-all duration-200"
      :class="isExpanded ? 'max-h-96' : 'max-h-0'"
    >
      <div class="card-body space-y-4">
        <!-- Display Toggles -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm cursor-pointer group">
            <input 
              type="checkbox" 
              v-model="store.showOrderBook"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
            />
            <span class="text-dark-300 group-hover:text-dark-200">Show Order Book</span>
          </label>
          
          <label class="flex items-center gap-2 text-sm cursor-pointer group">
            <input 
              type="checkbox" 
              v-model="store.showTrades"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
            />
            <span class="text-dark-300 group-hover:text-dark-200">Show Trades</span>
          </label>
        </div>
        
        <div class="divider"></div>
        
        <!-- Settings -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Order Book Depth -->
          <div>
            <label class="block text-xs text-dark-400 mb-1">Book Depth</label>
            <select v-model.number="store.orderbookDepth" class="select text-sm w-full">
              <option v-for="opt in depthOptions" :key="opt" :value="opt">{{ opt }} levels</option>
            </select>
          </div>
          
          <!-- Trades Count -->
          <div>
            <label class="block text-xs text-dark-400 mb-1">Trades</label>
            <select v-model.number="store.tradesCount" class="select text-sm w-full">
              <option v-for="opt in tradesOptions" :key="opt" :value="opt">{{ opt }} trades</option>
            </select>
          </div>
        </div>
        
        <!-- Connection Info -->
        <div class="pt-2 border-t border-dark-700/50">
          <div class="text-xs text-dark-500">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="store.isConnected ? 'bg-green-500' : 'bg-red-500'"></span>
              <span>{{ store.isConnected ? 'Connected to Binance' : 'Disconnected' }}</span>
            </div>
            <div v-if="store.stats?.messages_per_second" class="mt-1 text-dark-400">
              {{ store.stats.messages_per_second }} updates/sec
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
