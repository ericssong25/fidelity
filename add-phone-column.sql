-- Agrega la columna phone a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Actualiza la función handle_new_user para incluir phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'username', '@' || split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
