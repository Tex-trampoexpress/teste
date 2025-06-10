/*
  # Fix RLS Policies for User Profile Updates

  This migration fixes the Row-Level Security policies that were preventing users from updating their own profiles.

  ## Changes Made:
  1. **UPDATE Policy**: Fixed to properly check user ownership using correct UUID type casting
  2. **SELECT Policies**: Separated public viewing from own profile viewing
  3. **INSERT Policy**: Secured to only allow authenticated users to create their own profiles
  4. **DELETE Policy**: Secured to only allow users to delete their own profiles

  ## Security:
  - Users can only update/delete their own profiles
  - Public can view only available and complete profiles
  - Authenticated users can view their own profiles regardless of status
*/

-- Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Users can update by ID" ON usuarios;
DROP POLICY IF EXISTS "Anyone can read available profiles" ON usuarios;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON usuarios;
DROP POLICY IF EXISTS "Users can delete by ID" ON usuarios;

-- Create new UPDATE policy with correct type handling
CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id::uuid)
  WITH CHECK (auth.uid() = id::uuid);

-- Create separate SELECT policies
-- Public viewing: only available and complete profiles
CREATE POLICY "Public can read available profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING ((status = 'available'::text) AND (perfil_completo = true));

-- Own profile viewing: authenticated users can see their own profile
CREATE POLICY "Users can read own profile"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id::uuid);

-- Secure INSERT policy
CREATE POLICY "Authenticated users can insert own profile"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id::uuid);

-- Secure DELETE policy
CREATE POLICY "Users can delete own profile"
  ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id::uuid);