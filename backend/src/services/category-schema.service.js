const SAFE_TYPES = {
  texto: 'TEXT',
  numero: 'NUMERIC',
  fecha: 'DATE',
  si_no: 'BOOLEAN'
};

// Atributos iniciales para las categorías que ya existen en el inventario.
// Los campos comunes (marca, modelo, serial, ubicación, responsable) siguen
// en `equipos`; éstos son exclusivamente los datos técnicos de cada tipo.
const COMMON_ASSET_ATTRIBUTES = [
  { nombre: 'Marca', clave: 'marca', tipo: 'texto' },
  { nombre: 'Modelo', clave: 'modelo', tipo: 'texto' },
  { nombre: 'Serial (número de serie)', clave: 'serial', tipo: 'texto' },
  { nombre: 'Estado físico', clave: 'estado_fisico', tipo: 'texto' },
  { nombre: 'Uso recomendado', clave: 'uso_recomendado', tipo: 'texto' },
  { nombre: 'Observaciones', clave: 'observaciones', tipo: 'texto' }
];
const withCommon = (attributes) => [...COMMON_ASSET_ATTRIBUTES, ...attributes];
const DEFAULT_CATEGORY_ATTRIBUTES = {
  1: withCommon([
    { nombre: 'Hostname', clave: 'hostname', tipo: 'texto' }, { nombre: 'Sistema operativo', clave: 'so', tipo: 'texto' },
    { nombre: 'Procesador', clave: 'cpu', tipo: 'texto' }, { nombre: 'RAM', clave: 'ram_capacidad', tipo: 'texto' },
    { nombre: 'Almacenamiento', clave: 'disco_capacidad', tipo: 'texto' }, { nombre: 'Tipo de GPU', clave: 'gpu_tipo', tipo: 'texto' },
    { nombre: 'Modelo de GPU', clave: 'gpu_modelo', tipo: 'texto' }, { nombre: 'MAC Wi-Fi / red', clave: 'mac_wifi', tipo: 'texto' }
  ]),
  2: withCommon([{ nombre: 'Tipo de impresora', clave: 'tipo_impresora', tipo: 'texto' }, { nombre: 'Conectividad', clave: 'conectividad', tipo: 'texto' }, { nombre: 'Impresión dúplex', clave: 'duplex', tipo: 'si_no' }]),
  3: withCommon([{ nombre: 'Tamaño de pantalla', clave: 'tamano_pantalla', tipo: 'texto' }, { nombre: 'Resolución', clave: 'resolucion', tipo: 'texto' }, { nombre: 'Anclaje / soporte', clave: 'anclaje', tipo: 'texto' }]),
  4: withCommon([{ nombre: 'Tipo de dispositivo', clave: 'tipo_redes', tipo: 'texto' }, { nombre: 'Cantidad de puertos', clave: 'puertos', tipo: 'numero' }, { nombre: 'Velocidad de red', clave: 'velocidad_red', tipo: 'texto' }, { nombre: 'MAC Wi-Fi / red', clave: 'mac_wifi', tipo: 'texto' }]),
  5: withCommon([{ nombre: 'Tipo de accesorio', clave: 'tipo_periferico', tipo: 'texto' }, { nombre: 'Conectividad', clave: 'conectividad', tipo: 'texto' }, { nombre: 'Capacidad de disco', clave: 'disco_capacidad', tipo: 'texto' }]),
  6: withCommon([{ nombre: 'Hostname', clave: 'hostname', tipo: 'texto' }, { nombre: 'Sistema operativo', clave: 'so', tipo: 'texto' }, { nombre: 'Procesador', clave: 'cpu', tipo: 'texto' }, { nombre: 'RAM', clave: 'ram_capacidad', tipo: 'texto' }, { nombre: 'Almacenamiento', clave: 'disco_capacidad', tipo: 'texto' }, { nombre: 'Tipo de servidor / almacenamiento', clave: 'tipo_servidor', tipo: 'texto' }, { nombre: 'Cantidad de bahías', clave: 'bahias', tipo: 'numero' }]),
  7: withCommon([{ nombre: 'Sistema operativo', clave: 'so', tipo: 'texto' }, { nombre: 'RAM', clave: 'ram_capacidad', tipo: 'texto' }, { nombre: 'Almacenamiento', clave: 'disco_capacidad', tipo: 'texto' }, { nombre: 'Número telefónico', clave: 'numero_telefono', tipo: 'texto' }, { nombre: 'IMEI 1', clave: 'imei1', tipo: 'texto' }, { nombre: 'IMEI 2', clave: 'imei2', tipo: 'texto' }]),
  8: withCommon([{ nombre: 'Capacidad (Watts / VA)', clave: 'capacidad_watts', tipo: 'texto' }, { nombre: 'Tipo de UPS', clave: 'tipo_ups', tipo: 'texto' }, { nombre: 'MAC Wi-Fi / red', clave: 'mac_wifi', tipo: 'texto' }])
};

function tableName(tipoId) {
  return `equipos_categoria_${Number(tipoId)}`;
}

function quoteIdentifier(identifier) {
  // Las claves vienen validadas por validateAttributes; aun así se entrecomillan.
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function validateAttributes(attributes) {
  if (!Array.isArray(attributes) || attributes.length > 30) throw new Error('Indica entre 0 y 30 atributos');
  const keys = new Set();
  return attributes.map((attribute, index) => {
    const nombre = String(attribute.nombre || '').trim();
    const clave = normalizeKey(attribute.clave || nombre);
    const tipo = attribute.tipo || 'texto';
    if (!nombre || !/^[a-z][a-z0-9_]{0,48}$/.test(clave) || !SAFE_TYPES[tipo]) {
      throw new Error(`El atributo ${index + 1} no es válido`);
    }
    if (keys.has(clave) || ['equipo_id', 'created_at', 'updated_at'].includes(clave)) {
      throw new Error(`La clave "${clave}" está repetida o reservada`);
    }
    keys.add(clave);
    return { nombre, clave, tipo, requerido: Boolean(attribute.requerido) };
  });
}

async function createDetailTable(client, tipoId, attributes) {
  const columns = attributes.map(({ clave, tipo, requerido }) =>
    `${quoteIdentifier(clave)} ${SAFE_TYPES[tipo]}${requerido ? ' NOT NULL' : ''}`).join(',\n');
  const extraColumns = columns ? `,\n        ${columns}` : '';
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName(tipoId))} (
      equipo_id INT PRIMARY KEY REFERENCES equipos(id) ON DELETE CASCADE${extraColumns},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // También aplica atributos añadidos por una actualización o por la semilla
  // inicial a tablas que ya habían sido creadas.
  for (const { clave, tipo } of attributes) {
    await client.query(`ALTER TABLE ${quoteIdentifier(tableName(tipoId))}
      ADD COLUMN IF NOT EXISTS ${quoteIdentifier(clave)} ${SAFE_TYPES[tipo]}`);
  }
}

async function saveDetail(client, tipoId, equipmentId, attributes, values = {}) {
  if (!attributes.length) return;
  const columns = attributes.map(a => quoteIdentifier(a.clave));
  const params = [equipmentId, ...attributes.map(a => {
    const value = values[a.clave];
    return value === undefined || value === '' ? null : value;
  })];
  const placeholders = params.map((_, index) => `$${index + 1}`);
  const updates = columns.map((column, index) => `${column} = EXCLUDED.${column}`).join(', ');
  await client.query(`
    INSERT INTO ${quoteIdentifier(tableName(tipoId))} (equipo_id, ${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (equipo_id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP
  `, params);
}

module.exports = { tableName, quoteIdentifier, normalizeKey, validateAttributes, createDetailTable, saveDetail, DEFAULT_CATEGORY_ATTRIBUTES };
