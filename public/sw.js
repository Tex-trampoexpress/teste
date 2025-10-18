// Service Worker para PWA - Versão Otimizada
const CACHE_NAME = 'tex-v1.0.2'
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando versão', CACHE_NAME)
  
  // Forçar ativação imediata
  self.skipWaiting()
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .catch((error) => {
        console.log('Service Worker: Erro ao cachear:', error)
      })
  )
})

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando versão', CACHE_NAME)
  
  // Tomar controle imediatamente
  self.clients.claim()
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições de APIs externas e Supabase
  if (url.origin.includes('supabase') || url.origin.includes('mercadopago')) {
    return
  }

  // Estratégia: Network First para HTML, Cache First para assets
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/')
          })
        })
    )
  } else {
    // Cache First para assets (imagens, CSS, JS)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
  }
})

// Notificações Push (futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver no TEX',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    }
    
    event.waitUntil(
      self.registration.showNotification('TEX - TrampoExpress', options)
    )
  }
})

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})