import React, { useState, useEffect } from 'react';
import { X, LogOut, ArrowRightLeft, CheckCircle, Laptop, UserCheck, AlertCircle } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

export default function UnassignmentModal({ isOpen, onClose, equipment, token, onUnassignmentSuccess }) {
  const [motivo, setMotivo] = useState('Cambio de equipo');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observaciones, setObservaciones] = useState('Devolución de equipo a resguardo por cambio/baja.');
  const [firmaEmpleado, setFirmaEmpleado] = useState(null);
  const [firmaTi, setFirmaTi] = useState(null);

  // Modo Reasignación directa
  const [isReassign, setIsReassign] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [nuevoEmpleadoId, setNuevoEmpleadoId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo('Cambio de equipo');
      setMotivoCustom('');
      setObservaciones('Devolución de equipo a resguardo.');
      setFirmaEmpleado(null);
      setFirmaTi(null);
      setIsReassign(false);
      setNuevoEmpleadoId('');
      setError(null);
      fetchEmployees();
    }
  }, [isOpen, equipment]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/empleados', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    }
  };

  if (!isOpen || !equipment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const motivoFinal = motivo === 'Otro' ? (motivoCustom.trim() || 'Desasignación de equipo') : motivo;

      if (isReassign) {
        if (!nuevoEmpleadoId) {
          throw new Error('Debe seleccionar el nuevo empleado para la reasignación');
        }

        const resRe = await fetch(`/api/asignaciones/equipos/${equipment.id}/reasignar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            nuevo_empleado_id: nuevoEmpleadoId,
            motivo_desasignacion: motivoFinal,
            observaciones,
            firma_empleado: firmaEmpleado,
            firma_ti: firmaTi
          })
        });

        if (!resRe.ok) {
          const errRe = await resRe.json();
          throw new Error(errRe.error || 'Error al reasignar equipo');
        }

        const dataRe = await resRe.json();
        onUnassignmentSuccess({ ...dataRe, isReassign: true });
      } else {
        // Desasignación normal (pasar a Resguardo)
        const resDes = await fetch(`/api/asignaciones/equipos/${equipment.id}/desasignar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            motivo: motivoFinal,
            observaciones,
            firma_empleado: firmaEmpleado,
            firma_ti: firmaTi
          })
        });

        if (!resDes.ok) {
          const errDes = await resDes.json();
          throw new Error(errDes.error || 'Error al desasignar equipo');
        }

        const dataDes = await resDes.json();
        onUnassignmentSuccess({ ...dataDes, isReassign: false });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-gray-100 max-h-[92vh] flex flex-col">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-amber-600 to-red-600 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <LogOut className="w-6 h-6 text-amber-200" />
            <div>
              <h2 className="font-bold text-base leading-tight">Desasignación / Reasignación</h2>
              <p className="text-xs text-amber-100 font-mono">{equipment.hostname} ({equipment.serial})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition flex items-center justify-center"
            title="Cerrar ventana (X)"
          >
            <X className="w-6 h-6 font-bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 font-semibold">
              {error}
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 font-medium">
            <strong>Asignado actualmente a:</strong> {equipment.empleado_nombre || equipment.personal_asignado || 'N/A'}
          </div>

          {/* Motivo de Desasignación */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Motivo de Desasignación *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="Cambio de equipo">Cambio de equipo (Por defecto)</option>
              <option value="Baja de empleado">Baja de empleado</option>
              <option value="Mantenimiento / Reparación">Mantenimiento / Reparación</option>
              <option value="Devolución a inventario / Resguardo">Devolución a inventario / Resguardo</option>
              <option value="Otro">Otro motivo (Especificar)</option>
            </select>
          </div>

          {motivo === 'Otro' && (
            <div>
              <label className="font-bold text-gray-700 block mb-1">Especifique el motivo *</label>
              <input
                type="text"
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                placeholder="Escriba la razón de la desasignación..."
                required
                className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          )}

          {/* Opción de Reasignación Directa */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
            <label className="flex items-center space-x-2 font-bold text-indigo-900 cursor-pointer">
              <input
                type="checkbox"
                checked={isReassign}
                onChange={(e) => setIsReassign(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="flex items-center space-x-1">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>¿Reasignar inmediatamente a otro personal?</span>
              </span>
            </label>

            {isReassign && (
              <div className="pt-2">
                <label className="font-bold text-gray-700 block mb-1">Seleccionar Nuevo Empleado *</label>
                <select
                  value={nuevoEmpleadoId}
                  onChange={(e) => setNuevoEmpleadoId(e.target.value)}
                  required={isReassign}
                  className="w-full bg-white border border-indigo-300 rounded-xl p-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Nuevo Empleado --</option>
                  {employees
                    .filter(emp => emp.id !== equipment.empleado_id)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre} ({emp.area || 'Sin área'})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">Observaciones de la Devolución</label>
            <textarea
              rows="2"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Se recibe el equipo en buen estado con todos sus accesorios."
              className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Firmas Digitales */}
          <SignatureCanvas
            label="Firma de Entrega (Empleado)"
            onSave={(dataUrl) => setFirmaEmpleado(dataUrl)}
          />

          <SignatureCanvas
            label="Firma de Recepción (Personal TI)"
            onSave={(dataUrl) => setFirmaTi(dataUrl)}
          />

          {/* Acciones */}
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
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              {submitting ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{isReassign ? 'Reasignar y Generar PDFs' : 'Desasignar (Pasa a Resguardo)'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
