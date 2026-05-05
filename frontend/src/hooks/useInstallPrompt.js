import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

/**
 * Hook que captura el evento `beforeinstallprompt` del navegador.
 * Devuelve:
 *   - canInstall: boolean — el componente debe renderizar el botón (forzado o real)
 *   - isReady: boolean — el navegador YA disparó el evento y el botón FUNCIONARÁ
 *   - promptInstall: función — muestra el prompt nativo de instalación
 *   - handleDismiss: función — oculta el banner permanentemente
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(
    () => window.location.search.includes('pwa=debug') || sessionStorage.getItem('pwa-debug') === 'true'
  )
  const [dismissed, setDismissed] = useState(false) 

  useEffect(() => {
    const handler = (e) => {
      console.log('PWA: beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    console.log('PWA: Listening for beforeinstallprompt...')
    window.addEventListener('beforeinstallprompt', handler)

    // Si ya activamos el modo debug, avisamos que estamos forzando
    if (window.location.search.includes('pwa=debug')) {
      toast('Modo Debug PWA: Forzando visibilidad del botón', { icon: '🛠️' })
    }

    // Si ya está instalada como PWA, no mostramos nada
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed event fired')
      setCanInstall(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) {
      toast.error('El navegador aún no permite la instalación. Prueba interactuando un poco más con la página o refrescando.', {
        duration: 5000,
        position: 'top-center'
      })
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
      setDeferredPrompt(null)
      toast.success('¡Instalación iniciada!')
    }
  }

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
  }

  return { 
    canInstall: canInstall && !dismissed, 
    isReady: !!deferredPrompt, 
    promptInstall, 
    handleDismiss 
  }
}
