import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'

export const useMarketStore = defineStore('market', () => {
  // ============ Configuration ============
  const config = ref({
    binance_ws_base: 'wss://stream.binance.com:9443',
    binance_rest_base: 'https://api.binance.com/api/v3',
    supported_intervals: ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'],
    symbol: 'BTCUSDT',
    max_candles: 500,
    max_trades: 100,
    ml_api_enabled: false,
    poll_intervals: {
      market_analysis: 30000,
      llm_analysis: 60000,
      market_signals: 15000,
    },
    notifications: {
      enabled: true,
      sound_enabled: true,
      volatility_threshold: 0.5,
    }
  })
  
  // ============ Connection State ============
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref(null)
  const mlApiStatus = ref('unknown') // 'unknown', 'connected', 'error', 'not_configured'
  
  // ============ Market Parameters ============
  const symbol = ref('BTCUSDT')
  const interval = ref('1m')
  
  // ============ Binance Market Data ============
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
  
  const klineHistory = shallowRef([])
  const trades = shallowRef([])
  const orderbook = ref({
    bids: [],
    asks: [],
    imbalance: 0
  })
  
  // ============ ML API Data ============
  const marketAnalysis = ref(null)
  const llmAnalysis = ref(null)
  const marketSignals = shallowRef([])
  const latestSignal = ref(null)
  
  // Track signal changes for notifications
  const previousSignalType = ref(null)
  const previousLLMAnalysisId = ref(null)
  
  // Track prices for volatility detection (with timestamps for 1-minute window)
  const priceHistory = ref([]) // Array of {price, timestamp}
  
  // ============ UI State ============
  const showOrderBook = ref(true)
  const showTrades = ref(true)
  const showVolume = ref(true)
  const orderbookDepth = ref(10)
  const tradesCount = ref(15)
  const activeTab = ref('analysis') // 'analysis', 'signals', 'llm'
  
  // ============ Notification Settings ============
  // Initialize from localStorage or defaults
  const notificationsEnabled = ref(
    localStorage.getItem('btc_notifications_enabled') === 'true' || false
  )
  const notificationPermission = ref('default')
  const signalNotificationsEnabled = ref(
    localStorage.getItem('btc_signal_notifications') === 'false' ? false : true
  )
  const volatilityNotificationsEnabled = ref(
    localStorage.getItem('btc_volatility_notifications') === 'false' ? false : true
  )
  const soundEnabled = ref(
    localStorage.getItem('btc_sound_enabled') === 'false' ? false : true
  )
  
  // Watch for changes and persist to localStorage
  watch(notificationsEnabled, (val) => {
    localStorage.setItem('btc_notifications_enabled', val.toString())
  })
  
  watch(signalNotificationsEnabled, (val) => {
    localStorage.setItem('btc_signal_notifications', val.toString())
  })
  
  watch(volatilityNotificationsEnabled, (val) => {
    localStorage.setItem('btc_volatility_notifications', val.toString())
  })
  
  watch(soundEnabled, (val) => {
    localStorage.setItem('btc_sound_enabled', val.toString())
  })
  
  // ============ Statistics ============
  const stats = ref({
    trades_received: 0,
    klines_received: 0,
    orderbook_updates: 0,
    messages_per_second: 0,
    connected_at: null,
    last_update: null,
    last_ml_update: null
  })
  
  // ============ WebSocket Management ============
  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10
  let connectionId = 0
  let isManualDisconnect = false
  let messageCount = 0
  let rateInterval = null
  
  // ML API polling timers
  let marketAnalysisPollTimer = null
  let llmAnalysisPollTimer = null
  let marketSignalsPollTimer = null
  
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
  
  // Signal-related computed properties
  const currentSignal = computed(() => {
    if (!marketAnalysis.value) return null
    return {
      type: marketAnalysis.value.signal_type,
      direction: marketAnalysis.value.signal_direction,
      confidence: marketAnalysis.value.signal_confidence,
      summary: marketAnalysis.value.summary,
      action: marketAnalysis.value.action_recommendation,
    }
  })
  
  const signalColor = computed(() => {
    const type = currentSignal.value?.type
    if (!type) return 'gray'
    if (type.includes('BUY')) return 'green'
    if (type.includes('SELL')) return 'red'
    return 'yellow'
  })
  
  // Track config loaded state
  let configLoaded = false
  
  // ============ Notification Functions ============
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return false
    }
    
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    notificationsEnabled.value = permission === 'granted'
    return permission === 'granted'
  }
  
  function sendNotification(title, body, options = {}) {
    if (!notificationsEnabled.value || notificationPermission.value !== 'granted') {
      return
    }
    
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: options.tag || 'btc-analyzer',
        renotify: options.renotify || false,
        ...options
      })
      
      if (soundEnabled.value && options.playSound !== false) {
        playNotificationSound(options.soundType || 'signal')
      }
      
      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000)
    } catch (e) {
      console.error('Failed to send notification:', e)
    }
  }
  
  function playNotificationSound(type = 'signal') {
    if (!soundEnabled.value) return
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different sounds for different notification types
      if (type === 'buy') {
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1) // C#6
      } else if (type === 'sell') {
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4
        oscillator.frequency.setValueAtTime(330, audioContext.currentTime + 0.1) // E4
      } else if (type === 'volatility') {
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime) // E5
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.05) // A5
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1) // E5
      } else {
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime) // E5
      }
      
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (e) {
      console.warn('Could not play notification sound:', e)
    }
  }
  
  function checkVolatility() {
    if (!volatilityNotificationsEnabled.value || !lastPrice.value) {
      return
    }
    
    const now = Date.now()
    const currentPrice = lastPrice.value
    
    // Add current price to history
    priceHistory.value.push({ price: currentPrice, timestamp: now })
    
    // Remove prices older than 60 seconds
    priceHistory.value = priceHistory.value.filter(p => now - p.timestamp <= 60000)
    
    // Need at least 2 data points and some time elapsed
    if (priceHistory.value.length < 2) return
    
    // Get price from 60 seconds ago (or earliest available)
    const oldestPrice = priceHistory.value[0].price
    const timeDiff = (now - priceHistory.value[0].timestamp) / 1000 // in seconds
    
    // Only check if we have at least 10 seconds of data
    if (timeDiff < 10) return
    
    // Calculate percentage change
    const changePercent = Math.abs((currentPrice - oldestPrice) / oldestPrice * 100)
    const threshold = config.value.notifications?.volatility_threshold || 0.5
    
    // Alert if threshold exceeded
    if (changePercent >= threshold) {
      const direction = currentPrice > oldestPrice ? '📈 UP' : '📉 DOWN'
      const timeDesc = timeDiff >= 60 ? '1 min' : `${Math.floor(timeDiff)}s`
      sendNotification(
        `High Volatility Alert`,
        `BTC moved ${direction} ${changePercent.toFixed(2)}% in ${timeDesc} ($${currentPrice.toFixed(2)})`,
        { tag: 'volatility', soundType: 'volatility' }
      )
      // Clear history after alert to avoid spam
      priceHistory.value = [{ price: currentPrice, timestamp: now }]
    }
  }

  
  function checkSignalChange(newSignal) {
    if (!signalNotificationsEnabled.value || !newSignal) return
    
    const newType = newSignal.signal_type
    if (previousSignalType.value && previousSignalType.value !== newType) {
      const soundType = newType.includes('BUY') ? 'buy' : newType.includes('SELL') ? 'sell' : 'signal'
      sendNotification(
        `Signal Changed: ${newType}`,
        `${newSignal.summary || `Signal changed from ${previousSignalType.value} to ${newType}`}`,
        { tag: 'signal', soundType, renotify: true }
      )
    }
    
    previousSignalType.value = newType
  }
  
  // ============ Binance WebSocket Connection ============
  async function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return
    }
    
    // Check notification permission on start
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
      // If notifications were enabled before and permission is still granted
      if (notificationPermission.value === 'granted' && notificationsEnabled.value) {
        notificationsEnabled.value = true
      } else if (notificationPermission.value !== 'granted') {
        notificationsEnabled.value = false
      }
    }
    
    // Load config from server only on first connect
    if (!configLoaded) {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const serverConfig = await response.json()
          Object.assign(config.value, serverConfig)
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
    
    // Start ML API polling if enabled
    if (config.value.ml_api_enabled) {
      startMLPolling()
    }
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
        if (thisConnectionId !== connectionId) {
          console.log(`[${thisConnectionId}] Connection invalidated, closing`)
          ws.close()
          return
        }
        
        console.log(`[${thisConnectionId}] âœ… Connected to Binance WebSocket`)
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts = 0
        stats.value.connected_at = new Date().toISOString()
        
        startRateTracking()
      }
      
      ws.onmessage = (event) => {
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
        if (thisConnectionId !== connectionId || isManualDisconnect) {
          return
        }
        
        console.log(`[${thisConnectionId}] WebSocket closed:`, event.code, event.reason)
        isConnected.value = false
        isConnecting.value = false
        
        // Attempt reconnection
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          console.log(`[${thisConnectionId}] Reconnecting in ${delay}ms...`)
          reconnectAttempts++
          reconnectTimer = setTimeout(() => {
            if (!isManualDisconnect) {
              connectWebSocket()
            }
          }, delay)
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
    stopMLPolling()
    
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
      
      // Check volatility every second
      checkVolatility()
    }, 1000)
  }
  
  function stopRateTracking() {
    if (rateInterval) {
      clearInterval(rateInterval)
      rateInterval = null
    }
  }
  
  // ============ ML API Polling ============
  function startMLPolling() {
    // Fetch immediately
    fetchMarketAnalysis()
    fetchLLMAnalysis()
    fetchMarketSignals()
    
    // Set up polling intervals
    const intervals = config.value.poll_intervals
    
    marketAnalysisPollTimer = setInterval(
      fetchMarketAnalysis, 
      intervals.market_analysis
    )
    
    llmAnalysisPollTimer = setInterval(
      fetchLLMAnalysis, 
      intervals.llm_analysis
    )
    
    marketSignalsPollTimer = setInterval(
      fetchMarketSignals, 
      intervals.market_signals
    )
  }
  
  function stopMLPolling() {
    if (marketAnalysisPollTimer) {
      clearInterval(marketAnalysisPollTimer)
      marketAnalysisPollTimer = null
    }
    if (llmAnalysisPollTimer) {
      clearInterval(llmAnalysisPollTimer)
      llmAnalysisPollTimer = null
    }
    if (marketSignalsPollTimer) {
      clearInterval(marketSignalsPollTimer)
      marketSignalsPollTimer = null
    }
  }
  
  async function fetchMarketAnalysis() {
    try {
      const response = await fetch('/api/ml/market-analysis?limit=1')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          const newAnalysis = data.data[0]
          checkSignalChange(newAnalysis)
          marketAnalysis.value = newAnalysis
          mlApiStatus.value = 'connected'
          stats.value.last_ml_update = new Date().toISOString()
        }
      } else if (response.status === 503) {
        mlApiStatus.value = 'not_configured'
      } else {
        mlApiStatus.value = 'error'
      }
    } catch (e) {
      console.error('Failed to fetch market analysis:', e)
      mlApiStatus.value = 'error'
    }
  }
  
  async function fetchLLMAnalysis() {
    try {
      const response = await fetch('/api/ml/llm-analysis?limit=5')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          const newAnalysis = data.data[0]
          
          // Check if this is a new prediction (different ID)
          if (notificationsEnabled.value && previousLLMAnalysisId.value !== null && 
              newAnalysis.id !== previousLLMAnalysisId.value) {
            const direction = newAnalysis.prediction_direction || 'NEUTRAL'
            const directionEmoji = direction === 'BULLISH' ? '📈' : direction === 'BEARISH' ? '📉' : '➡️'
            const confidence = newAnalysis.prediction_confidence || 'UNKNOWN'
            
            sendNotification(
              `${directionEmoji} New AI Prediction`,
              `${direction} (${confidence} confidence) - ${newAnalysis.reasoning?.substring(0, 80) || 'Check the AI tab for details'}...`,
              { tag: 'llm-prediction', soundType: 'signal' }
            )
          }
          
          previousLLMAnalysisId.value = newAnalysis.id
          llmAnalysis.value = newAnalysis
        }
      }
    } catch (e) {
      console.error('Failed to fetch LLM analysis:', e)
    }
  }
  
  async function fetchMarketSignals() {
    try {
      const response = await fetch('/api/ml/market-signals?limit=20')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          marketSignals.value = data.data
          if (data.data.length > 0) {
            latestSignal.value = data.data[0]
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch market signals:', e)
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
    const currentBestBid = ticker.value?.bid_price || 0
    const currentBestAsk = ticker.value?.ask_price || 0
    
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
      
      // Remove stale entries that are too far from best bid
      if (currentBestBid > 0) {
        const maxDistance = currentBestBid * 0.01 // 1% range
        for (const [price] of bidsMap) {
          if (price < currentBestBid - maxDistance) {
            bidsMap.delete(price)
          }
        }
      }
      
      orderbook.value.bids = Array.from(bidsMap.entries())
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 20)
    }
    
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
      
      // Remove stale entries that are too far from best ask
      if (currentBestAsk > 0) {
        const maxDistance = currentBestAsk * 0.01 // 1% range
        for (const [price] of asksMap) {
          if (price > currentBestAsk + maxDistance) {
            asksMap.delete(price)
          }
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
  async function changeInterval(newInterval) {
    if (newInterval === interval.value) return
    
    console.log(`Changing interval from ${interval.value} to ${newInterval}`)
    interval.value = newInterval
    klineHistory.value = []
    
    disconnect()
    reconnectAttempts = 0
    
    await new Promise(resolve => setTimeout(resolve, 100))
    await connect()
  }
  
  function setActiveTab(tab) {
    activeTab.value = tab
  }
  
  function toggleNotifications() {
    if (!notificationsEnabled.value) {
      requestNotificationPermission()
    } else {
      notificationsEnabled.value = false
    }
  }
  
  function toggleSignalNotifications() {
    signalNotificationsEnabled.value = !signalNotificationsEnabled.value
  }
  
  function toggleVolatilityNotifications() {
    volatilityNotificationsEnabled.value = !volatilityNotificationsEnabled.value
  }
  
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }
  
  // Force refresh ML data
  function refreshMLData() {
    fetchMarketAnalysis()
    fetchLLMAnalysis()
    fetchMarketSignals()
  }
  
  return {
    // Config
    config,
    
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    mlApiStatus,
    
    // Market parameters
    symbol,
    interval,
    
    // Binance data
    ticker,
    kline,
    klineHistory,
    trades,
    orderbook,
    
    // ML API data
    marketAnalysis,
    llmAnalysis,
    marketSignals,
    latestSignal,
    
    // UI state
    showOrderBook,
    showTrades,
    showVolume,
    orderbookDepth,
    tradesCount,
    activeTab,
    
    // Notification settings
    notificationsEnabled,
    notificationPermission,
    signalNotificationsEnabled,
    volatilityNotificationsEnabled,
    soundEnabled,
    
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
    currentSignal,
    signalColor,
    
    // Actions
    connect,
    disconnect,
    changeInterval,
    setActiveTab,
    requestNotificationPermission,
    toggleNotifications,
    toggleSignalNotifications,
    toggleVolatilityNotifications,
    toggleSound,
    refreshMLData,
    sendNotification,
    playNotificationSound,
  }
})
