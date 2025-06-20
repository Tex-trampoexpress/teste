// Service Worker para PWA - Versão Otimizada
const CACHE_NAME = 'tex-v1.0.1'
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
  // Estratégia: Network First, fallback para Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a requisição foi bem-sucedida, clone e cache
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone)
            })
        }
        return response
      })
      .catch(() => {
        // Se falhou, tenta buscar no cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response
            }
            // Se não tem no cache, retorna página offline
            if (event.request.destination === 'document') {
              return caches.match('/')
            }
          })
      })
  )
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