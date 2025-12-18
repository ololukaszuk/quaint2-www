<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatQuantity, formatTimeMs, getBuyPressureIndicator } from '../utils/format'

const props = defineProps({
  compact: { type: Boolean, default: false }
})

const store = useMarketStore()
const showFilters = ref(false)
const localMinQty = ref(store.tradeMinQtyBTC)

const displayCount = computed(() => props.compact ? 12 : store.tradesCount)

// Use filtered trades from store
const recentTrades = computed(() => {
  const filtered = store.filteredTrades || []
  return filtered.slice(-displayCount.value).reverse()
})

// Max quantity for visual bars
const maxQty = computed(() => {
  if (recentTrades.value.length === 0) return 1
  return Math.max(...recentTrades.value.map(t => t.quantity))
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

// Display value based on unit toggle
const getDisplayQty = (trade) => {
  if (store.displayUnitTrades === 'USD') {
    return trade.quote_volume
  }
  return trade.quantity
}

const getDisplayQtyFormatted = (trade) => {
  if (store.displayUnitTrades === 'USD') {
    return '$' + formatPrice(trade.quote_volume)
  }
  return formatQuantity(trade.quantity)
}

// Bar width calculation
const getBarWidth = (trade) => {
  return (trade.quantity / maxQty.value) * 100
}

// Apply filter
const applyFilter = () => {
  store.setTradeMinQty(localMinQty.value)
  showFilters.value = false
}

// Clear filter
const clearFilter = () => {
  localMinQty.value = 0
  store.setTradeMinQty(0)
}

// Quick filter presets
const applyQuickFilter = (btc) => {
  localMinQty.value = btc
  store.setTradeMinQty(btc)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="card-header flex-shrink-0" :class="{ 'py-2 px-3': compact }">
      <div class="flex items-center gap-2">
        <h3 class="card-title" :class="{ 'text-xs': compact }">⚡ Recent Trades</h3>
        <!-- Unit toggle -->
        <button 
          @click="store.toggleTradesUnit"
          class="text-xs px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
          :title="`Show in ${store.displayUnitTrades === 'BTC' ? 'USD' : 'BTC'}`"
        >
          {{ store.displayUnitTrades }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Filter indicator -->
        <span 
          v-if="store.tradeMinQtyBTC > 0"
          class="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400"
        >
          ≥{{ store.tradeMinQtyBTC }} BTC
        </span>
        <span 
          :class="[
            'badge',
            pressureIndicator.class === 'price-up' ? 'badge-green' : 
            pressureIndicator.class === 'price-down' ? 'badge-red' : 'badge-gray',
            compact ? 'text-xs py-0' : ''
          ]"
        >
          {{ pressureIndicator.emoji }} {{ buySellRatio.toFixed(0) }}%
        </span>
        <!-- Filter toggle -->
        <button 
          @click="showFilters = !showFilters"
          class="p-1 rounded hover:bg-dark-800 transition-colors"
          :class="{ 'text-brand-400': showFilters || store.tradeMinQtyBTC > 0 }"
          title="Filter trades"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Filter Panel -->
    <div 
      v-if="showFilters"
      class="px-3 py-2 bg-dark-800/50 border-b border-dark-700/50 flex-shrink-0"
    >
      <div class="text-xs text-dark-500 mb-2">Min Quantity (BTC)</div>
      <div class="flex items-center gap-2 mb-2">
        <input 
          v-model.number="localMinQty"
          type="number"
          step="0.01"
          min="0"
          class="input text-xs py-1 px-2 w-24"
          placeholder="0.00"
        />
        <button 
          @click="applyFilter"
          class="px-2 py-1 text-xs bg-brand-600 text-white rounded hover:bg-brand-500 transition-colors"
        >
          Apply
        </button>
        <button 
          v-if="store.tradeMinQtyBTC > 0"
          @click="clearFilter"
          class="px-2 py-1 text-xs bg-dark-700 text-dark-300 rounded hover:bg-dark-600 transition-colors"
        >
          Clear
        </button>
      </div>
      <!-- Quick presets -->
      <div class="flex items-center gap-1">
        <span class="text-xs text-dark-500">Quick:</span>
        <button 
          v-for="preset in [0.1, 0.5, 1, 5, 10]"
          :key="preset"
          @click="applyQuickFilter(preset)"
          class="px-1.5 py-0.5 text-xs rounded transition-colors"
          :class="store.tradeMinQtyBTC === preset 
            ? 'bg-brand-600 text-white' 
            : 'bg-dark-700 text-dark-400 hover:bg-dark-600'"
        >
          {{ preset }}
        </button>
      </div>
    </div>
    
    <!-- Column Headers -->
    <div 
      class="px-3 py-1.5 grid gap-2 text-xs text-dark-500 border-b border-dark-700/50 flex-shrink-0"
      :class="compact ? 'grid-cols-2' : 'grid-cols-3'"
    >
      <span>Price</span>
      <span class="text-right">Qty ({{ store.displayUnitTrades }})</span>
      <span v-if="!compact" class="text-right">Time</span>
    </div>
    
    <!-- Trades List -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div 
        v-for="trade in recentTrades" 
        :key="trade.id"
        class="relative px-3 py-0.5 grid gap-2 text-xs mono transition-colors"
        :class="[
          compact ? 'grid-cols-2' : 'grid-cols-3',
          trade.side === 'buy' ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5'
        ]"
      >
        <!-- Background bar (visual indicator of trade size) -->
        <div 
          class="absolute inset-y-0 right-0 opacity-30"
          :class="trade.side === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'"
          :style="{ width: getBarWidth(trade) + '%' }"
        ></div>
        
        <!-- Content -->
        <span :class="trade.side === 'buy' ? 'text-green-400' : 'text-red-400'" class="relative truncate">
          {{ formatPrice(trade.price) }}
        </span>
        <span class="relative text-right text-dark-300 truncate">
          {{ getDisplayQtyFormatted(trade) }}
        </span>
        <span v-if="!compact" class="relative text-right text-dark-500 truncate">
          {{ formatTimeMs(trade.time) }}
        </span>
      </div>
      
      <!-- Empty State -->
      <div v-if="recentTrades.length === 0" class="p-4 text-center text-dark-500 text-sm">
        <template v-if="store.tradeMinQtyBTC > 0">
          No trades ≥ {{ store.tradeMinQtyBTC }} BTC
          <button @click="clearFilter" class="block mx-auto mt-2 text-xs text-brand-400 hover:text-brand-300">
            Clear filter
          </button>
        </template>
        <template v-else>
          Waiting for trades...
        </template>
      </div>
    </div>
  </div>
</template>
