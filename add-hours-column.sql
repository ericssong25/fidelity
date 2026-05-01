-- ============================================
-- AGREGAR COLUMNA HOURS A TABLA BUSINESSES
-- ============================================
-- Ejecutar en SQL Editor de Supabase

-- Agregar columna hours como JSONB para almacenar horarios de atención
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS hours JSONB DEFAULT '[
  {"day": "Lunes", "hours": "Cerrado"},
  {"day": "Martes", "hours": "9:00 AM - 6:00 PM"},
  {"day": "Miércoles", "hours": "9:00 AM - 6:00 PM"},
  {"day": "Jueves", "hours": "9:00 AM - 6:00 PM"},
  {"day": "Viernes", "hours": "9:00 AM - 6:00 PM"},
  {"day": "Sábado", "hours": "9:00 AM - 6:00 PM"},
  {"day": "Domingo", "hours": "Cerrado"}
]'::jsonb;

-- Verificar que la columna fue creada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND column_name = 'hours';
