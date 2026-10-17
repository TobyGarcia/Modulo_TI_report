-- Categorías con tablas de detalle independientes y atributos configurables.
CREATE TABLE IF NOT EXISTS atributos_tipo_equipo (
    id SERIAL PRIMARY KEY,
    tipo_equipo_id INT NOT NULL REFERENCES tipos_equipo(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'texto',
    requerido BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE (tipo_equipo_id, clave)
);

INSERT INTO atributos_tipo_equipo (tipo_equipo_id, nombre, clave, tipo, requerido, orden) VALUES
(2, 'Tipo de impresora', 'tipo_impresora', 'texto', FALSE, 0), (2, 'Conectividad', 'conectividad', 'texto', FALSE, 1), (2, 'Impresión dúplex', 'duplex', 'si_no', FALSE, 2),
(3, 'Tamaño de pantalla', 'tamano_pantalla', 'texto', FALSE, 0), (3, 'Resolución', 'resolucion', 'texto', FALSE, 1), (3, 'Anclaje / soporte', 'anclaje', 'texto', FALSE, 2),
(4, 'Tipo de dispositivo', 'tipo_redes', 'texto', FALSE, 0), (4, 'Cantidad de puertos', 'puertos', 'numero', FALSE, 1), (4, 'Velocidad de red', 'velocidad_red', 'texto', FALSE, 2),
(5, 'Tipo de accesorio', 'tipo_periferico', 'texto', FALSE, 0), (5, 'Conectividad', 'conectividad', 'texto', FALSE, 1),
(6, 'Tipo de servidor / almacenamiento', 'tipo_servidor', 'texto', FALSE, 0), (6, 'Cantidad de bahías', 'bahias', 'numero', FALSE, 1),
(7, 'Número telefónico', 'numero_telefono', 'texto', FALSE, 0), (7, 'IMEI 1', 'imei1', 'texto', FALSE, 1), (7, 'IMEI 2', 'imei2', 'texto', FALSE, 2),
(8, 'Capacidad (Watts / VA)', 'capacidad_watts', 'texto', FALSE, 0), (8, 'Tipo de UPS', 'tipo_ups', 'texto', FALSE, 1)
ON CONFLICT (tipo_equipo_id, clave) DO NOTHING;

-- Datos comunes que también se guardan dentro de cada ficha técnica.
INSERT INTO atributos_tipo_equipo (tipo_equipo_id, nombre, clave, tipo, requerido, orden)
SELECT categoria.id, campo.nombre, campo.clave, campo.tipo, FALSE, campo.orden
FROM (VALUES (1), (2), (3), (4), (5), (6), (7), (8)) AS categoria(id)
CROSS JOIN (VALUES
  ('Marca', 'marca', 'texto', 0), ('Modelo', 'modelo', 'texto', 1),
  ('Serial (número de serie)', 'serial', 'texto', 2), ('Estado físico', 'estado_fisico', 'texto', 3),
  ('Uso recomendado', 'uso_recomendado', 'texto', 4), ('Observaciones', 'observaciones', 'texto', 5)
) AS campo(nombre, clave, tipo, orden)
ON CONFLICT (tipo_equipo_id, clave) DO NOTHING;

INSERT INTO atributos_tipo_equipo (tipo_equipo_id, nombre, clave, tipo, requerido, orden) VALUES
(1, 'Hostname', 'hostname', 'texto', FALSE, 6), (1, 'Sistema operativo', 'so', 'texto', FALSE, 7), (1, 'Procesador', 'cpu', 'texto', FALSE, 8), (1, 'RAM', 'ram_capacidad', 'texto', FALSE, 9), (1, 'Almacenamiento', 'disco_capacidad', 'texto', FALSE, 10), (1, 'Tipo de GPU', 'gpu_tipo', 'texto', FALSE, 11), (1, 'Modelo de GPU', 'gpu_modelo', 'texto', FALSE, 12), (1, 'MAC Wi-Fi / red', 'mac_wifi', 'texto', FALSE, 13),
(6, 'Hostname', 'hostname', 'texto', FALSE, 6), (6, 'Sistema operativo', 'so', 'texto', FALSE, 7), (6, 'Procesador', 'cpu', 'texto', FALSE, 8), (6, 'RAM', 'ram_capacidad', 'texto', FALSE, 9), (6, 'Almacenamiento', 'disco_capacidad', 'texto', FALSE, 10),
(7, 'Sistema operativo', 'so', 'texto', FALSE, 6), (7, 'RAM', 'ram_capacidad', 'texto', FALSE, 7), (7, 'Almacenamiento', 'disco_capacidad', 'texto', FALSE, 8),
(5, 'Capacidad de disco', 'disco_capacidad', 'texto', FALSE, 6),
(4, 'MAC Wi-Fi / red', 'mac_wifi', 'texto', FALSE, 6), (8, 'MAC Wi-Fi / red', 'mac_wifi', 'texto', FALSE, 6)
ON CONFLICT (tipo_equipo_id, clave) DO NOTHING;

-- Tablas físicas para las categorías originales. Cada una conserva únicamente
-- sus atributos propios; los datos comunes están en equipos.
CREATE TABLE IF NOT EXISTS equipos_categoria_1 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_2 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  tipo_impresora TEXT, conectividad TEXT, duplex BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_3 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  tamano_pantalla TEXT, resolucion TEXT, anclaje TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_4 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  tipo_redes TEXT, puertos NUMERIC, velocidad_red TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_5 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  tipo_periferico TEXT, conectividad TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_6 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  tipo_servidor TEXT, bahias NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_7 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  numero_telefono TEXT, imei1 TEXT, imei2 TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos_categoria_8 (
  equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE,
  capacidad_watts TEXT, tipo_ups TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Completa las tablas si alguna fue creada por una versión anterior.
ALTER TABLE equipos_categoria_1 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS hostname TEXT, ADD COLUMN IF NOT EXISTS so TEXT, ADD COLUMN IF NOT EXISTS cpu TEXT, ADD COLUMN IF NOT EXISTS ram_capacidad TEXT, ADD COLUMN IF NOT EXISTS disco_capacidad TEXT, ADD COLUMN IF NOT EXISTS gpu_tipo TEXT, ADD COLUMN IF NOT EXISTS gpu_modelo TEXT, ADD COLUMN IF NOT EXISTS mac_wifi TEXT;
ALTER TABLE equipos_categoria_2 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE equipos_categoria_3 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE equipos_categoria_4 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS mac_wifi TEXT;
ALTER TABLE equipos_categoria_5 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS disco_capacidad TEXT;
ALTER TABLE equipos_categoria_6 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS hostname TEXT, ADD COLUMN IF NOT EXISTS so TEXT, ADD COLUMN IF NOT EXISTS cpu TEXT, ADD COLUMN IF NOT EXISTS ram_capacidad TEXT, ADD COLUMN IF NOT EXISTS disco_capacidad TEXT;
ALTER TABLE equipos_categoria_7 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS so TEXT, ADD COLUMN IF NOT EXISTS ram_capacidad TEXT, ADD COLUMN IF NOT EXISTS disco_capacidad TEXT;
ALTER TABLE equipos_categoria_8 ADD COLUMN IF NOT EXISTS marca TEXT, ADD COLUMN IF NOT EXISTS modelo TEXT, ADD COLUMN IF NOT EXISTS serial TEXT, ADD COLUMN IF NOT EXISTS estado_fisico TEXT, ADD COLUMN IF NOT EXISTS uso_recomendado TEXT, ADD COLUMN IF NOT EXISTS observaciones TEXT, ADD COLUMN IF NOT EXISTS mac_wifi TEXT;

-- Copia la información existente a la ficha técnica de su categoría. Es
-- idempotente: puede ejecutarse nuevamente sin duplicar equipos.
INSERT INTO equipos_categoria_1 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, hostname, so, cpu, ram_capacidad, disco_capacidad, gpu_tipo, gpu_modelo, mac_wifi)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, hostname, so, cpu, ram_capacidad, disco_capacidad, gpu_tipo, gpu_modelo, mac_wifi FROM equipos WHERE tipo_equipo_id = 1
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_2 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, tipo_impresora)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, especificaciones_extra->>'tipo_impresora' FROM equipos WHERE tipo_equipo_id = 2
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_3 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, tamano_pantalla, anclaje)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, especificaciones_extra->>'tamano_pantalla', especificaciones_extra->>'anclaje' FROM equipos WHERE tipo_equipo_id = 3
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_4 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, tipo_redes, mac_wifi)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, especificaciones_extra->>'tipo_redes', mac_wifi FROM equipos WHERE tipo_equipo_id = 4
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_5 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, tipo_periferico, disco_capacidad)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, especificaciones_extra->>'tipo_periferico', disco_capacidad FROM equipos WHERE tipo_equipo_id = 5
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_6 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, hostname, so, cpu, ram_capacidad, disco_capacidad)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, hostname, so, cpu, ram_capacidad, disco_capacidad FROM equipos WHERE tipo_equipo_id = 6
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_7 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, so, ram_capacidad, disco_capacidad, numero_telefono, imei1, imei2)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, so, ram_capacidad, disco_capacidad, especificaciones_extra->>'numero_telefono', especificaciones_extra->>'imei1', especificaciones_extra->>'imei2' FROM equipos WHERE tipo_equipo_id = 7
ON CONFLICT (equipo_id) DO NOTHING;
INSERT INTO equipos_categoria_8 (equipo_id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, mac_wifi, capacidad_watts, tipo_ups)
SELECT id, marca, modelo, serial, estado_fisico, uso_recomendado, observaciones, mac_wifi, especificaciones_extra->>'capacidad_watts', especificaciones_extra->>'tipo_ups' FROM equipos WHERE tipo_equipo_id = 8
ON CONFLICT (equipo_id) DO NOTHING;
