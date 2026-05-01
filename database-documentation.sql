-- ============================================
-- FIDELYAPP - DOCUMENTACIÓN COMPLETA DE BASE DE DATOS
-- Sistema de Tarjetas de Lealtad
-- ============================================
-- 
-- ÍNDICE:
-- 1. Visión General del Sistema
-- 2. Estructura de Tablas
-- 3. Relaciones entre Tablas
-- 4. Políticas de Seguridad (RLS)
-- 5. Funciones y Triggers
-- 6. Flujos de Negocio
-- 7. Scripts de Setup
-- 8. Datos de Ejemplo
--

-- ============================================
-- 1. VISIÓN GENERAL DEL SISTEMA
-- ============================================
--
-- FidelyApp es un sistema de tarjetas de lealtad digital que permite:
-- - A los negocios: Crear programas de lealtad, gestionar productos, 
--   registrar compras y otorgar puntos a clientes
-- - A los clientes: Acumular puntos, canjear recompensas, ver su historial
--
-- ROLES DE USUARIO:
-- - Customer (Cliente): Usuario que acumula puntos y canjea recompensas
-- - Business Owner (Dueño de Negocio): Usuario que administra su negocio,
--   productos y registra compras de clientes
--

-- ============================================
-- 2. ESTRUCTURA DE TABLAS
-- ============================================

-- 2.1 AUTENTICACIÓN Y PERFILES
-- -------------------------------------------
-- Tabla nativa de Supabase: auth.users
-- Almacena: email, password_hash, email_confirmed, etc.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  username TEXT,
  email TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 NEGOCIOS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,        -- Dueño del negocio
  name TEXT NOT NULL,                                         -- Nombre del negocio
  category TEXT NOT NULL,                                     -- Categoría (Coffee, Restaurant, etc.)
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

-- 2.3 HORARIOS DE NEGOCIO
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lunes, 6=Domingo
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, day_of_week)
);

-- 2.4 PRODUCTOS
-- -------------------------------------------
-- Cada negocio puede tener productos con precio y puntos asociados
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),    -- Precio en dólares
  points INTEGER NOT NULL CHECK (points >= 0),        -- Puntos que otorga al comprar
  category TEXT,                                      -- Ej: Coffee, Pastry, Drink
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,                  -- Si está disponible para venta
  is_featured BOOLEAN DEFAULT false,                  -- Si es producto destacado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 NIVELES DE LEALTAD
-- -------------------------------------------
-- Bronze, Silver, Gold, etc. Cada negocio define sus propios niveles
CREATE TABLE IF NOT EXISTS loyalty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                                   -- Ej: Bronze, Silver, Gold
  description TEXT,
  min_points INTEGER NOT NULL CHECK (min_points >= 0),  -- Puntos mínimos para alcanzar este nivel
  color TEXT NOT NULL,                                  -- Color HEX para UI (#12173B, #7546ED)
  icon_url TEXT,
  benefits JSONB,                                       -- JSON con beneficios del nivel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, name)
);

-- 2.6 PROGRAMAS DE LEALTAD
-- -------------------------------------------
-- Configuración del programa de puntos de cada negocio
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_per_purchase BOOLEAN DEFAULT true,             -- Si los puntos son por producto
  points_per_dollar DECIMAL(5,2) DEFAULT 1.0,           -- Puntos por dólar gastado (alternativa)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id)
);

-- 2.7 TARJETAS DE LEALTAD
-- -------------------------------------------
-- Relación entre un cliente y un negocio. Cada cliente tiene una tarjeta por negocio.
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,      -- Cliente
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,  -- Negocio
  card_number TEXT UNIQUE NOT NULL,                                      -- Número único de tarjeta
  current_level_id UUID REFERENCES loyalty_levels(id),                     -- Nivel actual
  current_points INTEGER DEFAULT 0 CHECK (current_points >= 0),          -- Puntos disponibles
  total_points_earned INTEGER DEFAULT 0 CHECK (total_points_earned >= 0),  -- Total acumulado histórico
  total_visits INTEGER DEFAULT 0 CHECK (total_visits >= 0),              -- Número de visitas/compras
  last_visit TIMESTAMP WITH TIME ZONE,                                    -- Última compra
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, business_id)  -- Un cliente solo puede tener una tarjeta por negocio
);

-- 2.8 TRANSACCIONES DE PUNTOS
-- -------------------------------------------
-- Historial de todos los movimientos de puntos (ganados, canjeados, ajustados)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  points INTEGER NOT NULL,                               -- Positivo = ganó, Negativo = canjeó
  description TEXT NOT NULL,                             -- "Compra de Latte", "Canje de recompensa"
  reference_id UUID,                                     -- ID de la compra/recompensa relacionada
  reference_type TEXT,                                   -- 'product', 'reward', 'manual_adjustment'
  created_by UUID REFERENCES auth.users(id),            -- Quién hizo la transacción (negocio o sistema)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.9 COMPRAS (PURCHASES)
-- -------------------------------------------
-- Registro de cada compra realizada por un cliente
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),  -- Monto total en $
  total_points INTEGER NOT NULL CHECK (total_points >= 0),        -- Puntos otorgados
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,                                             -- cash, card, transfer
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,              -- Dueño del negocio que registró
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 DETALLES DE COMPRA (PURCHASE_ITEMS)
-- -------------------------------------------
-- Productos individuales dentro de una compra
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  points_per_unit INTEGER NOT NULL CHECK (points_per_unit >= 0),
  total_points INTEGER NOT NULL CHECK (total_points >= 0),  -- quantity * points_per_unit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.11 RECOMPENSAS
-- -------------------------------------------
-- Recompensas que los clientes pueden canjear con sus puntos
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                                      -- "Café gratis", "Descuento 20%"
  description TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),   -- Puntos necesarios para canjear
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  is_limited BOOLEAN DEFAULT false,
  quantity_available INTEGER DEFAULT NULL,                -- NULL = ilimitado
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 CANJES DE RECOMPENSAS
-- -------------------------------------------
-- Registro de cuando un cliente canjea una recompensa
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  redemption_code TEXT UNIQUE,                             -- Código único para reclamar
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13 PROMOCIONES
-- -------------------------------------------
-- Promociones especiales de los negocios
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_product')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value >= 0),
  discount_label TEXT NOT NULL,                            -- "20% OFF", "$5 OFF", "2x1"
  applicable_products JSONB,                               -- Array de product IDs o null
  days_of_week INTEGER[],                                  -- [0,1,2,3,4,5,6] días que aplica
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER DEFAULT NULL,                        -- NULL = ilimitado
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.14 USO DE PROMOCIONES
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.15 NOTIFICACIONES
-- -------------------------------------------
-- Notificaciones para los usuarios (nuevo nivel, puntos ganados, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_level', 'points_earned', 'reward_available', 'promotion', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,                                              -- Datos adicionales
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. RELACIONES ENTRE TABLAS (Diagrama)
-- ============================================
--
-- auth.users (1) ----< (1) profiles
--       |
--       | (1) ----< (N) businesses (owner_id)
--       | (1) ----< (N) loyalty_cards (user_id)
--       |
-- businesses (1) ----< (N) business_hours
--       | (1) ----< (N) products
--       | (1) ----< (N) loyalty_levels
--       | (1) ----< (N) loyalty_programs
--       | (1) ----< (N) loyalty_cards
--       | (1) ----< (N) rewards
--       | (1) ----< (N) promotions
--       | (1) ----< (N) purchases
--       | (1) ----< (N) notifications
--       |
-- loyalty_cards (1) ----< (N) point_transactions
--       | (1) ----< (N) purchases
--       | (1) ----< (N) reward_redemptions
--       | (1) ----< (N) promotion_usages
--       |
-- purchases (1) ----< (N) purchase_items
--       | (1) ----< (N) promotion_usages
--       |
-- products (1) ----< (N) purchase_items
--       |
-- rewards (1) ----< (N) reward_redemptions
--       |
-- promotions (1) ----< (N) promotion_usages
--

-- ============================================
-- 4. ÍNDICES PARA OPTIMIZACIÓN
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

-- ============================================
-- 5. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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

-- 5.1 POLÍTICAS PARA PROFILES
-- -------------------------------------------
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5.2 POLÍTICAS PARA BUSINESSES
-- -------------------------------------------
CREATE POLICY "Business owners can manage their businesses" ON businesses
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view active businesses" ON businesses
  FOR SELECT USING (status = 'active');

-- 5.3 POLÍTICAS PARA PRODUCTS
-- -------------------------------------------
CREATE POLICY "Business owners can manage their products" ON products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = products.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view available products" ON products
  FOR SELECT USING (is_available = true);

-- 5.4 POLÍTICAS PARA LOYALTY_CARDS
-- -------------------------------------------
CREATE POLICY "Users can view their own cards" ON loyalty_cards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Business owners can view their customer cards" ON loyalty_cards
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = loyalty_cards.business_id AND b.owner_id = auth.uid()
  ));

-- 5.5 POLÍTICAS PARA POINT_TRANSACTIONS
-- -------------------------------------------
CREATE POLICY "Users can view their own transactions" ON point_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    WHERE lc.id = point_transactions.loyalty_card_id AND lc.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view their customer transactions" ON point_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    JOIN businesses b ON b.id = lc.business_id
    WHERE lc.id = point_transactions.loyalty_card_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can create transactions" ON point_transactions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    JOIN businesses b ON b.id = lc.business_id
    WHERE lc.id = point_transactions.loyalty_card_id AND b.owner_id = auth.uid()
  ));

-- 5.6 POLÍTICAS PARA PURCHASES
-- -------------------------------------------
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    WHERE lc.id = purchases.loyalty_card_id AND lc.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view their customer purchases" ON purchases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = purchases.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can create purchases" ON purchases
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = purchases.business_id AND b.owner_id = auth.uid()
  ));

-- 5.7 POLÍTICAS PARA PURCHASE_ITEMS
-- -------------------------------------------
CREATE POLICY "Users can view their own purchase items" ON purchase_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM purchases p 
    JOIN loyalty_cards lc ON lc.id = p.loyalty_card_id
    WHERE p.id = purchase_items.purchase_id AND lc.user_id = auth.uid()
  ));

CREATE POLICY "Business owners can view their customer purchase items" ON purchase_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM purchases p 
    JOIN businesses b ON b.id = p.business_id
    WHERE p.id = purchase_items.purchase_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners can create purchase items" ON purchase_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM purchases p 
    JOIN businesses b ON b.id = p.business_id
    WHERE p.id = purchase_items.purchase_id AND b.owner_id = auth.uid()
  ));

-- 5.8 POLÍTICAS PARA REWARDS
-- -------------------------------------------
CREATE POLICY "Business owners can manage their rewards" ON rewards
  FOR ALL USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = rewards.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view available rewards" ON rewards
  FOR SELECT USING (is_available = true);

-- 5.9 POLÍTICAS PARA NOTIFICATIONS
-- -------------------------------------------
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Business owners can send notifications to their customers" ON notifications
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = notifications.business_id AND b.owner_id = auth.uid()
  ));

-- ============================================
-- 6. FUNCIONES Y TRIGGERS
-- ============================================

-- 6.1 Trigger para actualizar timestamps automáticamente
-- -------------------------------------------
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

-- 6.2 Trigger para crear perfil automáticamente
-- -------------------------------------------
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6.3 Función para generar número de tarjeta único
-- -------------------------------------------
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FID-' || substr(gen_random_uuid()::text, 1, 12);
END;
$$ LANGUAGE plpgsql;

-- 6.4 Función para verificar upgrade de nivel
-- -------------------------------------------
CREATE OR REPLACE FUNCTION check_level_upgrade(card_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_card RECORD;
  new_level RECORD;
BEGIN
  -- Obtener datos actuales de la tarjeta
  SELECT * INTO current_card FROM loyalty_cards WHERE id = card_uuid;
  
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
    SET current_level_id = new_level.id, updated_at = now()
    WHERE id = card_uuid;
    
    -- Crear notificación de nuevo nivel
    INSERT INTO notifications (user_id, business_id, type, title, message, data)
    VALUES (
      current_card.user_id,
      current_card.business_id,
      'new_level',
      '¡New level achieved!',
      'Congratulations, you reached ' || new_level.name || '!',
      jsonb_build_object('level_name', new_level.name, 'level_color', new_level.color)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FLUJOS DE NEGOCIO (Documentación)
-- ============================================

-- 7.1 FLUJO: Registro de Compra
-- -------------------------------------------
-- 1. Cliente llega al negocio y el dueño busca su tarjeta
-- 2. Dueño hace click en "Register Purchase"
-- 3. Se abre modal con buscador de productos
-- 4. Dueño escribe nombre del producto y lo selecciona
-- 5. Producto se agrega al carrito con cantidad = 1
-- 6. Dueño puede ajustar cantidades (+/-) o eliminar
-- 7. Dueño click en "Complete"
-- 
-- SECUENCIA SQL:
--   INSERT INTO purchases (loyalty_card_id, business_id, total_amount, total_points, created_by)
--   INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, points_per_unit, total_points)
--   INSERT INTO point_transactions (loyalty_card_id, type='earned', points, description, reference_id)
--   UPDATE loyalty_cards SET current_points = current_points + X, total_points_earned = total_points_earned + X
--   PERFORM check_level_upgrade(loyalty_card_id)

-- 7.2 FLUJO: Canje de Recompensa
-- -------------------------------------------
-- 1. Cliente acumula suficientes puntos
-- 2. Cliente selecciona recompensa en la app
-- 3. Se crea redención con código único
-- 4. Puntos se restan de la tarjeta
-- 5. Cliente muestra código al dueño del negocio
-- 6. Dueño escanea/valida código
-- 7. Estado cambia a 'claimed'

-- 7.3 FLUJO: Upgrade de Nivel
-- -------------------------------------------
-- 1. Trigger check_level_upgrade se ejecuta después de cada transacción de puntos
-- 2. Compara puntos actuales contra niveles del negocio
-- 3. Si hay nuevo nivel disponible, actualiza current_level_id
-- 4. Crea notificación al usuario

-- ============================================
-- 8. DATOS DE EJEMPLO (Opcional)
-- ============================================

-- Insertar negocio de ejemplo
-- INSERT INTO businesses (owner_id, name, category, description, address, phone, email)
-- VALUES ('USER_ID', 'Moka Café', 'Coffee Shop', 'Best coffee in town', '123 Main St', '+1234567890', 'info@moka.com');

-- Insertar niveles de ejemplo (después de crear negocio)
-- INSERT INTO loyalty_levels (business_id, name, min_points, color)
-- SELECT id, 'Bronze', 0, '#12173B' FROM businesses WHERE name = 'Moka Café';
-- INSERT INTO loyalty_levels (business_id, name, min_points, color)
-- SELECT id, 'Silver', 500, '#032C7D' FROM businesses WHERE name = 'Moka Café';
-- INSERT INTO loyalty_levels (business_id, name, min_points, color)
-- SELECT id, 'Gold', 1500, '#7546ED' FROM businesses WHERE name = 'Moka Café';

-- Insertar productos de ejemplo
-- INSERT INTO products (business_id, name, description, price, points, category)
-- SELECT id, 'Espresso', 'Classic espresso', 2.50, 2, 'Coffee' FROM businesses WHERE name = 'Moka Café';

-- ============================================
-- 9. CONSULTAS ÚTILES
-- ============================================

-- Verificar tablas creadas
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar políticas RLS
-- SELECT schemaname, tablename, policyname FROM pg_policies ORDER BY tablename;

-- Verificar columnas de una tabla
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loyalty_cards';

-- Verificar triggers
-- SELECT trigger_name, event_object_table FROM information_schema.triggers;

-- ============================================
-- FIN DE LA DOCUMENTACIÓN
-- ============================================
