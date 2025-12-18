<script setup>
import { computed, ref } from 'vue'
import { useMarketStore } from '../store/market'
import { formatPrice } from '../utils/format'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const expandedSection = ref('trends')

const analysis = computed(() => store.marketAnalysis)

const toggleSection = (section) => {
  expandedSection.value = expandedSection.value === section ? null : section
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

const severityClass = (severity) => {
  if (severity === 'CRITICAL') return 'bg-red-500/20 text-red-400 border-red-500/30'
  if (severity === 'HIGH') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (severity === 'MEDIUM') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-dark-700 text-dark-400'
}
</script>

<template>
  <div class="h-full overflow-auto">
    <div v-if="analysis" class="divide-y divide-dark-700/50">
      <!-- SMC Overview -->
      <div class="p-4" :class="{ 'p-3': mobile }">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-dark-200">Smart Money Concepts</h4>
          <span 
            class="px-2 py-1 text-xs rounded"
            :class="biasClass(analysis.smc_bias)"
          >
            {{ analysis.smc_bias || 'NEUTRAL' }}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-xs text-dark-500">Price Zone</div>
            <div class="font-medium" :class="zoneClass(analysis.price_zone)">
              {{ analysis.price_zone || '-' }}
            </div>
          </div>
          <div class="p-2 bg-dark-800/50 rounded">
            <div class="text-xs text-dark-500">Equilibrium</div>
            <div class="font-mono text-dark-300 text-sm">
              ${{ formatPrice(analysis.equilibrium_price) }}
            </div>
          </div>
        </div>
        
        <!-- Order Blocks -->
        <div v-if="analysis.smc_order_blocks?.length" class="mt-3">
          <div class="text-xs text-dark-500 mb-2">Order Blocks</div>
          <div class="space-y-1">
            <div 
              v-for="(ob, i) in analysis.smc_order_blocks.slice(0, 3)"
              :key="i"
              class="flex items-center justify-between text-xs p-2 rounded"
              :class="ob.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'"
            >
              <span :class="ob.type === 'bullish' ? 'text-green-400' : 'text-red-400'">
                {{ ob.type === 'bullish' ? '🟢' : '🔴' }} {{ ob.type }}
              </span>
              <span class="font-mono text-dark-300">
                ${{ formatPrice(ob.low) }} - ${{ formatPrice(ob.high) }}
              </span>
              <span class="text-dark-500">{{ ob.distance_pct?.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Trends Section -->
      <div class="cursor-pointer" @click="toggleSection('trends')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Multi-Timeframe Trends</h4>
          <svg 
            class="w-4 h-4 text-dark-400 transition-transform"
            :class="{ 'rotate-180': expandedSection === 'trends' }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSection === 'trends' && analysis.trends" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }">
          <div class="grid grid-cols-2 gap-2">
            <div 
              v-for="(trend, tf) in analysis.trends"
              :key="tf"
              class="p-2 bg-dark-800/50 rounded"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-dark-500 font-medium">{{ tf }}</span>
                <span>{{ trendIcon(trend.direction) }}</span>
              </div>
              <div class="text-sm font-medium" :class="trendClass(trend.direction)">
                {{ trend.direction?.replace('TREND', '') || '-' }}
              </div>
              <div class="mt-1 h-1 bg-dark-700 rounded overflow-hidden">
                <div 
                  class="h-full rounded"
                  :class="trendClass(trend.direction).replace('text-', 'bg-')"
                  :style="{ width: `${(trend.strength || 0) * 100}%` }"
                ></div>
              </div>
              <div class="text-xs text-dark-500 mt-1">{{ ((trend.strength || 0) * 100).toFixed(0) }}% strength</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Support/Resistance Section -->
      <div class="cursor-pointer" @click="toggleSection('levels')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Key Levels</h4>
          <svg 
            class="w-4 h-4 text-dark-400 transition-transform"
            :class="{ 'rotate-180': expandedSection === 'levels' }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSection === 'levels'" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }">
          <!-- Nearest Levels -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-3 bg-green-500/10 rounded-lg">
              <div class="text-xs text-green-400/70">Nearest Support</div>
              <div class="font-mono text-green-400 text-lg">${{ formatPrice(analysis.nearest_support) }}</div>
              <div v-if="analysis.support_strength" class="text-xs text-dark-500">
                Strength: {{ (analysis.support_strength * 100).toFixed(0) }}%
              </div>
            </div>
            <div class="p-3 bg-red-500/10 rounded-lg">
              <div class="text-xs text-red-400/70">Nearest Resistance</div>
              <div class="font-mono text-red-400 text-lg">${{ formatPrice(analysis.nearest_resistance) }}</div>
              <div v-if="analysis.resistance_strength" class="text-xs text-dark-500">
                Strength: {{ (analysis.resistance_strength * 100).toFixed(0) }}%
              </div>
            </div>
          </div>
          
          <!-- Support Levels -->
          <div v-if="analysis.support_levels?.length" class="mb-3">
            <div class="text-xs text-dark-500 mb-2">Support Levels</div>
            <div class="space-y-1">
              <div 
                v-for="(level, i) in analysis.support_levels.slice(0, 4)"
                :key="`support-${i}`"
                class="flex items-center justify-between text-xs p-2 bg-green-500/5 rounded"
              >
                <span class="font-mono text-green-400">${{ formatPrice(level.price) }}</span>
                <span class="text-dark-500">{{ level.timeframe }}</span>
                <span class="text-dark-400">{{ level.distance_pct?.toFixed(2) }}% away</span>
              </div>
            </div>
          </div>
          
          <!-- Resistance Levels -->
          <div v-if="analysis.resistance_levels?.length">
            <div class="text-xs text-dark-500 mb-2">Resistance Levels</div>
            <div class="space-y-1">
              <div 
                v-for="(level, i) in analysis.resistance_levels.slice(0, 4)"
                :key="`resistance-${i}`"
                class="flex items-center justify-between text-xs p-2 bg-red-500/5 rounded"
              >
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
          <svg 
            class="w-4 h-4 text-dark-400 transition-transform"
            :class="{ 'rotate-180': expandedSection === 'pivots' }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSection === 'pivots'" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }">
          <!-- Daily Pivot -->
          <div class="p-3 bg-dark-800/50 rounded-lg mb-3 text-center">
            <div class="text-xs text-dark-500">Daily Pivot</div>
            <div class="font-mono text-brand-400 text-xl">${{ formatPrice(analysis.pivot_daily) }}</div>
            <div class="text-xs mt-1" :class="analysis.price_vs_pivot === 'ABOVE' ? 'text-green-400' : 'text-red-400'">
              Price {{ analysis.price_vs_pivot?.toLowerCase() || '-' }}
            </div>
          </div>
          
          <!-- Traditional Pivots -->
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
        </div>
      </div>
      
      <!-- Momentum Section -->
      <div class="cursor-pointer" @click="toggleSection('momentum')">
        <div class="p-4 flex items-center justify-between" :class="{ 'p-3': mobile }">
          <h4 class="text-sm font-medium text-dark-200">Momentum</h4>
          <svg 
            class="w-4 h-4 text-dark-400 transition-transform"
            :class="{ 'rotate-180': expandedSection === 'momentum' }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        
        <div v-if="expandedSection === 'momentum' && analysis.momentum" class="px-4 pb-4" :class="{ 'px-3 pb-3': mobile }">
          <div class="space-y-3">
            <div 
              v-for="(mom, tf) in analysis.momentum"
              :key="`mom-${tf}`"
              class="p-3 bg-dark-800/50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-dark-300">{{ tf }}</span>
                <span 
                  class="px-2 py-0.5 text-xs rounded"
                  :class="{
                    'bg-green-500/20 text-green-400': mom.rsi_status === 'OVERSOLD',
                    'bg-red-500/20 text-red-400': mom.rsi_status === 'OVERBOUGHT',
                    'bg-dark-700 text-dark-400': mom.rsi_status === 'NEUTRAL'
                  }"
                >
                  {{ mom.rsi_status }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-dark-500">RSI:</span>
                  <span class="font-mono text-dark-300 ml-1">{{ mom.rsi?.toFixed(1) }}</span>
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
      <div v-if="analysis.warnings?.length" class="p-4" :class="{ 'p-3': mobile }">
        <h4 class="text-sm font-medium text-dark-200 mb-3">⚠️ Warnings</h4>
        <div class="space-y-2">
          <div 
            v-for="(warning, i) in analysis.warnings"
            :key="`warning-${i}`"
            class="p-2 rounded border text-sm"
            :class="severityClass(warning.severity)"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ warning.type?.replace(/_/g, ' ') }}</span>
              <span class="text-xs opacity-70">{{ warning.severity }}</span>
            </div>
            <div class="text-xs mt-1 opacity-80">{{ warning.message }}</div>
          </div>
        </div>
      </div>
      
      <!-- Signal Factors -->
      <div v-if="analysis.signal_factors?.length" class="p-4 border-t border-dark-700/50" :class="{ 'p-3': mobile }">
        <h4 class="text-sm font-medium text-dark-200 mb-3">Signal Factors</h4>
        <div class="space-y-1">
          <div 
            v-for="(factor, i) in analysis.signal_factors"
            :key="`factor-${i}`"
            class="flex items-center justify-between text-xs p-2 rounded"
            :class="{
              'bg-green-500/10': factor.direction === 'BULLISH' || factor.weight > 0,
              'bg-red-500/10': factor.direction === 'BEARISH' || factor.weight < 0,
              'bg-dark-800/50': !factor.direction && factor.weight === 0
            }"
          >
            <span class="text-dark-300">{{ factor.description }}</span>
            <span 
              class="font-mono"
              :class="{
                'text-green-400': factor.weight > 0,
                'text-red-400': factor.weight < 0,
                'text-dark-400': factor.weight === 0
              }"
            >
              {{ factor.weight > 0 ? '+' : '' }}{{ factor.weight }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Data State -->
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center py-8">
        <div class="text-4xl mb-2">📊</div>
        <div class="text-dark-400">No analysis data available</div>
        <div class="text-xs text-dark-500 mt-1">Waiting for ML API...</div>
      </div>
    </div>
  </div>
</template>
