import React, { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verificar se já está instalado
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      const isInstalled = localStorage.getItem('pwa-installed') === 'true'
      setIsInstalled(isStandalone || isInstalled)
    }

    checkIfInstalled()

    // Listener para o evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Mostrar prompt após 5 segundos se não foi dispensado
      setTimeout(() => {
        if (!localStorage.getItem('pwa-dismissed') && !isInstalled) {
          setShowInstallPrompt(true)
        }
      }, 5000)
    }

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      localStorage.setItem('pwa-installed', 'true')
      console.log('PWA foi instalado com sucesso!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação')
    } else {
      console.log('Usuário recusou a instalação')
    }
    
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">
          <i className="fas fa-mobile-alt"></i>
        </div>
        <div className="pwa-prompt-text">
          <h3>Instalar TEX</h3>
          <p>Adicione o TEX à sua tela inicial para acesso rápido e experiência completa</p>
        </div>
        <div className="pwa-prompt-actions">
          <button onClick={handleInstallClick} className="pwa-install-button">
            <i className="fas fa-download"></i>
            Instalar App
          </button>
          <button onClick={handleDismiss} className="pwa-dismiss-button">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt