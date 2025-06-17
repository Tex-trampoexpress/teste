import { supabase } from './supabase'
import type { Usuario } from './database'

// Enhanced user interface with new fields
export interface EnhancedUsuario extends Usuario {
  profile_views: number
  total_contacts: number
  average_rating: number
  total_ratings: number
  featured: boolean
  premium: boolean
  last_activity: string
  distance_km?: number
  search_rank?: number
  trending_score?: number
}

// Search filters interface
export interface SearchFilters {
  search?: string
  tags?: string[]
  status?: 'available' | 'busy'
  latitude?: number
  longitude?: number
  radius?: number
  limit?: number
  offset?: number
}

// User statistics interface
export interface UserStatistics {
  total_users: number
  active_users: number
  user_rank: number
  percentile: number
}

export class EnhancedDatabaseService {
  // Enhanced search with ranking and distance
  static async searchUsuariosEnhanced(filters: SearchFilters = {}): Promise<EnhancedUsuario[]> {
    try {
      console.log('🔍 Busca aprimorada com filtros:', filters)

      const { data, error } = await supabase.rpc('search_usuarios_enhanced', {
        search_term: filters.search || '',
        filter_tags: filters.tags || [],
        filter_status: filters.status || 'available',
        user_lat: filters.latitude || null,
        user_lon: filters.longitude || null,
        radius_km: filters.radius || 50,
        limit_results: filters.limit || 20,
        offset_results: filters.offset || 0
      })

      if (error) {
        console.error('❌ Erro na busca aprimorada:', error)
        throw error
      }

      console.log(`✅ Busca aprimorada: ${data?.length || 0} resultados`)
      return data || []
    } catch (error) {
      console.error('❌ Erro na busca aprimorada:', error)
      throw error
    }
  }

  // Get trending professionals
  static async getTrendingProfessionals(limit: number = 10): Promise<EnhancedUsuario[]> {
    try {
      console.log('📈 Buscando profissionais em alta...')

      const { data, error } = await supabase.rpc('get_trending_professionals', {
        limit_results: limit
      })

      if (error) {
        console.error('❌ Erro ao buscar profissionais em alta:', error)
        throw error
      }

      console.log(`✅ Profissionais em alta: ${data?.length || 0} encontrados`)
      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar profissionais em alta:', error)
      throw error
    }
  }

  // Increment profile views
  static async incrementProfileViews(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_profile_views', {
        user_id: userId
      })

      if (error) {
        console.error('⚠️ Erro ao incrementar visualizações:', error)
      } else {
        console.log('👁️ Visualização de perfil registrada')
      }
    } catch (error) {
      console.error('⚠️ Erro ao incrementar visualizações:', error)
    }
  }

  // Increment contact count
  static async incrementContactCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_contact_count', {
        user_id: userId
      })

      if (error) {
        console.error('⚠️ Erro ao incrementar contatos:', error)
      } else {
        console.log('📞 Contato registrado')
      }
    } catch (error) {
      console.error('⚠️ Erro ao incrementar contatos:', error)
    }
  }

  // Get user statistics
  static async getUserStatistics(userId: string): Promise<UserStatistics | null> {
    try {
      console.log('📊 Buscando estatísticas do usuário...')

      const { data, error } = await supabase.rpc('get_user_statistics', {
        user_id: userId
      })

      if (error) {
        console.error('❌ Erro ao buscar estatísticas:', error)
        return null
      }

      if (data && data.length > 0) {
        console.log('✅ Estatísticas obtidas:', data[0])
        return data[0]
      }

      return null
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error)
      return null
    }
  }

  // Get featured users
  static async getFeaturedUsers(limit: number = 10): Promise<EnhancedUsuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('status', 'available')
        .eq('perfil_completo', true)
        .eq('featured', true)
        .order('average_rating', { ascending: false })
        .order('ultimo_acesso', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Erro ao buscar usuários em destaque:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar usuários em destaque:', error)
      throw error
    }
  }

  // Get premium users
  static async getPremiumUsers(limit: number = 10): Promise<EnhancedUsuario[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('status', 'available')
        .eq('perfil_completo', true)
        .eq('premium', true)
        .order('average_rating', { ascending: false })
        .order('ultimo_acesso', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Erro ao buscar usuários premium:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Erro ao buscar usuários premium:', error)
      throw error
    }
  }

  // Update user rating
  static async updateUserRating(userId: string, rating: number): Promise<void> {
    try {
      // Get current rating data
      const { data: currentUser, error: fetchError } = await supabase
        .from('usuarios')
        .select('average_rating, total_ratings')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      const currentAverage = currentUser.average_rating || 0
      const currentTotal = currentUser.total_ratings || 0
      
      // Calculate new average
      const newTotal = currentTotal + 1
      const newAverage = ((currentAverage * currentTotal) + rating) / newTotal

      // Update user
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          average_rating: Math.round(newAverage * 100) / 100, // Round to 2 decimal places
          total_ratings: newTotal
        })
        .eq('id', userId)

      if (updateError) throw updateError

      console.log('⭐ Avaliação atualizada com sucesso')
    } catch (error) {
      console.error('❌ Erro ao atualizar avaliação:', error)
      throw error
    }
  }

  // Set user as featured
  static async setUserFeatured(userId: string, featured: boolean = true): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ featured })
        .eq('id', userId)

      if (error) throw error

      console.log(`✨ Usuário ${featured ? 'destacado' : 'removido do destaque'}`)
    } catch (error) {
      console.error('❌ Erro ao atualizar destaque:', error)
      throw error
    }
  }

  // Set user as premium
  static async setUserPremium(userId: string, premium: boolean = true): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ premium })
        .eq('id', userId)

      if (error) throw error

      console.log(`💎 Usuário ${premium ? 'promovido a premium' : 'removido do premium'}`)
    } catch (error) {
      console.error('❌ Erro ao atualizar premium:', error)
      throw error
    }
  }

  // Get analytics data
  static async getAnalytics(): Promise<{
    totalUsers: number
    activeUsers: number
    availableUsers: number
    premiumUsers: number
    featuredUsers: number
    averageRating: number
  }> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('status, perfil_completo, premium, featured, average_rating, ultimo_acesso')

      if (error) throw error

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const analytics = {
        totalUsers: data.length,
        activeUsers: data.filter(u => new Date(u.ultimo_acesso) > thirtyDaysAgo).length,
        availableUsers: data.filter(u => u.status === 'available' && u.perfil_completo).length,
        premiumUsers: data.filter(u => u.premium).length,
        featuredUsers: data.filter(u => u.featured).length,
        averageRating: data.reduce((sum, u) => sum + (u.average_rating || 0), 0) / data.length
      }

      console.log('📊 Analytics obtidos:', analytics)
      return analytics
    } catch (error) {
      console.error('❌ Erro ao obter analytics:', error)
      throw error
    }
  }
}