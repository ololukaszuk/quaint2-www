<script setup>
import { ref } from 'vue'
import { useMarketStore } from '../store/market'

const props = defineProps({
  mobile: { type: Boolean, default: false }
})

const store = useMarketStore()
const isExpanded = ref(false)

const handleNotificationToggle = async () => {
  if (!store.notificationsEnabled) {
    const granted = await store.requestNotificationPermission()
    if (granted) {
      store.sendNotification('Notifications Enabled', 'You will now receive signal and volatility alerts', { playSound: true })
    }
  } else {
    store.toggleNotifications()
  }
}

const testNotification = () => {
  store.sendNotification(
    'Test Notification',
    'This is a test notification from BTC Analyzer',
    { playSound: true, tag: 'test' }
  )
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
      :class="isExpanded ? 'max-h-80' : 'max-h-0'"
    >
      <div class="px-4 pb-4 space-y-3" :class="{ 'px-3 pb-3': mobile }">
        <!-- Master Toggle -->
        <div class="p-3 bg-dark-800/50 rounded-lg">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <div class="text-sm text-dark-200">Enable Notifications</div>
              <div class="text-xs text-dark-500">
                {{ store.notificationPermission === 'granted' 
                   ? 'Browser notifications are allowed' 
                   : store.notificationPermission === 'denied'
                   ? 'Notifications blocked - check browser settings'
                   : 'Click to enable browser notifications' }}
              </div>
            </div>
            <button
              @click.prevent="handleNotificationToggle"
              class="relative w-10 h-6 rounded-full transition-colors"
              :class="store.notificationsEnabled ? 'bg-brand-600' : 'bg-dark-600'"
            >
              <span 
                class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                :class="{ 'translate-x-4': store.notificationsEnabled }"
              ></span>
            </button>
          </label>
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
          
          <!-- Volatility Notifications -->
          <label class="flex items-center justify-between p-2 rounded hover:bg-dark-800/30 cursor-pointer">
            <div class="flex items-center gap-2">
              <span>⚡</span>
              <div>
                <div class="text-sm text-dark-300">High Volatility</div>
                <div class="text-xs text-dark-500">
                  Alert when price moves ≥{{ store.config?.notifications?.volatility_threshold || 0.5 }}% in 1 second
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
          class="w-full px-3 py-2 text-sm bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg transition-colors"
        >
          Send Test Notification
        </button>
        
        <!-- Info -->
        <div class="text-xs text-dark-600 text-center">
          Works best when page is in background
        </div>
      </div>
    </div>
  </div>
</template>
