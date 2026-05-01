-- ============================================
-- FIDELYAPP - COMPLETE DATABASE SCHEMA
-- Sistema de Tarjetas de Lealtad
-- ============================================

-- 1. TABLAS DE AUTENTICACIÓN (Ya existen en Supabase)
-- auth.users (tabla nativa de Supabase)
-- profiles (tabla creada anteriormente)

-- 2. TABLAS DE NEGOCIOS
-- ============================================

-- Empresas/Negocios
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Horarios de operación de los negocios
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Monday, 6 = Sunday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, day_of_week)
);

-- 3. TABLAS DE PRODUCTOS
-- ============================================

-- Productos de los negocios
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  points INTEGER NOT NULL CHECK (points >= 0),
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLAS DE NIVELES Y PROGRAMAS DE LEALTAD
-- ============================================

-- Niveles de lealtad (Bronze, Silver, Gold, etc.)
CREATE TABLE IF NOT EXISTS loyalty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL CHECK (min_points >= 0),
  color TEXT NOT NULL,
  icon_url TEXT,
  benefits JSONB, -- Beneficios en formato JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, name)
);

-- Programas de lealtad por negocio
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_per_purchase BOOLEAN DEFAULT true, -- Si los puntos son por producto o por monto
  points_per_dollar DECIMAL(5,2) DEFAULT 1.0, -- Puntos por dólar (si aplica)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id)
);

-- 5. TABLAS DE TARJETAS DE LEALTAD
-- ============================================

-- Tarjetas de lealtad (relación usuario-negocio)
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  card_number TEXT UNIQUE NOT NULL, -- Número único de tarjeta
  current_level_id UUID REFERENCES loyalty_levels(id),
  current_points INTEGER DEFAULT 0 CHECK (current_points >= 0),
  total_points_earned INTEGER DEFAULT 0 CHECK (total_points_earned >= 0),
  total_visits INTEGER DEFAULT 0 CHECK (total_visits >= 0),
  last_visit TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, business_id)
);

-- 6. TABLAS DE TRANSACCIONES
-- ============================================

-- Transacciones de puntos
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  points INTEGER NOT NULL, -- Positivo para earned, negativo para redeemed
  description TEXT NOT NULL,
  reference_id UUID, -- ID de referencia (producto, recompensa, etc.)
  reference_type TEXT, -- 'product', 'reward', 'manual_adjustment'
  created_by UUID REFERENCES auth.users(id), -- Quién creó la transacción
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Compras/Pedidos
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  total_points INTEGER NOT NULL CHECK (total_points >= 0),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Detalles de compras (productos comprados)
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  points_per_unit INTEGER NOT NULL CHECK (points_per_unit >= 0),
  total_points INTEGER NOT NULL CHECK (total_points >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLAS DE RECOMPENSAS
-- ============================================

-- Recompensas canjeables
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  is_limited BOOLEAN DEFAULT false,
  quantity_available INTEGER DEFAULT NULL, -- NULL para ilimitado
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Canjes de recompensas
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  redemption_code TEXT UNIQUE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABLAS DE PROMOCIONES
-- ============================================

-- Promociones y ofertas
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_product')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
  discount_label TEXT NOT NULL, -- "20% OFF", "$5 OFF", "2x1", etc.
  applicable_products JSONB, -- Array de product IDs o null para todos
  days_of_week INTEGER[], -- [0,1,2,3,4,5,6] para días que aplica
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER DEFAULT NULL, -- NULL para ilimitado
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Uso de promociones
CREATE TABLE IF NOT EXISTS promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABLAS DE NOTIFICACIONES
-- ============================================

-- Notificaciones para usuarios
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_level', 'points_earned', 'reward_available', 'promotion', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Datos adicionales
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- 10. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_id ON loyalty_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_business_id ON loyalty_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_active ON loyalty_cards(is_active);

CREATE INDEX IF NOT EXISTS idx_point_transactions_card_id ON point_transactions(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_purchases_card_id ON purchases(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_rewards_business_id ON rewards(business_id);
CREATE INDEX IF NOT EXISTS idx_rewards_available ON rewards(is_available);

CREATE INDEX IF NOT EXISTS idx_promotions_business_id ON promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 11. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 12. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para generar número de tarjeta único
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FID-' || to_char(gen_random_uuid()::text, 'FM999999999999');
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar puntos de tarjeta
CREATE OR REPLACE FUNCTION update_card_points(card_uuid UUID, points_change INTEGER, transaction_type TEXT, description TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Actualizar puntos en la tarjeta
  UPDATE loyalty_cards 
  SET 
    current_points = current_points + points_change,
    total_points_earned = CASE 
      WHEN transaction_type = 'earned' THEN total_points_earned + points_change
      ELSE total_points_earned
    END,
    updated_at = now()
  WHERE id = card_uuid;
  
  -- Crear transacción de puntos
  INSERT INTO point_transactions (loyalty_card_id, type, points, description)
  VALUES (card_uuid, transaction_type, points_change, description);
  
  -- Verificar si el usuario alcanzó un nuevo nivel
  PERFORM check_level_upgrade(card_uuid);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar upgrade de nivel
CREATE OR REPLACE FUNCTION check_level_upgrade(card_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_card RECORD;
  new_level RECORD;
BEGIN
  -- Obtener datos actuales de la tarjeta
  SELECT * INTO current_card 
  FROM loyalty_cards 
  WHERE id = card_uuid;
  
  -- Buscar el nivel más alto que cumple con los puntos
  SELECT * INTO new_level
  FROM loyalty_levels
  WHERE business_id = current_card.business_id 
    AND min_points <= current_card.current_points
  ORDER BY min_points DESC
  LIMIT 1;
  
  -- Actualizar si encontró un nivel superior
  IF FOUND AND (new_level.id IS DISTINCT FROM current_card.current_level_id) THEN
    UPDATE loyalty_cards 
    SET current_level_id = new_level.id,
        updated_at = now()
    WHERE id = card_uuid;
    
    -- Crear notificación de nuevo nivel
    INSERT INTO notifications (user_id, business_id, type, title, message, data)
    VALUES (
      current_card.user_id,
      current_card.business_id,
      'new_level',
      '¡Nuevo nivel alcanzado!',
      'Felicidades, has alcanzado el nivel ' || new_level.name || '!',
      jsonb_build_object('level_name', new_level.name, 'level_color', new_level.color)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_levels_updated_at BEFORE UPDATE ON loyalty_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_cards_updated_at BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. DATOS DE EJEMPLO (Opcional)
-- ============================================

-- Insertar negocio de ejemplo
INSERT INTO businesses (owner_id, name, category, description, address, phone, email)
VALUES (
  'demo-owner-id', -- Reemplazar con ID real de usuario
  'Moka Café',
  'Coffee Shop',
  'El mejor café artesanal de la ciudad',
  '123 Main St, City',
  '+1234567890',
  'info@mokacafe.com'
) ON CONFLICT DO NOTHING;

-- Insertar niveles de lealtad de ejemplo
INSERT INTO loyalty_levels (business_id, name, description, min_points, color)
SELECT 
  b.id,
  level_name,
  level_desc,
  level_points,
  level_color
FROM businesses b, 
  unnest(ARRAY[
    ('Bronze', 'Nivel inicial', 0, '#12173B'),
    ('Silver', 'Nivel intermedio', 500, '#032C7D'),
    ('Gold', 'Nivel premium', 1500, '#7546ED')
  ]) AS t(level_name, level_desc, level_points, level_color)
WHERE b.name = 'Moka Café'
ON CONFLICT DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO products (business_id, name, description, price, points, category)
SELECT 
  b.id,
  product_name,
  product_desc,
  product_price,
  product_points,
  product_category
FROM businesses b,
  unnest(ARRAY[
    ('Espresso', 'Café espresso clásico', 2.50, 2, 'Coffee'),
    ('Cappuccino', 'Cappuccino espumoso', 3.20, 3, 'Coffee'),
    ('Croissant', 'Croissant francés', 2.00, 2, 'Pastry'),
    ('Latte', 'Latte suave', 3.50, 4, 'Coffee')
  ]) AS t(product_name, product_desc, product_price, product_points, product_category)
WHERE b.name = 'Moka Café'
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DEL ESQUEMA DE BASE DE DATOS
-- ============================================
