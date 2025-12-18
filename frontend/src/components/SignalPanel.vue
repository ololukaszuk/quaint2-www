<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatPercent, formatTime } from '../utils/format'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const toggleHistory = ref(false)

const analysis = computed(() => store.marketAnalysis)
const signals = computed(() => store.marketSignals)

const signalTypeClass = (type) => {
  if (!type) return 'bg-dark-700 text-dark-400'
  if (type.includes('STRONG_BUY')) return 'bg-green-500/20 text-green-400 border border-green-500/30'
  if (type.includes('WEAK_BUY')) return 'bg-green-500/10 text-green-400/80'
  if (type.includes('STRONG_SELL')) return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (type.includes('WEAK_SELL')) return 'bg-red-500/10 text-red-400/80'
  return 'bg-yellow-500/10 text-yellow-400'
}

const directionIcon = (direction) => {
  if (direction === 'LONG') return '📈'
  if (direction === 'SHORT') return '📉'
  return '⏸️'
}

const actionClass = (action) => {
  if (action === 'LONG') return 'text-green-400'
  if (action === 'SHORT') return 'text-red-400'
  return 'text-yellow-400'
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '-'
  const now = new Date()
  const time = new Date(timestamp)
  const diff = Math.floor((now - time) / 1000)
  
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
</script>

<template>
  <div style="height: 100%; overflow-y: auto; overflow-x: hidden;">
    <!-- Current Signal Card -->
    <div class="p-4 border-b border-dark-700/50" :class="{ 'p-3': mobile }">
      <div v-if="analysis" class="space-y-3">
        <!-- Signal Badge & Direction -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span 
              class="px-3 py-1.5 text-sm font-bold rounded-lg"
              :class="signalTypeClass(analysis.signal_type)"
            >
              {{ analysis.signal_type?.replace('_', ' ') || 'NO SIGNAL' }}
            </span>
            <span class="text-lg">{{ directionIcon(analysis.signal_direction) }}</span>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold font-mono" :class="actionClass(analysis.action_recommendation)">
              {{ analysis.signal_confidence?.toFixed(1) }}%
            </div>
            <div class="text-xs text-dark-500">confidence</div>
          </div>
        </div>
        
        <!-- Action Recommendation -->
        <div 
          class="p-3 rounded-lg text-center font-medium"
          :class="{
            'bg-green-500/10 text-green-400': analysis.action_recommendation === 'LONG',
            'bg-red-500/10 text-red-400': analysis.action_recommendation === 'SHORT',
            'bg-yellow-500/10 text-yellow-400': analysis.action_recommendation === 'WAIT'
          }"
        >
          {{ analysis.action_recommendation === 'LONG' ? '🟢 Go Long' : 
             analysis.action_recommendation === 'SHORT' ? '🔴 Go Short' : 
             '⏳ Wait for Better Entry' }}
        </div>
        
        <!-- Entry Levels -->
        <div v-if="analysis.entry_price" class="grid grid-cols-2 gap-2 text-sm">
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-xs text-dark-500">Entry</div>
            <div class="font-mono text-dark-200">${{ formatPrice(analysis.entry_price) }}</div>
          </div>
          <div class="p-2 bg-red-500/10 rounded">
            <div class="text-xs text-red-400/70">Stop Loss</div>
            <div class="font-mono text-red-400">${{ formatPrice(analysis.stop_loss) }}</div>
          </div>
        </div>
        
        <!-- Take Profit Levels -->
        <div v-if="analysis.take_profit_1" class="space-y-1">
          <div class="text-xs text-dark-500 mb-1">Take Profit Targets</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="p-2 bg-green-500/10 rounded text-center">
              <div class="text-green-400/70">TP1</div>
              <div class="font-mono text-green-400">${{ formatPrice(analysis.take_profit_1) }}</div>
            </div>
            <div v-if="analysis.take_profit_2" class="p-2 bg-green-500/10 rounded text-center">
              <div class="text-green-400/70">TP2</div>
              <div class="font-mono text-green-400">${{ formatPrice(analysis.take_profit_2) }}</div>
            </div>
            <div v-if="analysis.take_profit_3" class="p-2 bg-green-500/10 rounded text-center">
              <div class="text-green-400/70">TP3</div>
              <div class="font-mono text-green-400">${{ formatPrice(analysis.take_profit_3) }}</div>
            </div>
          </div>
        </div>
        
        <!-- Risk/Reward -->
        <div v-if="analysis.risk_reward_ratio" class="flex items-center justify-between text-sm">
          <span class="text-dark-400">Risk/Reward Ratio</span>
          <span class="font-mono text-brand-400">1:{{ analysis.risk_reward_ratio?.toFixed(2) }}</span>
        </div>
        
        <!-- Summary -->
        <div v-if="analysis.summary" class="p-3 bg-dark-800/30 rounded-lg">
          <div class="text-xs text-dark-500 mb-1">Analysis Summary</div>
          <div class="text-sm text-dark-300 leading-relaxed">{{ analysis.summary }}</div>
        </div>
        
        <!-- Last Updated -->
        <div class="text-xs text-dark-600 text-center">
          Updated {{ formatTimeAgo(analysis.analysis_time) }}
        </div>
      </div>
      
      <!-- No Data State -->
      <div v-else class="text-center py-8">
        <div class="text-4xl mb-2">📊</div>
        <div class="text-dark-400">No signal data available</div>
        <div class="text-xs text-dark-500 mt-1">Waiting for ML API...</div>
      </div>
    </div>
    
    <!-- Signal History (Collapsible) -->
    <div class="cursor-pointer border-t border-dark-700/50" @click="toggleHistory = !toggleHistory">
      <div class="px-4 py-3 flex items-center justify-between bg-dark-900/50 hover:bg-dark-900/70 transition-colors" :class="{ 'px-3 py-2': mobile }">
        <div class="text-xs text-dark-500 font-medium">Signal History</div>
        <svg 
          class="w-4 h-4 text-dark-400 transition-transform"
          :class="{ 'rotate-180': toggleHistory }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      
      <div v-if="toggleHistory" class="divide-y divide-dark-800/50 max-h-[400px] overflow-y-auto">
        <div 
          v-for="signal in signals.slice(0, 10)" 
          :key="signal.id"
          class="px-4 py-3 hover:bg-dark-800/30 transition-colors" :class="{ 'px-3': mobile }"
        >
          <div class="flex items-center justify-between mb-1">
            <span 
              class="px-2 py-0.5 text-xs rounded"
              :class="signalTypeClass(signal.signal_type)"
            >
              {{ signal.signal_type?.replace('_', ' ') }}
            </span>
            <span class="text-xs text-dark-500">{{ formatTimeAgo(signal.signal_time) }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-dark-400">
              {{ signal.previous_signal_type ? `From ${signal.previous_signal_type}` : 'Initial' }}
            </span>
            <span class="font-mono text-dark-300">${{ formatPrice(signal.price) }}</span>
          </div>
          <div v-if="signal.key_reasons" class="mt-1">
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="(reason, i) in signal.key_reasons?.slice(0, 2)" 
                :key="i"
                class="px-1.5 py-0.5 text-xs bg-dark-800 text-dark-400 rounded"
              >
                {{ reason }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="signals.length === 0" class="px-4 py-8 text-center text-dark-500 text-sm">
          No signal history yet
        </div>
      </div>
    </div>
  </div>
</template>
