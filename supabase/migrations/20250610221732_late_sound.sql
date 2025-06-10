/*
  # Correção da estrutura do banco de dados TEX

  1. Estrutura da tabela usuarios
    - Corrige a ordem de remoção de dependências
    - Mantém todas as funcionalidades existentes
    - Adiciona índices otimizados

  2. Funções SQL
    - Busca por proximidade
    - Busca textual otimizada
    - Triggers automáticos

  3. Segurança
    - Políticas RLS configuradas
    - Acesso controlado por autenticação
*/

-- Remover triggers primeiro (dependências)
DROP TRIGGER IF EXISTS usuarios_update_atualizado_em ON usuarios;
DROP TRIGGER IF EXISTS usuarios_check_perfil_completo ON usuarios;

-- Remover funções depois dos triggers
DROP FUNCTION IF EXISTS get_users_by_proximity(numeric, numeric, numeric);
DROP FUNCTION IF EXISTS search_usuarios(text, text[], text, integer);
DROP FUNCTION IF EXISTS update_atualizado_em();
DROP FUNCTION IF EXISTS update_ultimo_acesso();
DROP FUNCTION IF EXISTS check_perfil_completo();

-- Remover tabela existente se houver (cuidado em produção!)
DROP TABLE IF EXISTS usuarios CASCADE;

-- Criar tabela usuarios otimizada
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) > 0),
  whatsapp text UNIQUE NOT NULL CHECK (length(trim(whatsapp)) >= 10),
  descricao text,
  tags text[] DEFAULT '{}',
  foto_url text,
  localizacao text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'busy')),
  latitude numeric(10,8),
  longitude numeric(11,8),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  ultimo_acesso timestamptz DEFAULT now(),
  perfil_completo boolean DEFAULT false,
  verificado boolean DEFAULT false
);

-- Índices otimizados para performance
CREATE UNIQUE INDEX idx_usuarios_whatsapp ON usuarios (whatsapp);
CREATE INDEX idx_usuarios_status ON usuarios (status);
CREATE INDEX idx_usuarios_tags ON usuarios USING gin (tags);
CREATE INDEX idx_usuarios_location ON usuarios (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_usuarios_criado_em ON usuarios (criado_em DESC);
CREATE INDEX idx_usuarios_ultimo_acesso ON usuarios (ultimo_acesso DESC);
CREATE INDEX idx_usuarios_perfil_completo ON usuarios (perfil_completo);

-- Índice composto para buscas complexas
CREATE INDEX idx_usuarios_search ON usuarios (status, perfil_completo, criado_em DESC);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar último acesso
CREATE OR REPLACE FUNCTION update_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultimo_acesso = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se perfil está completo
CREATE OR REPLACE FUNCTION check_perfil_completo()
RETURNS TRIGGER AS $$
BEGIN
  -- Perfil completo se tem: nome, whatsapp, descrição e pelo menos 1 tag
  NEW.perfil_completo = (
    length(trim(NEW.nome)) > 0 AND
    length(trim(NEW.whatsapp)) >= 10 AND
    NEW.descricao IS NOT NULL AND
    length(trim(NEW.descricao)) > 0 AND
    array_length(NEW.tags, 1) > 0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-atualização
CREATE TRIGGER usuarios_update_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

CREATE TRIGGER usuarios_check_perfil_completo
  BEFORE INSERT OR UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION check_perfil_completo();

-- Função para busca por proximidade (nova versão corrigida)
CREATE OR REPLACE FUNCTION get_users_by_proximity(
  user_lat numeric,
  user_lon numeric,
  radius_km numeric DEFAULT 10
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
  distance_km numeric
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
    ROUND(
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(u.latitude)) * 
        cos(radians(u.longitude) - radians(user_lon)) + 
        sin(radians(user_lat)) * 
        sin(radians(u.latitude))
      )::numeric, 2
    ) as distance_km
  FROM usuarios u
  WHERE 
    u.latitude IS NOT NULL 
    AND u.longitude IS NOT NULL
    AND u.status = 'available'
    AND u.perfil_completo = true
    AND 6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(u.latitude)) * 
      cos(radians(u.longitude) - radians(user_lon)) + 
      sin(radians(user_lat)) * 
      sin(radians(u.latitude))
    ) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para busca textual otimizada
CREATE OR REPLACE FUNCTION search_usuarios(
  search_term text DEFAULT '',
  filter_tags text[] DEFAULT '{}',
  filter_status text DEFAULT 'available',
  limit_results integer DEFAULT 50
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
  verificado boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.nome, u.whatsapp, u.descricao, u.tags, u.foto_url,
    u.localizacao, u.status, u.latitude, u.longitude, u.criado_em,
    u.atualizado_em, u.ultimo_acesso, u.perfil_completo, u.verificado
  FROM usuarios u
  WHERE 
    u.status = filter_status
    AND u.perfil_completo = true
    AND (
      search_term = '' OR
      u.nome ILIKE '%' || search_term || '%' OR
      u.descricao ILIKE '%' || search_term || '%' OR
      u.localizacao ILIKE '%' || search_term || '%'
    )
    AND (
      array_length(filter_tags, 1) IS NULL OR
      u.tags && filter_tags
    )
  ORDER BY 
    u.ultimo_acesso DESC,
    u.criado_em DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode ver perfis disponíveis e completos
CREATE POLICY "Anyone can read available profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available' AND perfil_completo = true);

-- Política: Usuários autenticados podem inserir seu próprio perfil
CREATE POLICY "Users can insert their own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Política: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update their own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Política: Usuários podem deletar apenas seu próprio perfil
CREATE POLICY "Users can delete their own profile"
  ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Inserir alguns dados de exemplo para teste
INSERT INTO usuarios (
  id,
  nome,
  whatsapp,
  descricao,
  tags,
  localizacao,
  status,
  latitude,
  longitude
) VALUES 
(
  gen_random_uuid(),
  'João Silva',
  '+5511999887766',
  'Eletricista com 10 anos de experiência. Atendo residencial e comercial.',
  ARRAY['eletricista', 'manutenção', 'instalação'],
  'São Paulo, SP',
  'available',
  -23.5505,
  -46.6333
),
(
  gen_random_uuid(),
  'Maria Santos',
  '+5511888776655',
  'Designer gráfica especializada em identidade visual e marketing digital.',
  ARRAY['design', 'marketing', 'logo'],
  'Rio de Janeiro, RJ',
  'available',
  -22.9068,
  -43.1729
),
(
  gen_random_uuid(),
  'Pedro Costa',
  '+5511777665544',
  'Desenvolvedor web full-stack. Criação de sites e aplicativos.',
  ARRAY['programação', 'web', 'apps'],
  'Belo Horizonte, MG',
  'available',
  -19.9167,
  -43.9345
);

-- Comentários para documentação
COMMENT ON TABLE usuarios IS 'Tabela principal de usuários do TEX - otimizada para o fluxo atual';
COMMENT ON COLUMN usuarios.perfil_completo IS 'Indica se o perfil tem todas as informações necessárias';
COMMENT ON COLUMN usuarios.ultimo_acesso IS 'Timestamp do último acesso para ordenação';
COMMENT ON FUNCTION get_users_by_proximity IS 'Busca usuários por proximidade geográfica';
COMMENT ON FUNCTION search_usuarios IS 'Busca textual otimizada com filtros';