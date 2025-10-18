import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Usuario {
  id: string
  nome: string
  whatsapp: string
  descricao: string
  tags: string[]
  foto_url: string
  localizacao: string
  status: 'available' | 'busy'
  latitude: number | null
  longitude: number | null
  criado_em: string
  atualizado_em: string
  ultimo_acesso: string | null
  perfil_completo: boolean
  verificado: boolean
  distancia?: number
}

export interface CreateUsuarioData {
  whatsapp: string
  nome?: string
  descricao?: string
  tags?: string[]
  foto_url?: string
  localizacao?: string
  status?: 'available' | 'busy'
  latitude?: number | null
  longitude?: number | null
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
  perfil_completo?: boolean
}

export interface GetUsuariosOptions {
  search?: string
  status?: 'available' | 'busy'
  limit?: number
  page?: number
  tags?: string[]
  userLat?: number | null
  userLng?: number | null
}

export class DatabaseService {
  static async createUsuario(data: CreateUsuarioData): Promise<Usuario> {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([{
        whatsapp: data.whatsapp,
        nome: data.nome || '',
        descricao: data.descricao || '',
        tags: data.tags || [],
        foto_url: data.foto_url || '',
        localizacao: data.localizacao || '',
        status: data.status || 'available',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        perfil_completo: false,
        verificado: false
      }])
      .select()
      .single()

    if (error) throw error
    return usuario
  }

  static async getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('whatsapp', whatsapp)
      .maybeSingle()

    if (error) throw error
    return data
  }

  static async updateUsuario(id: string, data: UpdateUsuarioData): Promise<Usuario> {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .update({
        ...data,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return usuario
  }

  static async deleteUsuario(id: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async getUsuarios(options: GetUsuariosOptions = {}): Promise<{
    users: Usuario[]
    hasMore: boolean
    total: number
  }> {
    const {
      search = '',
      status,
      limit = 20,
      page = 1,
      tags = [],
      userLat = null,
      userLng = null
    } = options

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('usuarios')
      .select('*', { count: 'exact' })
      .eq('perfil_completo', true)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`)
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags)
    }

    if (userLat !== null && userLng !== null) {
      query = query
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
    }

    const { data, error, count } = await query
      .order('atualizado_em', { ascending: false })
      .range(from, to)

    if (error) throw error

    let users = data || []

    if (userLat !== null && userLng !== null) {
      users = users.map(user => {
        if (user.latitude && user.longitude) {
          const latDiff = user.latitude - userLat
          const lngDiff = user.longitude - userLng
          const distancia = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111
          return { ...user, distancia }
        }
        return user
      })

      users.sort((a, b) => (a.distancia || 999) - (b.distancia || 999))
    }

    return {
      users,
      hasMore: users.length === limit,
      total: count || 0
    }
  }

  static async getUsersByProximity(
    latitude: number,
    longitude: number,
    radiusKm: number = 100,
    searchTerm?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: Usuario[], hasMore: boolean, total: number }> {
    try {
      console.log('📍 Buscando usuários próximos:', { latitude, longitude, radiusKm, searchTerm, limit, offset })

      // Buscar TODOS os usuários com perfil completo e localização
      let query = supabase
        .from('usuarios')
        .select('*')
        .eq('perfil_completo', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Aplicar filtro de busca se houver
      if (searchTerm?.trim()) {
        const term = searchTerm.trim()
        query = query.or(`nome.ilike.%${term}%,descricao.ilike.%${term}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro na busca:', error)
        return { users: [], hasMore: false, total: 0 }
      }

      console.log(`📊 Total de usuários no banco: ${data?.length || 0}`)

      // Calcular distância usando fórmula de Haversine (mais precisa)
      const toRad = (value: number) => (value * Math.PI) / 180

      const usersWithDistance = (data || []).map(user => {
        const R = 6371 // Raio da Terra em km
        const dLat = toRad(user.latitude! - latitude)
        const dLon = toRad(user.longitude! - longitude)

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(user.latitude!)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distancia = R * c

        return { ...user, distancia }
      })

      // Filtrar por raio
      const filteredUsers = usersWithDistance.filter(u => u.distancia <= radiusKm)

      console.log(`🎯 Usuários dentro do raio de ${radiusKm}km: ${filteredUsers.length}`)

      // Ordenar por distância
      filteredUsers.sort((a, b) => a.distancia - b.distancia)

      // Aplicar paginação DEPOIS de filtrar
      const paginatedUsers = filteredUsers.slice(offset, offset + limit)
      const hasMore = (offset + limit) < filteredUsers.length

      if (paginatedUsers.length > 0) {
        console.log('🗺️ Primeiros resultados:')
        paginatedUsers.slice(0, 5).forEach(u => {
          console.log(`   - ${u.nome}: ${u.distancia.toFixed(2)}km (${u.status})`)
        })
      }

      return {
        users: paginatedUsers,
        hasMore,
        total: filteredUsers.length
      }
    } catch (error) {
      console.error('❌ Erro na busca com distância:', error)
      return { users: [], hasMore: false, total: 0 }
    }
  }

  static async updateStatus(id: string, status: 'available' | 'busy'): Promise<Usuario> {
    return this.updateUsuario(id, { status })
  }

  static async updateLastAccess(id: string): Promise<void> {
    await supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', id)
  }

  static calculateRelevanceScore(usuario: Usuario, searchTerm?: string): number {
    let score = 0

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const nome = usuario.nome.toLowerCase()
      const descricao = usuario.descricao.toLowerCase()

      if (nome.includes(term)) score += 10
      if (descricao.includes(term)) score += 5

      usuario.tags.forEach(tag => {
        if (tag.toLowerCase().includes(term)) score += 3
      })
    }

    if (usuario.verificado) score += 5
    if (usuario.foto_url) score += 2
    if (usuario.status === 'available') score += 3

    return score
  }
}
