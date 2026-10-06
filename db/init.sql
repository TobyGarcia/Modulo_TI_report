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

-- Tabla de Tipos/Categorías de Equipo
CREATE TABLE IF NOT EXISTS tipos_equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserción de tipos predeterminados
INSERT INTO tipos_equipo (id, nombre, descripcion) VALUES
(1, 'Equipo de Cómputo', 'Computadoras de escritorio, laptops y All-in-One'),
(2, 'Impresora / Multifuncional', 'Impresoras térmicas, inyección, láser y multifuncionales'),
(3, 'Monitor / Pantalla', 'Monitores y pantallas de visualización'),
(4, 'Redes y Comunicaciones', 'Routers, switches, access points y modems'),
(5, 'Periféricos y Accesorios', 'Teclados, mouse, dockstations, cámaras'),
(6, 'Servidor / Almacenamiento', 'Servidores físicos, NAS y almacenamiento'),
(7, 'Movilidad / Smartphone / Tablet', 'Celulares corporativos y tablets'),
(8, 'No Break / UPS', 'Sistemas de energía ininterrumpida')
ON CONFLICT (id) DO NOTHING;

-- Tablas de Catálogos Dinámicos
CREATE TABLE IF NOT EXISTS catalogos_empresas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    acronimo VARCHAR(3) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalogos_bases (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalogos_areas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal de equipos
CREATE TABLE IF NOT EXISTS equipos (
    id SERIAL PRIMARY KEY,
    item INT,
    personal_asignado VARCHAR(150),
    empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
    estado_id INT REFERENCES estados_equipo(id) DEFAULT 1,
    tipo_equipo_id INT REFERENCES tipos_equipo(id) DEFAULT 1,
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
    email VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- La cuenta inicial se crea de forma explícita desde las variables
-- BOOTSTRAP_ADMIN_USERNAME y BOOTSTRAP_ADMIN_PASSWORD en el backend.

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

-- Tabla de Salidas de Equipos (Formato SGI R1PTI3)
CREATE TABLE IF NOT EXISTS salidas_equipos (
    id SERIAL PRIMARY KEY,
    codigo_formato VARCHAR(50) DEFAULT 'R1PTI3',
    requisicion VARCHAR(100),
    lugar_emision VARCHAR(150) DEFAULT 'san Francisco de Campeche, Campeche',
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    tipo_solicitud VARCHAR(20) DEFAULT 'temporal', -- 'temporal' o 'permanente'
    solicitante_nombre VARCHAR(150),
    solicitante_email VARCHAR(150),
    solicitante_puesto VARCHAR(100),
    departamento VARCHAR(100),
    jefe_inmediato VARCHAR(150),
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_termino DATE,
    direccion_resguardo TEXT,
    observaciones TEXT,
    equipos_json JSONB DEFAULT '[]',
    equipo_id INT REFERENCES equipos(id) ON DELETE SET NULL,
    empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
    firma_empleado TEXT,
    firma_jefe TEXT,
    firma_ti TEXT,
    estado VARCHAR(20) DEFAULT 'activo', -- 'activo', 'vencido', 'finalizado'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Insumos y Materiales
CREATE TABLE IF NOT EXISTS insumos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'General',
    unidad_medida VARCHAR(50) DEFAULT 'Pza',
    presentacion NUMERIC(10,2) DEFAULT 1.00,
    stock_actual NUMERIC(10,2) DEFAULT 0.00,
    stock_minimo NUMERIC(10,2) DEFAULT 1.00,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Recetas por Tipo de Mantenimiento (BOM)
CREATE TABLE IF NOT EXISTS recetas_mantenimiento (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo_mantenimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación de Insumos por Receta
CREATE TABLE IF NOT EXISTS receta_insumos (
    id SERIAL PRIMARY KEY,
    receta_id INT REFERENCES recetas_mantenimiento(id) ON DELETE CASCADE,
    insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1.00
);

-- Relación de Insumos Utilizados en Mantenimiento
CREATE TABLE IF NOT EXISTS mantenimiento_insumos (
    id SERIAL PRIMARY KEY,
    mantenimiento_id INT REFERENCES mantenimientos(id) ON DELETE CASCADE,
    insumo_id INT REFERENCES insumos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bitácora de Movimientos de Insumos (Entradas, Salidas por Mantenimiento y Ajustes)
CREATE TABLE IF NOT EXISTS movimientos_insumos (
    id SERIAL PRIMARY KEY,
    insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(30) NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    mantenimiento_id INT REFERENCES mantenimientos(id) ON DELETE SET NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios explicativos
COMMENT ON TABLE empleados IS 'Tabla de empleados / personal para asignación de equipos';
COMMENT ON TABLE estados_equipo IS 'Catálogo de estados de asignación de equipos';
COMMENT ON TABLE equipos IS 'Tabla principal de inventario de equipos de cómputo y etiquetas QR';
COMMENT ON TABLE usuarios IS 'Tabla de usuarios autenticados del sistema';
COMMENT ON TABLE mantenimientos IS 'Tabla de programación, reportes individuales y bitácora de mantenimiento SGI';
COMMENT ON TABLE asignaciones IS 'Tabla principal de asignaciones, desasignaciones y reasignaciones de equipos';
COMMENT ON TABLE salidas_equipos IS 'Tabla de solicitudes y pases de salida de equipo informático (Formato SGI R1PTI3)';
COMMENT ON TABLE insumos IS 'Catálogo de materiales e insumos de mantenimiento con unidad de medida y presentación';
COMMENT ON TABLE recetas_mantenimiento IS 'Plantillas/Recetas de materiales requeridos según el tipo de mantenimiento';
COMMENT ON TABLE mantenimiento_insumos IS 'Detalle de consumo de insumos por mantenimiento realizado';
COMMENT ON TABLE movimientos_insumos IS 'Historial de entradas (reabastecimiento) y salidas de stock';


