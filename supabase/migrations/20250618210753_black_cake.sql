-- MIGRAÇÃO DE REVERSÃO (OPCIONAL)
-- Execute apenas se quiser remover as funcionalidades adicionadas

-- Remover funções adicionadas
DROP FUNCTION IF EXISTS search_usuarios_enhanced(text, text[], text, numeric, numeric, integer, integer, integer);
DROP FUNCTION IF EXISTS get_trending_professionals(integer);
DROP FUNCTION IF EXISTS get_user_statistics(uuid);
DROP FUNCTION IF EXISTS increment_profile_views(uuid);
DROP FUNCTION IF EXISTS increment_contact_count(uuid);
DROP FUNCTION IF EXISTS update_last_activity();

-- Remover trigger
DROP TRIGGER IF EXISTS usuarios_update_last_activity ON usuarios;

-- Remover índices adicionados
DROP INDEX IF EXISTS idx_usuarios_featured;
DROP INDEX IF EXISTS idx_usuarios_premium;
DROP INDEX IF EXISTS idx_usuarios_profile_views;
DROP INDEX IF EXISTS idx_usuarios_rating;

-- Remover colunas adicionadas (CUIDADO: isso remove os dados dessas colunas)
ALTER TABLE usuarios 
DROP COLUMN IF EXISTS profile_views,
DROP COLUMN IF EXISTS total_contacts,
DROP COLUMN IF EXISTS average_rating,
DROP COLUMN IF EXISTS total_ratings,
DROP COLUMN IF EXISTS featured,
DROP COLUMN IF EXISTS premium,
DROP COLUMN IF EXISTS last_activity;

-- Comentário
COMMENT ON TABLE usuarios IS 'Tabela usuarios revertida ao estado original';