<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useMarketStore } from './store/market'
import Header from './components/Header.vue'
import PriceCard from './components/PriceCard.vue'
import CandlestickChart from './components/CandlestickChart.vue'
import OrderBook from './components/OrderBook.vue'
import TradesList from './components/TradesList.vue'
import StatsBar from './components/StatsBar.vue'
import ControlPanel from './components/ControlPanel.vue'

const store = useMarketStore()

onMounted(() => {
  store.connect()
})

onUnmounted(() => {
  store.disconnect()
})
</script>

<template>
  <div class="min-h-screen bg-dark-950 text-dark-100 flex flex-col">
    <!-- Header -->
    <Header />
    
    <!-- Main Content -->
    <main class="flex-1 p-4 lg:p-6 overflow-hidden">
      <div class="h-full flex flex-col lg:flex-row gap-4">
        <!-- Left: Chart Area (70%) -->
        <div class="flex-1 lg:w-[70%] flex flex-col gap-4 min-w-0">
          <!-- Price Overview Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <PriceCard
              label="Last Price"
              :value="store.lastPrice"
              :change="store.priceChangePercent"
              format="currency"
              size="large"
            />
            <PriceCard
              label="24h Volume"
              :value="store.kline?.quote_volume"
              format="compact"
              prefix="$"
            />
            <PriceCard
              label="Buy Ratio"
              :value="store.buyRatio"
              format="percent"
              :indicator="store.buyRatio > 55 ? 'up' : store.buyRatio < 45 ? 'down' : 'neutral'"
            />
            <PriceCard
              label="Spread"
              :value="store.spreadPercent"
              format="bps"
              :badge="store.liquidityRating"
            />
          </div>
          
          <!-- Chart -->
          <div class="flex-1 card min-h-[400px]">
            <CandlestickChart />
          </div>
        </div>
        
        <!-- Right: Sidebar (30%) -->
        <div class="lg:w-[30%] flex flex-col gap-4 lg:max-w-md">
          <!-- Control Panel -->
          <ControlPanel />
          
          <!-- Order Book -->
          <div v-if="store.showOrderBook" class="card flex-1 min-h-[200px] max-h-[350px]">
            <OrderBook />
          </div>
          
          <!-- Live Trades -->
          <div v-if="store.showTrades" class="card flex-1 min-h-[200px] max-h-[350px]">
            <TradesList />
          </div>
        </div>
      </div>
    </main>
    
    <!-- Stats Footer -->
    <StatsBar />
  </div>
</template>
