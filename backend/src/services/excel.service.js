const xlsx = require('xlsx');

const INVENTORY_COLUMNS = [
  ['ID', 'id'],
  ['Item', 'item'],
  ['Estado', 'estado_nombre'],
  ['Empresa', 'empresa'],
  ['Base / Ciudad', 'ciudad'],
  ['Área', 'area'],
  ['Responsable', 'responsable'],
  ['No. empleado', 'no_empleado'],
  ['Puesto', 'puesto'],
  ['Hostname', 'hostname'],
  ['Marca', 'marca'],
  ['Modelo', 'modelo'],
  ['Serial', 'serial'],
  ['Sistema operativo', 'so'],
  ['Procesador', 'cpu'],
  ['RAM', 'ram_capacidad'],
  ['Almacenamiento', 'disco_capacidad'],
  ['Tipo de GPU', 'gpu_tipo'],
  ['Modelo de GPU', 'gpu_modelo'],
  ['MAC Wi-Fi / red', 'mac_wifi'],
  ['Estado físico', 'estado_fisico'],
  ['Uso recomendado', 'uso_recomendado'],
  ['Observaciones', 'observaciones'],
  ['Fecha de registro', 'created_at'],
  ['Última actualización', 'updated_at']
];

const COMMON_CATEGORY_KEYS = new Set([
  'marca', 'modelo', 'serial', 'estado_fisico', 'uso_recomendado', 'observaciones',
  'hostname', 'so', 'cpu', 'ram_capacidad', 'disco_capacidad', 'gpu_tipo',
  'gpu_modelo', 'mac_wifi'
]);

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
    const specificAttributes = category.attributes.filter(attribute => !COMMON_CATEGORY_KEYS.has(attribute.clave));
    const headers = [
      ...INVENTORY_COLUMNS.map(([label]) => label),
      ...specificAttributes.map(attribute => attribute.nombre)
    ];
    const rows = category.rows.map(row => [
      ...INVENTORY_COLUMNS.map(([, key]) => excelValue(row[key])),
      ...specificAttributes.map(attribute => excelValue(row[`detail__${attribute.clave}`]))
    ]);
    xlsx.utils.book_append_sheet(workbook, buildWorksheet(headers, rows), safeSheetName(category.nombre, usedNames));
  }

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
}

// Mapeo exacto de los encabezados en español recibidos del Excel a las columnas de la tabla de PostgreSQL
const COLUMN_MAPPING = {
  'Item': 'item',
  'Personal Asignado': 'personal_asignado',
  'Empresa': 'empresa',
  'Ciudad': 'ciudad',
  'Área': 'area',
  'hostname': 'hostname',
  'Marca': 'marca',
  'Modelo': 'modelo',
  'Serial': 'serial',
  'SO': 'so',
  'CPU (Modelo/Generación)': 'cpu',
  'Capacidad de la RAM': 'ram_capacidad',
  'Capacidad del Disco': 'disco_capacidad',
  'GPU (Integrada/Dedicada)': 'gpu_tipo',
  'Modelo GPU': 'gpu_modelo',
  'Estado Físico': 'estado_fisico',
  'MAC WiFI': 'mac_wifi',
  'Uso Recomendado': 'uso_recomendado',
  'Observaciones': 'observaciones'
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
