<script setup>
import { computed } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatQuantity, formatTimeMs, getBuyPressureIndicator } from '../utils/format'

const props = defineProps({
  compact: { type: Boolean, default: false }
})

const store = useMarketStore()

const displayCount = computed(() => props.compact ? 12 : store.tradesCount)

const recentTrades = computed(() => {
  const t = store.trades || []
  return t.slice(-displayCount.value).reverse()
})

// Calculate buy/sell ratio from recent trades
const buySellRatio = computed(() => {
  if (recentTrades.value.length === 0) return 50
  
  const buyCount = recentTrades.value.filter(t => t.side === 'buy').length
  return (buyCount / recentTrades.value.length) * 100
})

const pressureIndicator = computed(() => {
  return getBuyPressureIndicator(buySellRatio.value)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="card-header flex-shrink-0" :class="{ 'py-2 px-3': compact }">
      <h3 class="card-title" :class="{ 'text-xs': compact }">âš¡ Recent Trades</h3>
      <span class="text-xs text-dark-500">
        {{ store.stats?.trades_received || 0 }} total
      </span>
    </div>
    
    <!-- Column Headers -->
    <div 
      class="px-3 py-1.5 grid gap-2 text-xs text-dark-500 border-b border-dark-700/50 flex-shrink-0"
      :class="compact ? 'grid-cols-2' : 'grid-cols-3'"
    >
      <span>Price</span>
      <span class="text-right">Qty</span>
      <span v-if="!compact" class="text-right">Time</span>
    </div>
    
    <!-- Trades List -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div 
        v-for="trade in recentTrades" 
        :key="trade.id"
        class="px-3 py-0.5 grid gap-2 text-xs mono transition-colors"
        :class="[
          compact ? 'grid-cols-2' : 'grid-cols-3',
          trade.side === 'buy' ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5'
        ]"
      >
        <span :class="trade.side === 'buy' ? 'text-green-400' : 'text-red-400'" class="truncate">
          {{ formatPrice(trade.price) }}
        </span>
        <span class="text-right text-dark-300 truncate">{{ formatQuantity(trade.quantity) }}</span>
        <span v-if="!compact" class="text-right text-dark-500 truncate">
          {{ formatTimeMs(trade.time) }}
        </span>
      </div>
      
      <!-- Empty State -->
      <div v-if="recentTrades.length === 0" class="p-4 text-center text-dark-500 text-sm">
        Waiting for trades...
      </div>
    </div>
  </div>
</template>
