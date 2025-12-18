<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice, formatTimeAgo } from '../utils/format'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const expandedSections = ref({
  smc: true,
  trends: true,
  levels: false,
  pivots: false,
  momentum: false,
  warnings: false,
  factors: false
})

const analysis = computed(() => store.marketAnalysis)

const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const trendIcon = (direction) => {
  if (direction === 'UPTREND') return '📈'
  if (direction === 'DOWNTREND') return '📉'
  return '➡️'
}

const trendClass = (direction) => {
  if (direction === 'UPTREND') return 'text-green-400'
  if (direction === 'DOWNTREND') return 'text-red-400'
  return 'text-yellow-400'
}

const trendBarClass = (direction) => {
  if (direction === 'UPTREND') return 'bg-green-400'
  if (direction === 'DOWNTREND') return 'bg-red-400'
  return 'bg-yellow-400'
}

const biasClass = (bias) => {
  if (bias === 'BULLISH') return 'bg-green-500/20 text-green-400'
  if (bias === 'BEARISH') return 'bg-red-500/20 text-red-400'
  return 'bg-yellow-500/20 text-yellow-400'
}

const zoneClass = (zone) => {
  if (zone === 'DISCOUNT') return 'text-green-400'
  if (zone === 'PREMIUM') return 'text-red-400'
  return 'text-yellow-400'
}

const sortedOrderBlocks = computed(() => {
  if (!analysis.value?.smc_order_blocks?.length) return []
  return [...analysis.value.smc_order_blocks]
    .sort((a, b) => Math.abs(a.distance_pct || 0) - Math.abs(b.distance_pct || 0))
    .slice(0, 10)
})

const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return '0.00'
  const num = Number(weight)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

const hasPivotValue = (value) => {
  return value !== null && value !== undefined && !isNaN(value) && value > 0
}
</script>

<template>
  <div style="height: 100%; overflow-y: auto; overflow-x: hidden;">
    <div v-if="analysis" class="divide-y divide-dark-700/50">
      
      <div class="px-4 py-2 bg-dark-900/50 border-b border-dark-700/50 flex items-center justify-between">
        <span class="text-xs text-dark-500">Current Analysis</span>
        <span class="text-xs text-dark-600">Updated {{ formatTimeAgo(analysis.analysis_time) }}</span>
      </div>
      
      <!-- SMC Section -->
      <div class="cursor-pointer" @click="toggleSection('smc')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Smart Money Concepts</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.smc }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.smc" class="p-4 border-t border-dark-700/50" :class="{ 'p-3': mobile }" @click.stop>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2 py-1 text-xs rounded" :class="biasClass(analysis.smc_bias)">
              {{ analysis.smc_bias || 'NEUTRAL' }}
            </span>
          </div>
          
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-2 bg-dark-800/50 rounded">
              <div class="text-xs text-dark-500">Price Zone</div>
              <div class="font-medium" :class="zoneClass(analysis.price_zone)">{{ analysis.price_zone || '-' }}</div>
            </div>
            <div class="p-2 bg-dark-800/50 rounded">
              <div class="text-xs text-dark-500">Equilibrium</div>
              <div class="font-mono text-dark-300 text-sm">${{ formatPrice(analysis.equilibrium_price) }}</div>
            </div>
          </div>
          
          <div v-if="sortedOrderBlocks.length">
            <div class="text-xs text-dark-500 mb-2">
              Order Blocks ({{ analysis.smc_order_blocks.length }})
              <span class="text-dark-600">- sorted by distance</span>
            </div>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              <div v-for="(ob, i) in sortedOrderBlocks" :key="i"
                class="flex items-center justify-between text-xs p-2 rounded"
                :class="ob.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'">
                <span :class="ob.type === 'bullish' ? 'text-green-400' : 'text-red-400'">
                  {{ ob.type === 'bullish' ? '🟢' : '🔴' }} {{ ob.type }}
                </span>
                <span class="font-mono text-dark-300">${{ formatPrice(ob.low) }} - ${{ formatPrice(ob.high) }}</span>
                <span class="text-dark-500">{{ ob.distance_pct?.toFixed(2) }}%</span>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-dark-500 italic">No order blocks detected</div>
        </div>
      </div>
      
      <!-- Trends Section -->
      <div class="cursor-pointer" @click="toggleSection('trends')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Multi-Timeframe Trends</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.trends }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.trends && analysis.trends" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="(trend, tf) in analysis.trends" :key="tf" class="p-2 bg-dark-800/50 rounded">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-dark-500 font-medium">{{ tf }}</span>
                <span>{{ trendIcon(trend.direction) }}</span>
              </div>
              <div class="text-sm font-medium" :class="trendClass(trend.direction)">
                {{ trend.direction?.replace('TREND', '') || '-' }}
              </div>
              <div class="mt-1 h-1 bg-dark-700 rounded overflow-hidden">
                <div class="h-full rounded" :class="trendBarClass(trend.direction)" :style="{ width: `${(trend.strength || 0) * 100}%` }"></div>
              </div>
              <div class="text-xs text-dark-500 mt-1">{{ ((trend.strength || 0) * 100).toFixed(0) }}% strength</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Key Levels Section -->
      <div class="cursor-pointer" @click="toggleSection('levels')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Key Levels</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.levels }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.levels" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-3 bg-green-500/10 rounded-lg">
              <div class="text-xs text-green-400/70">Nearest Support</div>
              <div class="font-mono text-green-400 text-lg">${{ formatPrice(analysis.nearest_support) }}</div>
              <div v-if="analysis.support_strength" class="text-xs text-dark-500">Strength: {{ (analysis.support_strength * 100).toFixed(0) }}%</div>
            </div>
            <div class="p-3 bg-red-500/10 rounded-lg">
              <div class="text-xs text-red-400/70">Nearest Resistance</div>
              <div class="font-mono text-red-400 text-lg">${{ formatPrice(analysis.nearest_resistance) }}</div>
              <div v-if="analysis.resistance_strength" class="text-xs text-dark-500">Strength: {{ (analysis.resistance_strength * 100).toFixed(0) }}%</div>
            </div>
          </div>
          
          <div v-if="analysis.support_levels?.length" class="mb-3">
            <div class="text-xs text-dark-500 mb-2">Support Levels</div>
            <div class="space-y-1">
              <div v-for="(level, i) in analysis.support_levels.slice(0, 4)" :key="`support-${i}`"
                class="flex items-center justify-between text-xs p-2 bg-green-500/5 rounded">
                <span class="font-mono text-green-400">${{ formatPrice(level.price) }}</span>
                <span class="text-dark-500">{{ level.timeframe }}</span>
                <span class="text-dark-400">{{ level.distance_pct?.toFixed(2) }}% away</span>
              </div>
            </div>
          </div>
          
          <div v-if="analysis.resistance_levels?.length">
            <div class="text-xs text-dark-500 mb-2">Resistance Levels</div>
            <div class="space-y-1">
              <div v-for="(level, i) in analysis.resistance_levels.slice(0, 4)" :key="`resistance-${i}`"
                class="flex items-center justify-between text-xs p-2 bg-red-500/5 rounded">
                <span class="font-mono text-red-400">${{ formatPrice(level.price) }}</span>
                <span class="text-dark-500">{{ level.timeframe }}</span>
                <span class="text-dark-400">{{ level.distance_pct?.toFixed(2) }}% away</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pivot Points Section -->
      <div class="cursor-pointer" @click="toggleSection('pivots')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Pivot Points</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.pivots }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.pivots" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="p-3 bg-dark-800/50 rounded-lg mb-3 text-center">
            <div class="text-xs text-dark-500">Daily Pivot</div>
            <div class="font-mono text-brand-400 text-xl">${{ formatPrice(analysis.pivot_daily) }}</div>
            <div class="text-xs mt-1" :class="analysis.price_vs_pivot === 'ABOVE' ? 'text-green-400' : 'text-red-400'">
              Price {{ analysis.price_vs_pivot?.toLowerCase() || '-' }}
            </div>
          </div>
          
          <div class="mb-3">
            <div class="text-xs text-dark-500 mb-2">Traditional</div>
            <div class="grid grid-cols-3 gap-1 text-xs">
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R3</div>
                <div class="font-mono text-red-400">${{ formatPrice(analysis.pivot_r3_traditional) }}</div>
              </div>
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R2</div>
                <div class="font-mono text-red-400">${{ formatPrice(analysis.pivot_r2_traditional) }}</div>
              </div>
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R1</div>
                <div class="font-mono text-red-400">${{ formatPrice(analysis.pivot_r1_traditional) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S1</div>
                <div class="font-mono text-green-400">${{ formatPrice(analysis.pivot_s1_traditional) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S2</div>
                <div class="font-mono text-green-400">${{ formatPrice(analysis.pivot_s2_traditional) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S3</div>
                <div class="font-mono text-green-400">${{ formatPrice(analysis.pivot_s3_traditional) }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="hasPivotValue(analysis.pivot_r3_fibonacci)" class="mb-3">
            <div class="text-xs text-dark-500 mb-2">Fibonacci</div>
            <div class="grid grid-cols-3 gap-1 text-xs">
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R3</div>
                <div class="font-mono text-red-400 text-xs">${{ formatPrice(analysis.pivot_r3_fibonacci) }}</div>
              </div>
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R2</div>
                <div class="font-mono text-red-400 text-xs">${{ formatPrice(analysis.pivot_r2_fibonacci) }}</div>
              </div>
              <div class="p-1.5 bg-red-500/10 rounded text-center">
                <div class="text-red-400/60">R1</div>
                <div class="font-mono text-red-400 text-xs">${{ formatPrice(analysis.pivot_r1_fibonacci) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S1</div>
                <div class="font-mono text-green-400 text-xs">${{ formatPrice(analysis.pivot_s1_fibonacci) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S2</div>
                <div class="font-mono text-green-400 text-xs">${{ formatPrice(analysis.pivot_s2_fibonacci) }}</div>
              </div>
              <div class="p-1.5 bg-green-500/10 rounded text-center">
                <div class="text-green-400/60">S3</div>
                <div class="font-mono text-green-400 text-xs">${{ formatPrice(analysis.pivot_s3_fibonacci) }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="hasPivotValue(analysis.pivot_r4_camarilla) || hasPivotValue(analysis.pivot_r3_camarilla)" class="mb-3">
            <div class="text-xs text-dark-500 mb-2">Camarilla</div>
            <div class="grid grid-cols-4 gap-1 text-xs">
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_r4_camarilla) ? 'bg-red-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_r4_camarilla) ? 'text-red-400/60' : 'text-dark-600'" class="text-xs">R4</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_r4_camarilla) ? 'text-red-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_r4_camarilla) ? '$' + formatPrice(analysis.pivot_r4_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_r3_camarilla) ? 'bg-red-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_r3_camarilla) ? 'text-red-400/60' : 'text-dark-600'" class="text-xs">R3</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_r3_camarilla) ? 'text-red-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_r3_camarilla) ? '$' + formatPrice(analysis.pivot_r3_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_r2_camarilla) ? 'bg-red-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_r2_camarilla) ? 'text-red-400/60' : 'text-dark-600'" class="text-xs">R2</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_r2_camarilla) ? 'text-red-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_r2_camarilla) ? '$' + formatPrice(analysis.pivot_r2_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_r1_camarilla) ? 'bg-red-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_r1_camarilla) ? 'text-red-400/60' : 'text-dark-600'" class="text-xs">R1</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_r1_camarilla) ? 'text-red-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_r1_camarilla) ? '$' + formatPrice(analysis.pivot_r1_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_s1_camarilla) ? 'bg-green-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_s1_camarilla) ? 'text-green-400/60' : 'text-dark-600'" class="text-xs">S1</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_s1_camarilla) ? 'text-green-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_s1_camarilla) ? '$' + formatPrice(analysis.pivot_s1_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_s2_camarilla) ? 'bg-green-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_s2_camarilla) ? 'text-green-400/60' : 'text-dark-600'" class="text-xs">S2</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_s2_camarilla) ? 'text-green-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_s2_camarilla) ? '$' + formatPrice(analysis.pivot_s2_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_s3_camarilla) ? 'bg-green-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_s3_camarilla) ? 'text-green-400/60' : 'text-dark-600'" class="text-xs">S3</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_s3_camarilla) ? 'text-green-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_s3_camarilla) ? '$' + formatPrice(analysis.pivot_s3_camarilla) : 'N/A' }}
                </div>
              </div>
              <div class="p-1 rounded text-center" :class="hasPivotValue(analysis.pivot_s4_camarilla) ? 'bg-green-500/10' : 'bg-dark-800/30'">
                <div :class="hasPivotValue(analysis.pivot_s4_camarilla) ? 'text-green-400/60' : 'text-dark-600'" class="text-xs">S4</div>
                <div class="font-mono text-xs" :class="hasPivotValue(analysis.pivot_s4_camarilla) ? 'text-green-400' : 'text-dark-600'">
                  {{ hasPivotValue(analysis.pivot_s4_camarilla) ? '$' + formatPrice(analysis.pivot_s4_camarilla) : 'N/A' }}
                </div>
              </div>
            </div>
            <div v-if="!hasPivotValue(analysis.pivot_r1_camarilla) && !hasPivotValue(analysis.pivot_s1_camarilla)" class="mt-2 text-xs text-dark-600 italic">
              Camarilla pivot data not available from ML API
            </div>
          </div>
        </div>
      </div>
      
      <!-- Momentum Section -->
      <div class="cursor-pointer" @click="toggleSection('momentum')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Momentum</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.momentum }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.momentum && analysis.momentum" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="space-y-3">
            <div v-for="(mom, tf) in analysis.momentum" :key="`mom-${tf}`" class="p-3 bg-dark-800/50 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-dark-300">{{ tf }}</span>
                <span class="px-2 py-0.5 text-xs rounded"
                  :class="{
                    'bg-green-500/20 text-green-400': mom.rsi_status === 'OVERSOLD',
                    'bg-red-500/20 text-red-400': mom.rsi_status === 'OVERBOUGHT',
                    'bg-dark-700 text-dark-400': mom.rsi_status === 'NEUTRAL'
                  }">
                  {{ mom.rsi_status }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-dark-500">RSI:</span>
                  <span class="font-mono text-dark-300 ml-1">{{ mom.rsi?.toFixed(2) }}</span>
                </div>
                <div>
                  <span class="text-dark-500">Vol Ratio:</span>
                  <span class="font-mono text-dark-300 ml-1">{{ mom.volume_ratio?.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Warnings Section -->
      <div class="cursor-pointer" @click="toggleSection('warnings')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">⚠️ Warnings</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.warnings }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.warnings && analysis.warnings?.length" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="space-y-2">
            <div v-for="(warning, i) in analysis.warnings.filter(w => w && w.trim())" :key="`warning-${i}`"
              class="p-2 rounded border text-sm bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
              {{ warning }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Signal Factors Section -->
      <div class="cursor-pointer" @click="toggleSection('factors')">
        <div class="p-4 flex items-center justify-between border-t border-dark-700/50" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Signal Factors</h4>
          <svg class="w-4 h-4 text-dark-400 transition-transform" :class="{ 'rotate-180': expandedSections.factors }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSections.factors && analysis.signal_factors?.length" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }" @click.stop>
          <div class="space-y-1">
            <div v-for="(factor, i) in analysis.signal_factors" :key="`factor-${i}`"
              class="flex items-center justify-between text-xs p-2 rounded"
              :class="{
                'bg-green-500/10': factor.direction === 'BULLISH' || factor.weight > 0,
                'bg-red-500/10': factor.direction === 'BEARISH' || factor.weight < 0,
                'bg-dark-800/50': !factor.direction && factor.weight === 0
              }">
              <span class="text-dark-300">{{ factor.description }}</span>
              <span class="font-mono"
                :class="{
                  'text-green-400': factor.weight > 0,
                  'text-red-400': factor.weight < 0,
                  'text-dark-400': factor.weight === 0
                }">
                {{ factor.weight > 0 ? '+' : '' }}{{ formatWeight(factor.weight) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center py-8">
        <div class="text-4xl mb-2">📊</div>
        <div class="text-dark-400">No analysis data available</div>
        <div class="text-xs text-dark-500 mt-1">Waiting for ML API...</div>
      </div>
    </div>
  </div>
</template>
