<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatQuantity, getImbalanceIndicator } from '../utils/format'

const props = defineProps({
  compact: { type: Boolean, default: false }
})

const store = useMarketStore()
const asksContainer = ref(null)
const bidsContainer = ref(null)
const showFilters = ref(false)
const localMinQty = ref(store.orderbookMinQtyBTC)

const displayDepth = computed(() => props.compact ? 8 : store.orderbookDepth)

// FIXED #3 & #4: Proper ordering
// Bids: highest price first (top) -> lowest price last (bottom) - natural order from store
// Asks: lowest price last (bottom) -> highest price first (top) - reversed for display
const bids = computed(() => {
  const data = store.filteredOrderbook?.bids || []
  // Bids come in descending order (highest first), keep as-is
  return data.slice(0, displayDepth.value)
})

const asks = computed(() => {
  const data = store.filteredOrderbook?.asks || []
  // Asks come in ascending order (lowest first), reverse so lowest is at bottom
  return data.slice(0, displayDepth.value).reverse()
})

// Calculate max volume for bar width - only from visible items
const maxVolume = computed(() => {
  const allLevels = [...bids.value, ...asks.value]
  if (allLevels.length === 0) return 1
  return Math.max(...allLevels.map(l => l.quantity))
})

const imbalanceInfo = computed(() => {
  return getImbalanceIndicator(store.orderbookImbalance)
})

function getBarWidth(quantity) {
  return (quantity / maxVolume.value) * 100
}

// Display value based on unit toggle
const getDisplayQtyFormatted = (level) => {
  if (store.displayUnitOrderBook === 'USD') {
    return '$' + formatPrice(level.price * level.quantity)
  }
  return formatQuantity(level.quantity)
}

// FIXED #2: Calculate cumulative total from spread outwards
// For asks: sum from bottom (lowest price/closest to spread) UP to current row
// For bids: sum from top (highest price/closest to spread) DOWN to current row
const getCumulativeTotal = (levels, index, isAsks = false) => {
  let cumulative = 0
  
  if (isAsks) {
    // Asks array is reversed: [highest_price, ..., lowest_price]
    // Visual display (with justify-end): highest at top, lowest at bottom
    // We want cumulative from bottom (lowest=end of array) up to current
    cumulative = levels.slice(index).reduce((sum, level) => {
      if (store.displayUnitOrderBook === 'USD') {
        return sum + (level.price * level.quantity)
      }
      return sum + level.quantity
    }, 0)
  } else {
    // Bids are in natural order, index 0 is highest price (top, closest to spread)
    // Sum from start (highest bid) down to current position
    cumulative = levels.slice(0, index + 1).reduce((sum, level) => {
      if (store.displayUnitOrderBook === 'USD') {
        return sum + (level.price * level.quantity)
      }
      return sum + level.quantity
    }, 0)
  }
  
  if (store.displayUnitOrderBook === 'USD') {
    return '$' + formatPrice(cumulative)
  }
  return formatQuantity(cumulative)
}

// FIXED #1: Scroll functions
function scrollAsksToBottom() {
  if (asksContainer.value) {
    asksContainer.value.scrollTop = asksContainer.value.scrollHeight
  }
}

function scrollBidsToTop() {
  if (bidsContainer.value) {
    bidsContainer.value.scrollTop = 0
  }
}

let currentSymbol = ''
let currentFilterValue = store.orderbookMinQtyBTC

// FIXED #1: Only auto-scroll when symbol or filter changes
watch(
  () => [store.symbol, store.orderbookMinQtyBTC],
  async ([sym, filterVal]) => {
    const symbolChanged = sym !== currentSymbol
    const filterChanged = filterVal !== currentFilterValue
    
    if (symbolChanged) {
      currentSymbol = sym
    }
    
    if (filterChanged) {
      currentFilterValue = filterVal
    }
    
    // Only scroll on symbol or filter change
    if (symbolChanged || filterChanged) {
      await nextTick()
      scrollAsksToBottom()
      scrollBidsToTop()
      // Extra scroll after delay to ensure it sticks
      setTimeout(() => {
        scrollAsksToBottom()
        scrollBidsToTop()
      }, 100)
    }
  },
  { immediate: true }
)

onMounted(() => {
  setTimeout(() => {
    scrollAsksToBottom()
    scrollBidsToTop()
  }, 100)
})

// Apply filter
const applyFilter = () => {
  store.setOrderbookMinQty(localMinQty.value)
  showFilters.value = false
}

// Clear filter
const clearFilter = () => {
  localMinQty.value = 0
  store.setOrderbookMinQty(0)
}

// Quick filter presets
const applyQuickFilter = (btc) => {
  localMinQty.value = btc
  store.setOrderbookMinQty(btc)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="card-header flex-shrink-0" :class="{ 'py-2 px-3': compact }">
      <div class="flex items-center gap-2">
        <h3 class="card-title" :class="{ 'text-xs': compact }">📈 Order Book</h3>
        <!-- Unit toggle -->
        <button 
          @click="store.toggleOrderBookUnit"
          class="text-xs px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
          :title="`Show in ${store.displayUnitOrderBook === 'BTC' ? 'USD' : 'BTC'}`"
        >
          {{ store.displayUnitOrderBook }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Filter indicator -->
        <span 
          v-if="store.orderbookMinQtyBTC > 0"
          class="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400"
        >
          ≥{{ store.orderbookMinQtyBTC }} BTC
        </span>
        <span 
          :class="[
            'badge', 
            imbalanceInfo.class === 'price-up' ? 'badge-green' : 
            imbalanceInfo.class === 'price-down' ? 'badge-red' : 'badge-gray',
            compact ? 'text-xs py-0' : ''
          ]"
        >
          {{ imbalanceInfo.emoji }} {{ store.orderbookImbalance.toFixed(1) }}%
        </span>
        <!-- Filter toggle -->
        <button 
          @click="showFilters = !showFilters"
          class="p-1 rounded hover:bg-dark-800 transition-colors"
          :class="{ 'text-brand-400': showFilters || store.orderbookMinQtyBTC > 0 }"
          title="Filter orderbook"
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
          v-if="store.orderbookMinQtyBTC > 0"
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
          v-for="preset in [0.5, 1, 2, 5, 10]"
          :key="preset"
          @click="applyQuickFilter(preset)"
          class="px-1.5 py-0.5 text-xs rounded transition-colors"
          :class="store.orderbookMinQtyBTC === preset 
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
      <span class="text-left">Price</span>
      <span class="text-right">Qty ({{ store.displayUnitOrderBook }})</span>
      <!-- FIXED #2: Total column header shows correct unit -->
      <span v-if="!compact" class="text-right">Total ({{ store.displayUnitOrderBook }})</span>
    </div>
    
    <!-- Two-panel layout -->
    <div class="flex-1 grid grid-rows-[1fr_auto_1fr] min-h-0 overflow-hidden">
      <!-- Asks Container (top half) - FIXED #1 & #3: Always scrollable, defaults to bottom -->
      <div 
        ref="asksContainer" 
        class="overflow-y-auto overflow-x-hidden border-b border-dark-700/30 min-h-0"
      >
        <div class="min-h-full flex flex-col justify-end">
          <div 
            v-for="(ask, index) in asks" 
            :key="'ask-' + ask.price"
            class="relative px-3 py-0.5 grid gap-2 text-xs mono hover:bg-dark-800/50 transition-colors"
            :class="compact ? 'grid-cols-2' : 'grid-cols-3'"
          >
            <!-- Background bar (from right) -->
            <div 
              class="absolute inset-y-0 right-0 bg-red-500/10"
              :style="{ width: getBarWidth(ask.quantity) + '%' }"
            ></div>
            
            <!-- Content -->
            <span class="relative text-red-400 truncate">{{ formatPrice(ask.price) }}</span>
            <span class="relative text-right text-dark-300 truncate">{{ getDisplayQtyFormatted(ask) }}</span>
            <!-- FIXED #2: Total accumulates from spread (bottom) upward -->
            <span v-if="!compact" class="relative text-right text-dark-400 truncate">
              {{ getCumulativeTotal(asks, index, true) }}
            </span>
          </div>
          
          <!-- Empty asks -->
          <div v-if="asks.length === 0" class="p-2 text-center text-dark-600 text-xs">
            <template v-if="store.orderbookMinQtyBTC > 0">No asks ≥ {{ store.orderbookMinQtyBTC }} BTC</template>
            <template v-else>Loading...</template>
          </div>
        </div>
      </div>
      
      <!-- Spread (fixed center divider) -->
      <div class="px-2 py-1 flex items-center justify-center gap-2 text-xs bg-dark-800/50 border-y border-dark-600/50">
        <span class="text-dark-100 mono font-medium">{{ formatPrice(store.ticker?.spread) }}</span>
        <span class="text-dark-500">({{ (store.spreadPercent * 100).toFixed(3) }}%)</span>
      </div>
      
      <!-- Bids Container (bottom half) - FIXED #4: Highest prices at top -->
      <div 
        ref="bidsContainer" 
        class="overflow-y-auto overflow-x-hidden min-h-0"
      >
        <div 
          v-for="(bid, index) in bids" 
          :key="'bid-' + bid.price"
          class="relative px-3 py-0.5 grid gap-2 text-xs mono hover:bg-dark-800/50 transition-colors"
          :class="compact ? 'grid-cols-2' : 'grid-cols-3'"
        >
          <!-- Background bar (from right) -->
          <div 
            class="absolute inset-y-0 right-0 bg-green-500/10"
            :style="{ width: getBarWidth(bid.quantity) + '%' }"
          ></div>
          
          <!-- Content -->
          <span class="relative text-green-400 truncate">{{ formatPrice(bid.price) }}</span>
          <span class="relative text-right text-dark-300 truncate">{{ getDisplayQtyFormatted(bid) }}</span>
          <!-- FIXED #2: Total accumulates from spread (top) downward -->
          <span v-if="!compact" class="relative text-right text-dark-400 truncate">
            {{ getCumulativeTotal(bids, index) }}
          </span>
        </div>
        
        <!-- Empty bids -->
        <div v-if="bids.length === 0" class="p-2 text-center text-dark-600 text-xs">
          <template v-if="store.orderbookMinQtyBTC > 0">No bids ≥ {{ store.orderbookMinQtyBTC }} BTC</template>
          <template v-else>Loading...</template>
        </div>
      </div>
    </div>
  </div>
</template>