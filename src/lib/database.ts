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

export interface Transacao {
  id: string
  cliente_id: string
  prestador_id: string
  mp_payment_id: string
  status: string
  amount: number
  created_at: string
  updated_at: string
  cliente?: Usuario
  prestador?: Usuario
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

      // ✅ PREVENT DUPLICATES - Check if WhatsApp already exists
      console.log('🔍 Verificando se WhatsApp já existe:', userData.whatsapp)
      const existingUser = await this.getUsuarioByWhatsApp(userData.whatsapp.trim())
      if (existingUser) {
        console.error('❌ WhatsApp já cadastrado:', userData.whatsapp)
        throw new Error('Este número de WhatsApp já está cadastrado')
      }

      // Preparar dados para inserção
      const insertData = {
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
      }

      console.log('📝 Dados preparados para inserção:', insertData)

      const { data, error } = await supabase
        .from('usuarios')
        .insert(insertData)
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
      // Validar ID
      if (!id?.trim()) {
        throw new Error('ID do usuário é obrigatório')
      }

      const updateData: any = {}
      
      // Validar e limpar dados apenas se fornecidos
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
        updateData.tags = userData.tags || []
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

      console.log('📝 Dados preparados para atualização:', updateData)

      // Verificar se há dados para atualizar
      if (Object.keys(updateData).length === 0) {
        throw new Error('Nenhum dado fornecido para atualização')
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
        if (error.code === 'PGRST116') {
          throw new Error('Usuário não encontrado')
        }
        throw new Error(`Erro ao atualizar perfil: ${error.message}`)
      }

      if (!data) {
        throw new Error('Nenhum usuário foi atualizado')
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
      if (!id?.trim()) return

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
      if (!id?.trim()) {
        throw new Error('ID é obrigatório')
      }

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

  // Get user profile by WhatsApp number (CORRIGIDO)
  static async getUsuarioByWhatsApp(whatsapp: string): Promise<Usuario | null> {
    try {
      if (!whatsapp?.trim()) {
        throw new Error('WhatsApp é obrigatório')
      }

      console.log('🔍 Buscando usuário por WhatsApp:', whatsapp)

      // Usar a função SQL otimizada
      const { data, error } = await supabase
        .rpc('get_user_by_whatsapp', {
          phone_number: whatsapp.trim()
        })

      if (error) {
        console.error('❌ Erro ao buscar usuário por WhatsApp:', error)
        // Fallback para busca direta se a função falhar
        return this.getUsuarioByWhatsAppDirect(whatsapp)
      }

      if (data && data.length > 0) {
        const user = data[0]
        console.log('✅ Usuário encontrado:', user.nome)
        return {
          id: user.user_id,
          nome: user.nome,
          whatsapp: user.whatsapp,
          descricao: user.descricao,
          tags: user.tags,
          foto_url: user.foto_url,
          localizacao: user.localizacao,
          status: user.status,
          latitude: user.latitude,
          longitude: user.longitude,
          criado_em: user.criado_em,
          atualizado_em: user.atualizado_em,
          ultimo_acesso: user.ultimo_acesso,
          perfil_completo: user.perfil_completo,
          verificado: user.verificado
        }
      }

      console.log('ℹ️ Usuário não encontrado para WhatsApp:', whatsapp)
      return null
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por WhatsApp:', error)
      // Fallback para busca direta
      return this.getUsuarioByWhatsAppDirect(whatsapp)
    }
  }

  // Fallback para busca direta por WhatsApp
  private static async getUsuarioByWhatsAppDirect(whatsapp: string): Promise<Usuario | null> {
    try {
      console.log('🔄 Tentando busca direta por WhatsApp:', whatsapp)

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('whatsapp', whatsapp.trim())
        .maybeSingle()

      if (error) {
        console.error('❌ Erro na busca direta por WhatsApp:', error)
        return null
      }

      if (data) {
        console.log('✅ Usuário encontrado na busca direta:', data.nome)
        // Atualizar último acesso
        this.updateLastAccess(data.id)
      }

      return data
    } catch (error) {
      console.error('❌ Erro na busca direta por WhatsApp:', error)
      return null
    }
  }

  // Delete user profile
  static async deleteUsuario(id: string): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('ID é obrigatório')
      }

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

  // Get all users with optional filters and pagination
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
    limit?: number
    page?: number
    userLatitude?: number
    userLongitude?: number
  }): Promise<{ users: Usuario[], hasMore: boolean, total: number }> {
    return this.getUsuariosSimple(filters)
  }

  // Fallback simple search with intelligent scoring
  private static async getUsuariosSimple(filters?: {
    status?: 'available' | 'busy'
    search?: string
    limit?: number
    page?: number
    userLatitude?: number
    userLongitude?: number
  }): Promise<{ users: Usuario[], hasMore: boolean, total: number }> {
    try {
      const limitResults = filters?.limit || 20
      const page = filters?.page || 1
      const from = (page - 1) * limitResults
      const to = from + limitResults - 1

      console.log(`🔍 [PÁGINA ${page}] Buscando range: ${from}-${to} (limite: ${limitResults})`)

      let query = supabase
        .from('usuarios')
        .select('*', { count: 'exact' })
        .eq('status', filters?.status || 'available')
        .eq('perfil_completo', true)

      // Intelligent multi-field search
      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim()
        console.log(`🔎 Busca inteligente aplicada: "${searchTerm}"`)

        // Search in: name, description, location, and tags (using contains operator)
        query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,localizacao.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      } else {
        // No search term - order by creation date
        query = query.order('criado_em', { ascending: false })
      }

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('❌ Erro na busca:', error)
        throw error
      }

      let users = data || []

      // Calculate distance if user location is provided
      if (filters?.userLatitude && filters?.userLongitude) {
        users = users.map(user => {
          if (user.latitude && user.longitude) {
            const distance = this.calculateDistance(
              filters.userLatitude!,
              filters.userLongitude!,
              user.latitude,
              user.longitude
            )
            return { ...user, distancia: distance }
          }
          return user
        })
        console.log(`📍 Distância calculada para ${users.filter(u => u.distancia).length} usuários`)
      }

      // Apply intelligent scoring if search term exists
      const hasSearchTerm = !!filters?.search?.trim()
      if (hasSearchTerm) {
        const term = filters.search!.trim()

        // Add match score to each user
        users = users.map(user => ({
          ...user,
          matchScore: this.calculateMatchScore(user, term)
        }))
      }

      // Sort users: ALWAYS by distance first if available
      if (hasUserLocation && users.some(u => u.distancia !== undefined)) {
        users.sort((a, b) => {
          // Users without location go to the end
          if (a.distancia === undefined) return 1
          if (b.distancia === undefined) return -1

          // Primary sort: DISTANCE (closer first)
          return a.distancia - b.distancia
        })
        console.log(`📍 ${users.length} usuários ordenados por distância`)
      } else if (hasSearchTerm) {
        // Sort by match score only if no location
        users.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        console.log(`🎯 ${users.length} usuários ordenados por relevância`)
      }

      const total = count || 0
      const loadedSoFar = from + users.length
      const hasMore = loadedSoFar < total

      console.log(`✅ [PÁGINA ${page}] Retornados: ${users.length} | Carregados até agora: ${loadedSoFar}/${total} | Mais disponível: ${hasMore}`)

      return { users, hasMore, total }
    } catch (error) {
      console.error('❌ Erro na busca simples:', error)
      return { users: [], hasMore: false, total: 0 }
    }
  }

  // Calculate match score for intelligent search
  private static calculateMatchScore(user: Usuario, searchTerm: string): number {
    const term = searchTerm.toLowerCase()
    let score = 0

    // Exact match in tags (highest priority)
    if (user.tags?.some(tag => tag.toLowerCase() === term)) {
      score += 5
    }
    // Partial match in tags
    else if (user.tags?.some(tag => tag.toLowerCase().includes(term))) {
      score += 3
    }

    // Match in service title (descricao inicio)
    if (user.descricao?.toLowerCase().startsWith(term)) {
      score += 2
    }
    // Partial match in description
    else if (user.descricao?.toLowerCase().includes(term)) {
      score += 1
    }

    // Match in name
    if (user.nome?.toLowerCase().includes(term)) {
      score += 1
    }

    // Match in location
    if (user.localizacao?.toLowerCase().includes(term)) {
      score += 0.5
    }

    return score
  }

  // Calculate distance between two points using Haversine formula
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Get users by proximity with intelligent search using SQL function
  static async getUsersByProximity(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    searchTerm?: string
  ): Promise<Usuario[]> {
    try {
      console.log('📍 Buscando usuários com distância:', { latitude, longitude, radiusKm, searchTerm })

      const { data, error } = await supabase
        .rpc('search_users_with_distance', {
          user_lat: latitude,
          user_lon: longitude,
          search_term: searchTerm || null,
          radius_km: radiusKm
        })

      if (error) {
        console.error('❌ Erro na busca com distância:', error)
        const fallbackResponse = await this.getUsuarios({ status: 'available', limit: 20 })
        return fallbackResponse.users
      }

      const users = (data || []).map((user: any) => ({
        id: user.id,
        nome: user.nome,
        whatsapp: user.whatsapp,
        descricao: user.descricao,
        tags: user.tags,
        foto_url: user.foto_url,
        localizacao: user.localizacao,
        status: user.status,
        latitude: user.latitude,
        longitude: user.longitude,
        criado_em: user.criado_em,
        atualizado_em: user.atualizado_em,
        ultimo_acesso: user.ultimo_acesso,
        perfil_completo: user.perfil_completo,
        verificado: user.verificado,
        distancia: user.distance_km
      }))

      console.log(`✅ Encontrados ${users.length} usuários com distância calculada`)
      return users
    } catch (error) {
      console.error('❌ Erro na busca com distância:', error)
      const fallbackResponse = await this.getUsuarios({ status: 'available', limit: 20 })
      return fallbackResponse.users
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

  // Check if WhatsApp number is already registered (CORRIGIDO)
  static async isWhatsAppRegistered(whatsapp: string): Promise<boolean> {
    try {
      if (!whatsapp?.trim()) return false

      console.log('🔍 Verificando se WhatsApp está registrado:', whatsapp)

      // Usar a função SQL otimizada
      const { data, error } = await supabase
        .rpc('check_whatsapp_exists', {
          phone_number: whatsapp.trim()
        })

      if (error) {
        console.error('❌ Erro ao verificar WhatsApp:', error)
        // Fallback para verificação direta
        const user = await this.getUsuarioByWhatsAppDirect(whatsapp)
        return !!user
      }

      console.log('✅ Verificação de WhatsApp concluída:', data)
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

  // ============================================
  // TRANSACTION MANAGEMENT (MERCADO PAGO)
  // ============================================

  // Get transactions by user (as client or provider)
  static async getTransacoesByUsuario(
    userId: string,
    role: 'cliente' | 'prestador' | 'all' = 'all'
  ): Promise<Transacao[]> {
    try {
      console.log(`🔍 Buscando transações para usuário ${userId} como ${role}`)

      let query = supabase
        .from('transacoes')
        .select(`
          *,
          cliente:usuarios!cliente_id(id, nome, whatsapp, foto_url),
          prestador:usuarios!prestador_id(id, nome, whatsapp, foto_url)
        `)
        .order('created_at', { ascending: false })

      if (role === 'cliente') {
        query = query.eq('cliente_id', userId)
      } else if (role === 'prestador') {
        query = query.eq('prestador_id', userId)
      } else {
        query = query.or(`cliente_id.eq.${userId},prestador_id.eq.${userId}`)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro ao buscar transações:', error)
        return []
      }

      console.log(`✅ ${data?.length || 0} transações encontradas`)
      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error)
      return []
    }
  }

  // Get transaction by Mercado Pago payment ID
  static async getTransacaoByPaymentId(paymentId: string): Promise<Transacao | null> {
    try {
      console.log('🔍 Buscando transação por Payment ID:', paymentId)

      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          cliente:usuarios!cliente_id(id, nome, whatsapp, foto_url),
          prestador:usuarios!prestador_id(id, nome, whatsapp, foto_url)
        `)
        .eq('mp_payment_id', paymentId)
        .maybeSingle()

      if (error) {
        console.error('❌ Erro ao buscar transação:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('❌ Erro ao buscar transação:', error)
      return null
    }
  }

  // Get approved transactions (successful payments)
  static async getTransacoesAprovadas(userId?: string): Promise<Transacao[]> {
    try {
      console.log('🔍 Buscando transações aprovadas')

      let query = supabase
        .from('transacoes')
        .select(`
          *,
          cliente:usuarios!cliente_id(id, nome, whatsapp, foto_url),
          prestador:usuarios!prestador_id(id, nome, whatsapp, foto_url)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.or(`cliente_id.eq.${userId},prestador_id.eq.${userId}`)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro ao buscar transações aprovadas:', error)
        return []
      }

      console.log(`✅ ${data?.length || 0} transações aprovadas encontradas`)
      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar transações aprovadas:', error)
      return []
    }
  }

  // Get sales report for provider (services hired)
  static async getRelatorioVendas(
    prestadorId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total: number
    approved: number
    pending: number
    rejected: number
    totalAmount: number
    transactions: Transacao[]
  }> {
    try {
      console.log('📊 Gerando relatório de vendas para prestador:', prestadorId)

      let query = supabase
        .from('transacoes')
        .select(`
          *,
          cliente:usuarios!cliente_id(id, nome, whatsapp, foto_url)
        `)
        .eq('prestador_id', prestadorId)
        .order('created_at', { ascending: false })

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Erro ao gerar relatório:', error)
        return {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          totalAmount: 0,
          transactions: []
        }
      }

      const transactions = data || []
      const approved = transactions.filter(t => t.status === 'approved').length
      const pending = transactions.filter(t => t.status === 'pending' || t.status === 'in_process').length
      const rejected = transactions.filter(t => t.status === 'rejected' || t.status === 'cancelled').length
      const totalAmount = transactions
        .filter(t => t.status === 'approved')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      console.log(`✅ Relatório gerado: ${transactions.length} transações, R$ ${totalAmount.toFixed(2)}`)

      return {
        total: transactions.length,
        approved,
        pending,
        rejected,
        totalAmount,
        transactions
      }
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error)
      return {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalAmount: 0,
        transactions: []
      }
    }
  }

  // Get purchase history for client
  static async getHistoricoCompras(clienteId: string): Promise<Transacao[]> {
    try {
      console.log('🛒 Buscando histórico de compras para cliente:', clienteId)

      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          prestador:usuarios!prestador_id(id, nome, whatsapp, foto_url, descricao, tags)
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error)
        return []
      }

      console.log(`✅ ${data?.length || 0} compras encontradas`)
      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error)
      return []
    }
  }

  // Check if client already paid for provider access
  static async verificarPagamentoExistente(
    clienteId: string,
    prestadorId: string
  ): Promise<boolean> {
    try {
      console.log('🔍 Verificando pagamento existente:', { clienteId, prestadorId })

      const { data, error } = await supabase
        .from('transacoes')
        .select('id, status')
        .eq('cliente_id', clienteId)
        .eq('prestador_id', prestadorId)
        .eq('status', 'approved')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar pagamento:', error)
        return false
      }

      const exists = !!data
      console.log(exists ? '✅ Pagamento aprovado encontrado' : 'ℹ️ Nenhum pagamento aprovado')
      return exists
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error)
      return false
    }
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