/*
  # Performance Optimization and New Features

  1. Additional Performance Indexes
    - Composite indexes for common query patterns
    - Partial indexes for specific conditions
    - Text search optimization

  2. New Features
    - User activity tracking
    - Profile views counter
    - Rating system foundation
    - Enhanced search capabilities

  3. Performance Improvements
    - Query optimization
    - Index tuning
    - Statistics updates
*/

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_usuarios_status_perfil_ultimo_acesso 
  ON usuarios (status, perfil_completo, ultimo_acesso DESC) 
  WHERE status = 'available' AND perfil_completo = true;

-- Partial index for active available users
CREATE INDEX IF NOT EXISTS idx_usuarios_active_available 
  ON usuarios (ultimo_acesso DESC) 
  WHERE status = 'available' AND perfil_completo = true;

-- Text search index for better search performance
CREATE INDEX IF NOT EXISTS idx_usuarios_text_search 
  ON usuarios USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, '') || ' ' || COALESCE(localizacao, '')));

-- Index for tag-based searches with status filter
CREATE INDEX IF NOT EXISTS idx_usuarios_tags_status 
  ON usuarios USING gin(tags) 
  WHERE status = 'available' AND perfil_completo = true;

-- Add new columns for enhanced features
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_contacts integer DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0.0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS premium boolean DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now();

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_usuarios_profile_views ON usuarios (profile_views DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_featured ON usuarios (featured DESC, average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_premium ON usuarios (premium DESC, ultimo_acesso DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_rating ON usuarios (average_rating DESC, total_ratings DESC);

-- Create function to update profile views
CREATE OR REPLACE FUNCTION increment_profile_views(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE usuarios 
  SET profile_views = profile_views + 1,
      last_activity = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update contact count
CREATE OR REPLACE FUNCTION increment_contact_count(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE usuarios 
  SET total_contacts = total_contacts + 1,
      last_activity = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced search function with ranking
CREATE OR REPLACE FUNCTION search_usuarios_enhanced(
  search_term text DEFAULT '',
  filter_tags text[] DEFAULT '{}',
  filter_status text DEFAULT 'available',
  user_lat numeric DEFAULT NULL,
  user_lon numeric DEFAULT NULL,
  radius_km integer DEFAULT 50,
  limit_results integer DEFAULT 20,
  offset_results integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nome text,
  whatsapp text,
  descricao text,
  tags text[],
  foto_url text,
  localizacao text,
  status text,
  latitude numeric,
  longitude numeric,
  criado_em timestamptz,
  atualizado_em timestamptz,
  ultimo_acesso timestamptz,
  perfil_completo boolean,
  verificado boolean,
  profile_views integer,
  total_contacts integer,
  average_rating numeric,
  total_ratings integer,
  featured boolean,
  premium boolean,
  distance_km numeric,
  search_rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.nome,
    u.whatsapp,
    u.descricao,
    u.tags,
    u.foto_url,
    u.localizacao,
    u.status,
    u.latitude,
    u.longitude,
    u.criado_em,
    u.atualizado_em,
    u.ultimo_acesso,
    u.perfil_completo,
    u.verificado,
    u.profile_views,
    u.total_contacts,
    u.average_rating,
    u.total_ratings,
    u.featured,
    u.premium,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
      THEN ROUND(
        (6371 * acos(
          cos(radians(user_lat)) * cos(radians(u.latitude)) * 
          cos(radians(u.longitude) - radians(user_lon)) + 
          sin(radians(user_lat)) * sin(radians(u.latitude))
        ))::numeric, 2
      )
      ELSE NULL
    END as distance_km,
    CASE 
      WHEN search_term = '' THEN 1.0
      ELSE ts_rank(
        to_tsvector('portuguese', u.nome || ' ' || COALESCE(u.descricao, '') || ' ' || COALESCE(u.localizacao, '')),
        plainto_tsquery('portuguese', search_term)
      )
    END as search_rank
  FROM usuarios u
  WHERE 
    u.status = filter_status
    AND u.perfil_completo = true
    AND (
      search_term = '' 
      OR u.nome ILIKE '%' || search_term || '%'
      OR u.descricao ILIKE '%' || search_term || '%'
      OR u.localizacao ILIKE '%' || search_term || '%'
      OR u.tags && ARRAY[search_term]
    )
    AND (
      array_length(filter_tags, 1) IS NULL 
      OR u.tags && filter_tags
    )
    AND (
      user_lat IS NULL 
      OR user_lon IS NULL 
      OR u.latitude IS NULL 
      OR u.longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(u.latitude)) * 
          cos(radians(u.longitude) - radians(user_lon)) + 
          sin(radians(user_lat)) * sin(radians(u.latitude))
        )
      ) <= radius_km
    )
  ORDER BY 
    u.featured DESC,
    u.premium DESC,
    search_rank DESC,
    u.average_rating DESC,
    u.ultimo_acesso DESC
  LIMIT limit_results
  OFFSET offset_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending professionals
CREATE OR REPLACE FUNCTION get_trending_professionals(limit_results integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  nome text,
  whatsapp text,
  descricao text,
  tags text[],
  foto_url text,
  localizacao text,
  status text,
  latitude numeric,
  longitude numeric,
  criado_em timestamptz,
  atualizado_em timestamptz,
  ultimo_acesso timestamptz,
  perfil_completo boolean,
  verificado boolean,
  profile_views integer,
  total_contacts integer,
  average_rating numeric,
  total_ratings integer,
  featured boolean,
  premium boolean,
  trending_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.*,
    (
      (u.profile_views * 0.3) + 
      (u.total_contacts * 0.4) + 
      (u.average_rating * u.total_ratings * 0.2) +
      (CASE WHEN u.ultimo_acesso > now() - interval '7 days' THEN 10 ELSE 0 END) +
      (CASE WHEN u.featured THEN 20 ELSE 0 END) +
      (CASE WHEN u.premium THEN 15 ELSE 0 END)
    ) as trending_score
  FROM usuarios u
  WHERE 
    u.status = 'available'
    AND u.perfil_completo = true
  ORDER BY trending_score DESC, u.ultimo_acesso DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_id uuid)
RETURNS TABLE (
  total_users bigint,
  active_users bigint,
  user_rank bigint,
  percentile numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE ultimo_acesso > now() - interval '30 days') as active_users
    FROM usuarios 
    WHERE perfil_completo = true
  ),
  user_rank AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY profile_views DESC, total_contacts DESC, average_rating DESC) as rank
    FROM usuarios 
    WHERE perfil_completo = true AND id = user_id
  )
  SELECT 
    s.total_users,
    s.active_users,
    COALESCE(ur.rank, s.total_users) as user_rank,
    ROUND((1.0 - (COALESCE(ur.rank, s.total_users)::numeric / s.total_users)) * 100, 2) as percentile
  FROM stats s
  LEFT JOIN user_rank ur ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for new columns
CREATE POLICY "Users can read enhanced profile data" ON usuarios
  FOR SELECT TO authenticated, anon
  USING (
    (status = 'available' AND perfil_completo = true) OR 
    (auth.uid() = id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_profile_views(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_contact_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_usuarios_enhanced(text, text[], text, numeric, numeric, integer, integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_professionals(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_statistics(uuid) TO authenticated, anon;

-- Create trigger to update last_activity on profile updates
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usuarios_update_last_activity
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- Analyze tables for better query planning
ANALYZE usuarios;