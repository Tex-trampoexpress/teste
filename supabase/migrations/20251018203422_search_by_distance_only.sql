/*
  # Busca por Distância - Ordenação Exclusiva

  1. Nova Função
    - `search_users_by_distance` - Busca usuários ordenados APENAS por distância
    - Quando há termo de busca (ex: "pedreiro"), filtra por tag e ordena do mais próximo ao mais longe
    - Suporta paginação com LIMIT e OFFSET
    - Retorna total_count para controle de paginação

  2. Comportamento
    - Filtra por: status = 'available', perfil_completo = true, dentro do raio
    - Se search_term fornecido: filtra usuários com tag correspondente
    - Ordenação: SEMPRE por distância (mais próximo → mais longe)
    - Paginação: suporta limit e offset

  3. Retorno
    - Todos os campos do usuário + distance_km + total_count
*/

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

  -- Calcular total de registros que atendem aos critérios
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

  -- Retornar resultados paginados
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

COMMENT ON FUNCTION search_users_by_distance IS 'Busca usuários ordenados APENAS por distância (mais próximo → mais longe) com suporte a filtro por termo e paginação';
