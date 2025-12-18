<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'
import { useMarketStore } from '../store/market'
import { formatCurrency, formatQuantity } from '../utils/format'

const store = useMarketStore()

const chartContainer = ref(null)
const legendData = ref(null)
const isMobile = ref(false)

let chart = null
let candleSeries = null
let volumeSeries = null
let resizeObserver = null

// Check if mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Get timezone offset in minutes
const getTimezoneOffsetMinutes = () => {
  try {
    // Get local timezone offset (negative because JS returns opposite sign)
    return -new Date().getTimezoneOffset()
  } catch (e) {
    console.warn('Could not detect timezone, using UTC')
    return 0
  }
}

// Get timezone name for display
const getTimezoneName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (e) {
    return 'UTC'
  }
}

// Chart configuration with local timezone
const getChartOptions = () => ({
  layout: {
    textColor: '#94a3b8',
    background: { color: 'transparent' }
  },
  grid: {
    vertLines: { color: '#1e293b' },
    horzLines: { color: '#1e293b' }
  },
  timeScale: {
    borderColor: '#334155',
    timeVisible: true,
    secondsVisible: false,
    // Use local timezone offset
    // Lightweight Charts uses this to display times in local timezone
  },
  localization: {
    // Format dates in local timezone
    timeFormatter: (timestamp) => {
      const date = new Date(timestamp * 1000)
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    },
    dateFormatter: (timestamp) => {
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    }
  }
})

// Transform kline data for chart
// Note: Binance timestamps are in UTC milliseconds
// We keep them as-is (UTC seconds) and let lightweight-charts handle display
function transformCandles(history) {
  if (!history || !Array.isArray(history)) {
    console.log('No history data')
    return []
  }
  
  const candles = history
    .filter(k => {
      if (!k || !k.time) return false
      if (isNaN(k.open) || isNaN(k.high) || isNaN(k.low) || isNaN(k.close)) return false
      return true
    })
    .map(k => ({
      // Convert from milliseconds to seconds (UTC timestamp)
      time: Math.floor(k.time / 1000),
      open: Number(k.open),
      high: Number(k.high),
      low: Number(k.low),
      close: Number(k.close)
    }))
    .sort((a, b) => a.time - b.time)
  
  console.log(`Transformed ${candles.length} candles`)
  if (candles.length > 0) {
    console.log('First candle:', candles[0], 'Local time:', new Date(candles[0].time * 1000).toLocaleString())
    console.log('Last candle:', candles[candles.length - 1], 'Local time:', new Date(candles[candles.length - 1].time * 1000).toLocaleString())
  }
  
  return candles
}

function transformVolume(history) {
  if (!history || !Array.isArray(history)) return []
  
  return history
    .filter(k => k && k.time && !isNaN(k.volume))
    .map(k => ({
      time: Math.floor(k.time / 1000),
      value: Number(k.volume),
      color: k.close >= k.open ? '#22c55e80' : '#ef444480'
    }))
    .sort((a, b) => a.time - b.time)
}

// Initialize chart
function initChart() {
  if (!chartContainer.value) {
    console.log('No chart container')
    return
  }
  
  console.log('Initializing chart...')
  console.log('Detected timezone:', getTimezoneName(), 'Offset:', getTimezoneOffsetMinutes(), 'minutes')
  checkMobile()
  
  try {
    chart = createChart(chartContainer.value, {
      ...getChartOptions(),
      width: chartContainer.value.clientWidth,
      height: chartContainer.value.clientHeight
    })
    
    // Add candlestick series - v5 API: pass series type as first param
    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    })
    
    // Add volume histogram series - v5 API
    volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#475569',
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'volume'
    })
    
    // Configure volume price scale
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    })
    
    // Subscribe to crosshair move (desktop only)
    if (!isMobile.value) {
      chart.subscribeCrosshairMove(param => {
        if (param.time) {
          const candleData = param.seriesData.get(candleSeries)
          const volumeData = param.seriesData.get(volumeSeries)
          
          if (candleData) {
            // Format time in local timezone
            const date = new Date(param.time * 1000)
            legendData.value = {
              time: date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }),
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
    }
    
    // Set up resize observer
    resizeObserver = new ResizeObserver(entries => {
      if (chart && entries[0]) {
        const { width, height } = entries[0].contentRect
        chart.applyOptions({ width, height })
      }
    })
    
    resizeObserver.observe(chartContainer.value)
    
    console.log('Chart initialized successfully')
    
    // Initial data load
    updateChart()
  } catch (error) {
    console.error('Failed to initialize chart:', error)
  }
}

// Update chart data
function updateChart() {
  if (!candleSeries || !volumeSeries) {
    console.log('Series not initialized')
    return
  }
  
  console.log('Updating chart with klineHistory:', store.klineHistory?.length || 0, 'items')
  
  const candles = transformCandles(store.klineHistory)
  const volumes = transformVolume(store.klineHistory)
  
  if (candles.length > 0) {
    console.log('Setting candle data:', candles.length, 'candles')
    candleSeries.setData(candles)
    volumeSeries.setData(volumes)
  } else {
    console.warn('No valid candle data to display')
  }
}

// Watch for data changes
watch(
  () => store.klineHistory,
  (newHistory) => {
    console.log('klineHistory changed:', newHistory?.length || 0, 'items')
    if (candleSeries && newHistory && newHistory.length > 0) {
      updateChart()
    }
  },
  { deep: true }
)

watch(
  () => store.kline,
  (newKline) => {
    if (newKline && candleSeries && newKline.time) {
      const currentCandle = {
        time: Math.floor(newKline.time / 1000),
        open: Number(newKline.open),
        high: Number(newKline.high),
        low: Number(newKline.low),
        close: Number(newKline.close)
      }
      
      if (!isNaN(currentCandle.open) && !isNaN(currentCandle.high) && 
          !isNaN(currentCandle.low) && !isNaN(currentCandle.close)) {
        candleSeries.update(currentCandle)
        
        if (volumeSeries) {
          volumeSeries.update({
            time: currentCandle.time,
            value: Number(newKline.volume),
            color: newKline.close >= newKline.open ? '#22c55e80' : '#ef444480'
          })
        }
      }
    }
  },
  { deep: true }
)

// Reset chart on interval change
watch(
  () => store.interval,
  () => {
    console.log('Interval changed to:', store.interval)
    if (candleSeries && volumeSeries) {
      candleSeries.setData([])
      volumeSeries.setData([])
    }
  }
)

// Handle window resize
const handleResize = () => {
  const wasMobile = isMobile.value
  checkMobile()
  
  if (wasMobile !== isMobile.value && chart) {
    chart.applyOptions(getChartOptions())
  }
}

onMounted(() => {
  console.log('CandlestickChart mounted')
  window.addEventListener('resize', handleResize)
  initChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
      <div class="flex items-center gap-2">
        <h3 class="card-title">BTCUSDT</h3>
        <span class="badge badge-gray text-xs">{{ store.interval }}</span>
      </div>
      
      <!-- Legend (shown on hover, desktop only) -->
      <div v-if="legendData && !isMobile" class="hidden sm:flex items-center gap-3 text-xs font-mono">
        <span class="text-dark-500">{{ legendData.time }}</span>
        <span>O: <span :class="legendData.close >= legendData.open ? 'price-up' : 'price-down'">{{ formatCurrency(legendData.open) }}</span></span>
        <span>H: <span class="price-up">{{ formatCurrency(legendData.high) }}</span></span>
        <span>L: <span class="price-down">{{ formatCurrency(legendData.low) }}</span></span>
        <span>C: <span :class="legendData.close >= legendData.open ? 'price-up' : 'price-down'">{{ formatCurrency(legendData.close) }}</span></span>
        <span v-if="legendData.volume" class="text-dark-400">V: {{ formatQuantity(legendData.volume) }}</span>
      </div>
      
      <!-- Mobile: Current Price -->
      <div v-else class="sm:hidden flex items-center gap-2">
        <span 
          class="font-mono font-bold"
          :class="store.isPriceUp ? 'text-green-400' : 'text-red-400'"
        >
          ${{ store.lastPrice?.toLocaleString('en-US', { maximumFractionDigits: 2 }) }}
        </span>
      </div>
    </div>
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 min-h-0 touch-pan-y"></div>
  </div>
</template>

<style scoped>
.touch-pan-y {
  touch-action: pan-y pinch-zoom;
}
</style>
