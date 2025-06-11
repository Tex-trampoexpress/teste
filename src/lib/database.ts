import { supabase } from './supabase'

export interface Usuario {
  id: string
  nome: string
  whatsapp: string
  descricao: string | null
  tags: string[]
  foto_url: string | null
  localizacao: string | null
  status: 'available' | 'busy'
  latitude?: number | null
  longitude?: number | null
  criado_em: string
  atualizado_em: string
  ultimo_acesso: string
  perfil_completo: boolean
  verificado: boolean
  distancia?: number
}

export interface CreateUsuarioData {
  id: string
  nome: string
  whatsapp: string
  descricao: string
  tags: string[]
  foto_url?: string
  localizacao?: string
  status?: 'available' | 'busy'
  latitude?: number
  longitude?: number
}

export interface UpdateUsuarioData {
  nome?: string
  descricao?: string
  tags?: string[]
  foto_url?: string | null
  localizacao?: string | null
  status?: 'available' | 'busy'
  latitude?: number | null
  longitude?: number | null
}

export class DatabaseService {
  // Create new user profile
  static async createUsuario(userData: CreateUsuarioData): Promise<Usuario> {
    console.log('🔄 Criando usuário:', userData)
    
    try {
      // Validar dados obrigatórios
      if (!userData.nome?.trim()) {
        throw new Error('Nome é obrigatório')
      }
      if (!userData.whatsapp?.trim()) {
        throw new Error('WhatsApp é obrigatório')
      }
      if (!userData.descricao?.trim()) {
        throw new Error('Descrição é obrigatória')
      }
      if (!userData.tags || userData.tags.length === 0) {
        throw new Error('Pelo menos uma especialidade é obrigatória')
      }

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          id: userData.id,
          nome: userData.nome.trim(),
          whatsapp: userData.whatsapp.trim(),
          descricao: userData.descricao.trim(),
          tags: userData.tags,
          foto_url: userData.foto_url || null,
          localizacao: userData.localizacao?.trim() || null,
          status: userData.status || 'available',
          latitude: userData.latitude || null,
          longitude: userData.longitude || null
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao criar usuário:', error)
        if (error.code === '23505') {
          throw new Error('Este número de WhatsApp já está cadastrado')
        }
        throw new Error(`Erro ao criar perfil: ${error.message}`)
      }

      console.log('✅ Usuário criado com sucesso:', data)
      return data
    } catch (error) {
      console.error('❌ Erro na criação do usuário:', error)
      throw error
    }
  }

  // Update existing user profile
  static async updateUsuario(id: string, userData: UpdateUsuarioData): Promise<Usuario> {
    console.log('🔄 Atualizando usuário:', id, userData)
    
    try {
      const updateData: any = {}
      
      // Validar e limpar dados
      if (userData.nome !== undefined) {
        if (!userData.nome?.trim()) {
          throw new Error('Nome não pode estar vazio')
        }
        updateData.nome = userData.nome.trim()
      }
      
      if (userData.descricao !== undefined) {
        if (userData.descricao && !userData.descricao.trim()) {
          throw new Error('Descrição não pode estar vazia')
        }
        updateData.descricao = userData.descricao?.trim() || null
      }
      
      if (userData.tags !== undefined) {
        updateData.tags = userData.tags
      }
      
      if (userData.foto_url !== undefined) {
        updateData.foto_url = userData.foto_url
      }
      
      if (userData.localizacao !== undefined) {
        updateData.localizacao = userData.localizacao?.trim() || null
      }
      
      if (userData.status !== undefined) {
        updateData.status = userData.status
      }
      
      if (userData.latitude !== undefined) {
        updateData.latitude = userData.latitude
      }
      
      if (userData.longitude !== undefined) {
        updateData.longitude = userData.longitude
      }

      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao atualizar usuário:', error)
        if (error.code === '23505') {
          throw new Error('Este número de WhatsApp já está cadastrado')
        }
        throw new Error(`Erro ao atualizar perfil: ${error.message}`)
      }

      console.log('✅ Usuário atualizado com sucesso:', data)
      return data
    } catch (error) {
      console.error('❌ Erro na atualização do usuário:', error)
      throw error
    }
  }

  // Update last access timestamp
  static async updateLastAccess(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('⚠️ Erro ao atualizar último acesso:', error)
      }
    } catch (error) {
      console.error('⚠️ Erro ao atualizar último acesso:', error)
    }
  }

  // Get user profile by ID
  static async getUsuario(id: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao buscar usuário:', error)
        throw new Error(`Erro ao buscar perfil: ${error.message}`)
      }

      // Update last access when profile is viewed
      if (data) {
        this.updateLastAccess(id)
      }

      return data
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error)
      throw error
    }
  }

  // Get user profile by WhatsApp number
  static async getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('whatsapp', whatsapp.trim())
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao buscar usuário por WhatsApp:', error)
        throw new Error(`Erro ao buscar por WhatsApp: ${error.message}`)
      }

      // Update last access when user logs in
      if (data) {
        this.updateLastAccess(data.id)
      }

      return data
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por WhatsApp:', error)
      throw error
    }
  }

  // Delete user profile
  static async deleteUsuario(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Erro ao deletar usuário:', error)
        throw new Error(`Erro ao excluir perfil: ${error.message}`)
      }

      console.log('✅ Usuário deletado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao deletar usuário:', error)
      throw error
    }
  }

  // Get all users with optional filters
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
    limit?: number
  }): Promise<Usuario[]> {
    try {
      const searchTerm = filters?.search?.trim() || ''
      const filterTags = filters?.tags || []
      const filterStatus = filters?.status || 'available'
      const limitResults = filters?.limit || 50

      console.log('🔍 Buscando usuários com filtros:', { searchTerm, filterTags, filterStatus, limitResults })

      const { data, error } = await supabase
        .rpc('search_usuarios', {
          search_term: searchTerm,
          filter_tags: filterTags,
          filter_status: filterStatus,
          limit_results: limitResults
        })

      if (error) {
        console.error('❌ Erro na busca de usuários:', error)
        // Fallback para busca simples se a função RPC falhar
        console.log('🔄 Tentando busca simples como fallback...')
        return this.getUsuariosSimple(filters)
      }

      console.log(`✅ Encontrados ${data?.length || 0} usuários`)
      return data || []
    } catch (error) {
      console.error('❌ Erro na busca de usuários:', error)
      // Fallback para busca simples
      return this.getUsuariosSimple(filters)
    }
  }

  // Fallback simple search
  private static async getUsuariosSimple(filters?: {
    status?: 'available' | 'busy'
    search?: string
    limit?: number
  }): Promise<Usuario[]> {
    try {
      let query = supabase
        .from('usuarios')
        .select('*')
        .eq('status', filters?.status || 'available')
        .eq('perfil_completo', true)
        .order('ultimo_acesso', { ascending: false })

      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim()
        query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,localizacao.ilike.%${searchTerm}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro na busca simples:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro na busca simples:', error)
      return []
    }
  }

  // Get users by proximity
  static async getUsersByProximity(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10
  ): Promise<Usuario[]> {
    try {
      console.log('📍 Buscando usuários por proximidade:', { latitude, longitude, radiusKm })

      const { data, error } = await supabase
        .rpc('get_users_by_proximity', {
          user_lat: latitude,
          user_lon: longitude,
          radius_km: radiusKm
        })

      if (error) {
        console.error('❌ Erro na busca por proximidade:', error)
        // Fallback para busca simples
        return this.getUsuarios({ status: 'available', limit: 20 })
      }

      // Map the distance_km field to distancia for consistency
      const users = (data || []).map((user: any) => ({
        ...user,
        distancia: user.distance_km
      }))

      console.log(`✅ Encontrados ${users.length} usuários próximos`)
      return users
    } catch (error) {
      console.error('❌ Erro na busca por proximidade:', error)
      // Fallback para busca simples
      return this.getUsuarios({ status: 'available', limit: 20 })
    }
  }

  // Update user status only
  static async updateStatus(id: string, status: 'available' | 'busy'): Promise<Usuario> {
    return this.updateUsuario(id, { status })
  }

  // Search users by tags
  static async searchByTags(tags: string[]): Promise<Usuario[]> {
    return this.getUsuarios({ 
      tags, 
      status: 'available' 
    })
  }

  // Get users by location text search
  static async getUsersByLocation(location: string): Promise<Usuario[]> {
    return this.getUsuarios({
      search: location,
      status: 'available'
    })
  }

  // Check if WhatsApp number is already registered
  static async isWhatsAppRegistered(whatsapp: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('whatsapp', whatsapp.trim())
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao verificar WhatsApp:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('❌ Erro ao verificar WhatsApp:', error)
      return false
    }
  }

  // Get user statistics
  static async getUserStats(id: string): Promise<{
    profileCreated: string
    lastAccess: string
    profileComplete: boolean
    verified: boolean
    totalViews?: number
    responseRate?: number
  }> {
    const user = await this.getUsuario(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    return {
      profileCreated: user.criado_em,
      lastAccess: user.ultimo_acesso,
      profileComplete: user.perfil_completo,
      verified: user.verificado,
      // These could be implemented later with additional tables
      totalViews: 0,
      responseRate: 0
    }
  }

  // Get recent users (most active)
  static async getRecentUsers(limit: number = 20): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('status', 'available')
        .eq('perfil_completo', true)
        .order('ultimo_acesso', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Erro ao buscar usuários recentes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar usuários recentes:', error)
      return []
    }
  }

  // Get featured users (verified or complete profiles)
  static async getFeaturedUsers(limit: number = 10): Promise<Usuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('status', 'available')
        .eq('perfil_completo', true)
        .order('verificado', { ascending: false })
        .order('criado_em', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Erro ao buscar usuários em destaque:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar usuários em destaque:', error)
      return []
    }
  }

  // Verify user profile
  static async verifyUser(id: string): Promise<Usuario> {
    return this.updateUsuario(id, { verificado: true })
  }

  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('count')
        .limit(1)

      if (error) {
        console.error('❌ Erro na conexão:', error)
        return false
      }

      console.log('✅ Conexão com banco de dados OK')
      return true
    } catch (error) {
      console.error('❌ Erro na conexão:', error)
      return false
    }
  }
}