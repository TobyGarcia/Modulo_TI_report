-- Inventario por centro de stock. El catálogo de insumos sigue siendo único.
CREATE TABLE IF NOT EXISTS centros_stock (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO centros_stock (id, nombre) VALUES
  ('PERU', 'Base Perú'),
  ('YL', 'Base YL')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

CREATE TABLE IF NOT EXISTS stock_insumos_centros (
  insumo_id INT NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  centro_stock_id VARCHAR(10) NOT NULL REFERENCES centros_stock(id),
  stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (insumo_id, centro_stock_id),
  CHECK (stock_actual >= 0),
  CHECK (stock_minimo >= 0)
);

ALTER TABLE movimientos_insumos
  ADD COLUMN IF NOT EXISTS centro_stock_id VARCHAR(10) REFERENCES centros_stock(id);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumos_centro ON movimientos_insumos (centro_stock_id, created_at DESC);

-- Se conserva el stock legado y se asigna una sola vez a Perú para no duplicar
-- existencias. Usa transferencias posteriores para repartirlo a Base YL.
INSERT INTO stock_insumos_centros (insumo_id, centro_stock_id, stock_actual, stock_minimo)
SELECT id, 'PERU', COALESCE(stock_actual, 0), COALESCE(stock_minimo, 1)
FROM insumos
ON CONFLICT (insumo_id, centro_stock_id) DO NOTHING;

INSERT INTO stock_insumos_centros (insumo_id, centro_stock_id, stock_actual, stock_minimo)
SELECT id, 'YL', 0, COALESCE(stock_minimo, 1)
FROM insumos
ON CONFLICT (insumo_id, centro_stock_id) DO NOTHING;

-- Los movimientos históricos no tenían base: se marcan Perú únicamente como
-- origen de migración para mantener la bitácora consultable.
UPDATE movimientos_insumos SET centro_stock_id = 'PERU' WHERE centro_stock_id IS NULL;
