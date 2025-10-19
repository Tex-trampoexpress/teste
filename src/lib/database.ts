import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Usuario {
  id: string
  whatsapp: string
  nome: string
  descricao: string
  tags: string[]
  foto_url: string
  localizacao: string
  status: 'available' | 'busy'
  latitude: number | null
  longitude: number | null
  criado_em: string
  atualizado_em: string
  ultimo_acesso: string
  visualizacoes: number
  taxa_paga: boolean
}

export interface CreateUsuarioData {
  whatsapp: string
  nome: string
  descricao: string
  tags: string[]
  foto_url: string
  localizacao: string
  status: 'available' | 'busy'
  latitude: number | null
  longitude: number | null
}

export interface UpdateUsuarioData {
  nome?: string
  descricao?: string
  tags?: string[]
  foto_url?: string
  localizacao?: string
  status?: 'available' | 'busy'
  latitude?: number | null
  longitude?: number | null
}

export interface SearchFilters {
  searchTerm?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface SearchResponse {
  data: Usuario[]
  total: number
  hasMore: boolean
}

export class DatabaseService {
  static async getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('whatsapp', whatsapp)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user by WhatsApp:', error)
      throw error
    }
  }

  static async createUsuario(data: CreateUsuarioData): Promise<Usuario> {
    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .insert([{
          whatsapp: data.whatsapp,
          nome: data.nome,
          descricao: data.descricao,
          tags: data.tags,
          foto_url: data.foto_url,
          localizacao: data.localizacao,
          status: data.status,
          latitude: data.latitude,
          longitude: data.longitude
        }])
        .select()
        .single()

      if (error) throw error
      return usuario
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  static async updateUsuario(id: string, data: UpdateUsuarioData): Promise<Usuario> {
    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return usuario
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  static async deleteUsuario(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  static async updateLastAccess(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating last access:', error)
      throw error
    }
  }

  static async getUsuarios(filters: SearchFilters = {}): Promise<SearchResponse> {
    try {
      const { searchTerm = '', tags = [], limit = 20, offset = 0 } = filters

      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .eq('taxa_paga', true)
        .order('atualizado_em', { ascending: false })

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      }

      if (tags.length > 0) {
        query = query.contains('tags', tags)
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    } catch (error) {
      console.error('Error getting users:', error)
      throw error
    }
  }

  static async getUsersByProximity(
    latitude: number,
    longitude: number,
    radiusKm: number,
    filters: SearchFilters = {}
  ): Promise<SearchResponse> {
    try {
      const { searchTerm = '', tags = [], limit = 20, offset = 0 } = filters

      const { data, error } = await supabase.rpc('search_usuarios_by_distance', {
        user_lat: latitude,
        user_long: longitude,
        radius_km: radiusKm,
        search_term: searchTerm,
        search_tags: tags,
        result_limit: limit,
        result_offset: offset
      })

      if (error) throw error

      const total = data?.length || 0
      const hasMore = total >= limit

      return {
        data: data || [],
        total,
        hasMore
      }
    } catch (error) {
      console.error('Error getting users by proximity:', error)
      throw error
    }
  }
}
