-- ============================================================
-- SCRIPT PARA APLICAR NO SEU BANCO DE PRODUÇÃO
-- https://rengkrhtidgfaycutnqn.supabase.co
--
-- INSTRUÇÕES:
-- 1. Abra https://supabase.com/dashboard/project/rengkrhtidgfaycutnqn/sql
-- 2. Cole TODO este script
-- 3. Clique em "RUN" ou pressione Ctrl+Enter
-- ============================================================

-- Função auxiliar: Calcular distância (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision AS $$
DECLARE
  R constant double precision := 6371;
  dLat double precision;
  dLon double precision;
  a double precision;
  c double precision;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- Função principal: Busca por distância com paginação
CREATE OR REPLACE FUNCTION search_users_by_distance(
  user_lat double precision,
  user_lon double precision,
  search_term text DEFAULT NULL,
  radius_km double precision DEFAULT 100,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
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
  latitude double precision,
  longitude double precision,
  criado_em timestamptz,
  atualizado_em timestamptz,
  ultimo_acesso timestamptz,
  perfil_completo boolean,
  verificado boolean,
  distance_km double precision,
  total_count bigint
) AS $$
DECLARE
  search_lower text;
  total_records bigint;
BEGIN
  search_lower := LOWER(TRIM(search_term));

  -- Calcular total de registros
  SELECT COUNT(*) INTO total_records
  FROM usuarios u
  WHERE
    u.status = 'available'
    AND u.perfil_completo = true
    AND u.latitude IS NOT NULL
    AND u.longitude IS NOT NULL
    AND (
      search_term IS NULL
      OR search_term = ''
      OR EXISTS (SELECT 1 FROM unnest(u.tags) t WHERE LOWER(t) LIKE '%' || search_lower || '%')
      OR LOWER(u.descricao) LIKE '%' || search_lower || '%'
      OR LOWER(u.nome) LIKE '%' || search_lower || '%'
      OR LOWER(u.localizacao) LIKE '%' || search_lower || '%'
    )
    AND u.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
    AND u.longitude BETWEEN user_lon - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lon + (radius_km / (111.0 * cos(radians(user_lat))))
    AND calculate_distance(user_lat, user_lon, u.latitude, u.longitude) <= radius_km;

  -- Retornar resultados paginados ordenados por distância
  RETURN QUERY
  SELECT
    u.id,
    u.nome,
    u.whatsapp,
    u.descricao,
    u.tags,
    u.foto_url,
    u.localizacao,
    u.status::text,
    u.latitude,
    u.longitude,
    u.criado_em,
    u.atualizado_em,
    u.ultimo_acesso,
    u.perfil_completo,
    u.verificado,
    calculate_distance(user_lat, user_lon, u.latitude, u.longitude) as distance_km,
    total_records as total_count
  FROM usuarios u
  WHERE
    u.status = 'available'
    AND u.perfil_completo = true
    AND u.latitude IS NOT NULL
    AND u.longitude IS NOT NULL
    AND (
      search_term IS NULL
      OR search_term = ''
      OR EXISTS (SELECT 1 FROM unnest(u.tags) t WHERE LOWER(t) LIKE '%' || search_lower || '%')
      OR LOWER(u.descricao) LIKE '%' || search_lower || '%'
      OR LOWER(u.nome) LIKE '%' || search_lower || '%'
      OR LOWER(u.localizacao) LIKE '%' || search_lower || '%'
    )
    AND u.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
    AND u.longitude BETWEEN user_lon - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lon + (radius_km / (111.0 * cos(radians(user_lat))))
    AND calculate_distance(user_lat, user_lon, u.latitude, u.longitude) <= radius_km
  ORDER BY distance_km ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_location
  ON usuarios(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_status_perfil
  ON usuarios(status, perfil_completo)
  WHERE status = 'available' AND perfil_completo = true;

CREATE INDEX IF NOT EXISTS idx_usuarios_tags_gin
  ON usuarios USING gin(tags);

-- Testar a função
SELECT nome, distance_km
FROM search_users_by_distance(-27.5954, -48.548, '', 100, 20, 0)
LIMIT 5;
