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
        console.log('⚠️ WhatsApp vazio ou inválido')
        return null
      }

      // Limpar o número (apenas dígitos)
      const cleanWhatsApp = whatsapp.replace(/\D/g, '')
      console.log('🔍 Buscando usuário por WhatsApp:', cleanWhatsApp)

      if (cleanWhatsApp.length < 10) {
        console.log('❌ Número muito curto:', cleanWhatsApp)
        return null
      }

      // Tentar diferentes formatos do número
      const possibleFormats = [
        cleanWhatsApp,
        cleanWhatsApp.startsWith('55') ? cleanWhatsApp.substring(2) : `55${cleanWhatsApp}`,
        cleanWhatsApp.startsWith('0') ? cleanWhatsApp.substring(1) : `0${cleanWhatsApp}`
      ]

      console.log('📱 Testando formatos:', possibleFormats)

      // Buscar no banco de dados
      let data = null
      let error = null

      // Tentar cada formato até encontrar
      for (const format of possibleFormats) {
        const result = await supabase
          .from('usuarios')
          .select('*')
          .eq('whatsapp', format)
          .maybeSingle()
        
        if (result.error) {
          console.log(`⚠️ Erro ao buscar formato ${format}:`, result.error.message)
          continue
        }
        
        if (result.data) {
          data = result.data
          console.log(`✅ Usuário encontrado com formato ${format}:`, data.nome)
          break
        }
      }

      // Se não encontrou com nenhum formato, fazer busca LIKE mais flexível
      if (!data) {
        console.log('🔍 Tentando busca flexível...')
        const { data: flexData, error: flexError } = await supabase
        .from('usuarios')
        .select('*')
        .or(`whatsapp.like.%${cleanWhatsApp.slice(-8)}%,whatsapp.like.%${cleanWhatsApp.slice(-9)}%`)
        .maybeSingle()
      
        if (flexError) {
          console.error('❌ Erro na busca flexível:', flexError)
          error = flexError
        } else {
          data = flexData
          if (data) {
            console.log('✅ Usuário encontrado com busca flexível:', data.nome)
          }
        }
      }
      
      if (data) {
        console.log('🎉 Login bem-sucedido para:', data.nome)
        console.log('📊 Dados do usuário:', {
          id: data.id,
          nome: data.nome,
          whatsapp: data.whatsapp,
          perfil_completo: data.perfil_completo,
          status: data.status
        })
        
        // Atualizar último acesso
        await this.updateLastAccess(data.id)
        return data
      }
      
      console.log('ℹ️ Nenhum usuário encontrado para WhatsApp:', cleanWhatsApp)
      console.log('💡 Formatos testados:', possibleFormats)
      return null
      
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por WhatsApp:', error)
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

  // Get all users with optional filters
  static async getUsuarios(filters?: {
    status?: 'available' | 'busy'
    tags?: string[]
    search?: string
    limit?: number
    offset?: number
  }): Promise<Usuario[]> {
    try {
      const searchTerm = filters?.search?.trim() || ''
      const filterTags = filters?.tags || []
      // Usar query direta otimizada em vez de RPC para melhor performance
      let query = supabase!
        .from('usuarios')
        .select(`
          id, nome, whatsapp, descricao, tags, foto_url, 
          localizacao, status, latitude, longitude, 
          criado_em, ultimo_acesso, perfil_completo, verificado
        `)
        .eq('status', filterStatus)
        .eq('perfil_completo', true)
        .order('ultimo_acesso', { ascending: false })
        .range(offsetResults, offsetResults + limitResults - 1)

      // Aplicar filtros condicionalmente
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,localizacao.ilike.%${searchTerm}%`)
      }

      if (filterTags.length > 0) {
        query = query.overlaps('tags', filterTags)
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      )

      const { data, error } = await Promise.race([query, timeoutPromise]) as any

      if (error) {
        console.warn('⚠️ Erro na busca otimizada, usando dados mock:', error)
        return this.getMockUsers(limitResults) as Usuario[]
      }

      console.log(`✅ Encontrados ${data?.length || 0} usuários`)
      return data || this.getMockUsers(limitResults) as Usuario[]
    } catch (error) {
      console.warn('⚠️ Erro na busca de usuários, usando dados mock:', error)
      return this.getMockUsers(filters?.limit || 20) as Usuario[]
    }
  }

  // Busca rápida apenas com campos essenciais
  static async getUsuariosRapido(limit: number = 10): Promise<Partial<Usuario>[]> {
    try {
      // Always check connection first
      const isConnected = await this.testConnection()
      if (!isConnected) {
        console.warn('⚠️ Supabase não disponível, usando dados mock')
        return this.getMockUsers(limit)
      }

      // Try to fetch from Supabase with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )

      const fetchPromise = supabase!
        .from('usuarios')
        .select('id, nome, foto_url, tags, localizacao, status, ultimo_acesso')
        .eq('status', 'available')
        .eq('perfil_completo', true)
        .order('ultimo_acesso', { ascending: false })
        .limit(limit)

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.warn('⚠️ Erro na busca, usando dados mock:', error.message)
        return this.getMockUsers(limit)
      }

      return data || this.getMockUsers(limit)
    } catch (error) {
      console.warn('⚠️ Erro na busca, usando dados mock:', error)
      return this.getMockUsers(limit)
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

  // Check if WhatsApp number is already registered (CORRIGIDO)
  static async isWhatsAppRegistered(whatsapp: string): Promise<boolean> {
    try {
      const user = await this.getUsuarioByWhatsApp(whatsapp)
      return !!user
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

  // Mock users for when Supabase is not available
  private static getMockUsers(limit: number): Partial<Usuario>[] {
    const mockUsers = [
      {
        id: '1',
        nome: 'Ana Silva',
        whatsapp: '11999999001',
        descricao: 'Designer especializada em UI/UX com 5 anos de experiência',
        foto_url: null,
        tags: ['design', 'ui/ux'],
        localizacao: 'São Paulo, SP',
        status: 'available' as const,
        ultimo_acesso: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        perfil_completo: true,
        verificado: true
      },
      {
        id: '2', 
        nome: 'Carlos Santos',
        whatsapp: '11999999002',
        descricao: 'Desenvolvedor Full Stack especializado em React e Node.js',
        foto_url: null,
        tags: ['programação', 'react'],
        localizacao: 'Rio de Janeiro, RJ',
        status: 'available' as const,
        ultimo_acesso: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        perfil_completo: true,
        verificado: false
      },
      {
        id: '3',
        nome: 'Maria Oliveira',
        whatsapp: '11999999003',
        descricao: 'Especialista em Marketing Digital e Redes Sociais',
        foto_url: null,
        tags: ['marketing', 'social media'],
        localizacao: 'Belo Horizonte, MG',
        status: 'available' as const,
        ultimo_acesso: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        perfil_completo: true,
        verificado: true
      },
      {
        id: '4',
        nome: 'João Pereira',
        whatsapp: '11999999004',
        descricao: 'Consultor em Vendas e Atendimento ao Cliente',
        foto_url: null,
        tags: ['vendas', 'atendimento'],
        localizacao: 'Brasília, DF',
        status: 'available' as const,
        ultimo_acesso: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        perfil_completo: true,
        verificado: false
      },
      {
        id: '5',
        nome: 'Fernanda Costa',
        whatsapp: '11999999005',
        descricao: 'Fotógrafa profissional especializada em eventos',
        foto_url: null,
        tags: ['fotografia', 'eventos'],
        localizacao: 'Porto Alegre, RS',
        status: 'available' as const,
        ultimo_acesso: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        perfil_completo: true,
        verificado: true
      }
    ]
    
    return mockUsers.slice(0, limit)
  }

  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase não configurado')
        return false
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('count')
        .limit(1)

      if (error) {
        console.warn('⚠️ Erro na conexão:', error.message)
        return false
      }

      return true
    } catch (error) {
      console.warn('⚠️ Erro na conexão:', error.message)
      return false
    }
  }
}