<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice } from '../utils/format'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const showWarnings = ref(false)

const analysis = computed(() => store.llmAnalysis)

const directionClass = (direction) => {
  if (direction === 'BULLISH') return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (direction === 'BEARISH') return 'bg-red-500/20 text-red-400 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
}

const confidenceClass = (confidence) => {
  if (confidence === 'VERY_HIGH' || confidence === 'HIGH') return 'text-green-400'
  if (confidence === 'MEDIUM') return 'text-yellow-400'
  return 'text-dark-400'
}

const accuracyIcon = (correct) => {
  if (correct === true) return '✅'
  if (correct === false) return '❌'
  return '⏳'
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
  <div class="h-full overflow-y-auto overflow-x-hidden">
    <div v-if="analysis" class="p-4 space-y-4" :class="{ 'p-3 space-y-3': mobile }">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🤖</span>
          <div>
            <div class="text-sm font-medium text-dark-200">AI Prediction</div>
            <div class="text-xs text-dark-500">{{ analysis.model_name }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-dark-500">{{ formatTimeAgo(analysis.analysis_time) }}</div>
          <div v-if="analysis.response_time_seconds" class="text-xs text-dark-600">
            {{ analysis.response_time_seconds.toFixed(1) }}s response
          </div>
        </div>
      </div>
      
      <!-- Main Prediction Card -->
      <div 
        class="p-4 rounded-xl border"
        :class="directionClass(analysis.prediction_direction)"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl font-bold">
            {{ analysis.prediction_direction === 'BULLISH' ? '📈' : 
               analysis.prediction_direction === 'BEARISH' ? '📉' : '➡️' }}
            {{ analysis.prediction_direction }}
          </span>
          <span 
            class="px-3 py-1 text-sm rounded-full bg-dark-800/50"
            :class="confidenceClass(analysis.prediction_confidence)"
          >
            {{ analysis.prediction_confidence }} confidence
          </span>
        </div>
        
        <!-- Current Price at Analysis -->
        <div class="text-center mb-3">
          <div class="text-xs text-dark-500">Price at Analysis</div>
          <div class="font-mono text-xl text-dark-200">${{ formatPrice(analysis.price) }}</div>
        </div>
        
        <!-- Price Predictions -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-dark-800/30 rounded-lg">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-dark-500">1h Prediction</span>
              <span>{{ accuracyIcon(analysis.direction_correct_1h) }}</span>
            </div>
            <div class="font-mono text-lg text-dark-200">
              ${{ formatPrice(analysis.predicted_price_1h) }}
            </div>
            <div v-if="analysis.actual_price_1h" class="text-xs text-dark-500 mt-1">
              Actual: ${{ formatPrice(analysis.actual_price_1h) }}
            </div>
          </div>
          
          <div class="p-3 bg-dark-800/30 rounded-lg">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-dark-500">4h Prediction</span>
              <span>{{ accuracyIcon(analysis.direction_correct_4h) }}</span>
            </div>
            <div class="font-mono text-lg text-dark-200">
              ${{ formatPrice(analysis.predicted_price_4h) }}
            </div>
            <div v-if="analysis.actual_price_4h" class="text-xs text-dark-500 mt-1">
              Actual: ${{ formatPrice(analysis.actual_price_4h) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Key Levels -->
      <div v-if="analysis.critical_support || analysis.critical_resistance" class="grid grid-cols-2 gap-3">
        <div v-if="analysis.critical_support" class="p-3 bg-green-500/10 rounded-lg">
          <div class="text-xs text-green-400/70">Critical Support</div>
          <div class="font-mono text-green-400 text-lg">${{ formatPrice(analysis.critical_support) }}</div>
        </div>
        <div v-if="analysis.critical_resistance" class="p-3 bg-red-500/10 rounded-lg">
          <div class="text-xs text-red-400/70">Critical Resistance</div>
          <div class="font-mono text-red-400 text-lg">${{ formatPrice(analysis.critical_resistance) }}</div>
        </div>
      </div>
      
      <!-- Invalidation Level -->
      <div v-if="analysis.invalidation_level" class="p-3 bg-orange-500/10 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-orange-400">⚠️</span>
          <div>
            <div class="text-xs text-orange-400/70">Invalidation Level</div>
            <div class="font-mono text-orange-400">${{ formatPrice(analysis.invalidation_level) }}</div>
          </div>
        </div>
        <div class="text-xs text-dark-500 mt-1">
          Prediction invalidated if price crosses this level
        </div>
      </div>
      
      <!-- Key Levels Text -->
      <div v-if="analysis.key_levels" class="p-3 bg-dark-800/50 rounded-lg">
        <div class="text-xs text-dark-500 mb-2">Key Levels</div>
        <div class="text-sm text-dark-300">{{ analysis.key_levels }}</div>
      </div>
      
      <!-- Reasoning -->
      <div v-if="analysis.reasoning" class="p-3 bg-dark-800/30 rounded-lg">
        <div class="text-xs text-dark-500 mb-2">AI Reasoning</div>
        <div class="text-sm text-dark-300 leading-relaxed">{{ analysis.reasoning }}</div>
      </div>
      
      <!-- Market Context at Analysis -->
      <div v-if="analysis.market_context" class="space-y-3">
        <h4 class="text-sm font-medium text-dark-400">Context at Analysis</h4>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-dark-500">Signal Type</div>
            <div class="text-dark-300">{{ analysis.market_context.signal_type }}</div>
          </div>
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-dark-500">SMC Bias</div>
            <div class="text-dark-300">{{ analysis.market_context.smc_bias }}</div>
          </div>
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-dark-500">Price Zone</div>
            <div class="text-dark-300">{{ analysis.market_context.price_zone }}</div>
          </div>
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-dark-500">Confidence</div>
            <div class="text-dark-300">{{ analysis.market_context.signal_confidence?.toFixed(1) }}%</div>
          </div>
        </div>
      </div>
      
      <!-- Trends at Analysis -->
      <div v-if="analysis.trends_at_analysis" class="space-y-2">
        <h4 class="text-xs text-dark-500">Trends at Analysis Time</h4>
        <div class="grid grid-cols-4 gap-1 text-xs">
          <div 
            v-for="(trend, tf) in analysis.trends_at_analysis"
            :key="tf"
            class="p-2 bg-dark-800/50 rounded text-center"
          >
            <div class="text-dark-500">{{ tf }}</div>
            <div 
              class="font-medium"
              :class="{
                'text-green-400': trend.direction === 'UPTREND',
                'text-red-400': trend.direction === 'DOWNTREND',
                'text-yellow-400': trend.direction === 'SIDEWAYS'
              }"
            >
              {{ trend.direction === 'UPTREND' ? '↑' : trend.direction === 'DOWNTREND' ? '↓' : '→' }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Warnings at Analysis (Collapsible) -->
      <div v-if="analysis.warnings_at_analysis?.length" class="cursor-pointer border border-yellow-500/30 rounded-lg bg-yellow-500/5" @click="showWarnings = !showWarnings">
        <div class="px-3 py-2 flex items-center justify-between hover:bg-yellow-500/10 transition-colors" :class="{ 'px-2 py-1.5': mobile }">
          <h4 class="text-xs font-medium text-yellow-400">Warnings at Analysis</h4>
          <svg 
            class="w-4 h-4 text-yellow-400 transition-transform"
            :class="{ 'rotate-180': showWarnings }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="showWarnings" class="space-y-1 px-3 py-2 border-t border-yellow-500/20" :class="{ 'px-2 py-1.5': mobile }">
          <div 
            v-for="(warning, i) in analysis.warnings_at_analysis.filter(w => w && w.trim())"
            :key="i"
            class="p-2 bg-yellow-500/10 rounded text-xs text-yellow-400"
          >
            {{ warning }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Data State -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center py-8">
        <div class="text-4xl mb-2">🤖</div>
        <div class="text-dark-400">No AI prediction available</div>
        <div class="text-xs text-dark-500 mt-1">LLM analysis runs periodically (every ~7 candles)</div>
      </div>
    </div>
  </div>
</template>
