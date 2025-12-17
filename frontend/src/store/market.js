import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'

export const useMarketStore = defineStore('market', () => {
  // ============ Configuration ============
  const config = ref({
    binance_ws_base: 'wss://stream.binance.com:9443',
    binance_rest_base: 'https://api.binance.com/api/v3',
    supported_intervals: ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'],
    popular_symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT'],
    max_candles: 500,
    max_trades: 100
  })
  
  // ============ Connection State ============
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref(null)
  
  // ============ Market Parameters ============
  const symbol = ref('BTCUSDT')
  const interval = ref('1m')
  const refreshRate = ref(10)
  
  // ============ Market Data ============
  const ticker = ref({
    bid_price: 0,
    bid_qty: 0,
    ask_price: 0,
    ask_qty: 0,
    spread: 0,
    spread_pct: 0
  })
  
  const kline = ref({
    time: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    quote_volume: 0,
    trades: 0,
    taker_buy_volume: 0,
    taker_buy_quote_volume: 0,
    is_closed: false
  })
  
  // Use shallowRef for large arrays to improve performance
  const klineHistory = shallowRef([])
  const trades = shallowRef([])
  const orderbook = ref({
    bids: [],
    asks: [],
    imbalance: 0
  })
  
  // ============ UI State ============
  const showOrderBook = ref(true)
  const showTrades = ref(true)
  const showVolume = ref(true)
  const orderbookDepth = ref(10)
  const tradesCount = ref(15)
  
  // ============ Statistics ============
  const stats = ref({
    trades_received: 0,
    klines_received: 0,
    orderbook_updates: 0,
    messages_per_second: 0,
    connected_at: null,
    last_update: null
  })
  
  // ============ WebSocket Management ============
  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10
  
  // Connection ID to prevent race conditions
  let connectionId = 0
  let isManualDisconnect = false
  
  // Message rate tracking
  let messageCount = 0
  let rateInterval = null
  
  // ============ Computed Properties ============
  const lastPrice = computed(() => kline.value?.close || ticker.value?.bid_price || 0)
  
  const priceChangePercent = computed(() => {
    if (!kline.value?.open || !kline.value?.close) return 0
    return ((kline.value.close - kline.value.open) / kline.value.open) * 100
  })
  
  const isPriceUp = computed(() => priceChangePercent.value > 0)
  
  const buyRatio = computed(() => {
    if (!kline.value?.quote_volume || kline.value.quote_volume === 0) return 50
    return (kline.value.taker_buy_quote_volume / kline.value.quote_volume) * 100
  })
  
  const spreadPercent = computed(() => ticker.value?.spread_pct || 0)
  
  const liquidityRating = computed(() => {
    const sp = spreadPercent.value
    if (sp < 0.0001) return 'excellent'
    if (sp < 0.0002) return 'very_good'
    if (sp < 0.0005) return 'good'
    if (sp < 0.001) return 'moderate'
    return 'poor'
  })
  
  const orderbookImbalance = computed(() => orderbook.value?.imbalance || 0)
  
  // Track if initial config has been loaded
  let configLoaded = false
  
  // ============ Binance WebSocket Connection ============
  async function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return
    }
    
    // Load config from server only on first connect
    if (!configLoaded) {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const serverConfig = await response.json()
          Object.assign(config.value, serverConfig)
          // Only set default symbol on initial load
          if (serverConfig.default_symbol) {
            symbol.value = serverConfig.default_symbol
          }
          configLoaded = true
        }
      } catch (e) {
        console.warn('Could not load config from server, using defaults')
        configLoaded = true
      }
    }
    
    // Fetch initial data
    await fetchInitialData()
    
    // Connect to Binance WebSocket
    connectWebSocket()
  }
  
  async function fetchInitialData() {
    const sym = symbol.value.toUpperCase()
    
    // Fetch order book snapshot
    try {
      const response = await fetch(
        `${config.value.binance_rest_base}/depth?symbol=${sym}&limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        orderbook.value.bids = data.bids.map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        }))
        orderbook.value.asks = data.asks.map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        }))
        calculateImbalance()
      }
    } catch (e) {
      console.error('Failed to fetch order book:', e)
    }
    
    // Fetch historical klines
    try {
      const response = await fetch(
        `${config.value.binance_rest_base}/klines?symbol=${sym}&interval=${interval.value}&limit=${config.value.max_candles}`
      )
      if (response.ok) {
        const data = await response.json()
        klineHistory.value = data.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          close_time: k[6],
          quote_volume: parseFloat(k[7]),
          trades: k[8],
          taker_buy_volume: parseFloat(k[9]),
          taker_buy_quote_volume: parseFloat(k[10]),
          is_closed: true
        }))
      }
    } catch (e) {
      console.error('Failed to fetch kline history:', e)
    }
    
    // Fetch recent trades
    try {
      const response = await fetch(
        `${config.value.binance_rest_base}/trades?symbol=${sym}&limit=50`
      )
      if (response.ok) {
        const data = await response.json()
        trades.value = data.map(t => ({
          id: t.id,
          time: t.time,
          price: parseFloat(t.price),
          quantity: parseFloat(t.qty),
          quote_volume: parseFloat(t.price) * parseFloat(t.qty),
          is_buyer_maker: t.isBuyerMaker,
          side: t.isBuyerMaker ? 'sell' : 'buy'
        }))
      }
    } catch (e) {
      console.error('Failed to fetch trades:', e)
    }
  }
  
  function connectWebSocket() {
    // Increment connection ID to invalidate any pending operations
    const thisConnectionId = ++connectionId
    
    isConnecting.value = true
    connectionError.value = null
    isManualDisconnect = false
    
    const sym = symbol.value.toLowerCase()
    const streams = [
      `${sym}@kline_${interval.value}`,
      `${sym}@aggTrade`,
      `${sym}@bookTicker`,
      `${sym}@depth@100ms`
    ]
    
    const wsUrl = `${config.value.binance_ws_base}/stream?streams=${streams.join('/')}`
    
    console.log(`[${thisConnectionId}] Connecting to Binance WebSocket:`, sym)
    
    try {
      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        // Check if this connection is still valid
        if (thisConnectionId !== connectionId) {
          console.log(`[${thisConnectionId}] Connection invalidated, closing`)
          ws.close()
          return
        }
        
        console.log(`[${thisConnectionId}] ✅ Connected to Binance WebSocket`)
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts = 0
        stats.value.connected_at = new Date().toISOString()
        
        // Start message rate tracking
        startRateTracking()
      }
      
      ws.onmessage = (event) => {
        // Ignore messages from old connections
        if (thisConnectionId !== connectionId) return
        
        try {
          const data = JSON.parse(event.data)
          handleBinanceMessage(data)
          messageCount++
        } catch (e) {
          console.error('Failed to parse message:', e)
        }
      }
      
      ws.onerror = (error) => {
        if (thisConnectionId !== connectionId) return
        console.error('WebSocket error:', error)
        connectionError.value = 'Connection error'
      }
      
      ws.onclose = (event) => {
        // Ignore close events from old connections or manual disconnects
        if (thisConnectionId !== connectionId || isManualDisconnect) {
          console.log(`[${thisConnectionId}] Ignoring close event (invalidated or manual)`)
          return
        }
        
        console.log(`[${thisConnectionId}] WebSocket closed:`, event.code, event.reason)
        isConnected.value = false
        isConnecting.value = false
        stopRateTracking()
        
        // Auto-reconnect only if not manually disconnected
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          reconnectAttempts++
          console.log(`[${thisConnectionId}] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
          reconnectTimer = setTimeout(connectWebSocket, delay)
        } else {
          connectionError.value = 'Max reconnection attempts reached'
        }
      }
    } catch (e) {
      console.error('Failed to create WebSocket:', e)
      isConnecting.value = false
      connectionError.value = e.message
    }
  }
  
  function disconnect() {
    console.log('Disconnecting...')
    isManualDisconnect = true
    clearTimeout(reconnectTimer)
    reconnectTimer = null
    stopRateTracking()
    
    if (ws) {
      ws.close()
      ws = null
    }
    
    isConnected.value = false
    isConnecting.value = false
  }
  
  function startRateTracking() {
    messageCount = 0
    rateInterval = setInterval(() => {
      stats.value.messages_per_second = messageCount
      messageCount = 0
    }, 1000)
  }
  
  function stopRateTracking() {
    if (rateInterval) {
      clearInterval(rateInterval)
      rateInterval = null
    }
  }
  
  // ============ Message Handlers ============
  function handleBinanceMessage(data) {
    const stream = data.stream || ''
    const payload = data.data || {}
    
    stats.value.last_update = new Date().toISOString()
    
    if (stream.includes('@kline_')) {
      handleKline(payload)
    } else if (stream.includes('@aggTrade')) {
      handleTrade(payload)
    } else if (stream.includes('@bookTicker')) {
      handleBookTicker(payload)
    } else if (stream.includes('@depth')) {
      handleDepth(payload)
    }
  }
  
  function handleKline(data) {
    const k = data.k || {}
    
    kline.value = {
      time: k.t,
      close_time: k.T,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      quote_volume: parseFloat(k.q),
      trades: k.n,
      taker_buy_volume: parseFloat(k.V),
      taker_buy_quote_volume: parseFloat(k.Q),
      is_closed: k.x
    }
    
    // Update history if candle closed
    if (k.x) {
      const newHistory = [...klineHistory.value]
      const existingIndex = newHistory.findIndex(c => c.time === k.t)
      
      if (existingIndex >= 0) {
        newHistory[existingIndex] = { ...kline.value }
      } else {
        newHistory.push({ ...kline.value })
        if (newHistory.length > config.value.max_candles) {
          newHistory.shift()
        }
      }
      
      klineHistory.value = newHistory
    }
    
    stats.value.klines_received++
  }
  
  function handleTrade(data) {
    const trade = {
      id: data.a,
      time: data.T,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      quote_volume: parseFloat(data.p) * parseFloat(data.q),
      is_buyer_maker: data.m,
      side: data.m ? 'sell' : 'buy'
    }
    
    const newTrades = [...trades.value, trade]
    if (newTrades.length > config.value.max_trades) {
      newTrades.shift()
    }
    trades.value = newTrades
    
    stats.value.trades_received++
  }
  
  function handleBookTicker(data) {
    const bidPrice = parseFloat(data.b)
    const askPrice = parseFloat(data.a)
    const spread = askPrice - bidPrice
    
    ticker.value = {
      bid_price: bidPrice,
      bid_qty: parseFloat(data.B),
      ask_price: askPrice,
      ask_qty: parseFloat(data.A),
      spread: spread,
      spread_pct: bidPrice > 0 ? spread / bidPrice : 0
    }
  }
  
  function handleDepth(data) {
    // Update bids
    if (data.b && data.b.length > 0) {
      const bidsMap = new Map(
        orderbook.value.bids.map(b => [b.price, b.quantity])
      )
      
      for (const [priceStr, qtyStr] of data.b) {
        const price = parseFloat(priceStr)
        const qty = parseFloat(qtyStr)
        
        if (qty === 0) {
          bidsMap.delete(price)
        } else {
          bidsMap.set(price, qty)
        }
      }
      
      orderbook.value.bids = Array.from(bidsMap.entries())
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 20)
    }
    
    // Update asks
    if (data.a && data.a.length > 0) {
      const asksMap = new Map(
        orderbook.value.asks.map(a => [a.price, a.quantity])
      )
      
      for (const [priceStr, qtyStr] of data.a) {
        const price = parseFloat(priceStr)
        const qty = parseFloat(qtyStr)
        
        if (qty === 0) {
          asksMap.delete(price)
        } else {
          asksMap.set(price, qty)
        }
      }
      
      orderbook.value.asks = Array.from(asksMap.entries())
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) => a.price - b.price)
        .slice(0, 20)
    }
    
    calculateImbalance()
    stats.value.orderbook_updates++
  }
  
  function calculateImbalance() {
    const bids = orderbook.value.bids.slice(0, 10)
    const asks = orderbook.value.asks.slice(0, 10)
    
    const totalBid = bids.reduce((sum, b) => sum + b.quantity, 0)
    const totalAsk = asks.reduce((sum, a) => sum + a.quantity, 0)
    const total = totalBid + totalAsk
    
    orderbook.value.imbalance = total > 0 
      ? ((totalBid - totalAsk) / total) * 100 
      : 0
  }
  
  // ============ Actions ============
  async function changeSymbol(newSymbol) {
    const upper = newSymbol.toUpperCase()
    if (upper === symbol.value) return
    
    console.log(`Changing symbol from ${symbol.value} to ${upper}`)
    symbol.value = upper
    
    // Reset data
    klineHistory.value = []
    trades.value = []
    orderbook.value = { bids: [], asks: [], imbalance: 0 }
    ticker.value = { bid_price: 0, bid_qty: 0, ask_price: 0, ask_qty: 0, spread: 0, spread_pct: 0 }
    kline.value = { time: 0, open: 0, high: 0, low: 0, close: 0, volume: 0, quote_volume: 0, trades: 0, taker_buy_volume: 0, taker_buy_quote_volume: 0, is_closed: false }
    stats.value = { trades_received: 0, klines_received: 0, orderbook_updates: 0, messages_per_second: 0, connected_at: null, last_update: null }
    
    // Disconnect and reconnect
    disconnect()
    reconnectAttempts = 0
    
    // Small delay to ensure clean disconnect
    await new Promise(resolve => setTimeout(resolve, 100))
    await connect()
  }
  
  async function changeInterval(newInterval) {
    if (newInterval === interval.value) return
    
    console.log(`Changing interval from ${interval.value} to ${newInterval}`)
    interval.value = newInterval
    klineHistory.value = []
    
    // Disconnect and reconnect
    disconnect()
    reconnectAttempts = 0
    
    // Small delay to ensure clean disconnect
    await new Promise(resolve => setTimeout(resolve, 100))
    await connect()
  }
  function changeRefreshRate(newRate) {
    refreshRate.value = newRate
    // Note: With direct Binance connection, we get data as fast as Binance sends it
    // This could be used for throttling display updates if needed
  }
  
  return {
    // Config
    config,
    
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Market parameters
    symbol,
    interval,
    refreshRate,
    
    // Market data
    ticker,
    kline,
    klineHistory,
    trades,
    orderbook,
    
    // UI state
    showOrderBook,
    showTrades,
    showVolume,
    orderbookDepth,
    tradesCount,
    
    // Stats
    stats,
    
    // Computed
    lastPrice,
    priceChangePercent,
    isPriceUp,
    buyRatio,
    spreadPercent,
    liquidityRating,
    orderbookImbalance,
    
    // Actions
    connect,
    disconnect,
    changeSymbol,
    changeInterval,
    changeRefreshRate
  }
})
