import React, { useState, useEffect } from 'react'
import { EnhancedDatabaseService, type UserStatistics } from '../lib/database-enhanced'

interface UserStatisticsProps {
  userId: string
  className?: string
}

const UserStatisticsComponent: React.FC<UserStatisticsProps> = ({ 
  userId, 
  className = '' 
}) => {
  const [stats, setStats] = useState<UserStatistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadStatistics()
    }
  }, [userId])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const statistics = await EnhancedDatabaseService.getUserStatistics(userId)
      setStats(statistics)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`user-statistics loading ${className}`}>
        <div className="stats-header">
          <i className="fas fa-chart-line"></i>
          <h4>Carregando estatísticas...</h4>
        </div>
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card loading">
              <div className="stat-icon loading-circle"></div>
              <div className="stat-content">
                <div className="loading-line"></div>
                <div className="loading-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`user-statistics error ${className}`}>
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Não foi possível carregar as estatísticas</p>
        </div>
      </div>
    )
  }

  const getPerformanceLevel = (percentile: number) => {
    if (percentile >= 90) return { level: 'Excelente', color: '#4CAF50', icon: 'fa-trophy' }
    if (percentile >= 75) return { level: 'Muito Bom', color: '#2196F3', icon: 'fa-medal' }
    if (percentile >= 50) return { level: 'Bom', color: '#FF9800', icon: 'fa-star' }
    if (percentile >= 25) return { level: 'Regular', color: '#FFC107', icon: 'fa-thumbs-up' }
    return { level: 'Iniciante', color: '#9E9E9E', icon: 'fa-seedling' }
  }

  const performance = getPerformanceLevel(stats.percentile)

  return (
    <div className={`user-statistics ${className}`}>
      <div className="stats-header">
        <i className="fas fa-chart-line"></i>
        <h4>Suas Estatísticas</h4>
        <div className="performance-badge" style={{ backgroundColor: performance.color }}>
          <i className={`fas ${performance.icon}`}></i>
          {performance.level}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users" style={{ color: '#2196F3' }}></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_users.toLocaleString()}</div>
            <div className="stat-label">Total de Usuários</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-user-check" style={{ color: '#4CAF50' }}></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.active_users.toLocaleString()}</div>
            <div className="stat-label">Usuários Ativos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-ranking-star" style={{ color: '#FF9800' }}></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">#{stats.user_rank.toLocaleString()}</div>
            <div className="stat-label">Sua Posição</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-percentage" style={{ color: performance.color }}></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.percentile.toFixed(1)}%</div>
            <div className="stat-label">Percentil</div>
          </div>
        </div>
      </div>

      <div className="performance-summary">
        <div className="performance-bar">
          <div 
            className="performance-fill" 
            style={{ 
              width: `${stats.percentile}%`,
              backgroundColor: performance.color 
            }}
          ></div>
        </div>
        <p className="performance-text">
          Você está melhor que <strong>{stats.percentile.toFixed(1)}%</strong> dos usuários da plataforma
        </p>
      </div>

      <style jsx>{`
        .user-statistics {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .user-statistics.loading {
          animation: pulse 2s infinite;
        }

        .user-statistics.error {
          text-align: center;
          padding: 2rem;
        }

        .error-content i {
          font-size: 2rem;
          color: #f44336;
          margin-bottom: 1rem;
        }

        .error-content p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .stats-header {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .stats-header i {
          color: #00FFFF;
          font-size: 1.2rem;
        }

        .stats-header h4 {
          margin: 0;
          color: white;
          flex: 1;
        }

        .performance-badge {
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        .stat-card.loading {
          animation: pulse 2s infinite;
        }

        .stat-icon {
          margin-bottom: 0.8rem;
        }

        .stat-icon i {
          font-size: 1.5rem;
        }

        .loading-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 auto 0.8rem;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .loading-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          margin-bottom: 0.3rem;
        }

        .loading-line.short {
          width: 60%;
          margin: 0 auto;
        }

        .performance-summary {
          text-align: center;
        }

        .performance-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.8rem;
        }

        .performance-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s ease;
        }

        .performance-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin: 0;
        }

        .performance-text strong {
          color: white;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.8rem;
          }

          .stat-card {
            padding: 0.8rem;
          }

          .stat-value {
            font-size: 1.2rem;
          }

          .stat-label {
            font-size: 0.7rem;
          }

          .stats-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .performance-badge {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  )
}

export default UserStatisticsComponent