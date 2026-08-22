import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileCheck, X, Check, Laptop, Camera, Trash2, ShieldCheck, Search, Upload } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

// Helper seguro para guardar borradores en localStorage omitiendo datos pesados Base64
const saveLightDraft = (key, data) => {
  if (!key) return;
  try {
    const { imagenes_evidencia, firma_responsable, firma_tecnico, ...textOnly } = data;
    localStorage.setItem(key, JSON.stringify(textOnly));
  } catch (err) {
    try {
      // Si la memoria localStorage se llenó por residuos, vaciar únicamente borradores viejos
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('draft_report_')) localStorage.removeItem(k);
      });
    } catch (e) {}
  }
};

export default function MaintenanceReportModal({
  isOpen,
  onClose,
  onSave,
  equipment,
  equiposList = [],
  currentUser,
  existingMaintenance = null
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [selectedEq, setSelectedEq] = useState(equipment);
  const [eqSearchFilter, setEqSearchFilter] = useState('');

  const DRAFT_KEY = selectedEq ? `draft_report_${selectedEq.id}` : null;

  const [formData, setFormData] = useState({
    id: null,
    equipo_id: '',
    tipo_mantenimiento: 'preventivo',
    turno: 'Matutino',
    empleado_responsable: '',
    area_responsable: '',
    tecnico_nombre: '',
    tecnico_no_empleado: '',
    obs_procesador: 'Operativo',
    obs_ram: 'Sin fallas',
    obs_storage: 'Salud OK',
    obs_cargador: 'Funcional',
    observaciones_equipo: '',
    trabajo_realizado: '',
    material_utilizado: '',
    imagenes_evidencia: [],
    firma_responsable: null,
    firma_tecnico: null,
    auto_programar_siguiente: true
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Inicialización ÚNICA al abrir el modal o cambiar el equipo base/mantenimiento
  useEffect(() => {
    if (!isOpen) return;

    const activeEq = equipment || (equiposList.length > 0 ? equiposList[0] : null);
    setSelectedEq(activeEq);

    if (!activeEq) return;

    let savedDraft = null;
    try {
      const rawDraft = localStorage.getItem(`draft_report_${activeEq.id}`);
      if (rawDraft) savedDraft = JSON.parse(rawDraft);
    } catch (e) {
      console.error('Error al cargar borrador:', e);
    }

    if (savedDraft) {
      setFormData(prev => ({
        ...prev,
        ...savedDraft,
        id: existingMaintenance?.id || savedDraft.id || null,
        equipo_id: activeEq.id,
        imagenes_evidencia: existingMaintenance?.imagenes_evidencia
          ? (typeof existingMaintenance.imagenes_evidencia === 'string'
            ? JSON.parse(existingMaintenance.imagenes_evidencia)
            : existingMaintenance.imagenes_evidencia)
          : (prev.imagenes_evidencia || [])
      }));
    } else {
      setFormData({
        id: existingMaintenance?.id || null,
        equipo_id: activeEq.id,
        tipo_mantenimiento: existingMaintenance?.tipo_mantenimiento || 'preventivo',
        turno: existingMaintenance?.turno || 'Matutino',
        empleado_responsable: existingMaintenance?.empleado_responsable || activeEq.personal_asignado || '',
        area_responsable: existingMaintenance?.area_responsable || activeEq.area || '',
        tecnico_nombre: existingMaintenance?.tecnico_nombre || currentUser?.nombre || '',
        tecnico_no_empleado: existingMaintenance?.tecnico_no_empleado || 'TI-01',
        obs_procesador: existingMaintenance?.obs_procesador || 'Operativo',
        obs_ram: existingMaintenance?.obs_ram || 'Sin fallas',
        obs_storage: existingMaintenance?.obs_storage || 'Salud OK',
        obs_cargador: existingMaintenance?.obs_cargador || 'Funcional',
        observaciones_equipo: existingMaintenance?.observaciones_equipo || '',
        trabajo_realizado: existingMaintenance?.trabajo_realizado || '',
        material_utilizado: existingMaintenance?.material_utilizado || '',
        imagenes_evidencia: existingMaintenance?.imagenes_evidencia
          ? (typeof existingMaintenance.imagenes_evidencia === 'string'
            ? JSON.parse(existingMaintenance.imagenes_evidencia)
            : existingMaintenance.imagenes_evidencia)
          : [],
        firma_responsable: existingMaintenance?.firma_responsable || null,
        firma_tecnico: existingMaintenance?.firma_tecnico || null,
        auto_programar_siguiente: true
      });
    }
    setEqSearchFilter('');
  }, [isOpen, equipment?.id, existingMaintenance?.id]);

  // Memorización de la lista de equipos filtrados
  const filteredEquipments = useMemo(() => {
    if (!eqSearchFilter.trim()) return equiposList || [];
    const term = eqSearchFilter.toLowerCase();
    return (equiposList || []).filter(eq =>
      (eq.hostname && eq.hostname.toLowerCase().includes(term)) ||
      (eq.serial && eq.serial.toLowerCase().includes(term)) ||
      (eq.personal_asignado && eq.personal_asignado.toLowerCase().includes(term)) ||
      (eq.marca && eq.marca.toLowerCase().includes(term)) ||
      (eq.modelo && eq.modelo.toLowerCase().includes(term)) ||
      (eq.area && eq.area.toLowerCase().includes(term))
    );
  }, [equiposList, eqSearchFilter]);

  // Manejo directo de búsqueda para auto-seleccionar sin bucles de useEffect
  const handleSearchFilterChange = (e) => {
    const val = e.target.value;
    setEqSearchFilter(val);

    if (val.trim()) {
      const term = val.toLowerCase();
      const matches = (equiposList || []).filter(eq =>
        (eq.hostname && eq.hostname.toLowerCase().includes(term)) ||
        (eq.serial && eq.serial.toLowerCase().includes(term)) ||
        (eq.personal_asignado && eq.personal_asignado.toLowerCase().includes(term)) ||
        (eq.marca && eq.marca.toLowerCase().includes(term)) ||
        (eq.modelo && eq.modelo.toLowerCase().includes(term)) ||
        (eq.area && eq.area.toLowerCase().includes(term))
      );

      if (matches.length > 0 && !matches.some(eq => eq.id === selectedEq?.id)) {
        const firstMatch = matches[0];
        setSelectedEq(firstMatch);
        setFormData(prev => ({
          ...prev,
          equipo_id: firstMatch.id,
          empleado_responsable: firstMatch.personal_asignado || prev.empleado_responsable,
          area_responsable: firstMatch.area || prev.area_responsable
        }));
      }
    }
  };

  const handleSelectEquipment = (e) => {
    const eqId = parseInt(e.target.value, 10);
    const found = equiposList.find(item => item.id === eqId);
    if (found) {
      setSelectedEq(found);
      setFormData(prev => ({
        ...prev,
        equipo_id: found.id,
        empleado_responsable: found.personal_asignado || prev.empleado_responsable,
        area_responsable: found.area || prev.area_responsable
      }));
    }
  };

  // Helper seguro para actualizar formData
  const updateFormField = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (isOpen && DRAFT_KEY) {
        saveLightDraft(DRAFT_KEY, next);
      }
      return next;
    });
  };

  const handleClose = () => {
    if (DRAFT_KEY) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {}
    }
    onClose();
  };

  // Procesamiento altamente compatible con móviles usando FileReader
  const processSingleFile = (file) => {
    return new Promise((resolve) => {
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onerror = (err) => {
        console.error('Error al leer archivo en FileReader:', err);
        resolve(null);
      };
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (!dataUrl) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.onerror = (err) => {
          console.error('Error al cargar imagen en objeto Image:', err);
          resolve(dataUrl); // Retornar dataUrl original si falla el objeto Image
        };
        img.onload = () => {
          try {
            const maxDim = 600;
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', 0.55);
            img.onload = null;
            img.onerror = null;
            canvas.width = 0;
            canvas.height = 0;
            resolve(compressed || dataUrl);
          } catch (err) {
            console.error('Error al comprimir en canvas:', err);
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageCapture = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingImage(true);
    try {
      const compressedResults = [];
      for (const file of files) {
        const result = await processSingleFile(file);
        if (result) compressedResults.push(result);
      }

      if (compressedResults.length > 0) {
        setFormData((prev) => {
          const nextImgs = [...prev.imagenes_evidencia, ...compressedResults];
          const updated = { ...prev, imagenes_evidencia: nextImgs };
          if (DRAFT_KEY) {
            saveLightDraft(DRAFT_KEY, updated);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Error al procesar imágenes de evidencia:', err);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const nextImgs = prev.imagenes_evidencia.filter((_, i) => i !== index);
      const updated = { ...prev, imagenes_evidencia: nextImgs };
      if (DRAFT_KEY) {
        saveLightDraft(DRAFT_KEY, updated);
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.trabajo_realizado.trim()) {
      alert('Por favor ingrese la descripción del trabajo realizado.');
      return;
    }
    if (DRAFT_KEY) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {}
    }
    onSave(formData);
  };

  if (!isOpen || !selectedEq) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col">
        {/* Encabezado SGI R2PTI1 */}
        <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-purple-800 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5" />
            <div>
              <h2 className="font-bold text-base">Reporte de Mantenimiento (SGI R2PTI1)</h2>
              <p className="text-[11px] text-indigo-200">Sistema de Gestión Integral • Versión 02</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Selector de Equipo de la Base de Datos con Búsqueda */}
          {equiposList.length > 0 && (
            <div className="space-y-2 border-b pb-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Seleccionar Equipo de la Base de Datos
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por Hostname, Serial, Personal, Área, Marca..."
                  value={eqSearchFilter}
                  onChange={handleSearchFilterChange}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={selectedEq?.id || ''}
                onChange={handleSelectEquipment}
                className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {filteredEquipments.length === 0 ? (
                  <option value="">No se encontraron equipos con esa búsqueda</option>
                ) : (
                  filteredEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.hostname || 'SIN HOSTNAME'}] - Serial: {eq.serial} ({eq.marca} {eq.modelo}) - Asignado: {eq.personal_asignado || 'N/A'}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Ficha Resumen del Equipo Seleccionado */}
          {selectedEq && (
            <div className="bg-gray-50 rounded-xl p-3 border text-xs space-y-1">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b pb-1">
                <span className="flex items-center space-x-1">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>{selectedEq.hostname || 'SIN HOSTNAME'}</span>
                </span>
                <span className="font-mono text-indigo-700">Serial: {selectedEq.serial}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-gray-600">
                <div><span className="font-semibold">Marca/Modelo:</span> {selectedEq.marca} {selectedEq.modelo}</div>
                <div><span className="font-semibold">SO:</span> {selectedEq.so || 'N/A'}</div>
                <div><span className="font-semibold">Responsable:</span> {selectedEq.personal_asignado || 'No asignado'}</div>
                <div><span className="font-semibold">Área:</span> {selectedEq.area || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* Configuración Mantenimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Mantenimiento</label>
              <select
                value={formData.tipo_mantenimiento}
                onChange={(e) => updateFormField('tipo_mantenimiento', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Turno</label>
              <select
                value={formData.turno}
                onChange={(e) => updateFormField('turno', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Nocturno">Nocturno</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Área del Responsable</label>
              <input
                type="text"
                value={formData.area_responsable}
                onChange={(e) => updateFormField('area_responsable', e.target.value)}
                placeholder="Ej. Procura, Sistemas..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Datos del Personal y Técnico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Empleado / Responsable del Equipo</label>
              <input
                type="text"
                value={formData.empleado_responsable}
                onChange={(e) => updateFormField('empleado_responsable', e.target.value)}
                placeholder="Nombre del usuario que utiliza el equipo"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Técnico TI</label>
                <input
                  type="text"
                  value={formData.tecnico_nombre}
                  onChange={(e) => updateFormField('tecnico_nombre', e.target.value)}
                  placeholder="Nombre técnico"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">No. Empleado TI</label>
                <input
                  type="text"
                  value={formData.tecnico_no_empleado}
                  onChange={(e) => updateFormField('tecnico_no_empleado', e.target.value)}
                  placeholder="Ej: TI-01"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Checklist de Hardware (4 Columnas) */}
          <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
            <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
              Checklist de Estado Físico y Operativo
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Procesador</label>
                <input
                  type="text"
                  value={formData.obs_procesador}
                  onChange={(e) => updateFormField('obs_procesador', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Memoria RAM</label>
                <input
                  type="text"
                  value={formData.obs_ram}
                  onChange={(e) => updateFormField('obs_ram', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Almacenamiento</label>
                <input
                  type="text"
                  value={formData.obs_storage}
                  onChange={(e) => updateFormField('obs_storage', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Cargador / Adaptador</label>
                <input
                  type="text"
                  value={formData.obs_cargador}
                  onChange={(e) => updateFormField('obs_cargador', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Trabajo Realizado y Repuestos */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Trabajo Realizado <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                value={formData.trabajo_realizado}
                onChange={(e) => updateFormField('trabajo_realizado', e.target.value)}
                placeholder="Detalle las acciones realizadas: limpieza física, depuración de sistema, cambio de piezas, formateo, etc."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Material Utilizado / Repuestos</label>
              <input
                type="text"
                value={formData.material_utilizado}
                onChange={(e) => updateFormField('material_utilizado', e.target.value)}
                placeholder="Ej: Aire comprimido, alcohol isopropílico, SSD 500GB, pasta térmica..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones Generales</label>
              <input
                type="text"
                value={formData.observaciones_equipo}
                onChange={(e) => updateFormField('observaciones_equipo', e.target.value)}
                placeholder="Observaciones adicionales sobre el estado del equipo"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Fotos de Evidencia */}
          <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Imágenes de Prueba / Evidencias ({formData.imagenes_evidencia.length})</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-600 flex items-center space-x-1 shadow-sm transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Tomar Foto (Cámara)</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center space-x-1 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Galería / Archivos</span>
                </button>
              </div>
            </div>

            {uploadingImage && (
              <p className="text-[11px] text-indigo-600 animate-pulse font-medium">Procesando y optimizando imagen de evidencia...</p>
            )}

            {formData.imagenes_evidencia.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {formData.imagenes_evidencia.map((imgSrc, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border bg-white aspect-square">
                    <img src={imgSrc} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opción de Ciclo Automático a 6 Meses */}
          <div className="bg-indigo-50/80 rounded-xl p-3.5 border border-indigo-200 text-xs space-y-1.5">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_programar_siguiente ?? true}
                onChange={(e) => updateFormField('auto_programar_siguiente', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
              />
              <div>
                <span className="font-bold text-indigo-900 block">Agendar automáticamente el siguiente ciclo a 6 meses</span>
                <p className="text-indigo-700 text-[11px] leading-relaxed">
                  Calcula automáticamente la fecha del próximo mantenimiento preventivo (ajustado de Lunes a Sábado). La hora se marcará como <i>Pendiente</i> para asignación del coordinador.
                </p>
              </div>
            </label>
          </div>

          {/* Firmas Digitales de Conformidad */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Firmas Digitales de Conformidad (SGI)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">Firma del Usuario / Responsable</span>
                <SignatureCanvas
                  savedSignature={formData.firma_responsable}
                  onSave={(sigData) => updateFormField('firma_responsable', sigData)}
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">Firma del Técnico de TI</span>
                <SignatureCanvas
                  savedSignature={formData.firma_tecnico}
                  onSave={(sigData) => updateFormField('firma_tecnico', sigData)}
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-2 pt-3 border-t shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Reporte y Finalizar</span>
            </button>
          </div>
        </form>

        {/* Inputs de captura de archivo fuera del formulario para inmunidad absoluta contra submit indeseados */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
        />

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageCapture}
          className="hidden"
        />
      </div>
    </div>
  );
}
