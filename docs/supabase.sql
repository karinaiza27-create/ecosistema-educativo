-- docs/supabase.sql · Estructura de base de datos para persistencia permanente en Supabase
--
-- Instrucciones:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo
-- 3. Haz clic en "New query", pega este contenido y pulsa "Run"

CREATE TABLE IF NOT EXISTS ecosistema_colecciones (
  coleccion TEXT PRIMARY KEY,
  datos JSONB NOT NULL DEFAULT '[]'::jsonb,
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE ecosistema_colecciones ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura total
DROP POLICY IF EXISTS "Permitir acceso ecosistema" ON ecosistema_colecciones;
CREATE POLICY "Permitir acceso ecosistema" ON ecosistema_colecciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

