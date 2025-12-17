<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { useMarketStore } from '../store/market'
import { formatCurrency, formatQuantity, formatTime } from '../utils/format'

const store = useMarketStore()

const chartContainer = ref(null)
const legendData = ref(null)

let chart = null
let candleSeries = null
let volumeSeries = null
let resizeObserver = null

// Chart configuration
const chartOptions = {
  layout: {
    background: { type: 'solid', color: 'transparent' },
    textColor: '#94a3b8'
  },
  grid: {
    vertLines: { color: '#1e293b' },
    horzLines: { color: '#1e293b' }
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: '#475569',
      labelBackgroundColor: '#334155'
    },
    horzLine: {
      color: '#475569',
      labelBackgroundColor: '#334155'
    }
  },
  rightPriceScale: {
    borderColor: '#334155',
    scaleMargins: {
      top: 0.1,
      bottom: 0.2
    }
  },
  timeScale: {
    borderColor: '#334155',
    timeVisible: true,
    secondsVisible: false
  },
  handleScroll: {
    vertTouchDrag: false
  }
}

const candleSeriesOptions = {
  upColor: '#22c55e',
  downColor: '#ef4444',
  borderUpColor: '#22c55e',
  borderDownColor: '#ef4444',
  wickUpColor: '#22c55e',
  wickDownColor: '#ef4444'
}

const volumeSeriesOptions = {
  color: '#475569',
  priceFormat: {
    type: 'volume'
  },
  priceScaleId: 'volume',
  scaleMargins: {
    top: 0.8,
    bottom: 0
  }
}

// Transform kline data for chart
function transformCandles(history) {
  if (!history || !Array.isArray(history)) return []
  
  return history
    .filter(k => k && k.time)
    .map(k => ({
      time: Math.floor(k.time / 1000),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close
    }))
    .sort((a, b) => a.time - b.time)
}

function transformVolume(history) {
  if (!history || !Array.isArray(history)) return []
  
  return history
    .filter(k => k && k.time)
    .map(k => ({
      time: Math.floor(k.time / 1000),
      value: k.volume,
      color: k.close >= k.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    }))
    .sort((a, b) => a.time - b.time)
}

// Initialize chart
function initChart() {
  if (!chartContainer.value) return
  
  chart = createChart(chartContainer.value, {
    ...chartOptions,
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight
  })
  
  // Add candle series
  candleSeries = chart.addCandlestickSeries(candleSeriesOptions)
  
  // Add volume series
  volumeSeries = chart.addHistogramSeries(volumeSeriesOptions)
  
  // Configure volume price scale
  chart.priceScale('volume').applyOptions({
    scaleMargins: {
      top: 0.8,
      bottom: 0
    },
    borderVisible: false
  })
  
  // Subscribe to crosshair move
  chart.subscribeCrosshairMove(param => {
    if (param.time) {
      const candleData = param.seriesData.get(candleSeries)
      const volumeData = param.seriesData.get(volumeSeries)
      
      if (candleData) {
        legendData.value = {
          time: new Date(param.time * 1000).toLocaleString(),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeData?.value
        }
      }
    } else {
      legendData.value = null
    }
  })
  
  // Set up resize observer
  resizeObserver = new ResizeObserver(entries => {
    if (chart && entries[0]) {
      const { width, height } = entries[0].contentRect
      chart.applyOptions({ width, height })
    }
  })
  
  resizeObserver.observe(chartContainer.value)
}

// Update chart data
function updateChart() {
  if (!candleSeries || !volumeSeries) return
  
  const candles = transformCandles(store.klineHistory)
  const volumes = transformVolume(store.klineHistory)
  
  if (candles.length > 0) {
    candleSeries.setData(candles)
    volumeSeries.setData(volumes)
  }
  
  // Update current candle if exists
  if (store.kline && store.kline.time) {
    const currentCandle = {
      time: Math.floor(store.kline.time / 1000),
      open: store.kline.open,
      high: store.kline.high,
      low: store.kline.low,
      close: store.kline.close
    }
    
    candleSeries.update(currentCandle)
    
    volumeSeries.update({
      time: currentCandle.time,
      value: store.kline.volume,
      color: store.kline.close >= store.kline.open 
        ? 'rgba(34, 197, 94, 0.5)' 
        : 'rgba(239, 68, 68, 0.5)'
    })
  }
}

// Watch for data changes
watch(
  () => store.klineHistory,
  () => updateChart(),
  { deep: true }
)

watch(
  () => store.kline,
  () => {
    if (store.kline && candleSeries) {
      const currentCandle = {
        time: Math.floor(store.kline.time / 1000),
        open: store.kline.open,
        high: store.kline.high,
        low: store.kline.low,
        close: store.kline.close
      }
      
      candleSeries.update(currentCandle)
      
      if (volumeSeries) {
        volumeSeries.update({
          time: currentCandle.time,
          value: store.kline.volume,
          color: store.kline.close >= store.kline.open 
            ? 'rgba(34, 197, 94, 0.5)' 
            : 'rgba(239, 68, 68, 0.5)'
        })
      }
    }
  },
  { deep: true }
)

// Reset chart on symbol/interval change
watch(
  () => [store.symbol, store.interval],
  () => {
    if (candleSeries && volumeSeries) {
      candleSeries.setData([])
      volumeSeries.setData([])
    }
  }
)

onMounted(() => {
  initChart()
  updateChart()
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (chart) {
    chart.remove()
    chart = null
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Chart Header -->
    <div class="card-header">
      <div class="flex items-center gap-3">
        <h3 class="card-title">{{ store.symbol }} Chart</h3>
        <span class="badge badge-gray">{{ store.interval }}</span>
      </div>
      
      <!-- Legend (shown on hover) -->
      <div v-if="legendData" class="flex items-center gap-4 text-xs mono">
        <span>O: <span :class="legendData.close >= legendData.open ? 'price-up' : 'price-down'">{{ formatCurrency(legendData.open) }}</span></span>
        <span>H: <span class="price-up">{{ formatCurrency(legendData.high) }}</span></span>
        <span>L: <span class="price-down">{{ formatCurrency(legendData.low) }}</span></span>
        <span>C: <span :class="legendData.close >= legendData.open ? 'price-up' : 'price-down'">{{ formatCurrency(legendData.close) }}</span></span>
        <span v-if="legendData.volume">V: {{ formatQuantity(legendData.volume) }}</span>
      </div>
    </div>
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 min-h-0"></div>
  </div>
</template>
