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

const displayDepth = computed(() => props.compact ? 8 : store.orderbookDepth)

const bids = computed(() => {
  const data = store.orderbook?.bids || []
  return data.slice(0, displayDepth.value)
})

const asks = computed(() => {
  const data = store.orderbook?.asks || []
  return data.slice(0, displayDepth.value).sort((a, b) => b.price - a.price)
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

watch(
  () => [asks.value.length, bids.value.length, store.symbol],
  async ([askLen, bidLen, sym]) => {
    const symbolChanged = sym !== currentSymbol
    if (symbolChanged) {
      currentSymbol = sym
    }
    
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
    <div class="card-header flex-shrink-0" :class="{ 'py-2 px-3': compact }">
      <h3 class="card-title" :class="{ 'text-xs': compact }">📈 Order Book</h3>
      <div class="flex items-center gap-2">
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
      </div>
    </div>
    
    <!-- Column Headers -->
    <div 
      class="px-3 py-1.5 grid gap-2 text-xs text-dark-500 border-b border-dark-700/50 flex-shrink-0"
      :class="compact ? 'grid-cols-2' : 'grid-cols-3'"
    >
      <span class="text-left">Price</span>
      <span class="text-right">Qty</span>
      <span v-if="!compact" class="text-right">Total</span>
    </div>
    
    <!-- Two-panel layout -->
    <div class="flex-1 grid grid-rows-[1fr_auto_1fr] min-h-0 overflow-hidden">
      <!-- Asks Container (top half) -->
      <div 
        ref="asksContainer" 
        class="overflow-y-auto overflow-x-hidden border-b border-dark-700/30 min-h-0"
      >
        <div 
          v-for="(ask, i) in asks" 
          :key="'ask-' + i"
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
          <span class="relative text-right text-dark-300 truncate">{{ formatQuantity(ask.quantity) }}</span>
          <span v-if="!compact" class="relative text-right text-dark-400 truncate">
            {{ formatQuantity(ask.price * ask.quantity) }}
          </span>
        </div>
      </div>
      
      <!-- Spread (fixed center divider) -->
      <div class="px-2 py-1 flex items-center justify-center gap-2 text-xs bg-dark-800/50 border-y border-dark-600/50">
        <span class="text-dark-100 mono font-medium">{{ formatPrice(store.ticker?.spread) }}</span>
        <span class="text-dark-500">({{ (store.spreadPercent * 100).toFixed(3) }}%)</span>
      </div>
      
      <!-- Bids Container (bottom half) -->
      <div 
        ref="bidsContainer" 
        class="overflow-y-auto overflow-x-hidden min-h-0"
      >
        <div 
          v-for="(bid, i) in bids" 
          :key="'bid-' + i"
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
          <span class="relative text-right text-dark-300 truncate">{{ formatQuantity(bid.quantity) }}</span>
          <span v-if="!compact" class="relative text-right text-dark-400 truncate">
            {{ formatQuantity(bid.price * bid.quantity) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
