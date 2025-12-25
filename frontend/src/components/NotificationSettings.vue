<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMarketStore } from '../store/market'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const isExpanded = ref(false)
const showInstallGuide = ref(false)
const swRegistration = ref(null)

// Detect platform
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
const isAndroid = /Android/.test(navigator.userAgent)
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
const isFirefox = /Firefox/.test(navigator.userAgent)

// Detect if running as PWA/standalone
const isPWA = computed(() => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://')
})

// Check iOS version (16.4+ supports notifications)
const iOSVersion = computed(() => {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/)
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`)
  }
  return 0
})

const supportsIOSNotifications = computed(() => {
  return isIOS && iOSVersion.value >= 16.4
})

// Check service worker support
const hasServiceWorker = 'serviceWorker' in navigator
const hasPushManager = 'PushManager' in window
const hasNotificationAPI = 'Notification' in window

// Comprehensive notification status
const notificationStatus = computed(() => {
  // No Notification API at all
  if (!hasNotificationAPI) {
    return {
      canUse: false,
      supported: false,
      message: 'Your browser does not support notifications',
      color: 'text-red-400',
      action: null
    }
  }
  
  // iOS specific handling
  if (isIOS) {
    if (!supportsIOSNotifications.value) {
      return {
        canUse: false,
        supported: false,
        message: 'iOS 16.4+ required for notifications',
        color: 'text-yellow-400',
        action: null
      }
    }
    
    if (!isPWA.value) {
      return {
        canUse: false,
        supported: true,
        message: 'Add to Home Screen to enable notifications',
        color: 'text-yellow-400',
        action: 'install'
      }
    }
  }
  
  // Android Chrome - needs PWA for reliable background notifications
  if (isAndroid && !isPWA.value) {
    return {
      canUse: true,
      supported: true,
      message: 'Install as app for better notifications',
      color: 'text-yellow-400',
      action: 'install-optional'
    }
  }
  
  // Permission already granted
  if (store.notificationPermission === 'granted') {
    return {
      canUse: true,
      supported: true,
      message: 'Notifications enabled',
      color: 'text-green-400',
      action: null
    }
  }
  
  // Permission denied
  if (store.notificationPermission === 'denied') {
    return {
      canUse: false,
      supported: true,
      message: 'Blocked - Enable in browser settings',
      color: 'text-red-400',
      action: 'settings'
    }
  }
  
  // Default - permission not requested yet
  return {
    canUse: true,
    supported: true,
    message: 'Click to enable notifications',
    color: 'text-dark-500',
    action: 'request'
  }
})

// Install instructions based on platform
const installInstructions = computed(() => {
  if (isIOS && isSafari) {
    return {
      title: 'Install QuAInt′ on iOS',
      steps: [
        { icon: '📤', text: 'Tap the Share button at the bottom of Safari' },
        { icon: '➕', text: 'Scroll down and tap "Add to Home Screen"' },
        { icon: '✅', text: 'Tap "Add" to confirm' },
        { icon: '🏠', text: 'Open QuAInt′ from your Home Screen' },
        { icon: '🔔', text: 'Enable notifications in the app' }
      ]
    }
  }
  
  if (isIOS && isChrome) {
    return {
      title: 'Install QuAInt′ on iOS',
      steps: [
        { icon: '⚠️', text: 'Chrome on iOS doesn\'t support installation' },
        { icon: '🔄', text: 'Open this page in Safari' },
        { icon: '📤', text: 'Then use Share → Add to Home Screen' }
      ]
    }
  }
  
  if (isAndroid && isChrome) {
    return {
      title: 'Install QuAInt′ on Android',
      steps: [
        { icon: '⋮', text: 'Tap the menu button (three dots)' },
        { icon: '📲', text: 'Tap "Install app" or "Add to Home screen"' },
        { icon: '✅', text: 'Tap "Install" to confirm' },
        { icon: '🔔', text: 'Allow notifications when prompted' }
      ]
    }
  }
  
  if (isAndroid && isFirefox) {
    return {
      title: 'Install QuAInt′ on Android',
      steps: [
        { icon: '⋮', text: 'Tap the menu button (three dots)' },
        { icon: '📲', text: 'Tap "Install"' },
        { icon: '✅', text: 'Confirm installation' }
      ]
    }
  }
  
  // Desktop fallback
  return {
    title: 'Install QuAInt′ as App',
    steps: [
      { icon: '🔧', text: 'Look for install option in browser address bar' },
      { icon: '📲', text: 'Click to install as an app' }
    ]
  }
})

// Settings instructions based on platform
const settingsInstructions = computed(() => {
  if (isIOS) {
    return 'Go to Settings → Safari → QuAInt′ → Notifications'
  }
  if (isAndroid && isChrome) {
    return 'Tap the lock icon in the address bar → Site settings → Notifications'
  }
  return 'Check your browser notification settings'
})

// Initialize on mount
onMounted(async () => {
  // Get existing service worker registration
  if (hasServiceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        swRegistration.value = registrations[0]
      }
    } catch (e) {
      console.warn('Could not get SW registration:', e)
    }
  }
})

const handleNotificationToggle = async () => {
  if (!store.notificationsEnabled) {
    // Check if we need to show install guide first
    if (notificationStatus.value.action === 'install') {
      showInstallGuide.value = true
      return
    }
    
    const granted = await store.requestNotificationPermission()
    if (granted) {
      // Register for push if available
      await registerPushSubscription()
      
      store.sendNotification(
        'Notifications Enabled',
        'You will now receive trading alerts',
        { playSound: true }
      )
    }
  } else {
    store.toggleNotifications()
  }
}

async function registerPushSubscription() {
  if (!hasPushManager || !swRegistration.value) return
  
  try {
    // Check if already subscribed
    const existingSubscription = await swRegistration.value.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('Already subscribed to push')
      return existingSubscription
    }
    
    // Subscribe to push (would need VAPID keys from backend)
    // This is a placeholder - real implementation needs backend support
    console.log('Push subscription ready (requires backend VAPID keys)')
  } catch (e) {
    console.warn('Could not register push subscription:', e)
  }
}

const testNotification = async () => {
  // Try service worker notification first (works better on mobile)
  if (swRegistration.value && swRegistration.value.active) {
    try {
      swRegistration.value.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'Test Notification',
        body: 'This is a test notification from QuAInt′',
        options: {
          tag: 'test',
          renotify: true
        }
      })
      return
    } catch (e) {
      console.warn('SW notification failed, falling back:', e)
    }
  }
  
  // Fallback to regular notification
  store.sendNotification(
    'Test Notification',
    'This is a test notification from QuAInt′',
    { playSound: true, tag: 'test' }
  )
}

const dismissInstallGuide = () => {
  showInstallGuide.value = false
}
</script>

<template>
  <div class="border-t border-dark-700/50 bg-dark-900/50">
    <!-- Header (clickable) -->
    <button 
      @click="isExpanded = !isExpanded"
      class="w-full px-4 py-2 flex items-center justify-between hover:bg-dark-800/30 transition-colors"
      :class="{ 'px-3': mobile }"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm">🔔</span>
        <span class="text-sm text-dark-300">Notifications</span>
        <span 
          class="w-2 h-2 rounded-full"
          :class="store.notificationsEnabled ? 'bg-green-500' : 'bg-dark-600'"
        ></span>
        <!-- PWA indicator -->
        <span v-if="isPWA" class="text-xs text-brand-400" title="Running as installed app">
          📲
        </span>
      </div>
      <svg 
        class="w-4 h-4 text-dark-500 transition-transform"
        :class="{ 'rotate-180': isExpanded }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    
    <!-- Content -->
    <div 
      class="overflow-hidden transition-all duration-200"
      :class="isExpanded ? 'max-h-[500px]' : 'max-h-0'"
    >
      <div class="px-4 pb-4 space-y-3 overflow-y-auto max-h-[450px]" :class="{ 'px-3 pb-3': mobile }">
        
        <!-- Install Guide Modal -->
        <div 
          v-if="showInstallGuide"
          class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          @click.self="dismissInstallGuide"
        >
          <div class="bg-dark-900 rounded-xl max-w-sm w-full p-6 space-y-4 border border-dark-700">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-dark-100">
                {{ installInstructions.title }}
              </h3>
              <button 
                @click="dismissInstallGuide"
                class="p-1 rounded-lg hover:bg-dark-800 text-dark-400"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="space-y-3">
              <div 
                v-for="(step, index) in installInstructions.steps"
                :key="index"
                class="flex items-start gap-3 p-2 rounded-lg bg-dark-800/50"
              >
                <span class="text-xl">{{ step.icon }}</span>
                <span class="text-sm text-dark-300">{{ step.text }}</span>
              </div>
            </div>
            
            <p class="text-xs text-dark-500 text-center">
              After installation, return here to enable notifications
            </p>
            
            <button
              @click="dismissInstallGuide"
              class="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
        
        <!-- Platform Info Banner (if not supported well) -->
        <div 
          v-if="isIOS && !isPWA && supportsIOSNotifications"
          class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <div class="flex items-start gap-2">
            <span class="text-lg">📱</span>
            <div>
              <div class="text-sm font-medium text-yellow-400">Install for Notifications</div>
              <div class="text-xs text-dark-400 mt-1">
                iOS requires adding this app to your Home Screen for notifications to work.
              </div>
              <button
                @click="showInstallGuide = true"
                class="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
              >
                Show me how →
              </button>
            </div>
          </div>
        </div>
        
        <div 
          v-if="isIOS && !supportsIOSNotifications"
          class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div class="flex items-start gap-2">
            <span class="text-lg">⚠️</span>
            <div>
              <div class="text-sm font-medium text-red-400">iOS Update Required</div>
              <div class="text-xs text-dark-400 mt-1">
                Notifications require iOS 16.4 or later. You have iOS {{ iOSVersion }}.
              </div>
            </div>
          </div>
        </div>
        
        <!-- Android install suggestion -->
        <div 
          v-if="isAndroid && !isPWA"
          class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
        >
          <div class="flex items-start gap-2">
            <span class="text-lg">💡</span>
            <div>
              <div class="text-sm font-medium text-blue-400">Pro Tip</div>
              <div class="text-xs text-dark-400 mt-1">
                Install QuAInt′ as an app for more reliable background notifications.
              </div>
              <button
                @click="showInstallGuide = true"
                class="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Install app →
              </button>
            </div>
          </div>
        </div>
        
        <!-- Master Toggle -->
        <div class="p-3 bg-dark-800/50 rounded-lg">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <div class="text-sm text-dark-200">Enable Notifications</div>
              <div class="text-xs" :class="notificationStatus.color">
                {{ notificationStatus.message }}
              </div>
            </div>
            <button
              @click.prevent="handleNotificationToggle"
              class="relative w-10 h-6 rounded-full transition-colors"
              :class="store.notificationsEnabled ? 'bg-brand-600' : 'bg-dark-600'"
              :disabled="!notificationStatus.canUse && !notificationStatus.action"
            >
              <span 
                class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                :class="{ 'translate-x-4': store.notificationsEnabled }"
              ></span>
            </button>
          </label>
          
          <!-- Settings link for denied permission -->
          <div 
            v-if="notificationStatus.action === 'settings'"
            class="mt-2 pt-2 border-t border-dark-700/50"
          >
            <p class="text-xs text-dark-500">
              {{ settingsInstructions }}
            </p>
          </div>
        </div>
        
        <!-- Individual Settings -->
        <div v-if="store.notificationsEnabled" class="space-y-2">
          <!-- Signal Notifications -->
          <label class="flex items-center justify-between p-2 rounded hover:bg-dark-800/30 cursor-pointer">
            <div class="flex items-center gap-2">
              <span>🎯</span>
              <div>
                <div class="text-sm text-dark-300">Signal Changes</div>
                <div class="text-xs text-dark-500">Alert when signal type changes</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              :checked="store.signalNotificationsEnabled"
              @change="store.toggleSignalNotifications"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500"
            />
          </label>
          
          <!-- AI Prediction Notifications -->
          <label class="flex items-center justify-between p-2 rounded hover:bg-dark-800/30 cursor-pointer">
            <div class="flex items-center gap-2">
              <span>🤖</span>
              <div>
                <div class="text-sm text-dark-300">AI Predictions</div>
                <div class="text-xs text-dark-500">Alert when new AI prediction arrives</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              :checked="store.aiNotificationsEnabled"
              @change="store.toggleAINotifications"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500"
            />
          </label>
          
          <!-- Volatility Notifications -->
          <label class="flex items-center justify-between p-2 rounded hover:bg-dark-800/30 cursor-pointer">
            <div class="flex items-center gap-2">
              <span>⚡</span>
              <div>
                <div class="text-sm text-dark-300">High Volatility</div>
                <div class="text-xs text-dark-500">
                  Alert when price moves ≥{{ store.config?.notifications?.volatility_threshold || 0.5 }}% within 1 minute
                </div>
              </div>
            </div>
            <input 
              type="checkbox" 
              :checked="store.volatilityNotificationsEnabled"
              @change="store.toggleVolatilityNotifications"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500"
            />
          </label>
          
          <!-- Sound -->
          <label class="flex items-center justify-between p-2 rounded hover:bg-dark-800/30 cursor-pointer">
            <div class="flex items-center gap-2">
              <span>🔊</span>
              <div>
                <div class="text-sm text-dark-300">Sound Alerts</div>
                <div class="text-xs text-dark-500">Play sound with notifications</div>
              </div>
            </div>
            <input 
              type="checkbox" 
              :checked="store.soundEnabled"
              @change="store.toggleSound"
              class="w-4 h-4 rounded bg-dark-700 border-dark-600 text-brand-500 focus:ring-brand-500"
            />
          </label>
        </div>
        
        <!-- Test Button -->
        <button
          v-if="store.notificationsEnabled"
          @click="testNotification"
          class="w-full px-3 py-2 text-sm bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>🧪</span>
          Send Test Notification
        </button>
        
        <!-- Status Info -->
        <div class="text-xs text-dark-600 text-center space-y-1">
          <p>Works best when page is in background</p>
          <p v-if="isPWA" class="text-brand-400/70">
            ✓ Running as installed app
          </p>
          <p v-if="!hasServiceWorker" class="text-yellow-400/70">
            ⚠ Limited background support
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
