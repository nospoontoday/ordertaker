"use client"

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/register-sw'

export function ServiceWorkerInitializer() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
