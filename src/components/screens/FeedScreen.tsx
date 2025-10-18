import React, { useEffect, useRef, useState } from 'react'
import type { Usuario } from '../../lib/database'

interface FeedScreenProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onSearchUsersEnter: () => void
  proximityEnabled: boolean
  setProximityEnabled: (enabled: boolean) => void
  userLocation: {latitude: number, longitude: number} | null
  requestLocation: () => void
  proximityRadius: number
  setProximityRadius: (radius: number) => void
  searchUsers: () => void
  loading: boolean
  users: Usuario[]
  handleTagClick: (tag: string) => void
  handleContactClick: (user: Usuario) => void
  navigateTo: (screen: string) => void
  renderBackButton: () => React.ReactNode
  loadMoreUsers: () => void
  hasMore: boolean
  isLoadingMore: boolean
  totalUsers: number
}

const SearchInput = ({ value, onChange, onEnter, placeholder }: {
  value: string
  onChange: (value: string) => void
  onEnter: () => void
  placeholder: string
}) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onEnter()
        }
      }}
      autoComplete="off"
    />
  )
}

const SkeletonCard = () => (
  <div className="profile-card skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-info">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
      </div>
    </div>
    <div className="skeleton-tags">
      <div className="skeleton-tag"></div>
      <div className="skeleton-tag"></div>
      <div className="skeleton-tag"></div>
    </div>
  </div>
)

const FeedScreen: React.FC<FeedScreenProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchUsersEnter,
  proximityEnabled,
  setProximityEnabled,
  userLocation,
  requestLocation,
  proximityRadius,
  setProximityRadius,
  searchUsers,
  loading,
  users,
  handleTagClick,
  handleContactClick,
  navigateTo,
  renderBackButton,
  loadMoreUsers,
  hasMore,
  isLoadingMore,
  totalUsers
}) => {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => {
    if (!userLocation) {
      requestLocation()
    }
  }, [])

  useEffect(() => {
    const currentTarget = observerTarget.current
    if (!currentTarget || users.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        console.log(`👁️ Observer: intersecting=${entry.isIntersecting}, hasMore=${hasMore}, loading=${isLoadingMore || loading}`)

        if (entry.isIntersecting && hasMore && !isLoadingMore && !loading) {
          console.log('🔍 [OBSERVER] Fim da lista detectado - disparando loadMoreUsers()')
          loadMoreUsers()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(currentTarget)
    console.log('👁️ Observer inicializado')

    return () => {
      observer.disconnect()
      console.log('👁️ Observer desconectado')
    }
  }, [hasMore, isLoadingMore, loading, users.length])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await searchUsers()
    setTimeout(() => {
      setIsRefreshing(false)
      setPullDistance(0)
    }, 500)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart > 0 && window.scrollY === 0) {
      const distance = e.touches[0].clientY - touchStart
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
    setTouchStart(0)
  }

  return (
    <div
      className="feed"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance / 100
          }}
        >
          <div className="refresh-spinner">
            <i className={`fas fa-${pullDistance > 60 ? 'sync-alt' : 'arrow-down'} ${isRefreshing ? 'fa-spin' : ''}`}></i>
          </div>
          <span>{pullDistance > 60 ? 'Solte para atualizar' : 'Puxe para atualizar'}</span>
        </div>
      )}

      {renderBackButton()}

      <div className="search-header">
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <SearchInput
            value={searchTerm}
            onChange={onSearchTermChange}
            onEnter={onSearchUsersEnter}
            placeholder="Ex: pintor, encanador, eletricista..."
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => onSearchTermChange('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <button className="explore-btn" onClick={searchUsers}>
          <i className="fas fa-search"></i>
          BUSCAR
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="skeleton-container">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : users.length === 0 ? (
        <div className="no-results">
          <i className="fas fa-search"></i>
          <h3>Nenhum profissional encontrado</h3>
          <p>Tente ajustar sua busca ou localização</p>
          <div className="no-results-actions">
            <button className="explore-all-btn" onClick={() => {
              onSearchTermChange('')
              setProximityEnabled(false)
              searchUsers()
            }}>
              Ver Todos os Profissionais
            </button>
            <button className="back-home-btn" onClick={() => navigateTo('home')}>
              <i className="fas fa-home"></i>
              Voltar ao Início
            </button>
          </div>
        </div>
      ) : (
        <div>
          {users.map((user, index) => (
            <div
              key={user.id}
              className="profile-card"
              style={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
              }}
            >
              <div className="profile-header">
                <div className="profile-pic">
                  {user.foto_url ? (
                    <img src={user.foto_url} alt={user.nome} />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div className="profile-info">
                  <div className="profile-name-distance">
                    <h2>{user.nome}</h2>
                    {typeof user.distancia === 'number' && (
                      <span className="distance-badge">
                        <i className="fas fa-map-marker-alt"></i>
                        {user.distancia.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <p className="description">{user.descricao}</p>
                  {user.localizacao && (
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                      <i className="fas fa-map-marker-alt"></i> {user.localizacao}
                    </p>
                  )}
                  <span className={`status status-${user.status}`}>
                    {user.status === 'available' ? 'Disponível' : 'Ocupado'}
                  </span>
                </div>
              </div>

              {user.tags && user.tags.length > 0 && (
                <div className="hashtags">
                  {user.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="tag-clickable"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                className="whatsapp-btn"
                onClick={() => handleContactClick(user)}
              >
                <i className="fab fa-whatsapp"></i>
                Entrar em Contato
              </button>
            </div>
          ))}

          {isLoadingMore && (
            <div className="loading-more">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Carregando mais profissionais...</span>
            </div>
          )}

          {!hasMore && users.length > 0 && (
            <div className="end-of-list">
              <i className="fas fa-check-circle"></i>
              <span>Todos os Profissionais carregados</span>
            </div>
          )}

          <div ref={observerTarget} style={{ height: '20px' }}></div>
        </div>
      )}
    </div>
  )
}

export default FeedScreen
