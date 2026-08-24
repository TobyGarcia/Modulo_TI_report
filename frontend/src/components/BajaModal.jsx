import React, { useState, useEffect } from 'react';
import { X, Trash2, Upload, AlertTriangle, CheckCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import { generarFormatoBajaPDF } from '../utils/pdfGenerator';

export default function BajaModal({ isOpen, onClose, equipment, token, currentUser, onBajaSuccess }) {
  const [motivo, setMotivo] = useState('Obsolescencia tecnológica');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [imagenesEvidencia, setImagenesEvidencia] = useState([]);

  // Datos del Solicitante
  const [solicitanteNombre, setSolicitanteNombre] = useState(currentUser?.nombre || '');
  const [solicitanteCargo, setSolicitanteCargo] = useState('Soporte Técnico TI');
  const [firmaSolicita, setFirmaSolicita] = useState(null);

  // Datos de Autorización (Jefe de TI)
  const [autorizaNombre, setAutorizaNombre] = useState('Alejandro del Carmen Huchin Aban');
  const [autorizaCargo, setAutorizaCargo] = useState('Jefe de TI');
  const [firmaAutoriza, setFirmaAutoriza] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo('Obsolescencia tecnológica');
      setMotivoPersonalizado('');
      setObservaciones('');
      setImagenesEvidencia([]);
      setSolicitanteNombre(currentUser?.nombre || '');
      setSolicitanteCargo('Soporte Técnico TI');
      setFirmaSolicita(null);
      setAutorizaNombre('Alejandro del Carmen Huchin Aban');
      setAutorizaCargo('Jefe de TI');
      setFirmaAutoriza(null);
      setError(null);
    }
  }, [isOpen, equipment, currentUser]);

  if (!isOpen || !equipment) return null;

  // Manejador para cargar fotos de evidencia
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (imagenesEvidencia.length + files.length > 4) {
      alert('Solo se pueden adjuntar un máximo de 4 fotografías de evidencia para el Reporte Fotográfico R3PTI1.');
    }

    files.slice(0, 4 - imagenesEvidencia.length).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenesEvidencia(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setImagenesEvidencia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const motivoFinal = motivo === 'Otro' ? motivoPersonalizado.trim() : motivo;

    if (!motivoFinal) {
      setError('Debe especificar el motivo de la baja.');
      setSubmitting(false);
      return;
    }

    if (!firmaAutoriza) {
      setError('Atención: La firma digital del Jefe de TI es obligatoria para autorizar la baja del activo.');
      setSubmitting(false);
      return;
    }

    try {
      const bajaPayload = {
        motivo: motivoFinal,
        observaciones,
        imagenes_evidencia: imagenesEvidencia,
        solicitante_nombre: solicitanteNombre || 'Técnico de TI',
        solicitante_cargo: solicitanteCargo || 'Soporte Técnico TI',
        firma_solicita: firmaSolicita,
        autoriza_nombre: autorizaNombre || 'Alejandro del Carmen Huchin Aban',
        autoriza_cargo: autorizaCargo || 'Jefe de TI',
        firma_autoriza: firmaAutoriza
      };

      const res = await fetch(`/api/bajas/equipos/${equipment.id}/baja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bajaPayload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al procesar la baja');
      }

      const data = await res.json();

      // Generar PDF R3PTI1 automáticamente
      try {
        generarFormatoBajaPDF(data.baja, data.equipo);
      } catch (pdfErr) {
        console.error('Error al generar el PDF de Baja:', pdfErr);
      }

      if (onBajaSuccess) {
        onBajaSuccess(data);
      }

      onClose();
      alert('¡Equipo dado de baja correctamente y Acta Oficial R3PTI1 generada!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6 border">
        {/* Encabezado Rojo/Ámbar de Alerta de Baja */}
        <div className="bg-gradient-to-r from-red-700 to-amber-700 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Acta de Baja de Activos TI (R3PTI1)</h2>
              <p className="text-xs text-red-100 font-mono">{equipment.hostname || 'SIN HOSTNAME'} - S/N: {equipment.serial}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen del equipo */}
          <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 grid grid-cols-2 gap-2 text-gray-700">
            <div>
              <span className="font-bold text-gray-500 block text-[10px] uppercase">Equipo / Modelo:</span>
              <span className="font-semibold text-gray-900">{equipment.marca} {equipment.modelo}</span>
            </div>
            <div>
              <span className="font-bold text-gray-500 block text-[10px] uppercase">Ubicación / Área:</span>
              <span className="font-semibold text-gray-900">{equipment.ciudad || 'Campeche'} ({equipment.area || 'General'})</span>
            </div>
          </div>

          {/* Motivo de la Baja */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 block">Motivo Principal de la Baja *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="Obsolescencia tecnológica">Obsolescencia tecnológica</option>
              <option value="Daño físico o falla de tarjeta madre irrecuperable">Daño físico o falla de tarjeta madre irrecuperable</option>
              <option value="Extravío / Robo documentado">Extravío / Robo documentado</option>
              <option value="Sustitución por renovación de inventario">Sustitución por renovación de inventario</option>
              <option value="Equipo descontinuado / Incompatible">Equipo descontinuado / Incompatible</option>
              <option value="Otro">Otro motivo (Especificar)</option>
            </select>

            {motivo === 'Otro' && (
              <input
                type="text"
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                placeholder="Especifique detalladamente la causa de baja..."
                required
                className="w-full mt-2 bg-white border border-gray-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-red-500 outline-none"
              />
            )}
          </div>

          {/* Observaciones adicionales */}
          <div>
            <label className="font-bold text-gray-800 block mb-1">Observaciones Técnicas Adicionales</label>
            <textarea
              rows="2"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles sobre el estado final, dictamen técnico o piezas recuperadas..."
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          {/* Reporte Fotográfico (Evidencia) */}
          <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border">
            <div className="flex justify-between items-center">
              <label className="font-bold text-gray-800 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Evidencia Fotográfica (Reporte R3PTI1)</span>
              </label>
              <span className="text-[10px] text-gray-500 font-semibold">{imagenesEvidencia.length} / 4 fotos</span>
            </div>

            {/* Grid de imágenes cargadas */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {imagenesEvidencia.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-300 aspect-square bg-black">
                  <img src={img} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition shadow"
                    title="Eliminar foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {imagenesEvidencia.length < 4 && (
                <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-red-50/40 transition aspect-square text-gray-400 hover:text-red-600">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold text-center leading-tight">Subir Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bloque 1: Solicitante (Técnico / Personal de TI) */}
          <div className="space-y-2 border-t pt-3">
            <h3 className="font-bold text-gray-800 uppercase text-[11px] tracking-wider text-indigo-900">
              1. Datos de Quien Solicita la Baja
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre Solicitante</label>
                <input
                  type="text"
                  value={solicitanteNombre}
                  onChange={(e) => setSolicitanteNombre(e.target.value)}
                  placeholder="Nombre de quien solicita"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Cargo</label>
                <input
                  type="text"
                  value={solicitanteCargo}
                  onChange={(e) => setSolicitanteCargo(e.target.value)}
                  placeholder="Cargo"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <SignatureCanvas
              label="Firma de Quien Solicita"
              onSave={(dataUrl) => setFirmaSolicita(dataUrl)}
            />
          </div>

          {/* Bloque 2: Autorización del Jefe de TI (Obligatorio) */}
          <div className="space-y-2 border-t pt-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
            <h3 className="font-bold text-amber-900 uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>2. Autorización del Jefe de TI (Obligatoria)</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-amber-900 block mb-1">Nombre del Jefe de TI *</label>
                <input
                  type="text"
                  value={autorizaNombre}
                  onChange={(e) => setAutorizaNombre(e.target.value)}
                  required
                  placeholder="Nombre del Jefe de TI"
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 font-medium text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-amber-900 block mb-1">Cargo *</label>
                <input
                  type="text"
                  value={autorizaCargo}
                  onChange={(e) => setAutorizaCargo(e.target.value)}
                  required
                  placeholder="Jefe de TI"
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 font-medium text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <SignatureCanvas
              label="Firma Digital de Autorización del Jefe de TI *"
              onSave={(dataUrl) => setFirmaAutoriza(dataUrl)}
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              {submitting ? (
                <span>Procesando Baja...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Autorizar Baja y Generar PDF (R3PTI1)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
