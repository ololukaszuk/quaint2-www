<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useMarketStore } from './store/market'
import Header from './components/Header.vue'
import PriceCard from './components/PriceCard.vue'
import CandlestickChart from './components/CandlestickChart.vue'
import OrderBook from './components/OrderBook.vue'
import TradesList from './components/TradesList.vue'
import StatsBar from './components/StatsBar.vue'
import SignalPanel from './components/SignalPanel.vue'
import AnalysisPanel from './components/AnalysisPanel.vue'
import LLMPanel from './components/LLMPanel.vue'
import NotificationSettings from './components/NotificationSettings.vue'

const store = useMarketStore()

// Mobile sidebar state
const showMobileSidebar = ref(false)
const mobileTab = ref('chart') // 'chart', 'analysis', 'book'

// Update document title with current price
watch(
  () => store.lastPrice,
  (newPrice) => {
    if (newPrice && newPrice > 0) {
      // Format price with 2 decimal places
      const formattedPrice = newPrice.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
      document.title = `${formattedPrice} - BTCUSDT | QuAInt′`
    }
  },
  { immediate: true }
)

onMounted(() => {
  store.connect()
})

onUnmounted(() => {
  store.disconnect()
})

const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1024
})

// Computed volume display values
const volumeLabel = computed(() => {
  const unit = store.displayUnitVolume === 'BTC' ? 'BTC' : '$'
  return `Volume (${store.interval})`
})

const volumeValue = computed(() => store.intervalVolume)
const volumePrefix = computed(() => store.displayUnitVolume === 'USD' ? '$' : '')
const volumeSuffix = computed(() => store.displayUnitVolume === 'BTC' ? ' BTC' : '')

const volume24hLabel = computed(() => '24h Volume')
const volume24hValue = computed(() => store.volume24h)
const volume24hPrefix = computed(() => store.displayUnitVolume === 'USD' ? '$' : '')
const volume24hSuffix = computed(() => store.displayUnitVolume === 'BTC' ? ' BTC' : '')
</script>

<template>
  <div class="h-screen bg-dark-950 text-dark-100 flex flex-col overflow-hidden">
    <!-- Header -->
    <Header @toggle-sidebar="showMobileSidebar = !showMobileSidebar" />
    
    <!-- Main Content -->
    <main class="flex-1 overflow-hidden min-h-0">
      <!-- Desktop Layout -->
      <div class="hidden lg:flex h-full">
        <!-- Left: Chart & Market Data (65%) -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
          <div class="p-4 space-y-4">
            <!-- Price Overview Cards -->
            <div class="grid grid-cols-4 gap-3 flex-shrink-0">
              <PriceCard
                label="BTC Price"
                :value="store.lastPrice"
                :change="store.priceChangePercent"
                format="currency"
                size="large"
              />
              <PriceCard
                :label="`Buy Pressure (${store.interval})`"
                :value="store.buyRatio"
                format="percent"
                :indicator="store.buyRatio > 55 ? 'up' : store.buyRatio < 45 ? 'down' : 'neutral'"
              />
              <!-- Volume card with toggle -->
              <div class="card p-3 cursor-pointer hover:bg-dark-800/50 transition-colors" @click="store.toggleVolumeUnit">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-dark-500 font-medium text-xs">{{ volumeLabel }}</span>
                  <span class="text-xs text-dark-600 hover:text-dark-400">⇄ {{ store.displayUnitVolume }}</span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="font-mono font-bold tabular-nums text-xl text-dark-100">
                    {{ volumePrefix }}{{ store.intervalVolume?.toLocaleString('en-US', { maximumFractionDigits: store.displayUnitVolume === 'BTC' ? 2 : 0 }) }}{{ volumeSuffix }}
                  </span>
                </div>
              </div>
              <!-- 24h Volume card with toggle (uses same unit as interval volume) -->
              <div class="card p-3 cursor-pointer hover:bg-dark-800/50 transition-colors" @click="store.toggleVolumeUnit">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-dark-500 font-medium text-xs">{{ volume24hLabel }}</span>
                  <span class="text-xs text-dark-600 hover:text-dark-400">⇄ {{ store.displayUnitVolume }}</span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="font-mono font-bold tabular-nums text-xl text-dark-100">
                    {{ volume24hPrefix }}{{ store.volume24h?.toLocaleString('en-US', { maximumFractionDigits: store.displayUnitVolume === 'BTC' ? 2 : 0, notation: 'compact' }) }}{{ volume24hSuffix }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Chart -->
            <div class="card" style="height: 500px;">
              <CandlestickChart />
            </div>
            
            <!-- Bottom: Order Book & Trades -->
            <div class="grid grid-cols-2 gap-4 flex-shrink-0">
              <div v-if="store.showOrderBook" class="card" style="height: 400px;">
                <OrderBook />
              </div>
              <div v-if="store.showTrades" class="card" style="height: 400px;">
                <TradesList />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right: Analysis Panel (35%) -->
        <div class="w-[420px] border-l border-dark-700/50 flex flex-col" style="height: 100%; overflow: hidden;">
          <!-- Tab Navigation -->
          <div class="flex-shrink-0 flex border-b border-dark-700/50 bg-dark-900/50">
            <button
              @click="store.setActiveTab('analysis')"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="store.activeTab === 'analysis' 
                ? 'text-brand-400' 
                : 'text-dark-400 hover:text-dark-200'"
            >
              <span class="flex items-center justify-center gap-2">
                <span>📊</span>
                <span>Analysis</span>
              </span>
              <div 
                v-if="store.activeTab === 'analysis'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
              ></div>
            </button>
            <button
              @click="store.setActiveTab('signals')"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="store.activeTab === 'signals' 
                ? 'text-brand-400' 
                : 'text-dark-400 hover:text-dark-200'"
            >
              <span class="flex items-center justify-center gap-2">
                <span>🎯</span>
                <span>Signals</span>
                <span 
                  v-if="store.currentSignal"
                  class="px-1.5 py-0.5 text-xs rounded"
                  :class="{
                    'bg-green-500/20 text-green-400': store.signalColor === 'green',
                    'bg-red-500/20 text-red-400': store.signalColor === 'red',
                    'bg-yellow-500/20 text-yellow-400': store.signalColor === 'yellow',
                    'bg-dark-700 text-dark-400': store.signalColor === 'gray'
                  }"
                >
                  {{ store.currentSignal?.type?.replace('_', ' ') || 'N/A' }}
                </span>
              </span>
              <div 
                v-if="store.activeTab === 'signals'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
              ></div>
            </button>
            <button
              @click="store.setActiveTab('llm')"
              class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="store.activeTab === 'llm' 
                ? 'text-brand-400' 
                : 'text-dark-400 hover:text-dark-200'"
            >
              <span class="flex items-center justify-center gap-2">
                <span>🤖</span>
                <span>AI</span>
              </span>
              <div 
                v-if="store.activeTab === 'llm'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
              ></div>
            </button>
          </div>
          
          <!-- Tab Content -->
          <div class="flex-1" style="overflow: hidden; min-height: 0;">
            <AnalysisPanel v-if="store.activeTab === 'analysis'" />
            <SignalPanel v-if="store.activeTab === 'signals'" />
            <LLMPanel v-if="store.activeTab === 'llm'" />
          </div>
          
          <!-- Notification Settings -->
          <div class="flex-shrink-0" style="max-height: 400px; overflow-y: auto;">
            <NotificationSettings />
          </div>
        </div>
      </div>
      
      <!-- Mobile Layout -->
      <div class="lg:hidden flex flex-col h-full">
        <!-- Mobile Tab Navigation -->
        <div class="flex border-b border-dark-700/50 bg-dark-900 sticky top-0 z-10">
          <button
            @click="mobileTab = 'chart'"
            class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors"
            :class="mobileTab === 'chart' 
              ? 'text-brand-400 bg-dark-800/50' 
              : 'text-dark-400'"
          >
            📈 Chart
          </button>
          <button
            @click="mobileTab = 'analysis'"
            class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative"
            :class="mobileTab === 'analysis' 
              ? 'text-brand-400 bg-dark-800/50' 
              : 'text-dark-400'"
          >
            <span class="flex items-center justify-center gap-1">
              🎯 Signals
              <span 
                v-if="store.currentSignal"
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-green-500': store.signalColor === 'green',
                  'bg-red-500': store.signalColor === 'red',
                  'bg-yellow-500': store.signalColor === 'yellow',
                }"
              ></span>
            </span>
          </button>
          <button
            @click="mobileTab = 'book'"
            class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors"
            :class="mobileTab === 'book' 
              ? 'text-brand-400 bg-dark-800/50' 
              : 'text-dark-400'"
          >
            📚 Book
          </button>
        </div>
        
        <!-- Mobile Content -->
        <div class="flex-1 overflow-auto p-3">
          <!-- Chart Tab -->
          <div v-if="mobileTab === 'chart'" class="space-y-3">
            <!-- Compact Price Cards -->
            <div class="grid grid-cols-2 gap-2">
              <PriceCard
                label="BTC"
                :value="store.lastPrice"
                :change="store.priceChangePercent"
                format="currency"
                size="compact"
              />
              <!-- Mobile 24h volume with tap to toggle -->
              <div class="card p-2 cursor-pointer" @click="store.toggleVolumeUnit">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-dark-500 font-medium text-xs">24h Vol</span>
                  <span class="text-xs text-dark-600">{{ store.displayUnitVolume }}</span>
                </div>
                <span class="font-mono font-bold tabular-nums text-lg text-dark-100">
                  {{ volume24hPrefix }}{{ store.volume24h?.toLocaleString('en-US', { maximumFractionDigits: 0, notation: 'compact' }) }}{{ volume24hSuffix }}
                </span>
              </div>
            </div>
            
            <!-- Chart -->
            <div class="card h-[50vh] min-h-[300px]">
              <CandlestickChart />
            </div>
            
            <!-- Quick Signal Summary -->
            <div v-if="store.currentSignal" class="card p-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded"
                    :class="{
                      'bg-green-500/20 text-green-400': store.signalColor === 'green',
                      'bg-red-500/20 text-red-400': store.signalColor === 'red',
                      'bg-yellow-500/20 text-yellow-400': store.signalColor === 'yellow',
                    }"
                  >
                    {{ store.currentSignal.type?.replace('_', ' ') }}
                  </span>
                  <span class="text-xs text-dark-400">
                    {{ store.currentSignal.confidence?.toFixed(1) }}% confidence
                  </span>
                </div>
                <button 
                  @click="mobileTab = 'analysis'"
                  class="text-xs text-brand-400 hover:text-brand-300"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
          
          <!-- Analysis Tab -->
          <div v-if="mobileTab === 'analysis'" class="space-y-3">
            <!-- Sub-tabs for mobile -->
            <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                @click="store.setActiveTab('signals')"
                class="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors"
                :class="store.activeTab === 'signals' 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-dark-800 text-dark-300'"
              >
                🎯 Current Signal
              </button>
              <button
                @click="store.setActiveTab('analysis')"
                class="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors"
                :class="store.activeTab === 'analysis' 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-dark-800 text-dark-300'"
              >
                📊 Full Analysis
              </button>
              <button
                @click="store.setActiveTab('llm')"
                class="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors"
                :class="store.activeTab === 'llm' 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-dark-800 text-dark-300'"
              >
                🤖 AI Prediction
              </button>
            </div>
            
            <!-- Content -->
            <div class="card overflow-hidden">
              <SignalPanel v-if="store.activeTab === 'signals'" :mobile="true" />
              <AnalysisPanel v-if="store.activeTab === 'analysis'" :mobile="true" />
              <LLMPanel v-if="store.activeTab === 'llm'" :mobile="true" />
            </div>
            
            <!-- Notification Settings (Mobile) -->
            <NotificationSettings :mobile="true" />
          </div>
          
          <!-- Order Book Tab -->
          <div v-if="mobileTab === 'book'" class="space-y-3">
            <div class="card h-[45vh] min-h-[250px]">
              <OrderBook :compact="true" />
            </div>
            <div class="card h-[35vh] min-h-[200px]">
              <TradesList :compact="true" />
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Stats Footer -->
    <StatsBar />
  </div>
</template>