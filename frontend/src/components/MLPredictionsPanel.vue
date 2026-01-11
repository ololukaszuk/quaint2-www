<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatTimeAgo } from '../utils/format'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const showHistory = ref(false)
const statsHours = ref(24)
const currentTime = ref(Date.now())
let interval

// Update every 1 second for live time progression
onMounted(() => {
  interval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => clearInterval(interval))

const latest = computed(() => store.mlPredictionLatest)
const stats = computed(() => store.mlPredictionStats)
const intervals = computed(() => store.mlPredictionIntervals)

// Time remaining in current interval
const timeRemaining = computed(() => {
  if (!latest.value?.target_time_end) return null
  const end = new Date(latest.value.target_time_end).getTime()
  const remaining = Math.max(0, Math.floor((end - currentTime.value) / 1000))
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// Minutes into current interval (for trading recommendation)
const minutesIntoInterval = computed(() => {
  if (!latest.value?.target_time_start) return 0
  const start = new Date(latest.value.target_time_start).getTime()
  return Math.floor((currentTime.value - start) / 60000)
})

// Trading recommendation based on time in interval
const tradingRecommendation = computed(() => {
  const mins = minutesIntoInterval.value
  if (mins < 5) return { text: 'Wait for better signal', class: 'text-yellow-400', emoji: '⚠️' }
  if (mins < 10) return { text: 'Best time to trade', class: 'text-green-400', emoji: '✅' }
  return { text: 'Good for confirmation', class: 'text-blue-400', emoji: '✅' }
})

const directionClass = (direction) => {
  if (direction === 'UP' || direction === 1) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (direction === 'DOWN' || direction === -1) return 'bg-red-500/20 text-red-400 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
}

const directionIcon = (direction) => {
  if (direction === 'UP' || direction === 1) return '📈'
  if (direction === 'DOWN' || direction === -1) return '📉'
  return '➡️'
}

const accuracyClass = (accuracy) => {
  if (accuracy >= 0.8) return 'text-green-400'
  if (accuracy >= 0.6) return 'text-yellow-400'
  return 'text-red-400'
}

const certaintyClass = (certainty) => {
  if (certainty >= 0.8) return 'text-green-400'
  if (certainty >= 0.6) return 'text-yellow-400'
  return 'text-dark-400'
}

const formatIntervalTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const changeStatsHours = (hours) => {
  statsHours.value = hours
  store.fetchMLPredictionStats(hours)
}
</script>

<template>
  <div style="height: 100%; overflow-y: auto; overflow-x: hidden;">
    <div v-if="latest" class="p-4 space-y-4" :class="{ 'p-3 space-y-3': mobile }">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🧠</span>
          <div>
            <div class="text-sm font-medium text-dark-200">15m ML Prediction</div>
            <div class="text-xs text-dark-500">Machine Learning Model</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-dark-500">Time Remaining</div>
          <div class="font-mono text-lg text-brand-400">{{ timeRemaining || '--:--' }}</div>
        </div>
      </div>
      
      <!-- Current Prediction Card -->
      <div 
        class="p-4 rounded-xl border"
        :class="directionClass(latest.predicted_direction_label || latest.predicted_direction)"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl font-bold">
            {{ directionIcon(latest.predicted_direction_label || latest.predicted_direction) }}
            {{ latest.predicted_direction_label || (latest.predicted_direction === 1 ? 'UP' : 'DOWN') }}
          </span>
          <span 
            class="px-3 py-1 text-sm rounded-full bg-dark-800/50"
            :class="certaintyClass(latest.predicted_certainty)"
          >
            {{ (latest.predicted_certainty * 100).toFixed(1) }}% certainty
          </span>
        </div>
        
        <!-- Interval Info -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="p-2 bg-dark-800/30 rounded">
            <div class="text-xs text-dark-500">Interval</div>
            <div class="font-mono text-sm text-dark-200">
              {{ formatIntervalTime(latest.target_time_start) }} - {{ formatIntervalTime(latest.target_time_end) }}
            </div>
          </div>
          <div class="p-2 bg-dark-800/30 rounded">
            <div class="text-xs text-dark-500">Open Price</div>
            <div class="font-mono text-sm text-dark-200">${{ formatPrice(latest.interval_open_price) }}</div>
          </div>
        </div>
        
        <!-- Prediction Details -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-2 bg-dark-800/30 rounded">
            <div class="text-xs text-dark-500">Predictions</div>
            <div class="font-mono text-dark-200">{{ latest.prediction_count || 0 }}</div>
          </div>
          <div class="p-2 bg-dark-800/30 rounded">
            <div class="text-xs text-dark-500">Avg Certainty</div>
            <div class="font-mono" :class="certaintyClass(latest.avg_certainty)">
              {{ ((latest.avg_certainty || 0) * 100).toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
      
      <!-- Trading Recommendation -->
      <div class="p-3 bg-dark-800/50 rounded-lg border border-dark-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>{{ tradingRecommendation.emoji }}</span>
            <span class="text-sm" :class="tradingRecommendation.class">{{ tradingRecommendation.text }}</span>
          </div>
          <span class="text-xs text-dark-500">Minute {{ minutesIntoInterval }}/15</span>
        </div>
        <div class="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-1000"
            :class="{
              'bg-yellow-500': minutesIntoInterval < 5,
              'bg-green-500': minutesIntoInterval >= 5 && minutesIntoInterval < 10,
              'bg-blue-500': minutesIntoInterval >= 10
            }"
            :style="{ width: `${(minutesIntoInterval / 15) * 100}%` }"
          ></div>
        </div>
      </div>
      
      <!-- Stats Section -->
      <div v-if="stats" class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-dark-400">Performance Stats</h4>
          <div class="flex gap-1">
            <button 
              v-for="h in [6, 24, 48]" :key="h"
              @click="changeStatsHours(h)"
              class="px-2 py-0.5 text-xs rounded transition-colors"
              :class="statsHours === h ? 'bg-brand-600 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'"
            >
              {{ h }}h
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-2">
          <div class="p-3 bg-dark-800/50 rounded-lg">
            <div class="text-xs text-dark-500">Overall Accuracy</div>
            <div class="text-xl font-bold" :class="accuracyClass(stats.accuracy)">
              {{ ((stats.accuracy || 0) * 100).toFixed(1) }}%
            </div>
            <div class="text-xs text-dark-600">{{ stats.correct_predictions }}/{{ stats.total_predictions }}</div>
          </div>
          <div class="p-3 bg-dark-800/50 rounded-lg">
            <div class="text-xs text-dark-500">Interval Win Rate</div>
            <div class="text-xl font-bold" :class="accuracyClass(stats.interval_win_rate)">
              {{ ((stats.interval_win_rate || 0) * 100).toFixed(1) }}%
            </div>
            <div class="text-xs text-dark-600">{{ stats.intervals_won }}/{{ stats.intervals_total }}</div>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="p-2 bg-yellow-500/10 rounded text-center">
            <div class="text-yellow-400/70">Early (0-5m)</div>
            <div class="font-mono" :class="accuracyClass(stats.early_accuracy)">
              {{ ((stats.early_accuracy || 0) * 100).toFixed(0) }}%
            </div>
          </div>
          <div class="p-2 bg-green-500/10 rounded text-center">
            <div class="text-green-400/70">Mid (5-10m)</div>
            <div class="font-mono" :class="accuracyClass(stats.mid_accuracy)">
              {{ ((stats.mid_accuracy || 0) * 100).toFixed(0) }}%
            </div>
          </div>
          <div class="p-2 bg-blue-500/10 rounded text-center">
            <div class="text-blue-400/70">Late (10-15m)</div>
            <div class="font-mono" :class="accuracyClass(stats.late_accuracy)">
              {{ ((stats.late_accuracy || 0) * 100).toFixed(0) }}%
            </div>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-xs p-2 bg-dark-800/30 rounded">
          <span class="text-dark-500">Avg Confidence</span>
          <span class="font-mono" :class="certaintyClass(stats.avg_confidence)">
            {{ ((stats.avg_confidence || 0) * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="flex items-center justify-between text-xs p-2 bg-dark-800/30 rounded">
          <span class="text-dark-500">High Confidence (≥80%)</span>
          <span class="font-mono" :class="accuracyClass(stats.high_confidence_accuracy)">
            {{ ((stats.high_confidence_accuracy || 0) * 100).toFixed(1) }}% accurate
          </span>
        </div>
      </div>
      
      <!-- Intervals History (Collapsible) -->
      <div class="cursor-pointer border border-dark-700/50 rounded-lg" @click="showHistory = !showHistory">
        <div class="px-3 py-2 flex items-center justify-between hover:bg-dark-800/30 transition-colors">
          <h4 class="text-xs font-medium text-dark-400">Recent Intervals</h4>
          <svg 
            class="w-4 h-4 text-dark-400 transition-transform"
            :class="{ 'rotate-180': showHistory }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="showHistory && intervals?.length" class="border-t border-dark-700/50 max-h-64 overflow-y-auto" @click.stop>
          <div 
            v-for="(iv, i) in intervals" :key="i"
            class="px-3 py-2 border-b border-dark-800/50 last:border-0"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-dark-500">
                {{ formatIntervalTime(iv.target_time_start) }} - {{ formatIntervalTime(iv.target_time_end) }}
              </span>
              <span 
                class="px-1.5 py-0.5 text-xs rounded"
                :class="directionClass(iv.actual_direction)"
              >
                {{ iv.actual_direction }}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-dark-400">
                ${{ formatPrice(iv.open_price) }} → ${{ formatPrice(iv.close_price) }}
              </span>
              <span :class="accuracyClass(iv.accuracy)">
                {{ iv.correct_count }}/{{ iv.prediction_count }} ({{ ((iv.accuracy || 0) * 100).toFixed(0) }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Data State -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center py-8">
        <div class="text-4xl mb-2">🧠</div>
        <div class="text-dark-400">No ML prediction available</div>
        <div class="text-xs text-dark-500 mt-1">15-minute interval predictions</div>
      </div>
    </div>
  </div>
</template>
