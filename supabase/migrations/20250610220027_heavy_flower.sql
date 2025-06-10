/*
  # Correções finais no banco de dados TEX

  1. Correções de Políticas RLS
    - Adicionar política para verificação de WhatsApp
    - Permitir login seguro
    - Corrigir acesso para usuários anônimos

  2. Funções Auxiliares
    - Função para verificar se WhatsApp existe
    - Função para login seguro
    - Função para atualizar status do usuário

  3. Otimizações
    - Melhorar performance das consultas
    - Corrigir triggers
    - Adicionar validações extras
*/

-- Adicionar política para permitir verificação de WhatsApp por usuários anônimos
CREATE POLICY "Allow WhatsApp verification for login"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Função para verificar se WhatsApp já está registrado (sem expor dados sensíveis)
CREATE OR REPLACE FUNCTION check_whatsapp_exists(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM usuarios 
    WHERE whatsapp = phone_number
  );
END;
$$;

-- Função para login seguro que retorna dados básicos do perfil
CREATE OR REPLACE FUNCTION login_user(phone_number text)
RETURNS TABLE(
  user_id uuid,
  nome text,
  perfil_completo boolean,
  status text,
  foto_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id, 
    usuarios.nome, 
    usuarios.perfil_completo, 
    usuarios.status,
    usuarios.foto_url
  FROM usuarios
  WHERE whatsapp = phone_number;
  
  -- Atualizar último acesso se usuário encontrado
  UPDATE usuarios 
  SET ultimo_acesso = now() 
  WHERE whatsapp = phone_number;
END;
$$;

-- Função para atualizar apenas o status do usuário
CREATE OR REPLACE FUNCTION update_user_status(user_id uuid, new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se status é válido
  IF new_status NOT IN ('available', 'busy') THEN
    RETURN false;
  END IF;
  
  -- Atualizar status
  UPDATE usuarios 
  SET 
    status = new_status,
    atualizado_em = now()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Função para salvar perfil completo (corrigir problemas de salvamento)
CREATE OR REPLACE FUNCTION save_user_profile(
  user_id uuid,
  user_nome text,
  user_descricao text,
  user_tags text[],
  user_foto_url text DEFAULT NULL,
  user_localizacao text DEFAULT NULL,
  user_latitude numeric DEFAULT NULL,
  user_longitude numeric DEFAULT NULL,
  user_status text DEFAULT 'available'
)
RETURNS TABLE(
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
  perfil_completo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validações
  IF length(trim(user_nome)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  
  IF length(trim(user_descricao)) = 0 THEN
    RAISE EXCEPTION 'Descrição é obrigatória';
  END IF;
  
  IF array_length(user_tags, 1) IS NULL OR array_length(user_tags, 1) = 0 THEN
    RAISE EXCEPTION 'Pelo menos uma tag é obrigatória';
  END IF;
  
  -- Atualizar perfil
  UPDATE usuarios 
  SET 
    nome = user_nome,
    descricao = user_descricao,
    tags = user_tags,
    foto_url = user_foto_url,
    localizacao = user_localizacao,
    latitude = user_latitude,
    longitude = user_longitude,
    status = user_status,
    atualizado_em = now()
  WHERE usuarios.id = user_id;
  
  -- Retornar dados atualizados
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
    u.perfil_completo
  FROM usuarios u
  WHERE u.id = user_id;
END;
$$;

-- Função para criar novo usuário (primeira vez)
CREATE OR REPLACE FUNCTION create_new_user(
  user_id uuid,
  user_whatsapp text,
  user_nome text,
  user_descricao text,
  user_tags text[],
  user_foto_url text DEFAULT NULL,
  user_localizacao text DEFAULT NULL,
  user_latitude numeric DEFAULT NULL,
  user_longitude numeric DEFAULT NULL
)
RETURNS TABLE(
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
  perfil_completo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validações
  IF length(trim(user_nome)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  
  IF length(trim(user_whatsapp)) < 10 THEN
    RAISE EXCEPTION 'WhatsApp inválido';
  END IF;
  
  IF length(trim(user_descricao)) = 0 THEN
    RAISE EXCEPTION 'Descrição é obrigatória';
  END IF;
  
  IF array_length(user_tags, 1) IS NULL OR array_length(user_tags, 1) = 0 THEN
    RAISE EXCEPTION 'Pelo menos uma tag é obrigatória';
  END IF;
  
  -- Inserir novo usuário
  INSERT INTO usuarios (
    id,
    nome,
    whatsapp,
    descricao,
    tags,
    foto_url,
    localizacao,
    latitude,
    longitude,
    status
  ) VALUES (
    user_id,
    user_nome,
    user_whatsapp,
    user_descricao,
    user_tags,
    user_foto_url,
    user_localizacao,
    user_latitude,
    user_longitude,
    'available'
  );
  
  -- Retornar dados do usuário criado
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
    u.perfil_completo
  FROM usuarios u
  WHERE u.id = user_id;
END;
$$;

-- Corrigir função check_perfil_completo para ser mais rigorosa
CREATE OR REPLACE FUNCTION check_perfil_completo()
RETURNS TRIGGER AS $$
BEGIN
  -- Perfil completo se tem: nome, whatsapp, descrição válida e pelo menos 1 tag
  NEW.perfil_completo = (
    NEW.nome IS NOT NULL AND
    length(trim(NEW.nome)) > 0 AND
    NEW.whatsapp IS NOT NULL AND
    length(trim(NEW.whatsapp)) >= 10 AND
    NEW.descricao IS NOT NULL AND
    length(trim(NEW.descricao)) > 10 AND  -- Descrição deve ter pelo menos 10 caracteres
    NEW.tags IS NOT NULL AND
    array_length(NEW.tags, 1) > 0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar índice para melhorar performance de login
CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp_login ON usuarios (whatsapp) WHERE perfil_completo = true;

-- Comentários para documentação
COMMENT ON FUNCTION check_whatsapp_exists IS 'Verifica se um número WhatsApp já está registrado';
COMMENT ON FUNCTION login_user IS 'Função segura para login de usuários';
COMMENT ON FUNCTION update_user_status IS 'Atualiza apenas o status do usuário';
COMMENT ON FUNCTION save_user_profile IS 'Salva perfil completo com validações';
COMMENT ON FUNCTION create_new_user IS 'Cria novo usuário com validações completas';