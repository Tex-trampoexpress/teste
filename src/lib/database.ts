import { supabase } from './supabase'

export interface Usuario {
  id: string
  nome: string | null
  whatsapp: string | null
  descricao: string | null
  tags: string[]
  foto_url: string | null
  localizacao: string | null
  status: 'available' | 'busy'
  criado_em: string
  atualizado_em: string
}

export class DatabaseService {
  // Create or update user profile
  static async upsertUsuario(usuario: Partial<Usuario>) {
    const { data, error } = await supabase
      .from('usuarios')
      .upsert(usuario, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get user profile by ID
  static async getUsuario(id: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  // Get all users with optional filters
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
  }) {
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
      query = query.or(`nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Update user status
  static async updateStatus(id: string, status: 'available' | 'busy') {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Search users by tags
  static async searchByTags(tags: string[]) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .overlaps('tags', tags)
      .eq('status', 'available')
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get users by location
  static async getUsersByLocation(location: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('localizacao', `%${location}%`)
      .eq('status', 'available')
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  }
}