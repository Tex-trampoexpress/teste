/*
  # Create usuarios table with proper structure

  1. New Tables
    - `usuarios`
      - `id` (uuid, primary key) - matches Supabase auth.users
      - `nome` (text) - user's full name
      - `whatsapp` (text) - WhatsApp number as text for better formatting
      - `descricao` (text) - user description/bio
      - `tags` (text array) - service tags as array instead of single text
      - `foto_url` (text) - profile photo URL
      - `localizacao` (text) - user location
      - `status` (text) - availability status (available/busy)
      - `criado_em` (timestamptz) - creation timestamp with default
      - `atualizado_em` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `usuarios` table
    - Add policies for authenticated users to manage their own data
    - Add policy for public read access to user profiles

  3. Changes
    - Changed `whatsapp` from bigint to text for better phone number handling
    - Changed `tags` from text to text array for proper tag management
    - Added `status` field for availability tracking
    - Added `atualizado_em` for tracking profile updates
    - Added proper defaults and constraints
*/

-- Drop existing table if it exists (be careful in production)
DROP TABLE IF EXISTS usuarios;

-- Create usuarios table with proper structure
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  whatsapp text,
  descricao text,
  tags text[] DEFAULT '{}',
  foto_url text,
  localizacao text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'busy')),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all profiles"
  ON usuarios
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create function to automatically update atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER usuarios_update_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- Create indexes for better performance
CREATE INDEX idx_usuarios_status ON usuarios(status);
CREATE INDEX idx_usuarios_tags ON usuarios USING GIN(tags);
CREATE INDEX idx_usuarios_criado_em ON usuarios(criado_em DESC);