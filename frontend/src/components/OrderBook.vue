<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatQuantity, getImbalanceIndicator } from '../utils/format'

const store = useMarketStore()
const asksContainer = ref(null)
const bidsContainer = ref(null)

const bids = computed(() => {
  const data = store.orderbook?.bids || []
  return data.slice(0, store.orderbookDepth)
})

const asks = computed(() => {
  const data = store.orderbook?.asks || []
  // Sort asks: highest price at top, lowest at bottom
  return data.slice(0, store.orderbookDepth).sort((a, b) => b.price - a.price)
})

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

// Scroll asks to bottom (lowest ask visible) when data loads
function scrollAsksToBottom() {
  if (asksContainer.value) {
    asksContainer.value.scrollTop = asksContainer.value.scrollHeight
  }
}

// Scroll bids to top (highest bid visible) - this is default behavior
function scrollBidsToTop() {
  if (bidsContainer.value) {
    bidsContainer.value.scrollTop = 0
  }
}

// Track symbol changes to re-scroll
let currentSymbol = ''

watch(
  () => [asks.value.length, bids.value.length, store.symbol],
  async ([askLen, bidLen, sym]) => {
    const symbolChanged = sym !== currentSymbol
    if (symbolChanged) {
      currentSymbol = sym
    }
    
    // Scroll when we have data and symbol changed (or initial load)
    if (askLen > 0 && bidLen > 0 && symbolChanged) {
      await nextTick()
      setTimeout(() => {
        scrollAsksToBottom()
        scrollBidsToTop()
      }, 50)
    }
  },
  { immediate: true }
)

// Initial scroll on mount
onMounted(() => {
  setTimeout(() => {
    scrollAsksToBottom()
    scrollBidsToTop()
  }, 100)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="card-header flex-shrink-0">
      <h3 class="card-title">📈 Order Book</h3>
      <div class="flex items-center gap-2">
        <span :class="['badge', imbalanceInfo.class === 'price-up' ? 'badge-green' : imbalanceInfo.class === 'price-down' ? 'badge-red' : 'badge-gray']">
          {{ imbalanceInfo.emoji }} {{ store.orderbookImbalance.toFixed(1) }}%
        </span>
      </div>
    </div>
    
    <!-- Column Headers -->
    <div class="px-3 py-2 grid grid-cols-3 gap-2 text-xs text-dark-400 border-b border-dark-700/50 flex-shrink-0">
      <span class="text-left">Price</span>
      <span class="text-right">Qty</span>
      <span class="text-right">Total</span>
    </div>
    
    <!-- Two-panel layout using CSS Grid for guaranteed 50/50 split -->
    <div class="flex-1 grid grid-rows-[1fr_auto_1fr] min-h-0 overflow-hidden">
      <!-- Asks Container (top half) - scrolled to bottom -->
      <div 
        ref="asksContainer" 
        class="overflow-y-auto overflow-x-hidden border-b border-dark-700/30 min-h-0"
      >
        <div 
          v-for="(ask, i) in asks" 
          :key="'ask-' + i"
          class="relative px-3 py-1 grid grid-cols-3 gap-2 text-xs mono hover:bg-dark-800/50 transition-colors"
        >
          <!-- Background bar (from right) -->
          <div 
            class="absolute inset-y-0 right-0 bg-red-500/10"
            :style="{ width: getBarWidth(ask.quantity) + '%' }"
          ></div>
          
          <!-- Content -->
          <span class="relative text-red-400">{{ formatPrice(ask.price) }}</span>
          <span class="relative text-right text-dark-300">{{ formatQuantity(ask.quantity) }}</span>
          <span class="relative text-right text-dark-400">{{ formatQuantity(ask.price * ask.quantity) }}</span>
        </div>
      </div>
      
      <!-- Spread (fixed center divider) -->
      <div class="px-2 py-1 flex items-center justify-center gap-2 text-xs bg-dark-800/50 border-y border-dark-600/50">
        <span class="text-dark-100 mono font-medium">{{ formatPrice(store.ticker?.spread) }}</span>
        <span class="text-dark-500">({{ (store.spreadPercent * 100).toFixed(3) }}%)</span>
      </div>
      
      <!-- Bids Container (bottom half) - scrolled to top -->
      <div 
        ref="bidsContainer" 
        class="overflow-y-auto overflow-x-hidden min-h-0"
      >
        <div 
          v-for="(bid, i) in bids" 
          :key="'bid-' + i"
          class="relative px-3 py-1 grid grid-cols-3 gap-2 text-xs mono hover:bg-dark-800/50 transition-colors"
        >
          <!-- Background bar (from right) -->
          <div 
            class="absolute inset-y-0 right-0 bg-green-500/10"
            :style="{ width: getBarWidth(bid.quantity) + '%' }"
          ></div>
          
          <!-- Content -->
          <span class="relative text-green-400">{{ formatPrice(bid.price) }}</span>
          <span class="relative text-right text-dark-300">{{ formatQuantity(bid.quantity) }}</span>
          <span class="relative text-right text-dark-400">{{ formatQuantity(bid.price * bid.quantity) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
