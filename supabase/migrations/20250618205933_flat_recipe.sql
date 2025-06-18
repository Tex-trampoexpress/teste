/*
  # Enhanced User Fields Migration

  1. New Columns
    - `profile_views` (integer) - Profile view counter
    - `total_contacts` (integer) - Contact counter via WhatsApp
    - `average_rating` (numeric) - Average user rating (0.0 to 5.0)
    - `total_ratings` (integer) - Total number of ratings received
    - `featured` (boolean) - Featured user status
    - `premium` (boolean) - Premium user status
    - `last_activity` (timestamptz) - Last activity timestamp

  2. Enhanced Functions
    - Enhanced search with ranking system
    - Trending professionals algorithm
    - User statistics and percentile calculation
    - Profile views and contact tracking

  3. Performance Indexes
    - Optimized indexes for new fields
    - Composite indexes for complex queries

  4. Security
    - All functions use SECURITY DEFINER
    - Maintains existing RLS policies
*/

-- Drop existing functions that need to be recreated with new signatures
DROP FUNCTION IF EXISTS search_usuarios_enhanced(text, text[], text, numeric, numeric, integer, integer, integer);
DROP FUNCTION IF EXISTS get_trending_professionals(integer);
DROP FUNCTION IF EXISTS get_user_statistics(uuid);
DROP FUNCTION IF EXISTS increment_profile_views(uuid);
DROP FUNCTION IF EXISTS increment_contact_count(uuid);

-- Add new columns to usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_contacts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- Update existing records to ensure default values
UPDATE usuarios 
SET 
  profile_views = COALESCE(profile_views, 0),
  total_contacts = COALESCE(total_contacts, 0),
  average_rating = COALESCE(average_rating, 0.0),
  total_ratings = COALESCE(total_ratings, 0),
  featured = COALESCE(featured, false),
  premium = COALESCE(premium, false),
  last_activity = COALESCE(last_activity, now())
WHERE profile_views IS NULL 
   OR total_contacts IS NULL 
   OR average_rating IS NULL 
   OR total_ratings IS NULL 
   OR featured IS NULL 
   OR premium IS NULL 
   OR last_activity IS NULL;

-- Create performance indexes for new fields
CREATE INDEX IF NOT EXISTS idx_usuarios_featured 
ON usuarios (featured DESC, average_rating DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_premium 
ON usuarios (premium DESC, ultimo_acesso DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_profile_views 
ON usuarios (profile_views DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_rating 
ON usuarios (average_rating DESC, total_ratings DESC);

-- Function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios 
  SET 
    profile_views = profile_views + 1,
    last_activity = now()
  WHERE id = user_id;
END;
$$;

-- Function to increment contact count
CREATE OR REPLACE FUNCTION increment_contact_count(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios 
  SET 
    total_contacts = total_contacts + 1,
    last_activity = now()
  WHERE id = user_id;
END;
$$;

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
  last_activity timestamptz,
  distance_km numeric,
  search_rank numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    u.last_activity,
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
    -- Ranking based on multiple factors
    (
      CASE WHEN u.featured THEN 100 ELSE 0 END +
      CASE WHEN u.premium THEN 50 ELSE 0 END +
      CASE WHEN u.verificado THEN 25 ELSE 0 END +
      (u.average_rating * 10) +
      (LEAST(u.profile_views, 100) / 10) +
      (LEAST(u.total_contacts, 50) / 5) +
      CASE 
        WHEN search_term != '' AND (
          u.nome ILIKE '%' || search_term || '%' OR
          u.descricao ILIKE '%' || search_term || '%' OR
          u.localizacao ILIKE '%' || search_term || '%' OR
          EXISTS (SELECT 1 FROM unnest(u.tags) tag WHERE tag ILIKE '%' || search_term || '%')
        ) THEN 50 ELSE 0 
      END
    ) as search_rank
  FROM usuarios u
  WHERE 
    u.status = filter_status
    AND u.perfil_completo = true
    AND (
      array_length(filter_tags, 1) IS NULL 
      OR u.tags && filter_tags
    )
    AND (
      search_term = '' 
      OR u.nome ILIKE '%' || search_term || '%'
      OR u.descricao ILIKE '%' || search_term || '%'
      OR u.localizacao ILIKE '%' || search_term || '%'
      OR EXISTS (SELECT 1 FROM unnest(u.tags) tag WHERE tag ILIKE '%' || search_term || '%')
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
$$;

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
  last_activity timestamptz,
  trending_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    u.last_activity,
    -- Trending score based on recent activity and engagement
    (
      -- Weight for recent activity (last 7 days)
      CASE 
        WHEN u.last_activity > now() - interval '7 days' THEN 100
        WHEN u.last_activity > now() - interval '30 days' THEN 50
        ELSE 10
      END +
      -- Weight for views (normalized)
      (LEAST(u.profile_views, 1000) / 10) +
      -- Weight for contacts (normalized)
      (LEAST(u.total_contacts, 100) * 2) +
      -- Weight for rating
      (u.average_rating * 20) +
      -- Bonus for verified users
      CASE WHEN u.verificado THEN 50 ELSE 0 END +
      -- Bonus for premium users
      CASE WHEN u.premium THEN 75 ELSE 0 END +
      -- Bonus for featured users
      CASE WHEN u.featured THEN 100 ELSE 0 END
    ) as trending_score
  FROM usuarios u
  WHERE 
    u.status = 'available'
    AND u.perfil_completo = true
    AND u.last_activity > now() - interval '90 days' -- Only users active in last 90 days
  ORDER BY 
    trending_score DESC,
    u.average_rating DESC,
    u.ultimo_acesso DESC
  LIMIT limit_results;
END;
$$;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_id uuid)
RETURNS TABLE (
  total_users integer,
  active_users integer,
  user_rank integer,
  percentile numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count integer;
  active_count integer;
  user_score numeric;
  user_position integer;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_count
  FROM usuarios 
  WHERE perfil_completo = true;
  
  -- Count active users (last 30 days)
  SELECT COUNT(*) INTO active_count
  FROM usuarios 
  WHERE perfil_completo = true 
    AND ultimo_acesso > now() - interval '30 days';
  
  -- Calculate user score
  SELECT 
    (
      profile_views + 
      (total_contacts * 5) + 
      (average_rating * 50) + 
      CASE WHEN verificado THEN 100 ELSE 0 END +
      CASE WHEN premium THEN 200 ELSE 0 END +
      CASE WHEN featured THEN 300 ELSE 0 END
    ) INTO user_score
  FROM usuarios 
  WHERE id = user_id;
  
  -- Calculate user position
  SELECT COUNT(*) + 1 INTO user_position
  FROM usuarios u
  WHERE 
    u.perfil_completo = true
    AND (
      u.profile_views + 
      (u.total_contacts * 5) + 
      (u.average_rating * 50) + 
      CASE WHEN u.verificado THEN 100 ELSE 0 END +
      CASE WHEN u.premium THEN 200 ELSE 0 END +
      CASE WHEN u.featured THEN 300 ELSE 0 END
    ) > user_score;
  
  RETURN QUERY
  SELECT 
    total_count as total_users,
    active_count as active_users,
    user_position as user_rank,
    ROUND(((total_count - user_position + 1)::numeric / total_count::numeric) * 100, 1) as percentile;
END;
$$;

-- Function to update last_activity automatically
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$;

-- Create trigger for last_activity if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'usuarios_update_last_activity'
  ) THEN
    CREATE TRIGGER usuarios_update_last_activity
      BEFORE UPDATE ON usuarios
      FOR EACH ROW
      EXECUTE FUNCTION update_last_activity();
  END IF;
END;
$$;

-- Add some sample data for featured/premium users (optional)
DO $$
BEGIN
  -- Mark some existing users as featured (if they exist)
  UPDATE usuarios 
  SET 
    featured = true,
    profile_views = profile_views + 50,
    average_rating = 4.8
  WHERE perfil_completo = true 
    AND status = 'available'
    AND id IN (
      SELECT id FROM usuarios 
      WHERE perfil_completo = true 
        AND status = 'available'
      ORDER BY criado_em 
      LIMIT 2
    );
  
  -- Mark some users as premium
  UPDATE usuarios 
  SET 
    premium = true,
    profile_views = profile_views + 25,
    total_contacts = total_contacts + 10
  WHERE perfil_completo = true 
    AND status = 'available'
    AND NOT featured
    AND id IN (
      SELECT id FROM usuarios 
      WHERE perfil_completo = true 
        AND status = 'available'
        AND NOT featured
      ORDER BY ultimo_acesso DESC
      LIMIT 3
    );
END;
$$;

-- Add documentation comments
COMMENT ON COLUMN usuarios.profile_views IS 'Counter for user profile views';
COMMENT ON COLUMN usuarios.total_contacts IS 'Total contacts received via WhatsApp';
COMMENT ON COLUMN usuarios.average_rating IS 'Average rating received (0.0 to 5.0)';
COMMENT ON COLUMN usuarios.total_ratings IS 'Total number of ratings received';
COMMENT ON COLUMN usuarios.featured IS 'Indicates if user is featured on platform';
COMMENT ON COLUMN usuarios.premium IS 'Indicates if user has premium plan';
COMMENT ON COLUMN usuarios.last_activity IS 'Timestamp of user last activity';

COMMENT ON FUNCTION increment_profile_views(uuid) IS 'Increments profile view counter';
COMMENT ON FUNCTION increment_contact_count(uuid) IS 'Increments contact counter';
COMMENT ON FUNCTION search_usuarios_enhanced IS 'Enhanced search with ranking and multiple filters';
COMMENT ON FUNCTION get_trending_professionals IS 'Returns trending professionals based on engagement';
COMMENT ON FUNCTION get_user_statistics IS 'Returns user statistics and platform ranking';