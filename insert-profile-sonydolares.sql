-- ============================================
-- INSERTAR PERFIL PARA USUARIO sonydolares@gmail.com
-- ============================================

-- Paso 1: Verificar el ID del usuario en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'sonydolares@gmail.com';

-- Paso 2: Insertar el perfil (reemplaza 'USER_ID_AQUI' con el UUID real del paso 1)
-- Opción A: Si quieres especificar el ID manualmente
INSERT INTO profiles (id, name, username, email, created_at, updated_at)
VALUES (
  'USER_ID_AQUI',  -- Reemplaza esto con el UUID de auth.users
  'User',
  '@sonydolares',
  'sonydolares@gmail.com',
  '2026-05-01 15:24:24.851668',
  timezone('utc'::text, now())
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  updated_at = timezone('utc'::text, now());

-- ============================================
-- OPCIÓN B: Insertar automáticamente buscando el ID
-- (Ejecuta esto si prefieres que se haga todo en una consulta)
-- ============================================

INSERT INTO profiles (id, name, username, email, created_at, updated_at)
SELECT 
  au.id,
  'User',
  '@sonydolares',
  au.email,
  au.created_at,
  timezone('utc'::text, now())
FROM auth.users au
WHERE au.email = 'sonydolares@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  updated_at = timezone('utc'::text, now());

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que el perfil se creó correctamente
SELECT * FROM profiles WHERE email = 'sonydolares@gmail.com';
