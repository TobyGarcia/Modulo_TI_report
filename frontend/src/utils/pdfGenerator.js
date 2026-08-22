import jsPDF from 'jspdf';
import { LOGO_ITZ_BASE64 } from './logoBase64';

/**
 * Genera el PDF del Reporte de Mantenimiento de Equipo de Cómputo (Formato SGI R2PTI1)
 */
export function generarReportePDF(mantenimiento, equipo) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // --- ENCABEZADO OFICIAL SGI ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 22); // Cuadro exterior del encabezado

  // Líneas divisorias verticales
  doc.line(margin + 45, margin, margin + 45, margin + 22);
  doc.line(margin + 135, margin, margin + 135, margin + 22);
  doc.line(margin + 160, margin, margin + 160, margin + 22);

  // Logo Oficial ITZ OIL & GAS en Columna 1
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 2.5, margin + 2.5, 40, 17);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 8, margin + 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 8, margin + 16);
  }

  // Título y Código en Columna 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CÓDIGO', margin + 90, margin + 9, { align: 'center' });
  doc.setFontSize(10);
  doc.text('R2PTI1', margin + 90, margin + 16, { align: 'center' });

  // Tabla lateral derecha (Sistema, Versión, Página)
  doc.line(margin + 135, margin + 7, margin + contentWidth, margin + 7);
  doc.line(margin + 135, margin + 14, margin + contentWidth, margin + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 137, margin + 5);
  doc.text('SGI', margin + 163, margin + 5);

  doc.text('Versión:', margin + 137, margin + 12);
  doc.text('02', margin + 163, margin + 12);

  doc.text('Página:', margin + 137, margin + 19);
  doc.text('1 de 1', margin + 163, margin + 19);

  // Barra Amarilla con Título del Documento
  let currentY = margin + 22;
  doc.setFillColor(245, 175, 0); // Amarillo ITZ
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORTE DE MANTENIMIENTO DE EQUIPO DE COMPUTO', margin + (contentWidth / 2), currentY + 4.8, { align: 'center' });

  currentY += 9;

  // --- FECHA ---
  const fechaObj = mantenimiento.fecha_realizado ? new Date(mantenimiento.fecha_realizado) : new Date();
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mesNombres = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const mes = mesNombres[fechaObj.getMonth()];
  const anio = fechaObj.getFullYear();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin + 115, currentY + 4);

  // Tabla Fecha (Día | Mes | Año)
  doc.rect(margin + 128, currentY, 58, 6);
  doc.line(margin + 145, currentY, margin + 145, currentY + 6);
  doc.line(margin + 168, currentY, margin + 168, currentY + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Día', margin + 135, currentY + 2.5, { align: 'center' });
  doc.text('Mes', margin + 156.5, currentY + 2.5, { align: 'center' });
  doc.text('Año', margin + 177, currentY + 2.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(dia, margin + 135, currentY + 5.5, { align: 'center' });
  doc.text(mes, margin + 156.5, currentY + 5.5, { align: 'center' });
  doc.text(String(anio), margin + 177, currentY + 5.5, { align: 'center' });

  currentY += 8;

  // --- DATOS DEL EMPLEADO RESPONSABLE ---
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Datos del empleado responsable del equipo', margin + (contentWidth / 2), currentY + 3.5, { align: 'center' });

  currentY += 5;
  doc.rect(margin, currentY, contentWidth, 10);
  doc.line(margin, currentY + 5, margin + contentWidth, currentY + 5);
  doc.line(margin + 45, currentY, margin + 45, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del empleado:', margin + 2, currentY + 3.5);
  doc.text('Área:', margin + 2, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.text(mantenimiento.empleado_responsable || equipo.personal_asignado || 'N/A', margin + 47, currentY + 3.5);
  doc.text(mantenimiento.area_responsable || equipo.area || 'N/A', margin + 47, currentY + 8.5);

  currentY += 12;

  // --- DATOS DEL EQUIPO ---
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Equipo', margin + (contentWidth / 2), currentY + 3.5, { align: 'center' });

  currentY += 5;

  // Fila Marca / Modelo / Serie / SO
  doc.rect(margin, currentY, contentWidth, 10);
  doc.line(margin, currentY + 5, margin + contentWidth, currentY + 5);
  doc.line(margin + 90, currentY, margin + 90, currentY + 10);
  doc.line(margin + 20, currentY, margin + 20, currentY + 5);
  doc.line(margin + 20, currentY + 5, margin + 20, currentY + 10);
  doc.line(margin + 120, currentY + 5, margin + 120, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Marca:', margin + 2, currentY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.marca || 'N/A', margin + 22, currentY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Modelo:', margin + 92, currentY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.modelo || 'N/A', margin + 115, currentY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Serie:', margin + 2, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.serial || 'N/A', margin + 22, currentY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Sistema Operativo:', margin + 92, currentY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.so || 'N/A', margin + 125, currentY + 8.5);

  currentY += 10;

  // Encabezados Componentes
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');

  doc.line(margin + 35, currentY, margin + 35, currentY + 5);
  doc.line(margin + 65, currentY, margin + 65, currentY + 5);
  doc.line(margin + 95, currentY, margin + 95, currentY + 5);
  doc.line(margin + 125, currentY, margin + 125, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Descripción', margin + 2, currentY + 3.5);
  doc.text('Marca', margin + 37, currentY + 3.5);
  doc.text('Modelo', margin + 67, currentY + 3.5);
  doc.text('Estado', margin + 97, currentY + 3.5);
  doc.text('Observaciones', margin + 127, currentY + 3.5);

  currentY += 5;

  // Filas Componentes (Procesador, RAM, Storage, Cargador)
  const componentes = [
    { desc: 'Procesador', marca: equipo.marca || 'N/A', modelo: equipo.cpu || 'N/A', estado: 'Bueno', obs: mantenimiento.obs_procesador || 'Sin fallas' },
    { desc: 'Memoria RAM', marca: 'N/A', modelo: equipo.ram_capacidad || 'N/A', estado: 'Bueno', obs: mantenimiento.obs_ram || 'Operativo' },
    { desc: 'Storage', marca: 'N/A', modelo: equipo.disco_capacidad || 'N/A', estado: 'Bueno', obs: mantenimiento.obs_storage || 'Salud OK' },
    { desc: 'Cargador', marca: equipo.marca || 'N/A', modelo: 'Original', estado: 'Bueno', obs: mantenimiento.obs_cargador || 'Funcional' }
  ];

  doc.setFont('helvetica', 'normal');
  componentes.forEach(c => {
    doc.rect(margin, currentY, contentWidth, 5);
    doc.line(margin + 35, currentY, margin + 35, currentY + 5);
    doc.line(margin + 65, currentY, margin + 65, currentY + 5);
    doc.line(margin + 95, currentY, margin + 95, currentY + 5);
    doc.line(margin + 125, currentY, margin + 125, currentY + 5);

    doc.text(c.desc, margin + 2, currentY + 3.5);
    doc.text(c.marca, margin + 37, currentY + 3.5);
    doc.text(c.modelo, margin + 67, currentY + 3.5);
    doc.text(c.estado, margin + 97, currentY + 3.5);
    doc.text(c.obs, margin + 127, currentY + 3.5);

    currentY += 5;
  });

  // Observaciones Generales
  doc.rect(margin, currentY, contentWidth, 12);
  doc.setFont('helvetica', 'bold');
  doc.text('Observaciones:', margin + 2, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(mantenimiento.observaciones_equipo || 'Sin observaciones adicionales.', margin + 28, currentY + 4, { maxWidth: contentWidth - 30 });

  currentY += 14;

  // --- REPORTE DE MANTENIMIENTO ---
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de mantenimiento', margin + (contentWidth / 2), currentY + 3.5, { align: 'center' });

  currentY += 5;
  doc.rect(margin, currentY, contentWidth, 18);
  doc.line(margin, currentY + 6, margin + contentWidth, currentY + 6);
  doc.line(margin + 35, currentY, margin + 35, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de mantenimiento:', margin + 2, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text((mantenimiento.tipo_mantenimiento || 'Preventivo').toUpperCase(), margin + 37, currentY + 4);

  doc.setFont('helvetica', 'normal');
  const detalleTrabajo = `Trabajo Realizado: ${mantenimiento.trabajo_realizado || 'Mantenimiento físico y lógico ejecutado.'}\nMaterial Utilizado: ${mantenimiento.material_utilizado || 'Ninguno'}`;
  doc.text(detalleTrabajo, margin + 2, currentY + 10, { maxWidth: contentWidth - 4 });

  currentY += 20;

  // --- DATOS DEL TÉCNICO ---
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del técnico de mantenimiento', margin + (contentWidth / 2), currentY + 3.5, { align: 'center' });

  currentY += 5;
  doc.rect(margin, currentY, contentWidth, 6);
  doc.line(margin + 45, currentY, margin + 45, currentY + 6);
  doc.line(margin + 90, currentY, margin + 90, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('No. de empleado:', margin + 2, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(mantenimiento.tecnico_no_empleado || 'TI-01', margin + 28, currentY + 4);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', margin + 47, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(mantenimiento.tecnico_nombre || 'Técnico de Soporte', margin + 62, currentY + 4);

  currentY += 8;

  // --- FIRMAS DE CONFORMIDAD ---
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.rect(margin, currentY, contentWidth, 5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Firmas de conformidad', margin + (contentWidth / 2), currentY + 3.5, { align: 'center' });

  currentY += 5;

  // Cuadro de Firmas (2 Columnas: Área Responsable | Área de TI)
  const firmaHeight = 28;
  doc.rect(margin, currentY, contentWidth, firmaHeight);
  doc.line(margin, currentY + 5, margin + contentWidth, currentY + 5);
  doc.line(margin + (contentWidth / 2), currentY, margin + (contentWidth / 2), currentY + firmaHeight);

  doc.setFont('helvetica', 'bold');
  doc.text('Por el área donde se encuentra el equipo', margin + (contentWidth / 4), currentY + 3.5, { align: 'center' });
  doc.text('Por el área de TI', margin + (contentWidth * 3 / 4), currentY + 3.5, { align: 'center' });

  // Renderizar imágenes de firmas si existen
  if (mantenimiento.firma_responsable) {
    try {
      doc.addImage(mantenimiento.firma_responsable, 'PNG', margin + 15, currentY + 6, 55, 14);
    } catch (e) {
      console.error('Error rendering responsable signature:', e);
    }
  }

  if (mantenimiento.firma_tecnico) {
    try {
      doc.addImage(mantenimiento.firma_tecnico, 'PNG', margin + (contentWidth / 2) + 15, currentY + 6, 55, 14);
    } catch (e) {
      console.error('Error rendering tecnico signature:', e);
    }
  }

  // Nombres debajo de la firma
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(mantenimiento.empleado_responsable || equipo.personal_asignado || 'Responsable del área', margin + (contentWidth / 4), currentY + 25, { align: 'center' });
  doc.text(mantenimiento.tecnico_nombre || 'Técnico de mantenimiento', margin + (contentWidth * 3 / 4), currentY + 25, { align: 'center' });

  currentY += firmaHeight + 5;

  // --- SECCIÓN DE FOTOS / EVIDENCIAS SI EXISTEN ---
  const imagenes = Array.isArray(mantenimiento.imagenes_evidencia)
    ? mantenimiento.imagenes_evidencia
    : typeof mantenimiento.imagenes_evidencia === 'string'
      ? JSON.parse(mantenimiento.imagenes_evidencia || '[]')
      : [];

  if (imagenes.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EVIDENCIA FOTOGRÁFICA DE MANTENIMIENTO', margin, margin + 5);

    let imgY = margin + 12;
    imagenes.forEach((imgData, idx) => {
      if (imgY + 60 > pageHeight - margin) {
        doc.addPage();
        imgY = margin + 10;
      }
      try {
        doc.addImage(imgData, 'JPEG', margin + (idx % 2 === 0 ? 0 : 90), imgY, 80, 55);
        if (idx % 2 === 1) imgY += 60;
      } catch (e) {
        console.error('Error al renderizar evidencia fotográfica en PDF:', e);
      }
    });
  }

  // Guardar archivo PDF
  const filename = `Reporte_Mantenimiento_${equipo.hostname || equipo.serial}_${dia}-${mes}-${anio}.pdf`;
  doc.save(filename);
}

/**
 * Genera el PDF de la Bitácora de Mantenimiento Consolidada (Formato SGI A1PTI1)
 */
export function generarBitacoraPDF(mantenimientos, tituloFiltro = "BITACORA DE MANTENIMIENTO") {
  const doc = new jsPDF({
    orientation: 'l', // Horizontal para mayor espacio de columnas
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // --- ENCABEZADO OFICIAL SGI ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 22);

  doc.line(margin + 50, margin, margin + 50, margin + 22);
  doc.line(margin + 210, margin, margin + 210, margin + 22);
  doc.line(margin + 245, margin, margin + 245, margin + 22);

  // Logo Oficial ITZ OIL & GAS en Columna 1
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 3, margin + 2.5, 44, 17);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 10, margin + 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 10, margin + 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CÓDIGO', margin + 130, margin + 9, { align: 'center' });
  doc.setFontSize(10);
  doc.text('A1PTI1', margin + 130, margin + 16, { align: 'center' });

  doc.line(margin + 210, margin + 7, margin + contentWidth, margin + 7);
  doc.line(margin + 210, margin + 14, margin + contentWidth, margin + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 212, margin + 5);
  doc.text('SGI', margin + 248, margin + 5);

  doc.text('Versión:', margin + 212, margin + 12);
  doc.text('02', margin + 248, margin + 12);

  doc.text('Página:', margin + 212, margin + 19);
  doc.text('1 de 1', margin + 248, margin + 19);

  // Barra Amarilla
  let currentY = margin + 22;
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(tituloFiltro.toUpperCase(), margin + (contentWidth / 2), currentY + 4.8, { align: 'center' });

  currentY += 9;

  // Metadatos
  const hoy = new Date().toLocaleDateString('es-MX');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Fecha de Emisión: ${hoy}`, margin, currentY + 3);
  doc.text(`Turno: General / Todos`, margin + 80, currentY + 3);
  doc.text(`Total Registros: ${mantenimientos.length}`, margin + 180, currentY + 3);

  currentY += 6;

  // --- TABLA BITÁCORA (2 COLUMNAS PRINCIPALES: PREVENTIVO | CORRECTIVO) ---
  const halfColWidth = contentWidth / 2;

  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, halfColWidth, 6, 'F');
  doc.rect(margin, currentY, halfColWidth, 6, 'S');
  doc.rect(margin + halfColWidth, currentY, halfColWidth, 6, 'F');
  doc.rect(margin + halfColWidth, currentY, halfColWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MANTENIMIENTO REALIZADO (PREVENTIVO)', margin + (halfColWidth / 2), currentY + 4, { align: 'center' });
  doc.text('MANTENIMIENTO REALIZADO (CORRECTIVO)', margin + halfColWidth + (halfColWidth / 2), currentY + 4, { align: 'center' });

  currentY += 6;

  const preventivos = mantenimientos.filter(m => m.tipo_mantenimiento === 'preventivo');
  const correctivos = mantenimientos.filter(m => m.tipo_mantenimiento === 'correctivo');
  const maxFilas = Math.max(preventivos.length, correctivos.length, 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  for (let i = 0; i < maxFilas; i++) {
    if (currentY + 12 > pageHeight - margin - 25) {
      doc.addPage();
      currentY = margin + 10;
    }

    const prev = preventivos[i];
    const corr = correctivos[i];

    doc.rect(margin, currentY, halfColWidth, 12);
    doc.rect(margin + halfColWidth, currentY, halfColWidth, 12);

    if (prev) {
      const txtPrev = `[${prev.hostname || 'S/N'}] ${prev.trabajo_realizado || 'Mantenimiento Preventivo'}\nRealizó: ${prev.tecnico_nombre || 'TI'} | Fecha: ${prev.fecha_realizado ? new Date(prev.fecha_realizado).toLocaleDateString() : 'N/A'}`;
      doc.text(txtPrev, margin + 2, currentY + 4, { maxWidth: halfColWidth - 4 });
    }

    if (corr) {
      const txtCorr = `[${corr.hostname || 'S/N'}] ${corr.trabajo_realizado || 'Mantenimiento Correctivo'}\nRealizó: ${corr.tecnico_nombre || 'TI'} | Fecha: ${corr.fecha_realizado ? new Date(corr.fecha_realizado).toLocaleDateString() : 'N/A'}`;
      doc.text(txtCorr, margin + halfColWidth + 2, currentY + 4, { maxWidth: halfColWidth - 4 });
    }

    currentY += 12;
  }

  // --- SECCIÓN MATERIAL UTILIZADO ---
  if (currentY + 25 > pageHeight - margin) {
    doc.addPage();
    currentY = margin + 10;
  }

  currentY += 4;
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MATERIAL UTILIZADO', margin + (contentWidth / 2), currentY + 4, { align: 'center' });

  currentY += 6;
  doc.rect(margin, currentY, contentWidth, 18);

  const materiales = mantenimientos
    .map(m => m.material_utilizado ? `• ${m.hostname || 'Equipo'}: ${m.material_utilizado}` : null)
    .filter(Boolean)
    .join('\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(materiales || 'No se registraron consumos de material especial.', margin + 3, currentY + 5, { maxWidth: contentWidth - 6 });

  doc.save(`Bitacora_Mantenimiento_${hoy.replace(/\//g, '-')}.pdf`);
}

/**
 * Genera el PDF de Asignación / Responsiva de Equipo de Cómputo (Formato SGI R1PTI2)
 */
export function generarFormatoAsignacionPDF(datosAsignacion, equipo, empleado) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // --- ENCABEZADO OFICIAL SGI R1PTI2 ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 22);

  doc.line(margin + 45, margin, margin + 45, margin + 22);
  doc.line(margin + 135, margin, margin + 135, margin + 22);
  doc.line(margin + 160, margin, margin + 160, margin + 22);

  // Logo Oficial ITZ
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 2.5, margin + 2.5, 40, 17);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 8, margin + 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 8, margin + 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CÓDIGO', margin + 90, margin + 9, { align: 'center' });
  doc.setFontSize(10);
  doc.text('R1PTI2', margin + 90, margin + 16, { align: 'center' });

  doc.line(margin + 135, margin + 7, margin + contentWidth, margin + 7);
  doc.line(margin + 135, margin + 14, margin + contentWidth, margin + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 137, margin + 5);
  doc.text('SGI', margin + 163, margin + 5);

  doc.text('Versión:', margin + 137, margin + 12);
  doc.text('01', margin + 163, margin + 12);

  doc.text('Página:', margin + 137, margin + 19);
  doc.text('1 de 1', margin + 163, margin + 19);

  // Barra Amarilla
  let currentY = margin + 22;
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('RESPONSIVA DE EQUIPO DE COMPUTO Y ACCESORIOS', margin + (contentWidth / 2), currentY + 4.8, { align: 'center' });

  currentY += 15;

  // LÍNEA DE LUGAR Y FECHA
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mes = mesNombres[hoy.getMonth()];
  const anio = hoy.getFullYear();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`San Francisco de Campeche, Campeche, a ${dia} de ${mes} del ${anio}.`, margin + (contentWidth / 2), currentY, { align: 'center' });

  currentY += 12;
  doc.text('Por medio del presente informo que se me entregó el siguiente equipo:', margin, currentY);

  currentY += 8;

  // TABLA PRINCIPAL: EQUIPO | MARCA/MODELO | STATUS
  const col1W = 50;
  const col2W = 80;
  const col3W = contentWidth - col1W - col2W;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.line(margin + col1W, currentY, margin + col1W, currentY + 7);
  doc.line(margin + col1W + col2W, currentY, margin + col1W + col2W, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EQUIPO', margin + col1W / 2, currentY + 4.8, { align: 'center' });
  doc.text('MARCA/MODELO', margin + col1W + col2W / 2, currentY + 4.8, { align: 'center' });
  doc.text('STATUS', margin + col1W + col2W + col3W / 2, currentY + 4.8, { align: 'center' });

  currentY += 7;

  // Fila de datos (Observación 3: Default "Laptop", Modelo/Marca/Serial en saltos de línea, Status = Estado Físico)
  const rowHeight = 22;
  doc.rect(margin, currentY, contentWidth, rowHeight);
  doc.line(margin + col1W, currentY, margin + col1W, currentY + rowHeight);
  doc.line(margin + col1W + col2W, currentY, margin + col1W + col2W, currentY + rowHeight);

  // Columna EQUIPO (Laptop por defecto)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Laptop', margin + col1W / 2, currentY + (rowHeight / 2) + 1.5, { align: 'center' });

  // Columna MARCA/MODELO (Modelo, Marca, Serial con saltos de línea)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const marcaModeloTexto = `Modelo: ${equipo.modelo || 'N/A'}\nMarca: ${equipo.marca || 'N/A'}\nSerial: ${equipo.serial || 'N/A'}`;
  doc.text(marcaModeloTexto, margin + col1W + 4, currentY + 5.5, { maxWidth: col2W - 8, leading: 5 });

  // Columna STATUS (Estado físico del equipo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 128, 64);
  doc.text((equipo.estado_fisico || 'Excelente').toUpperCase(), margin + col1W + col2W + col3W / 2, currentY + (rowHeight / 2) + 1.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  currentY += rowHeight;

  // SECCIÓN OBSERVACIONES & SPECS
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OBSERVACIONES', margin + (contentWidth / 2), currentY + 4.2, { align: 'center' });

  currentY += 6;
  const obsHeight = 35;
  doc.rect(margin, currentY, contentWidth, obsHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SO:', margin + 3, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.so || 'N/A', margin + 25, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('CPU:', margin + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.cpu || 'N/A', margin + 25, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('RAM:', margin + 3, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.ram_capacidad || 'N/A', margin + 25, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('STORAGE:', margin + 3, currentY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.disco_capacidad || 'N/A', margin + 25, currentY + 24);

  if (datosAsignacion?.observaciones) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Notas: ${datosAsignacion.observaciones}`, margin + 3, currentY + 30, { maxWidth: contentWidth - 6 });
  }

  currentY += obsHeight + 10;

  // CLÁUSULA DE RESPONSABILIDAD
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const clausula = 'Acepto la responsabilidad de mantenerlo en las condiciones óptimas y hacerme cargo de su buen uso y funcionamiento, también asumo los descuentos que se pudieran generar y/o aplicarme por el mal uso.';
  doc.text(clausula, margin + 5, currentY, { maxWidth: contentWidth - 10, align: 'justify' });

  currentY += 25;

  // ATENTAMENTE & FIRMA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ATENTAMENTE', margin + (contentWidth / 2), currentY, { align: 'center' });

  currentY += 18;

  // Renderizar Firma si existe
  if (datosAsignacion?.firma_empleado) {
    try {
      doc.addImage(datosAsignacion.firma_empleado, 'PNG', margin + (contentWidth / 2) - 30, currentY - 16, 60, 16);
    } catch (e) {
      console.error('Error al agregar firma en asignación:', e);
    }
  }

  const lineStart = margin + (contentWidth / 2) - 45;
  const lineEnd = margin + (contentWidth / 2) + 45;
  doc.line(lineStart, currentY, lineEnd, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(empleado.nombre || equipo.personal_asignado || 'Empleado Responsable', margin + (contentWidth / 2), currentY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nombre completo y firma', margin + (contentWidth / 2), currentY + 4, { align: 'center' });

  doc.save(`Responsiva_Asignacion_${equipo.hostname || equipo.serial}_${dia}-${mes}-${anio}.pdf`);
}

/**
 * Genera el PDF de Desasignación y Devolución de Equipo de Cómputo (Formato SGI R3PTI2)
 */
export function generarFormatoDesasignacionPDF(datosDesasignacion, equipo, empleado, motivo = 'Cambio de equipo') {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // --- ENCABEZADO OFICIAL SGI R3PTI2 ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 22);

  doc.line(margin + 45, margin, margin + 45, margin + 22);
  doc.line(margin + 135, margin, margin + 135, margin + 22);
  doc.line(margin + 160, margin, margin + 160, margin + 22);

  // Logo Oficial ITZ
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 2.5, margin + 2.5, 40, 17);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 8, margin + 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 8, margin + 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CÓDIGO', margin + 90, margin + 9, { align: 'center' });
  doc.setFontSize(10);
  doc.text('R3PTI2', margin + 90, margin + 16, { align: 'center' });

  doc.line(margin + 135, margin + 7, margin + contentWidth, margin + 7);
  doc.line(margin + 135, margin + 14, margin + contentWidth, margin + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 137, margin + 5);
  doc.text('SGI', margin + 163, margin + 5);

  doc.text('Versión:', margin + 137, margin + 12);
  doc.text('01', margin + 163, margin + 12);

  doc.text('Página:', margin + 137, margin + 19);
  doc.text('1 de 1', margin + 163, margin + 19);

  // Barra Amarilla
  let currentY = margin + 22;
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('ACTA DE DESASIGNACION Y DEVOLUCION DE EQUIPO DE COMPUTO', margin + (contentWidth / 2), currentY + 4.8, { align: 'center' });

  currentY += 15;

  // LÍNEA DE LUGAR Y FECHA
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mes = mesNombres[hoy.getMonth()];
  const anio = hoy.getFullYear();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`San Francisco de Campeche, Campeche, a ${dia} de ${mes} del ${anio}.`, margin + (contentWidth / 2), currentY, { align: 'center' });

  currentY += 12;
  doc.text('Por medio del presente se hace constar la desasignación y devolución del equipo:', margin, currentY);

  currentY += 8;

  // TABLA PRINCIPAL: EQUIPO | MARCA/MODELO | MOTIVO DE DESASIGNACIÓN
  const col1W = 50;
  const col2W = 75;
  const col3W = contentWidth - col1W - col2W;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.line(margin + col1W, currentY, margin + col1W, currentY + 7);
  doc.line(margin + col1W + col2W, currentY, margin + col1W + col2W, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('EQUIPO', margin + col1W / 2, currentY + 4.8, { align: 'center' });
  doc.text('MARCA/MODELO', margin + col1W + col2W / 2, currentY + 4.8, { align: 'center' });
  doc.text('MOTIVO DESASIGNACIÓN', margin + col1W + col2W + col3W / 2, currentY + 4.8, { align: 'center' });

  currentY += 7;

  // Fila de datos (Observación 3 & 4: Laptop por defecto, Modelo/Marca/Serial con saltos de línea)
  const rowHeight = 22;
  const motivoTexto = (datosDesasignacion?.motivo || motivo || 'Cambio de equipo').toUpperCase();

  doc.rect(margin, currentY, contentWidth, rowHeight);
  doc.line(margin + col1W, currentY, margin + col1W, currentY + rowHeight);
  doc.line(margin + col1W + col2W, currentY, margin + col1W + col2W, currentY + rowHeight);

  // Columna EQUIPO (Laptop por defecto)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Laptop', margin + col1W / 2, currentY + (rowHeight / 2) + 1.5, { align: 'center' });

  // Columna MARCA/MODELO (Modelo, Marca, Serial con saltos de línea)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const marcaModeloTexto = `Modelo: ${equipo.modelo || 'N/A'}\nMarca: ${equipo.marca || 'N/A'}\nSerial: ${equipo.serial || 'N/A'}`;
  doc.text(marcaModeloTexto, margin + col1W + 4, currentY + 5.5, { maxWidth: col2W - 8, leading: 5 });

  // Columna MOTIVO DESASIGNACIÓN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 40, 40);
  doc.text(motivoTexto, margin + col1W + col2W + 3, currentY + 8, { maxWidth: col3W - 6 });
  doc.setTextColor(0, 0, 0);

  currentY += rowHeight;

  // SECCIÓN OBSERVACIONES & ESTADO DE DEVOLUCIÓN (Observación 4: Atributos separados por salto de línea)
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DETALLES DEL EQUIPO Y OBSERVACIONES DE ENTREGA', margin + (contentWidth / 2), currentY + 4.2, { align: 'center' });

  currentY += 6;
  const obsHeight = 45;
  doc.rect(margin, currentY, contentWidth, obsHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('EMPLEADO ANTERIOR:', margin + 3, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empleado?.nombre || equipo.personal_asignado || 'No registrado'} (${empleado?.area || equipo.area || 'N/A'})`, margin + 42, currentY + 6);

  // Atributos de especificaciones en líneas separadas
  doc.setFont('helvetica', 'bold');
  doc.text('SO:', margin + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.so || 'N/A', margin + 42, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('CPU:', margin + 3, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.cpu || 'N/A', margin + 42, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('RAM:', margin + 3, currentY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.ram_capacidad || 'N/A', margin + 42, currentY + 24);

  doc.setFont('helvetica', 'bold');
  doc.text('STORAGE:', margin + 3, currentY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.disco_capacidad || 'N/A', margin + 42, currentY + 30);

  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO FÍSICO:', margin + 3, currentY + 36);
  doc.setFont('helvetica', 'normal');
  doc.text(equipo.estado_fisico || 'Bueno', margin + 42, currentY + 36);

  doc.setFont('helvetica', 'bold');
  doc.text('NOTAS TI:', margin + 3, currentY + 42);
  doc.setFont('helvetica', 'normal');
  doc.text(datosDesasignacion?.observaciones || 'Se recibe equipo en resguardo.', margin + 42, currentY + 42, { maxWidth: contentWidth - 46 });

  currentY += obsHeight + 10;

  // CLÁUSULA DE RESGUARDO
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const clausula = 'El equipo de cómputo y sus accesorios quedan bajo el estado de RESGUARDO administrado por el Departamento de Tecnologías de la Información. Se hace constar la correcta entrega-recepción del bien.';
  doc.text(clausula, margin + 5, currentY, { maxWidth: contentWidth - 10, align: 'justify' });

  currentY += 25;

  // CUADRO DE FIRMAS (ENTREGÓ vs RECIBIÓ TI)
  const halfCol = contentWidth / 2;
  const firmaBoxH = 30;

  doc.rect(margin, currentY, contentWidth, firmaBoxH);
  doc.line(margin + halfCol, currentY, margin + halfCol, currentY + firmaBoxH);

  // Encabezados Firmas
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, currentY, halfCol, 6, 'F');
  doc.rect(margin + halfCol, currentY, halfCol, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');
  doc.line(margin + halfCol, currentY, margin + halfCol, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ENTREGÓ (EMPLEADO)', margin + halfCol / 2, currentY + 4, { align: 'center' });
  doc.text('RECIBIÓ (PERSONAL TI)', margin + halfCol + halfCol / 2, currentY + 4, { align: 'center' });

  // Firmas
  if (datosDesasignacion?.firma_empleado) {
    try {
      doc.addImage(datosDesasignacion.firma_empleado, 'PNG', margin + 15, currentY + 7, 50, 14);
    } catch (e) {}
  }
  if (datosDesasignacion?.firma_ti) {
    try {
      doc.addImage(datosDesasignacion.firma_ti, 'PNG', margin + halfCol + 15, currentY + 7, 50, 14);
    } catch (e) {}
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(empleado?.nombre || equipo.personal_asignado || 'Empleado', margin + halfCol / 2, currentY + 26, { align: 'center' });
  doc.text('Personal Soporte TI', margin + halfCol + halfCol / 2, currentY + 26, { align: 'center' });

  doc.save(`Acta_Desasignacion_${equipo.hostname || equipo.serial}_${dia}-${mes}-${anio}.pdf`);
}

/**
 * Genera el PDF de Solicitud de Salida de Equipo Informático en formato HORIZONTAL (Formato SGI R1PTI3)
 */
export function generarFormatoSalidaPDF(salidaData, opciones = { firmaEnBlanco: false }) {
  const doc = new jsPDF({
    orientation: 'l', // Formato Horizontal (Landscape)
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273 mm

  // --- ENCABEZADO OFICIAL SGI R1PTI3 ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 22);

  // Líneas divisorias verticales del encabezado
  doc.line(margin + 55, margin, margin + 55, margin + 22);
  doc.line(margin + 210, margin, margin + 210, margin + 22);

  // Logo ITZ
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 3.5, margin + 2.5, 48, 17);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 12, margin + 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 12, margin + 16);
  }

  // Título y Código en la Columna Central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CÓDIGO', margin + 132.5, margin + 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text(salidaData.codigo_formato || 'R1PTI3', margin + 132.5, margin + 16, { align: 'center' });

  // Tabla lateral derecha (Sistema, Versión, Página)
  doc.line(margin + 210, margin + 7.3, margin + contentWidth, margin + 7.3);
  doc.line(margin + 210, margin + 14.6, margin + contentWidth, margin + 14.6);
  doc.line(margin + 235, margin, margin + 235, margin + 22);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 212, margin + 5.5);
  doc.text('SGI', margin + 238, margin + 5.5);

  doc.text('Versión:', margin + 212, margin + 12.5);
  doc.text('01', margin + 238, margin + 12.5);

  doc.text('Página:', margin + 212, margin + 19.5);
  doc.text('1 de 1', margin + 238, margin + 19.5);

  // Barra Amarilla de Título Principal
  let currentY = margin + 22;
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('SOLICITUD DE SALIDA DE EQUIPO INFORMATICO', margin + (contentWidth / 2), currentY + 4.8, { align: 'center' });

  currentY += 7;

  // FILA 1: REQUISICIÓN Y FECHA DE SOLICITUD
  doc.rect(margin, currentY, contentWidth, 6.5);
  doc.line(margin + 50, currentY, margin + 50, currentY + 6.5);
  doc.line(margin + 170, currentY, margin + 170, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, 50, 6.5, 'F');
  doc.rect(margin, currentY, 50, 6.5, 'S');
  doc.text('Requisición', margin + 25, currentY + 4.5, { align: 'center' });

  if (salidaData.requisicion) {
    doc.setFont('helvetica', 'normal');
    doc.text(salidaData.requisicion, margin + 53, currentY + 4.5);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de solicitud:', margin + 53, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  const fechaSol = salidaData.fecha_solicitud ? new Date(salidaData.fecha_solicitud).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
  doc.text(fechaSol, margin + 85, currentY + 4.5);

  doc.text(salidaData.lugar_emision || 'san Francisco de Campeche, Campeche', margin + 173, currentY + 4.5);

  currentY += 6.5;

  // FILA 2: TIPO DE SOLICITUD DE SALIDA
  doc.rect(margin, currentY, contentWidth, 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Tipo de solicitud de salida:', margin + 3, currentY + 4.5);

  const esTemporal = salidaData.tipo_solicitud === 'temporal' || !salidaData.tipo_solicitud;
  const esPermanente = salidaData.tipo_solicitud === 'permanente';

  // Casilla Temporal
  doc.rect(margin + 55, currentY + 1.2, 4, 4);
  if (esTemporal) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 56.2, currentY + 4.3);
  }
  doc.setFont('helvetica', 'normal');
  doc.text('Temporal', margin + 61, currentY + 4.5);

  // Casilla Permanente
  doc.rect(margin + 95, currentY + 1.2, 4, 4);
  if (esPermanente) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', margin + 96.2, currentY + 4.3);
  }
  doc.setFont('helvetica', 'normal');
  doc.text('Permanente', margin + 101, currentY + 4.5);

  currentY += 6.5;

  // FILA 3: NOMBRE SOLICITANTE Y CORREO ELECTRONICO
  doc.rect(margin, currentY, contentWidth, 6.5);
  doc.line(margin + 170, currentY, margin + 170, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del Solicitante:', margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(salidaData.solicitante_nombre || '', margin + 42, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Correo electronico:', margin + 173, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(salidaData.solicitante_email || '', margin + 208, currentY + 4.5);

  currentY += 6.5;

  // FILA 4: JEFE INMEDIATO, DEPARTAMENTO, PUESTO SOLICITANTE
  doc.rect(margin, currentY, contentWidth, 6.5);
  doc.line(margin + 95, currentY, margin + 95, currentY + 6.5);
  doc.line(margin + 170, currentY, margin + 170, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Jefe Inmediato:', margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(salidaData.jefe_inmediato || '', margin + 28, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Departamento:', margin + 98, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(salidaData.departamento || '', margin + 124, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Puesto del Solicitante:', margin + 173, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(salidaData.solicitante_puesto || '', margin + 210, currentY + 4.5);

  currentY += 6.5;

  // FILA 5: PERIODO INICIO Y TERMINO
  doc.rect(margin, currentY, contentWidth, 6.5);
  doc.line(margin + 136.5, currentY, margin + 136.5, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de inicio del periodo:', margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  const fechaIni = salidaData.fecha_inicio ? new Date(salidaData.fecha_inicio).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX');
  doc.text(fechaIni, margin + 48, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de termino del periodo:', margin + 140, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  const fechaFin = salidaData.fecha_termino ? new Date(salidaData.fecha_termino).toLocaleDateString('es-MX') : 'N/A';
  doc.text(fechaFin, margin + 190, currentY + 4.5);

  currentY += 6.5;

  // BARRA AMARILLA SUBHEADER
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.rect(margin, currentY, contentWidth, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Equipos Informáticos que se solicita pase de salida:', margin + (contentWidth / 2), currentY + 4.5, { align: 'center' });

  currentY += 6.5;

  // TABLA DE EQUIPOS EN FORMATO HORIZONTAL
  const colCant = 22;
  const colTipo = 45;
  const colModSer = 75;
  const colMarca = 40;
  const colDir = contentWidth - colCant - colTipo - colModSer - colMarca;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.rect(margin, currentY, contentWidth, 6.5, 'S');

  doc.line(margin + colCant, currentY, margin + colCant, currentY + 6.5);
  doc.line(margin + colCant + colTipo, currentY, margin + colCant + colTipo, currentY + 6.5);
  doc.line(margin + colCant + colTipo + colModSer, currentY, margin + colCant + colTipo + colModSer, currentY + 6.5);
  doc.line(margin + colCant + colTipo + colModSer + colMarca, currentY, margin + colCant + colTipo + colModSer + colMarca, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Cantidad', margin + colCant / 2, currentY + 4.5, { align: 'center' });
  doc.text('Tipo de equipo', margin + colCant + colTipo / 2, currentY + 4.5, { align: 'center' });
  doc.text('Modelo/Numero Serie', margin + colCant + colTipo + colModSer / 2, currentY + 4.5, { align: 'center' });
  doc.text('Marca', margin + colCant + colTipo + colModSer + colMarca / 2, currentY + 4.5, { align: 'center' });
  doc.text('Lugar en donde estará en resguardo (Dirección)', margin + colCant + colTipo + colModSer + colMarca + colDir / 2, currentY + 4.5, { align: 'center' });

  currentY += 6.5;

  let items = Array.isArray(salidaData.equipos_json) && salidaData.equipos_json.length > 0
    ? salidaData.equipos_json
    : [{ cantidad: 1, tipo_equipo: 'Laptop', modelo_serial: 'N/A', marca: 'N/A' }];

  const totalFilas = Math.max(items.length, 5);
  const rowHeight = 7;
  const tableHeight = totalFilas * rowHeight;

  doc.rect(margin, currentY, contentWidth, tableHeight);
  doc.line(margin + colCant, currentY, margin + colCant, currentY + tableHeight);
  doc.line(margin + colCant + colTipo, currentY, margin + colCant + colTipo, currentY + tableHeight);
  doc.line(margin + colCant + colTipo + colModSer, currentY, margin + colCant + colTipo + colModSer, currentY + tableHeight);
  doc.line(margin + colCant + colTipo + colModSer + colMarca, currentY, margin + colCant + colTipo + colModSer + colMarca, currentY + tableHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (let i = 0; i < totalFilas; i++) {
    const yRow = currentY + (i * rowHeight);
    if (i > 0) {
      doc.line(margin, yRow, margin + colCant + colTipo + colModSer + colMarca, yRow);
    }

    const item = items[i];
    if (item) {
      doc.text(String(item.cantidad || 1), margin + colCant / 2, yRow + 4.8, { align: 'center' });
      doc.text(item.tipo_equipo || 'Laptop', margin + colCant + 3, yRow + 4.8);
      doc.text(item.modelo_serial || '', margin + colCant + colTipo + 3, yRow + 4.8, { maxWidth: colModSer - 6 });
      doc.text(item.marca || '', margin + colCant + colTipo + colModSer + 3, yRow + 4.8, { maxWidth: colMarca - 6 });
    }
  }

  if (salidaData.direccion_resguardo) {
    doc.text(salidaData.direccion_resguardo, margin + colCant + colTipo + colModSer + colMarca + 3, currentY + 5.5, {
      maxWidth: colDir - 6,
      leading: 4
    });
  }

  currentY += tableHeight;

  // SECCIÓN OBSERVACIONES
  const obsHeight = 20;
  doc.rect(margin, currentY, contentWidth, obsHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OBSERVACIONES:', margin + 3, currentY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const obsTexto = salidaData.observaciones || 'Sin observaciones particulares.';
  doc.text(obsTexto, margin + 3, currentY + 9.5, { maxWidth: contentWidth - 6, leading: 4 });

  currentY += obsHeight + 4;

  // SECCIÓN FIRMAS
  doc.setFillColor(245, 175, 0);
  doc.rect(margin, currentY, contentWidth, 5.5, 'F');
  doc.rect(margin, currentY, contentWidth, 5.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Firmas', margin + (contentWidth / 2), currentY + 3.8, { align: 'center' });

  currentY += 5.5;

  const colFirmaW = contentWidth / 3;
  const firmaBoxH = 25;

  doc.rect(margin, currentY, contentWidth, firmaBoxH);
  doc.line(margin + colFirmaW, currentY, margin + colFirmaW, currentY + firmaBoxH);
  doc.line(margin + colFirmaW * 2, currentY, margin + colFirmaW * 2, currentY + firmaBoxH);

  doc.line(margin, currentY + 5.5, margin + contentWidth, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Solicitante', margin + colFirmaW / 2, currentY + 4, { align: 'center' });
  doc.text('Vo. Bo.', margin + colFirmaW + colFirmaW / 2, currentY + 4, { align: 'center' });
  doc.text('Vo. Bo.', margin + colFirmaW * 2 + colFirmaW / 2, currentY + 4, { align: 'center' });

  if (!opciones.firmaEnBlanco) {
    if (salidaData.firma_empleado) {
      try {
        doc.addImage(salidaData.firma_empleado, 'PNG', margin + 20, currentY + 6.5, colFirmaW - 40, 13);
      } catch (e) {}
    }
    if (salidaData.firma_jefe) {
      try {
        doc.addImage(salidaData.firma_jefe, 'PNG', margin + colFirmaW + 20, currentY + 6.5, colFirmaW - 40, 13);
      } catch (e) {}
    }
    if (salidaData.firma_ti) {
      try {
        doc.addImage(salidaData.firma_ti, 'PNG', margin + colFirmaW * 2 + 20, currentY + 6.5, colFirmaW - 40, 13);
      } catch (e) {}
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Empleado', margin + colFirmaW / 2, currentY + 22.5, { align: 'center' });
  doc.text('Gerente o Coordinador del area', margin + colFirmaW + colFirmaW / 2, currentY + 22.5, { align: 'center' });
  doc.text('Area de Tecnologia de la Informacion', margin + colFirmaW * 2 + colFirmaW / 2, currentY + 22.5, { align: 'center' });

  currentY += firmaBoxH + 5;

  // LEYENDAS INFERIORES DE COPIAS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Original TI', margin, currentY);
  doc.text('Copia Vigilante', margin, currentY + 3.5);
  doc.text('Copia Empleado', margin, currentY + 7);

  const filename = `Solicitud_Salida_${(salidaData.solicitante_nombre || 'Equipo').replace(/\s+/g, '_')}_${fechaSol.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * Genera el PDF de Solicitud de Cuenta Microsoft 365 (Formato SGI R1TI4 - Horizontal Landscape)
 */
export function generarFormatoM365PDF(solicitudData, opciones = {}) {
  const { firmaEnBlanco = false } = opciones;

  const doc = new jsPDF({
    orientation: 'l', // Horizontal / Landscape
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273 mm

  // --- 1. ENCABEZADO OFICIAL SGI R1TI4 ---
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 20);

  // Líneas divisorias verticales
  doc.line(margin + 50, margin, margin + 50, margin + 20);
  doc.line(margin + 210, margin, margin + 210, margin + 20);
  doc.line(margin + 245, margin, margin + 245, margin + 20);

  // Logo ITZ OIL & GAS en Columna 1
  try {
    doc.addImage(LOGO_ITZ_BASE64, 'JPEG', margin + 3, margin + 2, 44, 16);
  } catch (e) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ITZ', margin + 10, margin + 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('OIL & GAS', margin + 10, margin + 15);
  }

  // Título y Código en Columna 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CÓDIGO', margin + 130, margin + 8, { align: 'center' });
  doc.setFontSize(10);
  doc.text('R1TI4', margin + 130, margin + 15, { align: 'center' });

  // Tabla lateral derecha (Sistema, Versión, Página)
  doc.line(margin + 210, margin + 6.6, margin + contentWidth, margin + 6.6);
  doc.line(margin + 210, margin + 13.3, margin + contentWidth, margin + 13.3);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema:', margin + 212, margin + 5);
  doc.text('SGI', margin + 248, margin + 5);

  doc.text('Versión:', margin + 212, margin + 11.5);
  doc.text('00', margin + 248, margin + 11.5);

  doc.text('Página:', margin + 212, margin + 18);
  doc.text('1 de 1', margin + 248, margin + 18);

  // --- 2. BARRA AMARILLA DE TÍTULO ---
  let currentY = margin + 20;
  doc.setFillColor(245, 175, 0); // Amarillo ITZ
  doc.rect(margin, currentY, contentWidth, 10, 'F');
  doc.rect(margin, currentY, contentWidth, 10, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('SOLICITUD DE CUENTA M365 (USUARIO INTERNO)', margin + (contentWidth / 2), currentY + 4.2, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text('DEPARTAMENTO DE TECNOLOGÍAS DE LA INFORMACIÓN', margin + (contentWidth / 2), currentY + 8.2, { align: 'center' });

  currentY += 10;

  // --- 3. SECCIÓN SOLICITANTE Y METADATOS ---
  const rowH = 6.5;
  const colMidX = margin + 160;

  // 3 Filas de Metadatos
  doc.rect(margin, currentY, contentWidth, rowH * 3);
  doc.line(margin, currentY + rowH, margin + contentWidth, currentY + rowH);
  doc.line(margin, currentY + rowH * 2, margin + contentWidth, currentY + rowH * 2);
  doc.line(colMidX, currentY, colMidX, currentY + rowH * 3);

  // Formatear Fecha
  let fechaSol = '';
  if (solicitudData.fecha_solicitud) {
    const fObj = new Date(solicitudData.fecha_solicitud);
    fechaSol = !isNaN(fObj.getTime()) ? fObj.toLocaleDateString('es-MX') : String(solicitudData.fecha_solicitud);
  } else {
    fechaSol = new Date().toLocaleDateString('es-MX');
  }

  doc.setFontSize(8);

  // Fila 1
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del solicitante:', margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(solicitudData.solicitante_nombre || '', margin + 40, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('N°de Orden:', colMidX + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(solicitudData.no_orden || '', colMidX + 35, currentY + 4.5);

  // Fila 2
  doc.setFont('helvetica', 'bold');
  doc.text('Area solicitante:', margin + 3, currentY + rowH + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(solicitudData.area_solicitante || 'General', margin + 40, currentY + rowH + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de solicitud:', colMidX + 3, currentY + rowH + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaSol, colMidX + 35, currentY + rowH + 4.5);

  // Fila 3
  doc.setFont('helvetica', 'bold');
  doc.text('E-mail:', margin + 3, currentY + rowH * 2 + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(solicitudData.solicitante_email || '', margin + 40, currentY + rowH * 2 + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del proyecto:', colMidX + 3, currentY + rowH * 2 + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(solicitudData.nombre_proyecto || 'ITZ OIL & GAS', colMidX + 35, currentY + rowH * 2 + 4.5);

  currentY += rowH * 3;

  // --- 4. BARRA MORADA/GRIS: Requerimiento de Cuenta Microsoft ---
  doc.setFillColor(230, 225, 240);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Requerimiento de Cuenta Microsoft', margin + (contentWidth / 2), currentY + 4.2, { align: 'center' });

  currentY += 6;

  // --- 5. TABLA DETALLE DE LICENCIA Y EMPLEADO ---
  const reqRows = [
    { label: 'Tipo de Licencia Microsoft 365', val: solicitudData.tipo_licencia || 'Microsoft Business Standard', bold: true },
    { label: 'Nombre Completo', val: solicitudData.nombre_completo || '' },
    { label: 'Puesto', val: solicitudData.puesto || '' },
    { label: 'Departamento', val: solicitudData.departamento || '' },
    { label: 'Correo Sugerido:', val: solicitudData.correo_sugerido || '' },
    { label: 'Jefe Directo', val: solicitudData.jefe_directo || solicitudData.solicitante_nombre || '' },
    { label: 'Ciudad', val: solicitudData.ciudad || 'San Francisco de Campeche, campeche' },
    { label: 'Número Telefónico de la empresa', val: solicitudData.telefono_empresa || '' },
    { label: 'Correo Sugerido:', val: solicitudData.correo_sugerido || '' }
  ];

  const colLabelW = 85;

  reqRows.forEach((r) => {
    doc.rect(margin, currentY, contentWidth, rowH);
    doc.line(margin + colLabelW, currentY, margin + colLabelW, currentY + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(r.label, margin + 3, currentY + 4.5);

    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.text(r.val, margin + colLabelW + 4, currentY + 4.5);

    currentY += rowH;
  });

  currentY += 4;

  // --- 6. SECCIÓN DE FIRMAS (3 COLUMNAS) ---
  const firmaBoxH = 34;
  const colFirmaW = contentWidth / 3;

  doc.rect(margin, currentY, contentWidth, firmaBoxH);
  // Encabezado gris/lavanda de firmas
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.rect(margin, currentY, contentWidth, 6, 'S');

  // Líneas divisorias de columnas
  doc.line(margin + colFirmaW, currentY, margin + colFirmaW, currentY + firmaBoxH);
  doc.line(margin + colFirmaW * 2, currentY, margin + colFirmaW * 2, currentY + firmaBoxH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COORDINADOR DEL ÁREA QUE SOLICITA', margin + colFirmaW / 2, currentY + 4.2, { align: 'center' });
  doc.text('SOLICITANTE', margin + colFirmaW + colFirmaW / 2, currentY + 4.2, { align: 'center' });
  doc.text('COORDINADOR TI', margin + colFirmaW * 2 + colFirmaW / 2, currentY + 4.2, { align: 'center' });

  // Renderizar Firmas Digitales si existen y no es firma en blanco
  if (!firmaEnBlanco) {
    if (solicitudData.firma_solicitante) {
      try {
        doc.addImage(solicitudData.firma_solicitante, 'PNG', margin + 15, currentY + 7, colFirmaW - 30, 16);
      } catch (e) {}
    }
    if (solicitudData.firma_empleado) {
      try {
        doc.addImage(solicitudData.firma_empleado, 'PNG', margin + colFirmaW + 15, currentY + 7, colFirmaW - 30, 16);
      } catch (e) {}
    }
    if (solicitudData.firma_ti) {
      try {
        doc.addImage(solicitudData.firma_ti, 'PNG', margin + colFirmaW * 2 + 15, currentY + 7, colFirmaW - 30, 16);
      } catch (e) {}
    }
  }

  // Nombres y cargos debajo de la firma
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(solicitudData.solicitante_nombre || 'Jefe / Coordinador de Área', margin + colFirmaW / 2, currentY + 28, { align: 'center' });
  doc.text(solicitudData.nombre_completo || 'Empleado Solicitante', margin + colFirmaW + colFirmaW / 2, currentY + 28, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('Aceptado y firmado', margin + colFirmaW * 2 + colFirmaW / 2, currentY + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(solicitudData.coordinador_ti || 'Alejandro del Carmen Huchin Aban', margin + colFirmaW * 2 + colFirmaW / 2, currentY + 28, { align: 'center' });

  const filename = `Solicitud_Cuenta_M365_${(solicitudData.no_orden || 'R1TI4').replace(/\s+/g, '_')}_${fechaSol.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}



