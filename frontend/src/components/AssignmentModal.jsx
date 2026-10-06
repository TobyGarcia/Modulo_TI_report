import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, CheckCircle, Laptop, FileText } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

export default function AssignmentModal({ isOpen, onClose, equipment, token, onAssignmentSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isNewEmployee, setIsNewEmployee] = useState(false);

  // Datos para nuevo empleado
  const [newEmployeeData, setNewEmployeeData] = useState({
    nombre: '',
    area: equipment?.area || 'General',
    empresa: equipment?.empresa || 'ITZ OIL & GAS'
  });

  const [observaciones, setObservaciones] = useState('Entrega de equipo de cómputo y accesorios');
  const [firmaEmpleado, setFirmaEmpleado] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetch('/api/catalogos', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const registeredCompanies = Array.isArray(data?.empresas) ? data.empresas : [];
          setCompanies(registeredCompanies);
          const matchingCompany = registeredCompanies.find(company => company.acronimo === equipment?.empresa);
          if (matchingCompany) {
            setNewEmployeeData(current => ({ ...current, empresa: matchingCompany.nombre }));
          }
        })
        .catch(err => console.error('Error al cargar empresas:', err));
      setSelectedEmployeeId('');
      setIsNewEmployee(false);
      setNewEmployeeData({
        nombre: '',
        area: equipment?.area || 'General',
        empresa: equipment?.empresa || 'ITZ OIL & GAS'
      });
      setObservaciones('Entrega de equipo de cómputo y accesorios');
      setFirmaEmpleado(null);
      setError(null);
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
      let targetEmployeeId = selectedEmployeeId;

      // Si es un nuevo empleado, registrarlo primero en /api/empleados
      if (isNewEmployee) {
        if (!newEmployeeData.nombre.trim()) {
          throw new Error('El nombre del nuevo empleado es obligatorio');
        }

        const resEmp = await fetch('/api/empleados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newEmployeeData)
        });

        if (!resEmp.ok) {
          const errEmp = await resEmp.json();
          throw new Error(errEmp.error || 'Error al registrar nuevo empleado');
        }

        const createdEmp = await resEmp.json();
        targetEmployeeId = createdEmp.id;
      }

      if (!targetEmployeeId) {
        throw new Error('Debe seleccionar un empleado para realizar la asignación');
      }

      // Enviar asignación
      const resAsig = await fetch(`/api/asignaciones/equipos/${equipment.id}/asignar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          empleado_id: targetEmployeeId,
          observaciones,
          firma_empleado: firmaEmpleado
        })
      });

      if (!resAsig.ok) {
        const errAsig = await resAsig.json();
        throw new Error(errAsig.error || 'Error al procesar asignación');
      }

      const resultData = await resAsig.json();
      onAssignmentSuccess(resultData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-8 border">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Laptop className="w-6 h-6 text-indigo-200" />
            <div>
              <h2 className="font-bold text-lg leading-tight">Asignación de Equipo</h2>
              <p className="text-xs text-indigo-200 font-mono">{equipment.hostname} ({equipment.serial})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 font-semibold">
              {error}
            </div>
          )}

          {/* Toggle Modo: Empleado Existente vs Nuevo Personal de Ingreso */}
          <div className="flex bg-gray-100 p-1 rounded-xl font-bold">
            <button
              type="button"
              onClick={() => setIsNewEmployee(false)}
              className={`flex-1 py-2 text-center rounded-lg transition flex items-center justify-center space-x-1 ${
                !isNewEmployee ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Personal Existente</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewEmployee(true)}
              className={`flex-1 py-2 text-center rounded-lg transition flex items-center justify-center space-x-1 ${
                isNewEmployee ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Ingreso</span>
            </button>
          </div>

          {/* Opción 1: Seleccionar Empleado Existente */}
          {!isNewEmployee ? (
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">Seleccionar Empleado Responsable *</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                required={!isNewEmployee}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Seleccionar de la lista --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} ({emp.area || 'Sin área'} - {emp.empresa || 'ITZ'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Opción 2: Formulario Nuevo Personal de Ingreso */
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <h3 className="font-bold text-indigo-900 flex items-center space-x-1">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Datos del Nuevo Personal de Ingreso</span>
              </h3>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre Completo del Empleado *</label>
                <input
                  type="text"
                  value={newEmployeeData.nombre}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez García"
                  required={isNewEmployee}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Área / Departamento</label>
                  <input
                    type="text"
                    value={newEmployeeData.area}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, area: e.target.value })}
                    placeholder="Ej. Operaciones"
                    className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Empresa (nombre completo)</label>
                  <input
                    type="text"
                    list="assignment-companies-list"
                    value={newEmployeeData.empresa}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, empresa: e.target.value })}
                    placeholder="Ej. ITZ OIL & GAS"
                    className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <datalist id="assignment-companies-list">
                    {companies.map(company => <option key={company.id} value={company.nombre} />)}
                  </datalist>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">Observaciones / Accesorios Entregados</label>
            <textarea
              rows="2"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Se entrega con cargador original, funda y mouse."
              className="w-full bg-white border border-gray-300 rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Firma Digital del Empleado */}
          <SignatureCanvas
            label="Firma de Conformidad del Empleado"
            onSave={(dataUrl) => setFirmaEmpleado(dataUrl)}
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
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              {submitting ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Asignar y Descargar PDF (R1PTI2)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
