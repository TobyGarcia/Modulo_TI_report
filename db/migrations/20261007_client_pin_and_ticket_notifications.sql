-- Acceso de clientes mediante PIN y notificaciones internas para Mesa de Ayuda.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_cliente_empleado_unique
  ON usuarios (empleado_id) WHERE role = 'cliente' AND empleado_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notificaciones_tickets (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ticket_id INT NOT NULL REFERENCES tickets_mantenimiento(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'nuevo_ticket',
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_tickets_usuario
  ON notificaciones_tickets (usuario_id, leida, created_at DESC);
