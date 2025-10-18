/*
  # Sistema de Pagamento - Mercado Pago PIX

  1. Nova Tabela
    - `transacoes`
      - `id` (uuid, primary key)
      - `cliente_id` (uuid, referência ao usuário que está pagando)
      - `prestador_id` (uuid, referência ao prestador de serviço)
      - `mp_payment_id` (text, ID do pagamento no Mercado Pago)
      - `status` (text, status do pagamento)
      - `amount` (numeric, valor fixo 2.02)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `transacoes`
    - Políticas para usuários autenticados
    - Índices para performance

  3. Funções
    - Trigger para atualizar updated_at
    - Validações de integridade
*/

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  prestador_id uuid NOT NULL,
  mp_payment_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'in_process')),
  amount numeric(10,2) NOT NULL DEFAULT 2.02 CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT transacoes_different_users CHECK (cliente_id <> prestador_id),
  
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (prestador_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias transações como cliente"
  ON transacoes FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Usuários podem ver suas próprias transações como prestador"
  ON transacoes FOR SELECT
  TO authenticated
  USING (prestador_id = auth.uid());

CREATE POLICY "Permitir inserção de transações"
  ON transacoes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de transações"
  ON transacoes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_cliente_id ON transacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_prestador_id ON transacoes(prestador_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_mp_payment_id ON transacoes(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_created_at ON transacoes(created_at DESC);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_transacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS transacoes_update_updated_at ON transacoes;
CREATE TRIGGER transacoes_update_updated_at
  BEFORE UPDATE ON transacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_transacoes_updated_at();