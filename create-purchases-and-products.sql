-- ============================================
-- CREAR TABLAS DE PRODUCTOS Y COMPRAS
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. TABLA DE PRODUCTOS
-- ============================================
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

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their products" ON products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = products.business_id AND b.owner_id = auth.uid()
  ));

-- 2. TABLA DE TRANSACCIONES DE PUNTOS
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_card_id ON point_transactions(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);

-- Políticas RLS para point_transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

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

-- 3. TABLA DE COMPRAS (PURCHASES)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_purchases_card_id ON purchases(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- Políticas RLS para purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

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

-- 4. TABLA DE ITEMS DE COMPRA (PURCHASE_ITEMS)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);

-- Políticas RLS para purchase_items
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('products', 'point_transactions', 'purchases', 'purchase_items');

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename IN ('products', 'point_transactions', 'purchases', 'purchase_items');

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('products', 'point_transactions', 'purchases', 'purchase_items');
