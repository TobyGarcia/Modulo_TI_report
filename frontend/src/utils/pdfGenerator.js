import jsPDF from 'jspdf';

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

  // Logo / Nombre Empresa en Columna 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ITZ', margin + 8, margin + 11);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('OIL & GAS', margin + 8, margin + 16);

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ITZ', margin + 10, margin + 11);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('OIL & GAS', margin + 10, margin + 16);

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
