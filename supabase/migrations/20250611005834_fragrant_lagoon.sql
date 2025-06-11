/*
  # Otimização Final do Banco de Dados TEX

  1. Estrutura Final
    - Tabela usuarios otimizada
    - Índices de performance
    - Funções SQL corrigidas
    - Triggers funcionais
    
  2. Políticas RLS
    - Leitura pública para perfis disponíveis
    - Operações CRUD funcionais
    
  3. Dados de Teste
    - Perfis realistas atualizados
    - Coordenadas corretas
*/

-- Limpar estrutura existente completamente
DROP TRIGGER IF EXISTS usuarios_update_atualizado_em ON usuarios;
DROP TRIGGER IF EXISTS usuarios_check_perfil_completo ON usuarios;
DROP FUNCTION IF EXISTS get_users_by_proximity(numeric, numeric, numeric);
DROP FUNCTION IF EXISTS search_usuarios(text, text[], text, integer);
DROP FUNCTION IF EXISTS update_atualizado_em();
DROP FUNCTION IF EXISTS check_perfil_completo();

-- Remover todas as políticas
DROP POLICY IF EXISTS "Public can read available profiles" ON usuarios;
DROP POLICY IF EXISTS "Allow profile creation" ON usuarios;
DROP POLICY IF EXISTS "Allow profile updates" ON usuarios;
DROP POLICY IF EXISTS "Allow profile deletion" ON usuarios;

-- Recriar tabela com estrutura final otimizada
DROP TABLE IF EXISTS usuarios CASCADE;

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

-- Índices otimizados para performance máxima
CREATE UNIQUE INDEX idx_usuarios_whatsapp ON usuarios (whatsapp);
CREATE INDEX idx_usuarios_status ON usuarios (status);
CREATE INDEX idx_usuarios_tags ON usuarios USING gin (tags);
CREATE INDEX idx_usuarios_location ON usuarios (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_usuarios_criado_em ON usuarios (criado_em DESC);
CREATE INDEX idx_usuarios_ultimo_acesso ON usuarios (ultimo_acesso DESC);
CREATE INDEX idx_usuarios_perfil_completo ON usuarios (perfil_completo);
CREATE INDEX idx_usuarios_search ON usuarios (status, perfil_completo, criado_em DESC);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se perfil está completo (CORRIGIDA)
CREATE OR REPLACE FUNCTION check_perfil_completo()
RETURNS TRIGGER AS $$
BEGIN
  -- Perfil completo: nome, whatsapp, descrição e pelo menos 1 tag
  NEW.perfil_completo = (
    NEW.nome IS NOT NULL AND
    length(trim(NEW.nome)) > 0 AND
    NEW.whatsapp IS NOT NULL AND
    length(trim(NEW.whatsapp)) >= 10 AND
    NEW.descricao IS NOT NULL AND
    length(trim(NEW.descricao)) > 0 AND
    NEW.tags IS NOT NULL AND
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

-- Função de busca por proximidade (OTIMIZADA)
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
    u.id, u.nome, u.whatsapp, u.descricao, u.tags, u.foto_url,
    u.localizacao, u.status, u.latitude, u.longitude, u.criado_em,
    u.atualizado_em, u.ultimo_acesso, u.perfil_completo, u.verificado,
    ROUND(
      6371 * acos(
        LEAST(1.0, 
          cos(radians(user_lat)) * 
          cos(radians(u.latitude)) * 
          cos(radians(u.longitude) - radians(user_lon)) + 
          sin(radians(user_lat)) * 
          sin(radians(u.latitude))
        )
      )::numeric, 2
    ) as distance_km
  FROM usuarios u
  WHERE 
    u.latitude IS NOT NULL 
    AND u.longitude IS NOT NULL
    AND u.status = 'available'
    AND u.perfil_completo = true
    AND 6371 * acos(
      LEAST(1.0,
        cos(radians(user_lat)) * 
        cos(radians(u.latitude)) * 
        cos(radians(u.longitude) - radians(user_lon)) + 
        sin(radians(user_lat)) * 
        sin(radians(u.latitude))
      )
    ) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Função de busca textual (OTIMIZADA)
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
      u.localizacao ILIKE '%' || search_term || '%' OR
      EXISTS (
        SELECT 1 FROM unnest(u.tags) as tag 
        WHERE tag ILIKE '%' || search_term || '%'
      )
    )
    AND (
      array_length(filter_tags, 1) IS NULL OR
      u.tags && filter_tags
    )
  ORDER BY 
    u.verificado DESC,
    u.ultimo_acesso DESC,
    u.criado_em DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS FINAIS (alinhadas com o fluxo atual)
-- Leitura: perfis disponíveis e completos são públicos
CREATE POLICY "Public can read available profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING ((status = 'available'::text) AND (perfil_completo = true));

-- Inserção: permitir criação de perfis
CREATE POLICY "Allow profile creation"
  ON usuarios
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Atualização: permitir atualização de perfis
CREATE POLICY "Allow profile updates"
  ON usuarios
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Exclusão: permitir exclusão de perfis
CREATE POLICY "Allow profile deletion"
  ON usuarios
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Inserir dados de teste atualizados e realistas
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
-- Eletricista em São Paulo
(
  '550e8400-e29b-41d4-a716-446655440001',
  'João Silva',
  '+5511999887766',
  'Eletricista com 10 anos de experiência. Atendo emergências 24h, instalações residenciais e comerciais. Trabalho com qualidade e preço justo.',
  ARRAY['eletricista', 'emergência', 'instalação', 'manutenção', 'residencial'],
  'Vila Madalena, São Paulo - SP',
  'available',
  -23.5505,
  -46.6333
),
-- Designer no Rio de Janeiro
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Maria Santos',
  '+5521888776655',
  'Designer gráfica e especialista em marketing digital. Criação de logos, identidade visual, sites e campanhas para redes sociais.',
  ARRAY['design', 'marketing', 'logo', 'sites', 'social media', 'branding'],
  'Copacabana, Rio de Janeiro - RJ',
  'available',
  -22.9068,
  -43.1729
),
-- Desenvolvedor em Belo Horizonte
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Pedro Costa',
  '+5531777665544',
  'Desenvolvedor full-stack especializado em React, Node.js e mobile. Criação de sites, apps e sistemas web personalizados.',
  ARRAY['programação', 'web', 'apps', 'react', 'nodejs', 'mobile'],
  'Savassi, Belo Horizonte - MG',
  'available',
  -19.9167,
  -43.9345
),
-- Arquiteta em São Paulo
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Ana Oliveira',
  '+5511666554433',
  'Arquiteta e designer de interiores. Projetos residenciais e comerciais, reformas e decoração. Atendimento personalizado.',
  ARRAY['arquitetura', 'design de interiores', 'reforma', 'decoração', 'projetos'],
  'Jardins, São Paulo - SP',
  'available',
  -23.5629,
  -46.6544
),
-- Mecânico em Santo André (ocupado)
(
  '550e8400-e29b-41d4-a716-446655440005',
  'Carlos Mendes',
  '+5511555443322',
  'Mecânico automotivo com oficina própria. Especialista em carros nacionais e importados. Diagnóstico computadorizado.',
  ARRAY['mecânica', 'automotivo', 'diagnóstico', 'manutenção', 'carros'],
  'Santo André, São Paulo - SP',
  'busy',
  -23.6821,
  -46.5453
),
-- Personal Trainer no Rio
(
  '550e8400-e29b-41d4-a716-446655440006',
  'Lucia Ferreira',
  '+5521444332211',
  'Personal trainer e nutricionista. Treinos personalizados, acompanhamento nutricional e consultoria em bem-estar.',
  ARRAY['personal trainer', 'nutrição', 'fitness', 'saúde', 'bem-estar'],
  'Ipanema, Rio de Janeiro - RJ',
  'available',
  -22.9838,
  -43.2096
),
-- Advogado em Curitiba
(
  '550e8400-e29b-41d4-a716-446655440007',
  'Roberto Lima',
  '+5541333221100',
  'Advogado especialista em direito trabalhista e previdenciário. Consultoria jurídica e acompanhamento processual.',
  ARRAY['advocacia', 'direito trabalhista', 'previdenciário', 'consultoria', 'jurídico'],
  'Centro, Curitiba - PR',
  'available',
  -25.4284,
  -49.2733
),
-- Fotógrafa em São Paulo
(
  '550e8400-e29b-41d4-a716-446655440008',
  'Fernanda Rocha',
  '+5511222110099',
  'Fotógrafa profissional especializada em eventos, casamentos e ensaios. Portfolio completo e equipamentos de última geração.',
  ARRAY['fotografia', 'casamentos', 'eventos', 'ensaios', 'retratos'],
  'Moema, São Paulo - SP',
  'available',
  -23.6058,
  -46.6732
),
-- Contador em São Paulo
(
  '550e8400-e29b-41d4-a716-446655440009',
  'Ricardo Alves',
  '+5511111000999',
  'Contador especializado em pequenas e médias empresas. Abertura de empresas, contabilidade fiscal e consultoria tributária.',
  ARRAY['contabilidade', 'fiscal', 'tributário', 'empresas', 'consultoria'],
  'Vila Olímpia, São Paulo - SP',
  'available',
  -23.5955,
  -46.6856
),
-- Professora de Inglês no Rio
(
  '550e8400-e29b-41d4-a716-446655440010',
  'Camila Torres',
  '+5521000999888',
  'Professora de inglês nativa com certificação internacional. Aulas particulares e em grupo, preparação para exames.',
  ARRAY['inglês', 'aulas', 'idiomas', 'certificação', 'conversação'],
  'Leblon, Rio de Janeiro - RJ',
  'available',
  -22.9840,
  -43.2175
);

-- Comentários para documentação
COMMENT ON TABLE usuarios IS 'Tabela principal de usuários do TEX - estrutura final otimizada';
COMMENT ON COLUMN usuarios.perfil_completo IS 'Indica se o perfil tem todas as informações necessárias';
COMMENT ON COLUMN usuarios.ultimo_acesso IS 'Timestamp do último acesso para ordenação';
COMMENT ON FUNCTION get_users_by_proximity IS 'Busca usuários por proximidade geográfica otimizada';
COMMENT ON FUNCTION search_usuarios IS 'Busca textual otimizada com filtros avançados';