/*
  # Otimização de Busca por Proximidade

  1. Novas Funções Otimizadas
    - `calculate_distance` - Função auxiliar Haversine
    - `get_users_by_proximity` - Busca usuários próximos otimizada
    - `search_users_with_distance` - Busca com termo E distância

  2. Índices de Performance
    - Índice para lat/long
    - Índice GIN para tags
    - Índice para status e perfil_completo

  3. Melhorias
    - Bounding box para filtro rápido
    - Ordenação por distância
    - Busca inteligente com scoring
*/

-- Função otimizada para calcular distância (Haversine)
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

-- Função otimizada para busca por proximidade
CREATE OR REPLACE FUNCTION get_users_by_proximity(
  user_lat double precision,
  user_lon double precision,
  radius_km double precision DEFAULT 10
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
  distance_km double precision
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
    u.status::text,
    u.latitude,
    u.longitude,
    u.criado_em,
    u.atualizado_em,
    u.ultimo_acesso,
    u.perfil_completo,
    u.verificado,
    calculate_distance(user_lat, user_lon, u.latitude, u.longitude) as distance_km
  FROM usuarios u
  WHERE
    u.status = 'available'
    AND u.perfil_completo = true
    AND u.latitude IS NOT NULL
    AND u.longitude IS NOT NULL
    AND u.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
    AND u.longitude BETWEEN user_lon - (radius_km / (111.0 * cos(radians(user_lat)))) AND user_lon + (radius_km / (111.0 * cos(radians(user_lat))))
    AND calculate_distance(user_lat, user_lon, u.latitude, u.longitude) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para busca com termo E distância
CREATE OR REPLACE FUNCTION search_users_with_distance(
  user_lat double precision,
  user_lon double precision,
  search_term text DEFAULT NULL,
  radius_km double precision DEFAULT 100
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
  match_score integer
) AS $$
DECLARE
  search_lower text;
BEGIN
  search_lower := LOWER(TRIM(search_term));

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
    CASE
      WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL THEN
        calculate_distance(user_lat, user_lon, u.latitude, u.longitude)
      ELSE NULL
    END as distance_km,
    (
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(u.tags) t WHERE LOWER(t) = search_lower
      ) THEN 5 ELSE 0 END +
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(u.tags) t WHERE LOWER(t) LIKE '%' || search_lower || '%'
      ) THEN 3 ELSE 0 END +
      CASE WHEN LOWER(u.descricao) LIKE search_lower || '%' THEN 2 ELSE 0 END +
      CASE WHEN LOWER(u.descricao) LIKE '%' || search_lower || '%' THEN 1 ELSE 0 END +
      CASE WHEN LOWER(u.nome) LIKE '%' || search_lower || '%' THEN 1 ELSE 0 END +
      CASE WHEN LOWER(u.localizacao) LIKE '%' || search_lower || '%' THEN 1 ELSE 0 END
    )::integer as match_score
  FROM usuarios u
  WHERE
    u.status = 'available'
    AND u.perfil_completo = true
    AND (
      search_term IS NULL
      OR search_term = ''
      OR EXISTS (SELECT 1 FROM unnest(u.tags) t WHERE LOWER(t) LIKE '%' || search_lower || '%')
      OR LOWER(u.descricao) LIKE '%' || search_lower || '%'
      OR LOWER(u.nome) LIKE '%' || search_lower || '%'
      OR LOWER(u.localizacao) LIKE '%' || search_lower || '%'
    )
    AND (
      u.latitude IS NULL
      OR u.longitude IS NULL
      OR u.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
    )
  ORDER BY
    match_score DESC,
    distance_km ASC NULLS LAST
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_location ON usuarios(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_status_perfil ON usuarios(status, perfil_completo) WHERE status = 'available' AND perfil_completo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_tags_gin ON usuarios USING gin(tags);