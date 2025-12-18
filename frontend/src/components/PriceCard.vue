<script setup>
import { computed } from 'vue'
import { formatPrice, formatCompact, formatPercent, getLiquidityBadge } from '../utils/format'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  change: { type: Number, default: null },
  format: { type: String, default: 'number' }, // number, currency, compact, percent, bps
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  indicator: { type: String, default: null }, // up, down, neutral
  badge: { type: String, default: null }, // liquidity rating
  size: { type: String, default: 'normal' } // normal, large, compact
})

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return '-'
  
  const num = Number(props.value)
  if (isNaN(num)) return '-'
  
  switch (props.format) {
    case 'currency':
      return '$' + num.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    case 'compact':
      return formatCompact(num)
    case 'percent':
      return num.toFixed(1) + '%'
    case 'bps':
      return (num * 10000).toFixed(2) + ' bps'
    default:
      return formatPrice(num)
  }
})

const changeClass = computed(() => {
  if (props.change === null) return ''
  return props.change >= 0 ? 'text-green-400' : 'text-red-400'
})

const changeText = computed(() => {
  if (props.change === null) return null
  const sign = props.change >= 0 ? '+' : ''
  return `${sign}${props.change.toFixed(2)}%`
})

const indicatorClass = computed(() => {
  if (!props.indicator) return ''
  switch (props.indicator) {
    case 'up': return 'text-green-400'
    case 'down': return 'text-red-400'
    default: return 'text-dark-400'
  }
})

const badgeInfo = computed(() => {
  if (!props.badge) return null
  return getLiquidityBadge(props.badge)
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'large':
      return {
        container: 'p-4',
        label: 'text-xs',
        value: 'text-2xl',
        change: 'text-sm'
      }
    case 'compact':
      return {
        container: 'p-2',
        label: 'text-xs',
        value: 'text-lg',
        change: 'text-xs'
      }
    default:
      return {
        container: 'p-3',
        label: 'text-xs',
        value: 'text-xl',
        change: 'text-xs'
      }
  }
})
</script>

<template>
  <div class="card" :class="sizeClasses.container">
    <!-- Label Row -->
    <div class="flex items-center justify-between mb-1">
      <span class="text-dark-500 font-medium" :class="sizeClasses.label">{{ label }}</span>
      <span v-if="badgeInfo" :class="['badge text-xs', badgeInfo.class]">
        {{ badgeInfo.emoji }} {{ badgeInfo.text }}
      </span>
    </div>
    
    <!-- Value Row -->
    <div class="flex items-baseline gap-2">
      <span 
        class="font-mono font-bold tabular-nums"
        :class="[sizeClasses.value, indicatorClass || 'text-dark-100']"
      >
        {{ prefix }}{{ formattedValue }}{{ suffix }}
      </span>
      
      <!-- Change indicator -->
      <span 
        v-if="changeText" 
        class="font-mono"
        :class="[sizeClasses.change, changeClass]"
      >
        {{ changeText }}
      </span>
    </div>
    
    <!-- Indicator bar for buy ratio etc -->
    <div v-if="props.format === 'percent' && props.value !== null" class="mt-2">
      <div class="h-1 bg-dark-700 rounded-full overflow-hidden">
        <div 
          class="h-full transition-all duration-300"
          :class="Number(props.value) > 55 ? 'bg-green-500' : Number(props.value) < 45 ? 'bg-red-500' : 'bg-yellow-500'"
          :style="{ width: `${Math.min(100, Math.max(0, Number(props.value)))}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
