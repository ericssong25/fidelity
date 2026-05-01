-- ============================================
-- ZUMA - TABLAS DE RECOMPENSAS (REWARDS)
-- ============================================
-- Ejecutar en SQL Editor de Supabase
-- 
-- Este script crea:
-- 1. Tabla rewards - Recompensas canjeables
-- 2. Tabla reward_redemptions - Registro de canjes
-- 3. Índices para optimización
-- 4. Políticas RLS para seguridad
-- 5. Trigger para updated_at
-- ============================================

-- ============================================
-- 1. TABLA DE RECOMPENSAS (REWARDS)
-- ============================================
-- Recompensas que los clientes pueden canjear con sus puntos
-- Soporta: cantidad limitada, disponibilidad por tiempo

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                                      -- Ej: "Café gratis", "Malteada 50% OFF"
  description TEXT,                                        -- Descripción detallada
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),   -- Puntos necesarios para canjear
  image_url TEXT,                                          -- Imagen de la recompensa
  category TEXT,                                           -- Ej: "Drink", "Food", "Discount"
  is_available BOOLEAN DEFAULT true,                       -- Activa/Inactiva manualmente
  is_limited BOOLEAN DEFAULT false,                      -- Tiene cantidad limitada
  quantity_available INTEGER DEFAULT NULL,               -- NULL = ilimitado, número = stock restante
  valid_from TIMESTAMP WITH TIME ZONE,                   -- Cuándo empieza a estar disponible
  valid_until TIMESTAMP WITH TIME ZONE,                  -- Cuándo deja de estar disponible
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comentarios de documentación
COMMENT ON TABLE rewards IS 'Recompensas canjeables por puntos de lealtad';
COMMENT ON COLUMN rewards.is_limited IS 'Si true, la cantidad es limitada';
COMMENT ON COLUMN rewards.quantity_available IS 'Stock restante. NULL = ilimitado';
COMMENT ON COLUMN rewards.valid_from IS 'Fecha/hora de inicio de disponibilidad';
COMMENT ON COLUMN rewards.valid_until IS 'Fecha/hora de fin de disponibilidad. Ej: usar para "Hoy hasta las 5PM"';

-- ============================================
-- 2. TABLA DE CANJES (REWARD_REDEMPTIONS)
-- ============================================
-- Registro de cuando un cliente canjea una recompensa

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  redemption_code TEXT UNIQUE,                             -- Código único para reclamar (ej: A7B2C9)
  claimed_at TIMESTAMP WITH TIME ZONE,                     -- Cuándo el negocio marcó como reclamado
  expires_at TIMESTAMP WITH TIME ZONE,                     -- Cuándo expira el canje (ej: 24h después de creación)
  notes TEXT,                                              -- Notas del negocio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE reward_redemptions IS 'Registro de canjes de recompensas por clientes';
COMMENT ON COLUMN reward_redemptions.redemption_code IS 'Código único de 6 caracteres para validar en el negocio';
COMMENT ON COLUMN reward_redemptions.status IS 'pending = pendiente, claimed = reclamado, expired = expirado/cancelado';

-- ============================================
-- 3. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para rewards
CREATE INDEX IF NOT EXISTS idx_rewards_business_id ON rewards(business_id);
CREATE INDEX IF NOT EXISTS idx_rewards_available ON rewards(is_available);
CREATE INDEX IF NOT EXISTS idx_rewards_valid_until ON rewards(valid_until);
CREATE INDEX IF NOT EXISTS idx_rewards_category ON rewards(category);

-- Índices para reward_redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_card_id ON reward_redemptions(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_code ON reward_redemptions(redemption_code);

-- ============================================
-- 4. SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================

-- Activar RLS en ambas tablas
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Políticas para rewards
-- Dueños de negocio pueden gestionar sus recompensas
CREATE POLICY "Business owners can manage their rewards" ON rewards
  FOR ALL USING (EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = rewards.business_id AND b.owner_id = auth.uid()
  ));

-- Cualquiera puede ver recompensas disponibles (para clientes)
CREATE POLICY "Anyone can view available rewards" ON rewards
  FOR SELECT USING (is_available = true);

-- Políticas para reward_redemptions
-- Clientes pueden ver sus propios canjes
CREATE POLICY "Users can view their own redemptions" ON reward_redemptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    WHERE lc.id = reward_redemptions.loyalty_card_id AND lc.user_id = auth.uid()
  ));

-- Clientes pueden crear canjes (canjear recompensas)
CREATE POLICY "Users can create redemptions" ON reward_redemptions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM loyalty_cards lc 
    WHERE lc.id = reward_redemptions.loyalty_card_id AND lc.user_id = auth.uid()
  ));

-- Dueños de negocio pueden ver canjes de sus recompensas
CREATE POLICY "Business owners can view customer redemptions" ON reward_redemptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM rewards r 
    JOIN businesses b ON b.id = r.business_id
    WHERE r.id = reward_redemptions.reward_id AND b.owner_id = auth.uid()
  ));

-- Dueños de negocio pueden actualizar canjes (marcar como reclamado/expirado)
CREATE POLICY "Business owners can update redemptions" ON reward_redemptions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM rewards r 
    JOIN businesses b ON b.id = r.business_id
    WHERE r.id = reward_redemptions.reward_id AND b.owner_id = auth.uid()
  ));

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en rewards
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rewards_updated_at 
  BEFORE UPDATE ON rewards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. EJEMPLOS DE USO
-- ============================================

-- Ejemplo 1: Crear una recompensa simple (siempre disponible)
-- INSERT INTO rewards (business_id, name, description, points_cost, category)
-- VALUES (
--   'uuid-del-negocio',
--   'Café gratis',
--   'Un café espresso gratis en tu próxima visita',
--   100,
--   'Drink'
-- );

-- Ejemplo 2: Crear recompensa limitada por tiempo (hasta las 5PM hoy)
-- INSERT INTO rewards (business_id, name, description, points_cost, is_limited, quantity_available, valid_until, category)
-- VALUES (
--   'uuid-del-negocio',
--   'Malteada especial',
--   'Canjea hoy hasta las 5PM una malteada con tus puntos',
--   150,
--   true,
--   20,  -- Solo 20 disponibles
--   '2026-05-01 17:00:00+00',  -- Hoy a las 5PM UTC
--   'Drink'
-- );

-- Ejemplo 3: Crear recompensa disponible solo mañana
-- INSERT INTO rewards (business_id, name, description, points_cost, valid_from, valid_until, category)
-- VALUES (
--   'uuid-del-negocio',
--   'Descuento 20% mañana',
--   'Válido solo el día siguiente a la creación',
--   50,
--   '2026-05-02 00:00:00+00',  -- Desde mañana
--   '2026-05-02 23:59:59+00',  -- Hasta mañana
--   'Discount'
-- );

-- Ejemplo 4: Registrar un canje (hecho automáticamente por la app)
-- INSERT INTO reward_redemptions (loyalty_card_id, reward_id, points_used, status, redemption_code, expires_at)
-- VALUES (
--   'uuid-de-la-tarjeta',
--   'uuid-de-la-recompensa',
--   100,
--   'pending',
--   'A7B2C9',
--   timezone('utc'::text, now() + interval '24 hours')  -- Expira en 24h
-- );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rewards', 'reward_redemptions');

-- Verificar índices
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('rewards', 'reward_redemptions');

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('rewards', 'reward_redemptions')
ORDER BY tablename, policyname;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
