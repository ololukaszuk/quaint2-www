/**
 * Utility functions for formatting and calculations
 */

/**
 * Format a number as currency with appropriate precision
 */
export function formatPrice(value, decimals = 2) {
  if (!value && value !== 0) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  // Determine precision based on value
  let precision = decimals
  if (num < 0.01) precision = 6
  else if (num < 1) precision = 4
  else if (num < 100) precision = 2
  else precision = 2
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  })
}

/**
 * Format a number as currency with $ prefix
 */
export function formatCurrency(value, decimals = 2) {
  if (!value && value !== 0) return '-'
  return '$' + formatPrice(value, decimals)
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompact(value) {
  if (!value && value !== 0) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toFixed(2)
}

/**
 * Format quantity with appropriate decimals
 */
export function formatQuantity(value, decimals = 4) {
  if (!value && value !== 0) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  if (num < 0.0001) return num.toExponential(2)
  if (num < 1) return num.toFixed(6)
  if (num < 100) return num.toFixed(4)
  return num.toFixed(2)
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 2) {
  if (!value && value !== 0) return '-'
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(decimals)}%`
}

/**
 * Format timestamp to time string
 */
export function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Format timestamp to time with milliseconds
 */
export function formatTimeMs(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${time}.${ms}`
}

/**
 * Format spread percentage with quality indicator
 */
export function formatSpread(spreadPct) {
  if (!spreadPct && spreadPct !== 0) return { text: '-', quality: 'neutral' }
  
  const text = `${(spreadPct * 100).toFixed(4)}%`
  let quality = 'poor'
  
  if (spreadPct < 0.01) quality = 'excellent'
  else if (spreadPct < 0.02) quality = 'very_good'
  else if (spreadPct < 0.05) quality = 'good'
  else if (spreadPct < 0.10) quality = 'moderate'
  
  return { text, quality }
}

/**
 * Get buy pressure indicator
 */
export function getBuyPressureIndicator(buyRatio) {
  if (buyRatio > 60) return { emoji: '👆👆', text: 'Strong Buy', class: 'price-up' }
  if (buyRatio > 55) return { emoji: '👆', text: 'Buy Pressure', class: 'price-up' }
  if (buyRatio < 40) return { emoji: '👇👇', text: 'Strong Sell', class: 'price-down' }
  if (buyRatio < 45) return { emoji: '👇', text: 'Sell Pressure', class: 'price-down' }
  return { emoji: '⚖️', text: 'Balanced', class: 'price-neutral' }
}

/**
 * Get order book imbalance indicator
 */
export function getImbalanceIndicator(imbalance) {
  if (imbalance > 20) return { emoji: '👆👆', text: 'Strong Buy', class: 'price-up' }
  if (imbalance > 10) return { emoji: '👆', text: 'Buy', class: 'price-up' }
  if (imbalance < -20) return { emoji: '👇👇', text: 'Strong Sell', class: 'price-down' }
  if (imbalance < -10) return { emoji: '👇', text: 'Sell', class: 'price-down' }
  return { emoji: '⚖️', text: 'Balanced', class: 'price-neutral' }
}

/**
 * Get liquidity rating badge info
 */
export function getLiquidityBadge(rating) {
  const badges = {
    excellent: { text: 'Excellent', class: 'badge-green', emoji: '🟢' },
    very_good: { text: 'Very Good', class: 'badge-green', emoji: '🟢' },
    good: { text: 'Good', class: 'badge-yellow', emoji: '🟡' },
    moderate: { text: 'Moderate', class: 'badge-yellow', emoji: '🟠' },
    poor: { text: 'Poor', class: 'badge-red', emoji: '🔴' }
  }
  return badges[rating] || badges.moderate
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * Throttle function
 */
export function throttle(fn, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
