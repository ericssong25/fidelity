-- ============================================
-- SUPABASE SETUP SCRIPTS
-- Ejecuta estos scripts en el dashboard de Supabase (SQL Editor)
-- ============================================

-- 1. Primero, asegúrate de que la tabla profiles exista con la estructura correcta
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  username TEXT,
  email TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS (Row Level Security) en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para la tabla profiles

-- Política para permitir a los usuarios autenticados ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para permitir a los usuarios autenticados insertar su propio perfil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para permitir a los usuarios autenticados actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para permitir a los usuarios autenticados eliminar su propio perfil
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- 4. Crear un trigger para crear automáticamente un perfil cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'username', '@' || split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear el trigger que se ejecuta después de que un usuario se registra
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Dar permisos para que los usuarios anónimos puedan registrarse
-- (Esto es para el sistema de autenticación de Supabase)
-- No se necesitan políticas especiales para auth.users ya que Supabase maneja esto internamente

-- 7. Opcional: Crear una función para actualizar el perfil
CREATE OR REPLACE FUNCTION public.update_profile(
  p_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    name = COALESCE(p_name, name),
    username = COALESCE(p_username, username),
    updated_at = now()
  WHERE id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Dar permisos para ejecutar la función de actualización
GRANT EXECUTE ON FUNCTION public.update_profile TO authenticated;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar que el trigger se creó correctamente
SELECT 
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' OR trigger_name = 'on_auth_user_created';
