<script setup>
import { computed } from 'vue'
import { useMarketStore } from '../store/market'

const store = useMarketStore()

const lastUpdate = computed(() => {
  if (!store.stats?.last_update) return '-'
  return new Date(store.stats.last_update).toLocaleTimeString()
})
</script>

<template>
  <footer class="bg-dark-900 border-t border-dark-700/50 px-4 py-2">
    <div class="flex items-center justify-between text-xs text-dark-400">
      <!-- Left: Data Source -->
      <div class="flex items-center gap-4">
        <span class="text-brand-500">⚡ Direct Binance Connection</span>
        <span class="hidden sm:inline">|</span>
        <span class="hidden sm:inline">
          {{ store.stats?.messages_per_second || 0 }} msg/s
        </span>
        <span class="hidden md:inline">|</span>
        <span class="hidden md:inline">
          Trades: {{ store.stats?.trades_received?.toLocaleString() || 0 }}
        </span>
        <span class="hidden lg:inline">|</span>
        <span class="hidden lg:inline">
          Book Updates: {{ store.stats?.orderbook_updates?.toLocaleString() || 0 }}
        </span>
      </div>
      
      <!-- Right: Update Time -->
      <div class="flex items-center gap-4">
        <span>Last: {{ lastUpdate }}</span>
        <a 
          href="https://www.binance.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-brand-500 hover:text-brand-400 transition-colors"
        >
          binance.com ↗
        </a>
      </div>
    </div>
  </footer>
</template>
