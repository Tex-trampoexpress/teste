import React from 'react'
import type { Usuario } from '../../lib/database'

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

interface ProfileSetupScreenProps {
  profileForm: ProfileFormData
  onNomeChange: (value: string) => void
  onDescricaoChange: (value: string) => void
  onLocalizacaoChange: (value: string) => void
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleProfileSave: () => void
  currentUser: Usuario | null
  userLocation: {latitude: number, longitude: number} | null
  requestLocation: () => void
  renderBackButton: () => React.ReactNode
}

const TextInput = ({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  )
}

const TextArea = ({ value, onChange, placeholder, rows }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows: number
}) => {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      autoComplete="off"
    />
  )
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  profileForm,
  onNomeChange,
  onDescricaoChange,
  onLocalizacaoChange,
  setProfileForm,
  addTag,
  removeTag,
  handlePhotoUpload,
  handleProfileSave,
  currentUser,
  userLocation,
  requestLocation,
  renderBackButton
}) => {
  const [tagInput, setTagInput] = React.useState('')

  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTag(tagInput)
      setTagInput('')
    }
  }

  return (
    <div className="form-container profile-setup">
      {renderBackButton()}
      <h2>Criar Perfil</h2>
      <p>Complete seu perfil para começar a receber contatos</p>

      <div className="photo-upload">
        <div className="photo-preview">
          {profileForm.foto_url ? (
            <img src={profileForm.foto_url} alt="Preview" />
          ) : (
            <i className="fas fa-camera"></i>
          )}
        </div>
        <label htmlFor="photo-input">
          <i className="fas fa-upload"></i>
          Adicionar Foto
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
        />
      </div>

      <div className="form-group">
        <label>Nome Completo *</label>
        <TextInput
          value={profileForm.nome}
          onChange={onNomeChange}
          placeholder="Seu nome completo"
        />
      </div>

      <div className="form-group">
        <label>Descrição Profissional *</label>
        <TextArea
          value={profileForm.descricao}
          onChange={onDescricaoChange}
          placeholder="Descreva seus serviços e experiência..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Especialidades *</label>
        <div className="tags-input">
          <div className="tags-input-wrapper">
            <input
              type="text"
              placeholder="Digite uma especialidade"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="add-tag-btn"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
          <div className="tags-container">
            {profileForm.tags.map((tag, index) => (
              <div key={index} className="tag">
                {tag}
                <i className="fas fa-times" onClick={() => removeTag(tag)}></i>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Localização</label>
        <TextInput
          value={profileForm.localizacao}
          onChange={onLocalizacaoChange}
          placeholder="Cidade, Estado"
        />
        <div className="location-gps-option">
          {userLocation ? (
            <p className="location-gps-status">
              <i className="fas fa-check-circle"></i>
              Localização GPS ativada
            </p>
          ) : (
            <button
              type="button"
              className="location-gps-btn"
              onClick={() => {
                requestLocation()
                if (userLocation) {
                  setProfileForm(prev => ({
                    ...prev,
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude
                  }))
                }
              }}
            >
              <i className="fas fa-map-marker-alt"></i>
              Usar GPS
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Status</label>
        <div className="status-toggle">
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'available' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'available' }))}
          >
            <span className="dot available"></span>
            Disponível
          </button>
          <button
            type="button"
            className={`status-btn ${profileForm.status === 'busy' ? 'active' : ''}`}
            onClick={() => setProfileForm(prev => ({ ...prev, status: 'busy' }))}
          >
            <span className="dot busy"></span>
            Ocupado
          </button>
        </div>
      </div>

      <div className="whatsapp-preview">
        <h4>Prévia do Contato</h4>
        <div className="contact-preview">
          <i className="fab fa-whatsapp"></i>
          {currentUser?.whatsapp || '+55 11 99999-9999'}
        </div>
      </div>

      <button className="save-profile-btn" onClick={handleProfileSave}>
        <i className="fas fa-save"></i>
        Salvar Perfil
      </button>
    </div>
  )
}

export default ProfileSetupScreen
