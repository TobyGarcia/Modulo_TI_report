-- Script de inicialización de la base de datos para la gestión de equipos e inventario QR

-- Tabla de Empleados
CREATE TABLE IF NOT EXISTS empleados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    no_empleado VARCHAR(50),
    empresa VARCHAR(100),
    area VARCHAR(100),
    puesto VARCHAR(100),
    email VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Estados de Equipo
CREATE TABLE IF NOT EXISTS estados_equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Inserción de estados predeterminados
INSERT INTO estados_equipo (id, nombre, descripcion) VALUES
(1, 'Resguardo', 'Equipo en resguardo sin personal asignado'),
(2, 'Asignado', 'Equipo actualmente asignado a un empleado'),
(3, 'Mantenimiento', 'Equipo en proceso de mantenimiento o reparación'),
(4, 'Baja', 'Equipo dado de baja')
ON CONFLICT (id) DO NOTHING;

-- Tabla principal de equipos
CREATE TABLE IF NOT EXISTS equipos (
    id SERIAL PRIMARY KEY,
    item INT,
    personal_asignado VARCHAR(150),
    empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
    estado_id INT REFERENCES estados_equipo(id) DEFAULT 1,
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
INSERT INTO usuarios (nombre, username, password_hash, role)
VALUES ('Administrador', 'admin', '$2a$10$eE6sO7oN8g1cRzE/v10f..wKxGvRj1J9dF9iK5L7M3N1O5P9Q2R4u', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Tabla de mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    tipo_mantenimiento VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'programado',
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

-- Tabla de Asignaciones (Histórico de Movimientos de Asignación, Desasignación y Reasignación)
CREATE TABLE IF NOT EXISTS asignaciones (
    id SERIAL PRIMARY KEY,
    equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
    tipo_movimiento VARCHAR(30) NOT NULL, -- 'asignacion', 'desasignacion', 'reasignacion'
    motivo TEXT, -- 'Cambio de equipo', 'Baja de empleado', 'Nuevo ingreso', etc.
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    firma_empleado TEXT,
    firma_ti TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla / Alias Historial de Asignaciones para compatibilidad
CREATE TABLE IF NOT EXISTS historial_asignaciones (
    id SERIAL PRIMARY KEY,
    equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
    empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
    tipo_movimiento VARCHAR(30) NOT NULL,
    motivo TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    firma_empleado TEXT,
    firma_ti TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios explicativos
COMMENT ON TABLE empleados IS 'Tabla de empleados / personal para asignación de equipos';
COMMENT ON TABLE estados_equipo IS 'Catálogo de estados de asignación de equipos';
COMMENT ON TABLE equipos IS 'Tabla principal de inventario de equipos de cómputo y etiquetas QR';
COMMENT ON TABLE usuarios IS 'Tabla de usuarios autenticados del sistema';
COMMENT ON TABLE mantenimientos IS 'Tabla de programación, reportes individuales y bitácora de mantenimiento SGI';
COMMENT ON TABLE asignaciones IS 'Tabla principal de asignaciones, desasignaciones y reasignaciones de equipos';
