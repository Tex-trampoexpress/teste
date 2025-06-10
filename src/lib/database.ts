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
  descricao?: string
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
  foto_url?: string
  localizacao?: string
  status?: 'available' | 'busy'
  latitude?: number
  longitude?: number
}

export class DatabaseService {
  // Create new user profile
  static async createUsuario(userData: CreateUsuarioData): Promise<Usuario> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: userData.id,
        nome: userData.nome,
        whatsapp: userData.whatsapp,
        descricao: userData.descricao || null,
        tags: userData.tags || [],
        foto_url: userData.foto_url || null,
        localizacao: userData.localizacao || null,
        status: userData.status || 'available',
        latitude: userData.latitude || null,
        longitude: userData.longitude || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }
    return data
  }

  // Update existing user profile
  static async updateUsuario(id: string, userData: UpdateUsuarioData): Promise<Usuario> {
    const updateData: any = {}
    
    // Only include fields that are provided
    if (userData.nome !== undefined) updateData.nome = userData.nome
    if (userData.descricao !== undefined) updateData.descricao = userData.descricao
    if (userData.tags !== undefined) updateData.tags = userData.tags
    if (userData.foto_url !== undefined) updateData.foto_url = userData.foto_url
    if (userData.localizacao !== undefined) updateData.localizacao = userData.localizacao
    if (userData.status !== undefined) updateData.status = userData.status
    if (userData.latitude !== undefined) updateData.latitude = userData.latitude
    if (userData.longitude !== undefined) updateData.longitude = userData.longitude

    const { data, error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }
    return data
  }

  // Update last access timestamp
  static async updateLastAccess(id: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating last access:', error)
    }
  }

  // Get user profile by ID
  static async getUsuario(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error getting user:', error)
      throw error
    }

    // Update last access when profile is viewed
    if (data) {
      this.updateLastAccess(id)
    }

    return data
  }

  // Get user profile by WhatsApp number
  static async getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('whatsapp', whatsapp)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error getting user by WhatsApp:', error)
      throw error
    }

    // Update last access when user logs in
    if (data) {
      this.updateLastAccess(data.id)
    }

    return data
  }

  // Delete user profile
  static async deleteUsuario(id: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  // Get all users with optional filters (using optimized search function)
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
    limit?: number
  }): Promise<Usuario[]> {
    const searchTerm = filters?.search || ''
    const filterTags = filters?.tags || []
    const filterStatus = filters?.status || 'available'
    const limitResults = filters?.limit || 50

    const { data, error } = await supabase
      .rpc('search_usuarios', {
        search_term: searchTerm,
        filter_tags: filterTags,
        filter_status: filterStatus,
        limit_results: limitResults
      })

    if (error) {
      console.error('Error searching users:', error)
      throw error
    }
    return data || []
  }

  // Get users by proximity using the optimized database function
  static async getUsersByProximity(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10
  ): Promise<Usuario[]> {
    const { data, error } = await supabase
      .rpc('get_users_by_proximity', {
        user_lat: latitude,
        user_lon: longitude,
        radius_km: radiusKm
      })

    if (error) {
      console.error('Error getting users by proximity:', error)
      throw error
    }

    // Map the distance_km field to distancia for consistency
    return (data || []).map((user: any) => ({
      ...user,
      distancia: user.distance_km
    }))
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('whatsapp', whatsapp)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - WhatsApp not registered
        return false
      }
      console.error('Error checking WhatsApp registration:', error)
      throw error
    }
    return !!data
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
      throw new Error('User not found')
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('status', 'available')
      .eq('perfil_completo', true)
      .order('ultimo_acesso', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting recent users:', error)
      throw error
    }
    return data || []
  }

  // Get featured users (verified or complete profiles)
  static async getFeaturedUsers(limit: number = 10): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('status', 'available')
      .eq('perfil_completo', true)
      .order('verificado', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting featured users:', error)
      throw error
    }
    return data || []
  }

  // Verify user profile
  static async verifyUser(id: string): Promise<Usuario> {
    return this.updateUsuario(id, { verificado: true })
  }
}