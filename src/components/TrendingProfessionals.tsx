import React, { useState, useEffect } from 'react'
import { EnhancedDatabaseService, type EnhancedUsuario } from '../lib/database-enhanced'

interface TrendingProfessionalsProps {
  onUserClick?: (user: EnhancedUsuario) => void
  onContactClick?: (user: EnhancedUsuario) => void
}

const TrendingProfessionals: React.FC<TrendingProfessionalsProps> = ({
  onUserClick,
  onContactClick
}) => {
  const [trendingUsers, setTrendingUsers] = useState<EnhancedUsuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrendingProfessionals()
  }, [])

  const loadTrendingProfessionals = async () => {
    try {
      setLoading(true)
      const users = await EnhancedDatabaseService.getTrendingProfessionals(8)
      setTrendingUsers(users)
    } catch (error) {
      console.error('Erro ao carregar profissionais em alta:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (user: EnhancedUsuario) => {
    // Increment profile views
    EnhancedDatabaseService.incrementProfileViews(user.id)
    onUserClick?.(user)
  }

  const handleContactClick = (user: EnhancedUsuario) => {
    // Increment contact count
    EnhancedDatabaseService.incrementContactCount(user.id)
    onContactClick?.(user)
  }

  if (loading) {
    return (
      <div className="trending-professionals-loading">
        <div className="loading-header">
          <i className="fas fa-fire"></i>
          <h3>Carregando profissionais em alta...</h3>
        </div>
        <div className="loading-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="loading-card">
              <div className="loading-avatar"></div>
              <div className="loading-content">
                <div className="loading-line"></div>
                <div className="loading-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (trendingUsers.length === 0) {
    return (
      <div className="trending-professionals-empty">
        <i className="fas fa-fire"></i>
        <h3>Nenhum profissional em alta no momento</h3>
        <p>Volte mais tarde para ver os profissionais mais procurados</p>
      </div>
    )
  }

  return (
    <div className="trending-professionals">
      <div className="trending-header">
        <div className="trending-title">
          <i className="fas fa-fire"></i>
          <h3>Profissionais em Alta</h3>
          <span className="trending-badge">{trendingUsers.length}</span>
        </div>
        <p>Os mais procurados da semana</p>
      </div>

      <div className="trending-grid">
        {trendingUsers.map((user) => (
          <div 
            key={user.id} 
            className="trending-card"
            onClick={() => handleUserClick(user)}
          >
            {/* Badges */}
            <div className="trending-badges">
              {user.featured && (
                <span className="badge featured">
                  <i className="fas fa-star"></i>
                  Destaque
                </span>
              )}
              {user.premium && (
                <span className="badge premium">
                  <i className="fas fa-crown"></i>
                  Premium
                </span>
              )}
              {user.verificado && (
                <span className="badge verified">
                  <i className="fas fa-check-circle"></i>
                  Verificado
                </span>
              )}
            </div>

            {/* Profile Picture */}
            <div className="trending-avatar">
              {user.foto_url ? (
                <img 
                  src={user.foto_url} 
                  alt={user.nome}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <i className={`fas fa-user ${user.foto_url ? 'hidden' : ''}`}></i>
              
              {/* Status indicator */}
              <div className={`status-indicator ${user.status}`}>
                <span className="status-dot"></span>
              </div>
            </div>

            {/* User Info */}
            <div className="trending-info">
              <h4>{user.nome}</h4>
              <p className="trending-description">{user.descricao}</p>
              
              {/* Location */}
              {user.localizacao && (
                <p className="trending-location">
                  <i className="fas fa-map-marker-alt"></i>
                  {user.localizacao}
                </p>
              )}

              {/* Tags */}
              <div className="trending-tags">
                {user.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="trending-tag">
                    #{tag}
                  </span>
                ))}
                {user.tags.length > 3 && (
                  <span className="trending-tag more">
                    +{user.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="trending-stats">
                <div className="stat">
                  <i className="fas fa-eye"></i>
                  <span>{user.profile_views}</span>
                </div>
                <div className="stat">
                  <i className="fas fa-phone"></i>
                  <span>{user.total_contacts}</span>
                </div>
                {user.total_ratings > 0 && (
                  <div className="stat">
                    <i className="fas fa-star"></i>
                    <span>{user.average_rating.toFixed(1)}</span>
                  </div>
                )}
                {user.trending_score && (
                  <div className="stat trending-score">
                    <i className="fas fa-fire"></i>
                    <span>{Math.round(user.trending_score)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Button */}
            <button
              className="trending-contact-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleContactClick(user)
                window.open(
                  `https://wa.me/55${user.whatsapp.replace(/\D/g, '')}?text=Olá! Vi seu perfil no TEX e gostaria de conversar sobre seus serviços.`,
                  '_blank'
                )
              }}
            >
              <i className="fab fa-whatsapp"></i>
              Contatar
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .trending-professionals {
          margin: 2rem 0;
        }

        .trending-professionals-loading,
        .trending-professionals-empty {
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .trending-professionals-empty i {
          font-size: 3rem;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 1rem;
        }

        .loading-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .loading-header i {
          color: #ff6b35;
          animation: pulse 2s infinite;
        }

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .loading-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .loading-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          animation: pulse 2s infinite;
        }

        .loading-content {
          flex: 1;
        }

        .loading-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          margin-bottom: 0.5rem;
          animation: pulse 2s infinite;
        }

        .loading-line.short {
          width: 60%;
        }

        .trending-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .trending-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .trending-title i {
          color: #ff6b35;
          font-size: 1.5rem;
        }

        .trending-title h3 {
          margin: 0;
          background: linear-gradient(135deg, #FFD700, #00FFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 1.5rem;
        }

        .trending-badge {
          background: #ff6b35;
          color: white;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .trending-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .trending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .trending-card {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          backdrop-filter: blur(10px);
        }

        .trending-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 255, 255, 0.2);
          border-color: rgba(0, 255, 255, 0.3);
        }

        .trending-badges {
          position: absolute;
          top: 1rem;
          right: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .badge {
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .badge.featured {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #000;
        }

        .badge.premium {
          background: linear-gradient(135deg, #9C27B0, #673AB7);
          color: white;
        }

        .badge.verified {
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
          color: white;
        }

        .trending-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin: 0 auto 1rem;
          position: relative;
          background: linear-gradient(135deg, #FFD700, #00FFFF);
          padding: 3px;
          overflow: hidden;
        }

        .trending-avatar img {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          object-fit: cover;
        }

        .trending-avatar i {
          width: 74px;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 50%;
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .status-indicator {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-indicator.available {
          background: #4CAF50;
        }

        .status-indicator.busy {
          background: #f44336;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
        }

        .trending-info {
          text-align: center;
        }

        .trending-info h4 {
          margin: 0 0 0.5rem 0;
          color: white;
          font-size: 1.1rem;
        }

        .trending-description {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin: 0 0 0.8rem 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .trending-location {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }

        .trending-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .trending-tag {
          background: rgba(0, 255, 255, 0.1);
          color: #00FFFF;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          font-size: 0.7rem;
          border: 1px solid rgba(0, 255, 255, 0.2);
        }

        .trending-tag.more {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .trending-stats {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
        }

        .stat i {
          color: #00FFFF;
        }

        .stat.trending-score i {
          color: #ff6b35;
        }

        .trending-contact-btn {
          width: 100%;
          background: #25D366;
          color: white;
          border: none;
          padding: 0.8rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .trending-contact-btn:hover {
          background: #128C7E;
          transform: translateY(-1px);
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .trending-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }

          .trending-card {
            padding: 1rem;
          }

          .trending-badges {
            position: static;
            flex-direction: row;
            justify-content: center;
            margin-bottom: 1rem;
          }

          .trending-stats {
            gap: 0.5rem;
          }

          .stat {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  )
}

export default TrendingProfessionals