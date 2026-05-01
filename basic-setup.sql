-- ============================================
-- FIDELYAPP - MÍNIMO PARA PRUEBA INICIAL
-- Paso 1: Negocio + Tarjeta de Lealtad
-- ============================================

-- 1. TABLA BÁSICA DE NEGOCIOS
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA BÁSICA DE TARJETAS DE LEALTAD
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  card_number TEXT UNIQUE NOT NULL,
  current_points INTEGER DEFAULT 0 CHECK (current_points >= 0),
  total_visits INTEGER DEFAULT 0 CHECK (total_visits >= 0),
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, business_id)
);

-- 3. ÍNDICES BÁSICOS
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_id ON loyalty_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_business_id ON loyalty_cards(business_id);

-- 4. HABILITAR RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE SEGURIDAD BÁSICAS

-- Políticas para businesses
CREATE POLICY "Users can view own businesses" ON businesses
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own businesses" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own businesses" ON businesses
  FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para loyalty_cards
CREATE POLICY "Users can view own cards" ON loyalty_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view customer cards" ON loyalty_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own cards" ON loyalty_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can create customer cards" ON loyalty_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update customer cards" ON loyalty_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE id = business_id AND owner_id = auth.uid()
    )
  );

-- 6. FUNCIONES BÁSICAS

-- Función para generar número de tarjeta único
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FID-' || to_char(gen_random_uuid()::text, 'FM999999999999');
END;
$$ LANGUAGE plpgsql;

-- Función para emitir nueva tarjeta
CREATE OR REPLACE FUNCTION issue_loyalty_card(
  p_user_id UUID,
  p_business_id UUID,
  p_card_number TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_card_id UUID;
  v_card_number TEXT := COALESCE(p_card_number, generate_card_number());
BEGIN
  -- Verificar que la tarjeta no exista
  IF EXISTS (SELECT 1 FROM loyalty_cards WHERE card_number = v_card_number) THEN
    RAISE EXCEPTION 'Card number already exists';
  END IF;
  
  -- Verificar que el usuario no tenga ya una tarjeta de este negocio
  IF EXISTS (SELECT 1 FROM loyalty_cards WHERE user_id = p_user_id AND business_id = p_business_id) THEN
    RAISE EXCEPTION 'User already has a card for this business';
  END IF;
  
  -- Crear la tarjeta
  INSERT INTO loyalty_cards (user_id, business_id, card_number)
  VALUES (p_user_id, p_business_id, v_card_number)
  RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para añadir puntos a una tarjeta
CREATE OR REPLACE FUNCTION add_points_to_card(
  p_card_id UUID,
  p_points INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;
  
  UPDATE loyalty_cards 
  SET 
    current_points = current_points + p_points,
    total_visits = total_visits + 1,
    updated_at = now()
  WHERE id = p_card_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_cards_updated_at BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. DATOS DE EJEMPLO (Opcional - para pruebas)

-- Insertar negocio de ejemplo
INSERT INTO businesses (owner_id, name, category, description, address, phone)
VALUES (
  'demo-owner-id', -- Reemplazar con ID real de usuario
  'Moka Café',
  'Coffee Shop',
  'El mejor café artesanal de la ciudad',
  '123 Main St, City',
  '+1234567890'
) ON CONFLICT DO NOTHING;

-- 9. VISTAS ÚTILES

-- Vista para ver tarjetas de un negocio (para dueños)
CREATE OR REPLACE VIEW business_cards AS
SELECT 
  lc.*,
  u.email as user_email,
  p.name as user_name
FROM loyalty_cards lc
JOIN auth.users u ON lc.user_id = u.id
LEFT JOIN profiles p ON lc.user_id = p.id;

-- Vista para ver tarjetas de un usuario
CREATE OR REPLACE VIEW user_cards AS
SELECT 
  lc.*,
  b.name as business_name,
  b.category as business_category
FROM loyalty_cards lc
JOIN businesses b ON lc.business_id = b.id
WHERE lc.is_active = true;

-- ============================================
-- FIN - MÍNIMO PARA PRUEBA INICIAL
-- ============================================
