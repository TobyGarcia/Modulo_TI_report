const xlsx = require('xlsx');

function excelValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return value;
}

function safeSheetName(name, usedNames) {
  const base = String(name || 'Sin categoría').replace(/[\\\\/:?*\[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin categoría';
  let candidate = base.slice(0, 31);
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const postfix = ` (${suffix++})`;
    candidate = `${base.slice(0, 31 - postfix.length)}${postfix}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function buildWorksheet(headers, rows) {
  const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!autofilter'] = { ref: `A1:${xlsx.utils.encode_col(Math.max(headers.length - 1, 0))}${Math.max(rows.length + 1, 1)}` };
  worksheet['!cols'] = headers.map((header, index) => ({
    wch: Math.min(42, Math.max(12, String(header).length + 2, ...rows.slice(0, 100).map(row => String(row[index] ?? '').length + 2)))
  }));
  return worksheet;
}

const GENERAL_EXPORT_COLUMNS = [
  { nombre: 'ID', clave: 'id' },
  { nombre: 'Personal asignado', clave: 'responsable' },
  { nombre: 'Empresa', clave: 'empresa' },
  { nombre: 'Base / Ciudad', clave: 'ciudad' },
  { nombre: 'Hostname', clave: 'hostname' },
  { nombre: 'Marca', clave: 'marca' },
  { nombre: 'Modelo', clave: 'modelo' },
  { nombre: 'Número de serie', clave: 'serial' }
];

const FINAL_EXPORT_COLUMNS = [
  { nombre: 'Estado físico', clave: 'estado_fisico' },
  { nombre: 'Uso recomendado', clave: 'uso_recomendado' },
  { nombre: 'Observaciones', clave: 'observaciones' }
];

const GENERAL_KEYS = new Set(GENERAL_EXPORT_COLUMNS.map(column => column.clave));
const FINAL_KEYS = new Set(FINAL_EXPORT_COLUMNS.map(column => column.clave));

function exportValue(row, key) {
  // Los atributos de categoría son la fuente más específica; los campos de la
  // tabla principal conservan compatibilidad con inventarios anteriores.
  const detailValue = row[`detail__${key}`];
  return excelValue(detailValue ?? row[key]);
}

/**
 * Crea un libro de inventario con una hoja por categoría. Recibe los datos ya
 * consultados para mantener este módulo independiente de PostgreSQL.
 */
function buildInventoryWorkbook(categories) {
  const workbook = xlsx.utils.book_new();
  const usedNames = new Set(['resumen']);
  const total = categories.reduce((sum, category) => sum + category.rows.length, 0);
  const generatedAt = new Date().toLocaleString('es-MX');
  const summaryRows = [
    ['Reporte', 'Inventario de equipos QR'],
    ['Generado', generatedAt],
    ['Total de equipos', total],
    [],
    ['Categoría', 'Equipos exportados'],
    ...categories.map(category => [category.nombre, category.rows.length])
  ];
  const summary = xlsx.utils.aoa_to_sheet(summaryRows);
  summary['!cols'] = [{ wch: 34 }, { wch: 22 }];
  xlsx.utils.book_append_sheet(workbook, summary, 'Resumen');

  for (const category of categories) {
    const technicalColumns = category.attributes.filter(attribute =>
      !GENERAL_KEYS.has(attribute.clave) && !FINAL_KEYS.has(attribute.clave)
    );
    const bitLockerColumns = Number(category.id) === 1
      ? [
        { nombre: 'BitLocker habilitado', clave: 'bitlocker_habilitado' },
        { nombre: 'Identificador BitLocker', clave: 'bitlocker_identificador' },
        { nombre: 'Clave de recuperación BitLocker', clave: 'bitlocker_clave' }
      ]
      : [];
    const columns = [...GENERAL_EXPORT_COLUMNS, ...technicalColumns, ...bitLockerColumns, ...FINAL_EXPORT_COLUMNS];
    const headers = columns.map(column => column.nombre);
    const rows = category.rows.map(row => columns.map(column => exportValue(row, column.clave)));
    xlsx.utils.book_append_sheet(workbook, buildWorksheet(headers, rows), safeSheetName(category.nombre, usedNames));
  }

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
}

// Mapeo exacto de los encabezados en español recibidos del Excel a las columnas de la tabla de PostgreSQL
const COLUMN_MAPPING = {
  'ID': 'id',
  'Item': 'item',
  'Personal Asignado': 'personal_asignado',
  'Empresa': 'empresa',
  'Ciudad': 'ciudad',
  'Base / Ciudad': 'ciudad',
  'Área': 'area',
  'hostname': 'hostname',
  'Marca': 'marca',
  'Modelo': 'modelo',
  'Serial': 'serial',
  'Número de serie': 'serial',
  'SO': 'so',
  'Sistema operativo': 'so',
  'CPU (Modelo/Generación)': 'cpu',
  'Procesador': 'cpu',
  'Capacidad de la RAM': 'ram_capacidad',
  'RAM': 'ram_capacidad',
  'Capacidad del Disco': 'disco_capacidad',
  'Almacenamiento': 'disco_capacidad',
  'GPU (Integrada/Dedicada)': 'gpu_tipo',
  'Tipo de GPU': 'gpu_tipo',
  'Modelo GPU': 'gpu_modelo',
  'Modelo de GPU': 'gpu_modelo',
  'Estado Físico': 'estado_fisico',
  'MAC WiFI': 'mac_wifi',
  'MAC Wi-Fi / red': 'mac_wifi',
  'Uso Recomendado': 'uso_recomendado',
  'Observaciones': 'observaciones',
  'BitLocker habilitado': 'bitlocker_habilitado',
  'Identificador BitLocker': 'bitlocker_identificador',
  'Clave de recuperación BitLocker': 'bitlocker_clave'
};

function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  return rawData.map((row) => {
    const mappedRow = {};
    for (const [excelCol, dbCol] of Object.entries(COLUMN_MAPPING)) {
      // Normalizar buscando coincidencias sin importar espacios extra
      const key = Object.keys(row).find(
        k => k.trim().toLowerCase() === excelCol.trim().toLowerCase()
      );
      mappedRow[dbCol] = key ? String(row[key]).trim() : '';
    }
    return mappedRow;
  });
}

module.exports = {
  parseExcelBuffer,
  COLUMN_MAPPING,
  buildInventoryWorkbook,
};
