<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatQuantity, formatTimeMs } from '../utils/format'

const store = useMarketStore()

const trades = computed(() => {
  const data = store.trades || []
  return [...data].reverse().slice(0, store.tradesCount)
})

const totalBuyVolume = computed(() => {
  return store.trades
    .filter(t => t.side === 'buy')
    .reduce((sum, t) => sum + t.quote_volume, 0)
})

const totalSellVolume = computed(() => {
  return store.trades
    .filter(t => t.side === 'sell')
    .reduce((sum, t) => sum + t.quote_volume, 0)
})

const buyPercentage = computed(() => {
  const total = totalBuyVolume.value + totalSellVolume.value
  if (total === 0) return 50
  return (totalBuyVolume.value / total) * 100
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="card-header">
      <h3 class="card-title">💱 Live Trades</h3>
      <span class="text-xs text-dark-400">{{ trades.length }} trades</span>
    </div>
    
    <!-- Buy/Sell Ratio Bar -->
    <div class="px-3 py-2 border-b border-dark-700/50">
      <div class="flex items-center gap-2 text-xs mb-1">
        <span class="text-green-400">Buy {{ buyPercentage.toFixed(1) }}%</span>
        <span class="flex-1"></span>
        <span class="text-red-400">Sell {{ (100 - buyPercentage).toFixed(1) }}%</span>
      </div>
      <div class="h-1.5 bg-dark-700 rounded-full overflow-hidden flex">
        <div 
          class="bg-green-500 transition-all duration-300"
          :style="{ width: buyPercentage + '%' }"
        ></div>
        <div 
          class="bg-red-500 transition-all duration-300"
          :style="{ width: (100 - buyPercentage) + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- Column Headers -->
    <div class="px-3 py-2 grid grid-cols-4 gap-2 text-xs text-dark-400 border-b border-dark-700/50">
      <span>Side</span>
      <span class="text-right">Price</span>
      <span class="text-right">Qty</span>
      <span class="text-right">Time</span>
    </div>
    
    <!-- Trades List -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <div 
        v-for="trade in trades" 
        :key="trade.id"
        class="px-3 py-1.5 grid grid-cols-4 gap-2 text-xs mono hover:bg-dark-800/50 transition-colors border-b border-dark-800/30"
      >
        <span :class="trade.side === 'buy' ? 'text-green-400' : 'text-red-400'">
          {{ trade.side === 'buy' ? '🟢' : '🔴' }}
        </span>
        <span :class="['text-right', trade.side === 'buy' ? 'text-green-400' : 'text-red-400']">
          {{ formatPrice(trade.price) }}
        </span>
        <span class="text-right text-dark-300">{{ formatQuantity(trade.quantity) }}</span>
        <span class="text-right text-dark-500">{{ formatTimeMs(trade.time) }}</span>
      </div>
      
      <!-- Empty State -->
      <div v-if="trades.length === 0" class="p-4 text-center text-dark-500 text-sm">
        Waiting for trades...
      </div>
    </div>
  </div>
</template>
