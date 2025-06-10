/*
  # Fix RLS Policies for User Updates

  1. Security Changes
    - Drop existing restrictive UPDATE policy
    - Create new UPDATE policy that allows users to update their own records
    - Ensure policy works with Supabase auth system
    - Keep other policies intact for security

  2. Policy Details
    - UPDATE policy: Users can only update records where they are the owner
    - Uses auth.uid() to match against record ID for security
    - Maintains data integrity while allowing legitimate updates
*/

-- Drop the existing UPDATE policy that's causing issues
DROP POLICY IF EXISTS "Users can update by ID" ON usuarios;

-- Create a new UPDATE policy that properly uses Supabase auth
CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Also update the SELECT policy to be more permissive for authenticated users viewing their own profile
DROP POLICY IF EXISTS "Anyone can read available profiles" ON usuarios;

-- Create separate policies for reading - one for public viewing and one for own profile
CREATE POLICY "Anyone can read available profiles"
  ON usuarios
  FOR SELECT
  TO anon, authenticated
  USING ((status = 'available'::text) AND (perfil_completo = true));

CREATE POLICY "Users can read own profile"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

-- Ensure the INSERT policy allows creating profiles
DROP POLICY IF EXISTS "Anyone can insert profiles" ON usuarios;

CREATE POLICY "Authenticated users can insert profiles"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id);

-- Keep DELETE policy but make it more secure
DROP POLICY IF EXISTS "Users can delete by ID" ON usuarios;

CREATE POLICY "Users can delete own profile"
  ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = id);