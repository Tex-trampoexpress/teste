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

  // Get all users with optional filters
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
    limit?: number
  }): Promise<Usuario[]> {
    let query = supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm},localizacao.ilike.${searchTerm}`)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting users:', error)
      throw error
    }
    return data || []
  }

  // Get users by proximity using the database function
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('localizacao', `%${location}%`)
      .eq('status', 'available')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Error getting users by location:', error)
      throw error
    }
    return data || []
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
    totalViews?: number
    responseRate?: number
  }> {
    const user = await this.getUsuario(id)
    if (!user) {
      throw new Error('User not found')
    }

    return {
      profileCreated: user.criado_em,
      // These could be implemented later with additional tables
      totalViews: 0,
      responseRate: 0
    }
  }
}