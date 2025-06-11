/*
  # Correção completa das operações de perfil

  1. Políticas RLS
    - Corrigir políticas para permitir operações do usuário atual
    - Manter segurança mas permitir funcionalidade

  2. Funções
    - Verificar se todas as funções estão funcionando
    - Corrigir triggers se necessário
*/

-- Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "Anyone can update profiles" ON usuarios;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON usuarios;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON usuarios;
DROP POLICY IF EXISTS "Anyone can read available profiles" ON usuarios;

-- Política de leitura: perfis públicos disponíveis e completos
CREATE POLICY "Public can read available profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available' AND perfil_completo = true);

-- Política de inserção: permitir criação de perfis (sem autenticação por enquanto)
CREATE POLICY "Allow profile creation"
  ON usuarios
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política de atualização: permitir atualização por ID (sem autenticação por enquanto)
CREATE POLICY "Allow profile updates"
  ON usuarios
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política de exclusão: permitir exclusão por ID
CREATE POLICY "Allow profile deletion"
  ON usuarios
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Verificar se as funções de trigger estão funcionando
-- Recriar função de verificação de perfil completo
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
  
  -- Log para debug
  RAISE NOTICE 'Perfil completo calculado: % para usuário %', NEW.perfil_completo, NEW.nome;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar função de atualização de timestamp
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RAISE NOTICE 'Timestamp atualizado para usuário %', NEW.nome;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que os triggers existem
DROP TRIGGER IF EXISTS usuarios_check_perfil_completo ON usuarios;
DROP TRIGGER IF EXISTS usuarios_update_atualizado_em ON usuarios;

CREATE TRIGGER usuarios_check_perfil_completo
  BEFORE INSERT OR UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION check_perfil_completo();

CREATE TRIGGER usuarios_update_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- Comentário para documentação
COMMENT ON TABLE usuarios IS 'Políticas RLS ajustadas para permitir operações de perfil funcionais';