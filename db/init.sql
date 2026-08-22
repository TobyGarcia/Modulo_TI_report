-- Script de inicialización de la base de datos para la gestión de equipos e inventario QR

-- Tabla principal de equipos
CREATE TABLE IF NOT EXISTS equipos (
    id SERIAL PRIMARY KEY,
    item INT,
    personal_asignado VARCHAR(150),
    empresa VARCHAR(100),
    ciudad VARCHAR(100),
    area VARCHAR(100),
    hostname VARCHAR(100),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    serial VARCHAR(100) UNIQUE,
    so VARCHAR(100),
    cpu VARCHAR(150),
    ram_capacidad VARCHAR(50),
    disco_capacidad VARCHAR(50),
    gpu_tipo VARCHAR(50),
    gpu_modelo VARCHAR(100),
    estado_fisico VARCHAR(100),
    mac_wifi VARCHAR(50),
    uso_recomendado TEXT,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuario Administrador por defecto: (admin / admin123)
-- El hash bcrypt corresponde a la contraseña 'admin123'
INSERT INTO usuarios (nombre, username, password_hash, role)
VALUES ('Administrador', 'admin', '$2a$10$eE6sO7oN8g1cRzE/v10f..wKxGvRj1J9dF9iK5L7M3N1O5P9Q2R4u', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Comentarios explicativos
COMMENT ON TABLE equipos IS 'Tabla principal de inventario de equipos de cómputo y etiquetas QR';
COMMENT ON TABLE usuarios IS 'Tabla de usuarios autenticados del sistema';

-- Tabla de mantenimientos (programación, levantamiento de reporte y bitácora)
CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    tipo_mantenimiento VARCHAR(20) NOT NULL, -- 'preventivo' o 'correctivo'
    estado VARCHAR(20) NOT NULL DEFAULT 'programado', -- 'programado', 'completado', 'cancelado'
    fecha_programada DATE,
    fecha_realizado TIMESTAMP,
    turno VARCHAR(50),
    empleado_responsable VARCHAR(150),
    area_responsable VARCHAR(100),
    tecnico_nombre VARCHAR(100),
    tecnico_no_empleado VARCHAR(50),
    obs_procesador TEXT,
    obs_ram TEXT,
    obs_storage TEXT,
    obs_cargador TEXT,
    observaciones_equipo TEXT,
    trabajo_realizado TEXT,
    material_utilizado TEXT,
    imagenes_evidencia JSONB DEFAULT '[]',
    firma_responsable TEXT,
    firma_tecnico TEXT,
    hora_programada VARCHAR(20) DEFAULT 'Pendiente',
    codigo_formato VARCHAR(50) DEFAULT 'R2PTI1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE mantenimientos IS 'Tabla de programación, reportes individuales y bitácora de mantenimiento SGI';

