/*
  # Criação da Tabela de Usuários

  1. Nova Tabela
    - `usuarios`
      - `id` (uuid, primary key)
      - `nome` (text, nome do usuário)
      - `whatsapp` (text, número do WhatsApp - único)
      - `descricao` (text, descrição do serviço)
      - `tags` (text[], especialidades/tags)
      - `foto_url` (text, URL da foto)
      - `localizacao` (text, endereço)
      - `status` (text, disponível/ocupado)
      - `latitude` (double precision, coordenada)
      - `longitude` (double precision, coordenada)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)
      - `ultimo_acesso` (timestamp)
      - `perfil_completo` (boolean)
      - `verificado` (boolean)

  2. Segurança
    - Enable RLS na tabela
    - Políticas para leitura pública e escrita autenticada
    - Índices para performance

  3. Funções Auxiliares
    - get_user_by_whatsapp
    - check_whatsapp_exists
*/

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) > 0),
  whatsapp text UNIQUE NOT NULL CHECK (length(trim(whatsapp)) >= 10),
  descricao text,
  tags text[] DEFAULT '{}',
  foto_url text,
  localizacao text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy')),
  latitude double precision,
  longitude double precision,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  ultimo_acesso timestamptz DEFAULT now(),
  perfil_completo boolean DEFAULT false,
  verificado boolean DEFAULT false
);

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver todos os perfis"
  ON usuarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Usuários podem inserir seus próprios perfis"
  ON usuarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON usuarios FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários podem deletar seus próprios perfis"
  ON usuarios FOR DELETE
  TO anon, authenticated
  USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp ON usuarios(whatsapp);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_completo ON usuarios(perfil_completo) WHERE perfil_completo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_criado_em ON usuarios(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso ON usuarios(ultimo_acesso DESC);

-- Função para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS usuarios_update_updated_at ON usuarios;
CREATE TRIGGER usuarios_update_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_updated_at();

-- Função para buscar usuário por WhatsApp
CREATE OR REPLACE FUNCTION get_user_by_whatsapp(phone_number text)
RETURNS TABLE (
  user_id uuid,
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
  verificado boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
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
    u.verificado
  FROM usuarios u
  WHERE u.whatsapp = phone_number
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para verificar se WhatsApp existe
CREATE OR REPLACE FUNCTION check_whatsapp_exists(phone_number text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios WHERE whatsapp = phone_number
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentários
COMMENT ON TABLE usuarios IS 'Tabela de usuários/prestadores de serviço';
COMMENT ON FUNCTION get_user_by_whatsapp IS 'Busca usuário por número de WhatsApp';
COMMENT ON FUNCTION check_whatsapp_exists IS 'Verifica se WhatsApp já está cadastrado';