import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, RefreshCw, UserCheck, Laptop, Edit3, Trash2, Building2, MapPin, X, Check } from 'lucide-react';

export default function EmployeeManagement({ token }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    area: 'General',
    empresa: 'ITZ OIL & GAS',
    no_empleado: '',
    puesto: '',
    email: ''
  });

  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/empleados?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al obtener empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchEmployees(val);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      nombre: '',
      area: 'General',
      empresa: 'ITZ OIL & GAS',
      no_empleado: '',
      puesto: '',
      email: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      nombre: emp.nombre || '',
      area: emp.area || 'General',
      empresa: emp.empresa || 'ITZ OIL & GAS',
      no_empleado: emp.no_empleado || '',
      puesto: emp.puesto || '',
      email: emp.email || ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const isEdit = !!editingEmployee;
      const url = isEdit ? `/api/empleados/${editingEmployee.id}` : '/api/empleados';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar el empleado');
      }

      setIsModalOpen(false);
      fetchEmployees(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este empleado? Sus equipos pasarán a estado de Resguardo.')) return;

    try {
      const res = await fetch(`/api/empleados/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEmployees(search);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error('Error al eliminar empleado:', err);
    }
  };

  const handleViewEmployeeDetail = async (id) => {
    try {
      const res = await fetch(`/api/empleados/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedEmployeeDetail(data);
      }
    } catch (err) {
      console.error('Error al ver detalle de empleado:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Gestión de Personal & Empleados</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administración centralizada de empleados para asignación de equipos y responsivas.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Personal de Ingreso</span>
        </button>
      </div>

      {/* Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por Nombre, Área, Empresa o No. Empleado..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>

        <button
          onClick={() => fetchEmployees(search)}
          className="p-2.5 bg-white border rounded-xl hover:bg-gray-50 text-gray-600 transition"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Cargando empleados...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-600 font-medium">No se encontraron empleados registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4">Nombre del Empleado</th>
                  <th className="p-4">Área / Departamento</th>
                  <th className="p-4">Empresa</th>
                  <th className="p-4">No. Empleado / Puesto</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-indigo-50/40 transition">
                    <td className="p-4 font-semibold text-gray-900">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{emp.nombre}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {emp.area || 'General'}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {emp.empresa || 'ITZ OIL & GAS'}
                    </td>
                    <td className="p-4 text-xs text-gray-500 font-mono">
                      <div>{emp.no_empleado ? `ID: ${emp.no_empleado}` : 'Sin código'}</div>
                      <div className="text-gray-400 font-sans">{emp.puesto || ''}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewEmployeeDetail(emp.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition text-xs font-semibold flex items-center space-x-1"
                          title="Ver Equipos Asignados"
                        >
                          <Laptop className="w-4 h-4" />
                          <span>Ver Equipos</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Alta / Edición de Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Personal de Ingreso'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Carlos Martínez Pérez"
                  required
                  className="w-full bg-white border rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Área / Departamento</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Ej. Operaciones"
                    className="w-full bg-white border rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Empresa</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    placeholder="Ej. ITZ OIL & GAS"
                    className="w-full bg-white border rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">No. de Empleado (Opcional)</label>
                  <input
                    type="text"
                    value={formData.no_empleado}
                    onChange={(e) => setFormData({ ...formData, no_empleado: e.target.value })}
                    placeholder="Ej. EMP-0102"
                    className="w-full bg-white border rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Puesto (Opcional)</label>
                  <input
                    type="text"
                    value={formData.puesto}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                    placeholder="Ej. Analista"
                    className="w-full bg-white border rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                >
                  {submitting ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Equipos Asignados */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedEmployeeDetail.nombre}</h3>
                <p className="text-xs text-gray-500">{selectedEmployeeDetail.area} • {selectedEmployeeDetail.empresa}</p>
              </div>
              <button onClick={() => setSelectedEmployeeDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Equipos Actualmente Asignados ({selectedEmployeeDetail.equipos_asignados?.length || 0})
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {!selectedEmployeeDetail.equipos_asignados || selectedEmployeeDetail.equipos_asignados.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Este empleado no tiene equipos asignados actualmente.</p>
              ) : (
                selectedEmployeeDetail.equipos_asignados.map(eq => (
                  <div key={eq.id} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-indigo-950">{eq.hostname || 'SIN HOSTNAME'}</div>
                      <div className="text-gray-500 font-mono">S/N: {eq.serial} ({eq.marca} {eq.modelo})</div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                      {eq.estado_nombre || 'Asignado'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedEmployeeDetail(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
