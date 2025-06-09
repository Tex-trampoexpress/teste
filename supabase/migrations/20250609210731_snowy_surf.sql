/*
  # Enhanced usuarios table for profile management

  1. New Tables
    - `usuarios` (enhanced)
      - `id` (uuid, primary key) - unique user identifier
      - `nome` (text, not null) - user's full name (required)
      - `whatsapp` (text, unique, not null) - WhatsApp number (required and unique)
      - `descricao` (text) - user description/bio
      - `tags` (text array, not null, default '{}') - service tags
      - `foto_url` (text) - profile photo URL
      - `localizacao` (text) - user location
      - `status` (text, not null, default 'available') - availability status
      - `latitude` (decimal) - GPS latitude for proximity search
      - `longitude` (decimal) - GPS longitude for proximity search
      - `criado_em` (timestamptz, not null, default now()) - creation timestamp
      - `atualizado_em` (timestamptz, not null, default now()) - last update timestamp

  2. Security
    - Enable RLS on `usuarios` table
    - Add policies for public read access (anyone can see profiles)
    - Add policies for authenticated users to manage their own data
    - Add policy for upsert operations (create or update)

  3. Indexes
    - Index on whatsapp for fast login lookup
    - Index on status for filtering available users
    - GIN index on tags for tag-based search
    - Index on creation date for ordering
    - Spatial index for location-based queries

  4. Constraints
    - WhatsApp must be unique (one profile per phone number)
    - Status must be either 'available' or 'busy'
    - Nome cannot be empty when provided
    - Tags array cannot be null
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS usuarios CASCADE;

-- Create enhanced usuarios table
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text UNIQUE NOT NULL,
  descricao text,
  tags text[] NOT NULL DEFAULT '{}',
  foto_url text,
  localizacao text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy')),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE usuarios ADD CONSTRAINT usuarios_nome_not_empty 
  CHECK (length(trim(nome)) > 0);

ALTER TABLE usuarios ADD CONSTRAINT usuarios_whatsapp_format 
  CHECK (length(trim(whatsapp)) >= 10);

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can see profiles)
CREATE POLICY "Anyone can read all profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create policies for authenticated users to manage their own data
CREATE POLICY "Users can insert their own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can delete their own profile"
  ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id::text);

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
CREATE UNIQUE INDEX idx_usuarios_whatsapp ON usuarios(whatsapp);
CREATE INDEX idx_usuarios_status ON usuarios(status);
CREATE INDEX idx_usuarios_tags ON usuarios USING GIN(tags);
CREATE INDEX idx_usuarios_criado_em ON usuarios(criado_em DESC);
CREATE INDEX idx_usuarios_location ON usuarios(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create function for proximity search
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 decimal, lon1 decimal, 
  lat2 decimal, lon2 decimal
) RETURNS decimal AS $$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get users by proximity
CREATE OR REPLACE FUNCTION get_users_by_proximity(
  user_lat decimal,
  user_lon decimal,
  radius_km decimal DEFAULT 10
) RETURNS TABLE (
  id uuid,
  nome text,
  whatsapp text,
  descricao text,
  tags text[],
  foto_url text,
  localizacao text,
  status text,
  latitude decimal,
  longitude decimal,
  criado_em timestamptz,
  atualizado_em timestamptz,
  distance_km decimal
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
    calculate_distance(user_lat, user_lon, u.latitude, u.longitude) as distance_km
  FROM usuarios u
  WHERE u.latitude IS NOT NULL 
    AND u.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, u.latitude, u.longitude) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;