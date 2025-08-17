/*
  # Criar tabela de transações para Mercado Pago

  1. Nova Tabela
    - `transacoes`
      - `id` (uuid, primary key)
      - `cliente_id` (uuid, foreign key para usuarios.id)
      - `prestador_id` (uuid, foreign key para usuarios.id)
      - `mp_payment_id` (text, ID do pagamento no Mercado Pago)
      - `status` (text, status do pagamento: pending, approved, rejected, etc.)
      - `amount` (numeric, valor da transação - fixo em 2.02)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `transacoes`
    - Políticas para permitir acesso aos dados das transações

  3. Índices
    - Índice no mp_payment_id para consultas rápidas
    - Índice no cliente_id e prestador_id
    - Índice no status para filtros
*/

-- Criar tabela transacoes
CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  prestador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mp_payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(10,2) NOT NULL DEFAULT 2.02,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT transacoes_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'in_process')),
  CONSTRAINT transacoes_amount_check CHECK (amount > 0),
  CONSTRAINT transacoes_different_users CHECK (cliente_id != prestador_id)
);

-- Habilitar RLS
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias transações como cliente"
  ON transacoes
  FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Usuários podem ver suas próprias transações como prestador"
  ON transacoes
  FOR SELECT
  TO authenticated
  USING (prestador_id = auth.uid());

CREATE POLICY "Permitir inserção de transações"
  ON transacoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de transações"
  ON transacoes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_mp_payment_id ON transacoes(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cliente_id ON transacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_prestador_id ON transacoes(prestador_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_created_at ON transacoes(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_transacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transacoes_update_updated_at
  BEFORE UPDATE ON transacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_transacoes_updated_at();

-- Função para obter estatísticas de transações
CREATE OR REPLACE FUNCTION get_transacao_stats(user_id uuid)
RETURNS TABLE (
  total_como_cliente bigint,
  total_como_prestador bigint,
  valor_total_pago numeric,
  valor_total_recebido numeric,
  transacoes_aprovadas_cliente bigint,
  transacoes_aprovadas_prestador bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM transacoes WHERE cliente_id = user_id) as total_como_cliente,
    (SELECT COUNT(*) FROM transacoes WHERE prestador_id = user_id) as total_como_prestador,
    (SELECT COALESCE(SUM(amount), 0) FROM transacoes WHERE cliente_id = user_id AND status = 'approved') as valor_total_pago,
    (SELECT COALESCE(SUM(amount), 0) FROM transacoes WHERE prestador_id = user_id AND status = 'approved') as valor_total_recebido,
    (SELECT COUNT(*) FROM transacoes WHERE cliente_id = user_id AND status = 'approved') as transacoes_aprovadas_cliente,
    (SELECT COUNT(*) FROM transacoes WHERE prestador_id = user_id AND status = 'approved') as transacoes_aprovadas_prestador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;