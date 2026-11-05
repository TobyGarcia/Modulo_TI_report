-- Flujo de mesa de ayuda: solicitudes sin equipo personal, pool técnico y trazabilidad.
ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS solicitante_puesto VARCHAR(100);
ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS proyecto_nombre VARCHAR(150);
ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS numero_orden VARCHAR(30);
ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS fecha_abierto TIMESTAMP;
ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS solucion_tecnico TEXT;
ALTER TABLE tickets_mantenimiento ALTER COLUMN estado SET DEFAULT 'nuevo';
CREATE INDEX IF NOT EXISTS idx_tickets_pool ON tickets_mantenimiento (estado, created_at);
