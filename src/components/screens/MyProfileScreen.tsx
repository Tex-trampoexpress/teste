import React from 'react'
import type { Usuario } from '../../lib/database'
import { DatabaseService } from '../../lib/database'
import { toast } from 'react-hot-toast'

interface ProfileFormData {
  nome: string
  descricao: string
  tags: string[]
  foto_url: string
  localizacao: string
  status: 'available' | 'busy'
  latitude: number | null
  longitude: number | null
}

interface MyProfileScreenProps {
  currentUser: Usuario | null
  setCurrentUser: React.Dispatch<React.SetStateAction<Usuario | null>>
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>
  navigateTo: (screen: string) => void
  handleDeleteProfile: () => void
  renderBackButton: () => React.ReactNode
}

const MyProfileScreen: React.FC<MyProfileScreenProps> = ({
  currentUser,
  setCurrentUser,
  setProfileForm,
  navigateTo,
  handleDeleteProfile,
  renderBackButton
}) => {
  if (!currentUser) {
    return (
      <div className="no-profile">
        <h2>Perfil não encontrado</h2>
        <p>Você precisa estar logado para ver seu perfil.</p>
        <button className="create-profile-btn" onClick={() => navigateTo('verify')}>
          Fazer Login
        </button>
      </div>
    )
  }

  return (
    <div className="my-profile-content">
      {renderBackButton()}

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-pic">
            {currentUser.foto_url ? (
              <img src={currentUser.foto_url} alt={currentUser.nome} />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </div>
          <div className="profile-info">
            <h2>{currentUser.nome}</h2>
            <p className="description">{currentUser.descricao}</p>
            {currentUser.localizacao && (
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                <i className="fas fa-map-marker-alt"></i> {currentUser.localizacao}
              </p>
            )}

            <div className="status-toggle-profile">
              <button
                className={`status-btn-profile ${currentUser.status === 'available' ? 'active' : ''}`}
                onClick={async () => {
                  try {
                    const updatedUser = await DatabaseService.updateStatus(currentUser.id, 'available')
                    setCurrentUser(updatedUser)
                    localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
                    toast.success('Status atualizado!')
                  } catch (error) {
                    toast.error('Erro ao atualizar status')
                  }
                }}
              >
                <span className="dot available"></span>
                Disponível
              </button>
              <button
                className={`status-btn-profile ${currentUser.status === 'busy' ? 'active' : ''}`}
                onClick={async () => {
                  try {
                    const updatedUser = await DatabaseService.updateStatus(currentUser.id, 'busy')
                    setCurrentUser(updatedUser)
                    localStorage.setItem('tex-current-user', JSON.stringify(updatedUser))
                    toast.success('Status atualizado!')
                  } catch (error) {
                    toast.error('Erro ao atualizar status')
                  }
                }}
              >
                <span className="dot busy"></span>
                Ocupado
              </button>
            </div>
          </div>
        </div>

        {currentUser.tags && currentUser.tags.length > 0 && (
          <div className="hashtags">
            {currentUser.tags.map((tag, index) => (
              <span key={index}>#{tag}</span>
            ))}
          </div>
        )}

        <div className="profile-stats">
          <div className="stat">
            <i className="fas fa-calendar-alt"></i>
            <span>Membro desde {new Date(currentUser.criado_em).toLocaleDateString()}</span>
          </div>
          <div className="stat">
            <i className="fas fa-clock"></i>
            <span>Último acesso: {new Date(currentUser.ultimo_acesso).toLocaleDateString()}</span>
          </div>
          <div className="stat">
            <i className="fas fa-check-circle"></i>
            <span>Perfil {currentUser.perfil_completo ? 'completo' : 'incompleto'}</span>
          </div>
          {currentUser.verificado && (
            <div className="stat">
              <i className="fas fa-verified"></i>
              <span>Perfil verificado</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-actions">
        <button
          className="edit-profile-btn"
          onClick={() => {
            setProfileForm({
              nome: currentUser.nome,
              descricao: currentUser.descricao || '',
              tags: currentUser.tags || [],
              foto_url: currentUser.foto_url || '',
              localizacao: currentUser.localizacao || '',
              status: currentUser.status,
              latitude: currentUser.latitude,
              longitude: currentUser.longitude
            })
            navigateTo('edit-profile')
          }}
        >
          <i className="fas fa-edit"></i>
          Editar Perfil
        </button>

        <button className="delete-profile-btn" onClick={handleDeleteProfile}>
          <i className="fas fa-trash"></i>
          Excluir Perfil
        </button>
      </div>
    </div>
  )
}

export default MyProfileScreen
