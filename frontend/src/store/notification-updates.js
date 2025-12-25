/**
 * Updated Notification Functions for market.js
 * Replace the existing notification functions with these for better mobile support
 * 
 * INSTRUCTIONS: Merge these updates into your frontend/src/store/market.js file
 */

// Add these new refs at the top of the store (around line 160):
const serviceWorkerRegistration = ref(null)
const pushSubscription = ref(null)

// Replace/update the connect() function notification initialization (around line 490-505):
async function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return
  }
  
  // Register service worker for push notifications
  await registerServiceWorker()
  
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
  
  // ... rest of connect() function remains the same
}

// Add this new function after the connect() function:
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    return null
  }
  
  try {
    // Check if already registered
    const existingRegistrations = await navigator.serviceWorker.getRegistrations()
    if (existingRegistrations.length > 0) {
      serviceWorkerRegistration.value = existingRegistrations[0]
      console.log('✅ Using existing Service Worker')
      return serviceWorkerRegistration.value
    }
    
    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    serviceWorkerRegistration.value = registration
    console.log('✅ Service Worker registered:', registration.scope)
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New Service Worker version available')
        }
      })
    })
    
    return registration
  } catch (error) {
    console.warn('Service Worker registration failed:', error)
    return null
  }
}

// Replace the requestNotificationPermission() function (around line 330-370):
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications')
    return false
  }
  
  // Check for iOS specific requirements
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true
  
  // iOS requires PWA for notifications (16.4+)
  if (isIOS && !isPWA) {
    console.warn('iOS requires adding to Home Screen for notifications')
    // Don't show alert here - let the UI component handle guidance
    return false
  }
  
  // Check if already denied
  if (notificationPermission.value === 'denied') {
    console.warn('Notification permission was denied')
    return false
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    
    if (permission === 'granted') {
      notificationsEnabled.value = true
      
      // Try to subscribe to push notifications if available
      if ('PushManager' in window && serviceWorkerRegistration.value) {
        try {
          // Note: Real push subscription requires VAPID keys from backend
          // This is a placeholder for the subscription flow
          const existingSubscription = await serviceWorkerRegistration.value.pushManager.getSubscription()
          if (existingSubscription) {
            pushSubscription.value = existingSubscription
            console.log('✅ Push subscription exists')
          }
        } catch (pushError) {
          console.warn('Push subscription not available:', pushError)
        }
      }
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

// Replace the sendNotification() function (around line 372-391):
async function sendNotification(title, body, options = {}) {
  if (!notificationsEnabled.value || notificationPermission.value !== 'granted') {
    return
  }
  
  // Play sound if enabled
  if (soundEnabled.value && options.playSound !== false) {
    playNotificationSound(options.soundType || 'signal')
  }
  
  const notificationOptions = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: options.tag || 'quaintone-notification',
    renotify: options.renotify || true,
    requireInteraction: options.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    silent: false,
    data: {
      url: window.location.href,
      timestamp: Date.now(),
      ...options.data
    },
    ...options
  }
  
  try {
    // Try service worker notification first (better for mobile/background)
    if (serviceWorkerRegistration.value?.active) {
      // Use showNotification on the registration for better mobile support
      await serviceWorkerRegistration.value.showNotification(title, notificationOptions)
      console.log('📱 Notification sent via Service Worker')
      return
    }
    
    // Fallback to regular Notification API
    const notification = new Notification(title, notificationOptions)
    
    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)
    
    console.log('🔔 Notification sent via Notification API')
  } catch (error) {
    console.error('Failed to send notification:', error)
    
    // Last resort: try SW message-based notification
    if (serviceWorkerRegistration.value?.active) {
      try {
        serviceWorkerRegistration.value.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          options: notificationOptions
        })
      } catch (swError) {
        console.error('SW fallback also failed:', swError)
      }
    }
  }
}

// Update the playNotificationSound() function for better mobile support (around line 393-428):
function playNotificationSound(type = 'signal') {
  if (!soundEnabled.value) return
  
  try {
    // Create audio context (may need user gesture on mobile)
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      console.warn('AudioContext not supported')
      return
    }
    
    const audioContext = new AudioContext()
    
    // Resume context if suspended (required on mobile)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Different sounds for different notification types
    const now = audioContext.currentTime
    
    if (type === 'buy') {
      oscillator.frequency.setValueAtTime(880, now)      // A5
      oscillator.frequency.setValueAtTime(1100, now + 0.1) // C#6
    } else if (type === 'sell') {
      oscillator.frequency.setValueAtTime(440, now)      // A4
      oscillator.frequency.setValueAtTime(330, now + 0.1) // E4
    } else if (type === 'volatility') {
      oscillator.frequency.setValueAtTime(660, now)       // E5
      oscillator.frequency.setValueAtTime(880, now + 0.05) // A5
      oscillator.frequency.setValueAtTime(660, now + 0.1)  // E5
    } else {
      oscillator.frequency.setValueAtTime(660, now) // E5
    }
    
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    
    oscillator.start(now)
    oscillator.stop(now + 0.2)
    
    // Clean up
    oscillator.onended = () => {
      oscillator.disconnect()
      gainNode.disconnect()
      audioContext.close()
    }
  } catch (e) {
    console.warn('Could not play notification sound:', e)
  }
}

// Add these to the return statement at the end of the store:
// return {
//   ... existing exports ...
//   serviceWorkerRegistration,
//   pushSubscription,
//   registerServiceWorker,
// }
