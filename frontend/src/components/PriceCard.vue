<script setup>
import { computed } from 'vue'
import { formatCurrency, formatCompact, formatPercent, getLiquidityBadge } from '../utils/format'

const props = defineProps({
  label: String,
  value: [Number, String],
  change: Number,
  format: {
    type: String,
    default: 'number' // number, currency, percent, compact, bps
  },
  prefix: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'normal' // normal, large
  },
  indicator: {
    type: String,
    default: null // up, down, neutral
  },
  badge: {
    type: String,
    default: null
  }
})

const formattedValue = computed(() => {
  if (!props.value && props.value !== 0) return '-'
  
  switch (props.format) {
    case 'currency':
      return formatCurrency(props.value)
    case 'compact':
      return props.prefix + formatCompact(props.value)
    case 'percent':
      return props.value.toFixed(1) + '%'
    case 'bps':
      return (props.value * 100).toFixed(3) + '%'
    default:
      return props.value.toLocaleString()
  }
})

const changeClass = computed(() => {
  if (props.change > 0) return 'price-up'
  if (props.change < 0) return 'price-down'
  return 'price-neutral'
})

const indicatorClass = computed(() => {
  if (props.indicator === 'up') return 'price-up'
  if (props.indicator === 'down') return 'price-down'
  return 'price-neutral'
})

const badgeInfo = computed(() => {
  if (!props.badge) return null
  return getLiquidityBadge(props.badge)
})
</script>

<template>
  <div class="card p-3 lg:p-4">
    <div class="flex items-start justify-between mb-1">
      <span class="stat-label">{{ label }}</span>
      <span v-if="badgeInfo" :class="['badge', badgeInfo.class]">
        {{ badgeInfo.emoji }} {{ badgeInfo.text }}
      </span>
    </div>
    <div 
      class="font-semibold mono tabular-nums"
      :class="[
        size === 'large' ? 'text-xl lg:text-2xl' : 'text-lg',
        indicator ? indicatorClass : ''
      ]"
    >
      {{ formattedValue }}
    </div>
    <div v-if="change !== undefined" class="text-xs mt-1" :class="changeClass">
      {{ formatPercent(change) }}
    </div>
  </div>
</template>
