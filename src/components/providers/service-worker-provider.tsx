'use client'

/**
 * Service Worker Provider
 *
 * Registers the service worker and provides context for PWA features.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { registerServiceWorker } from '@/lib/client/pwa/register-sw'

interface ServiceWorkerContextValue {
  isRegistered: boolean
  registration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  update: () => void
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue>({
  isRegistered: false,
  registration: null,
  updateAvailable: false,
  update: () => {},
})

export function useServiceWorker() {
  return useContext(ServiceWorkerContext)
}

interface ServiceWorkerProviderProps {
  children: ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Only register in production or when explicitly enabled
    const shouldRegister =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === 'true'

    if (!shouldRegister) {
      return
    }

    async function register() {
      const reg = await registerServiceWorker()
      if (reg) {
        setRegistration(reg)
        setIsRegistered(true)

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        })
      }
    }

    register()
  }, [])

  const update = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return (
    <ServiceWorkerContext.Provider
      value={{
        isRegistered,
        registration,
        updateAvailable,
        update,
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  )
}
