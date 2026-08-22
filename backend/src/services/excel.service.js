const xlsx = require('xlsx');

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
};
