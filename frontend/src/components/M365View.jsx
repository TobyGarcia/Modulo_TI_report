import React, { useState, useEffect } from 'react';
import { Mail, Plus, Search, RefreshCw, FileText, Download, Edit3, Trash2, User, CheckCircle, X, ShieldAlert, Printer, Building2, Key } from 'lucide-react';
import { generarFormatoM365PDF } from '../utils/pdfGenerator';
import SignatureCanvas from './SignatureCanvas';
import Pagination from './Pagination';

const LICENCIAS_M365 = [
  'Microsoft Business Standard',
  'Microsoft Business Basic',
  'Visio',
  'Planner',
  'Power BI'
];

export default function M365View({ token, currentUser }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Auxiliares para autopoblar
  const [empleadosList, setEmpleadosList] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSolicitud, setEditingSolicitud] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    codigo_formato: 'R1TI4',
    no_orden: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    solicitante_id: null,
    solicitante_nombre: '',
    area_solicitante: '',
    solicitante_email: '',
    nombre_proyecto: 'ITZ OIL & GAS',
    tipo_licencia: 'Microsoft Business Standard',
    empleado_id: null,
    nombre_completo: '',
    puesto: '',
    departamento: 'General',
    correo_sugerido: '',
    jefe_directo: '',
    ciudad: 'San Francisco de Campeche, campeche',
    telefono_empresa: '',
    firma_solicitante: null,
    firma_empleado: null,
    firma_ti: null,
    coordinador_ti: 'Alejandro del Carmen Huchin Aban',
    estado: 'activo'
  });

  const [useDigitalSignatures, setUseDigitalSignatures] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSolicitudes = async (query = '') => {
    setLoading(true);
    try {
      let url = `/api/m365?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(Array.isArray(data) ? data : []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error al obtener solicitudes M365:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpleados = async () => {
    try {
      const res = await fetch('/api/empleados', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmpleadosList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar lista de empleados:', err);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchEmpleados();
  }, [token]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchSolicitudes(val);
  };

  const totalPages = Math.ceil(solicitudes.length / pageSize) || 1;
  const currentSolicitudes = solicitudes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Autopoblar datos del Solicitante (Jefe de área)
  const handleSelectSolicitante = (empId) => {
    if (!empId) return;
    const emp = empleadosList.find(e => e.id === parseInt(empId, 10));
    if (emp) {
      setFormData(prev => ({
        ...prev,
        solicitante_id: emp.id,
        solicitante_nombre: emp.nombre || '',
        area_solicitante: emp.area || prev.area_solicitante,
        solicitante_email: emp.email || prev.solicitante_email,
        jefe_directo: prev.jefe_directo || emp.nombre || ''
      }));
    }
  };

  // Autopoblar datos del Empleado a quien se le asigna la cuenta M365
  const handleSelectEmpleadoAsignado = (empId) => {
    if (!empId) return;
    const emp = empleadosList.find(e => e.id === parseInt(empId, 10));
    if (emp) {
      setFormData(prev => ({
        ...prev,
        empleado_id: emp.id,
        nombre_completo: emp.nombre || '',
        puesto: emp.puesto || prev.puesto,
        departamento: emp.area || prev.departamento,
        correo_sugerido: emp.email || prev.correo_sugerido
      }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingSolicitud(null);
    setFormData({
      codigo_formato: 'R1TI4',
      no_orden: '',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      solicitante_id: null,
      solicitante_nombre: '',
      area_solicitante: '',
      solicitante_email: '',
      nombre_proyecto: 'ITZ OIL & GAS',
      tipo_licencia: 'Microsoft Business Standard',
      empleado_id: null,
      nombre_completo: '',
      puesto: '',
      departamento: 'General',
      correo_sugerido: '',
      jefe_directo: '',
      ciudad: 'San Francisco de Campeche, campeche',
      telefono_empresa: '',
      firma_solicitante: null,
      firma_empleado: null,
      firma_ti: null,
      coordinador_ti: 'Alejandro del Carmen Huchin Aban',
      estado: 'activo'
    });
    setUseDigitalSignatures(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (solicitud) => {
    setEditingSolicitud(solicitud);
    setFormData({
      codigo_formato: solicitud.codigo_formato || 'R1TI4',
      no_orden: solicitud.no_orden || '',
      fecha_solicitud: solicitud.fecha_solicitud ? new Date(solicitud.fecha_solicitud).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      solicitante_id: solicitud.solicitante_id || null,
      solicitante_nombre: solicitud.solicitante_nombre || '',
      area_solicitante: solicitud.area_solicitante || '',
      solicitante_email: solicitud.solicitante_email || '',
      nombre_proyecto: solicitud.nombre_proyecto || 'ITZ OIL & GAS',
      tipo_licencia: solicitud.tipo_licencia || 'Microsoft Business Standard',
      empleado_id: solicitud.empleado_id || null,
      nombre_completo: solicitud.nombre_completo || '',
      puesto: solicitud.puesto || '',
      departamento: solicitud.departamento || 'General',
      correo_sugerido: solicitud.correo_sugerido || '',
      jefe_directo: solicitud.jefe_directo || '',
      ciudad: solicitud.ciudad || 'San Francisco de Campeche, campeche',
      telefono_empresa: solicitud.telefono_empresa || '',
      firma_solicitante: solicitud.firma_solicitante || null,
      firma_empleado: solicitud.firma_empleado || null,
      firma_ti: solicitud.firma_ti || null,
      coordinador_ti: solicitud.coordinador_ti || 'Alejandro del Carmen Huchin Aban',
      estado: solicitud.estado || 'activo'
    });
    setUseDigitalSignatures(!!(solicitud.firma_solicitante || solicitud.firma_empleado || solicitud.firma_ti));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveSolicitud = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const isEdit = !!editingSolicitud;
      const url = isEdit ? `/api/m365/${editingSolicitud.id}` : '/api/m365';
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
        let errorMsg = 'Error al guardar la solicitud de cuenta M365';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch (e) {
          errorMsg = `Error de servidor (${res.status}: ${res.statusText})`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setIsModalOpen(false);
      await fetchSolicitudes(search);
      await fetchEmpleados(); // Recargar personal por si cambió el email de un empleado
      return data;
    } catch (err) {
      console.error('Error al guardar solicitud M365:', err);
      setError(err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSolicitud = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta solicitud de cuenta M365?')) return;
    try {
      const res = await fetch(`/api/m365/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSolicitudes(search);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDownloadPDF = (solicitud, firmaEnBlanco = false) => {
    generarFormatoM365PDF(solicitud, { firmaEnBlanco });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
              <Mail className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Solicitud de Cuentas Microsoft 365</h2>
              <p className="text-xs text-gray-500 font-medium">Formato SGI R1TI4 - Asignación de licencias Business Standard, Basic, Visio, Planner, Power BI</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Solicitud M365</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por solicitante, empleado, licencia, correo, folio..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <button
          onClick={() => fetchSolicitudes(search)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition"
          title="Actualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-medium">Cargando solicitudes M365...</p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No se encontraron solicitudes de cuenta Microsoft</p>
            <p className="text-xs text-gray-400 mt-1">Haga clic en "Nueva Solicitud M365" para registrar el primer formato R1TI4.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Folio / Fecha</th>
                  <th className="py-3 px-4">Jefe Solicitante</th>
                  <th className="py-3 px-4">Empleado Asignado</th>
                  <th className="py-3 px-4">Licencia M365</th>
                  <th className="py-3 px-4">Correo Sugerido / Asignado</th>
                  <th className="py-3 px-4 text-right">Acciones (PDF Horizontal R1TI4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {currentSolicitudes.map((item) => {
                  const fechaStr = item.fecha_solicitud ? new Date(item.fecha_solicitud).toLocaleDateString('es-MX') : 'N/A';
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900">
                        <div>{item.no_orden || `M365-${item.id}`}</div>
                        <div className="text-[10px] font-normal text-gray-500">{fechaStr}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        <div className="font-bold text-gray-900">{item.solicitante_nombre || 'N/A'}</div>
                        <div className="text-[10px] text-gray-500">{item.area_solicitante || 'General'}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-bold text-gray-900">{item.nombre_completo || 'N/A'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">{item.puesto || 'N/A'} • {item.departamento || 'General'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          <Key className="w-3 h-3 mr-1 text-blue-600" />
                          {item.tipo_licencia || 'Microsoft Business Standard'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-700">
                        {item.correo_sugerido ? (
                          <span className="text-emerald-700 font-semibold">{item.correo_sugerido}</span>
                        ) : (
                          <span className="text-gray-400 italic">Pendiente por TI</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botón Imprimir Firma en Blanco */}
                          <button
                            onClick={() => handleDownloadPDF(item, true)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                            title="Imprimir PDF Horizontal con Firma en Blanco"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Botón Descargar PDF Digital */}
                          <button
                            onClick={() => handleDownloadPDF(item, false)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold text-[11px] shadow-sm"
                            title="Descargar PDF Formato Horizontal R1TI4"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF R1TI4</span>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title="Editar solicitud"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteSolicitud(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar solicitud"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={solicitudes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <h3 className="font-extrabold text-base">
                  {editingSolicitud ? 'Editar Solicitud de Cuenta M365 (Formato SGI R1TI4)' : 'Nueva Solicitud de Cuenta M365 (Formato SGI R1TI4)'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-blue-100 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSolicitud} className="p-6 space-y-6 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECCIÓN 1: DATOS DEL SOLICITANTE (JEFE DE ÁREA) */}
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/80 space-y-3">
                <h4 className="font-bold text-blue-900 flex items-center space-x-1.5 text-xs">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Información del Jefe / Coordinador de Área Solicitante:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">Seleccionar Jefe de Área:</label>
                    <select
                      onChange={(e) => handleSelectSolicitante(e.target.value)}
                      className="w-full bg-white border border-blue-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Empleado Registrado --</option>
                      {empleadosList.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} ({e.area || 'General'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Nombre del Solicitante *:</label>
                    <input
                      type="text"
                      value={formData.solicitante_nombre}
                      onChange={(e) => setFormData({ ...formData, solicitante_nombre: e.target.value })}
                      placeholder="Nombre del jefe de área"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Área Solicitante:</label>
                    <input
                      type="text"
                      value={formData.area_solicitante}
                      onChange={(e) => setFormData({ ...formData, area_solicitante: e.target.value })}
                      placeholder="Área del jefe"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">E-mail del Solicitante:</label>
                    <input
                      type="email"
                      value={formData.solicitante_email}
                      onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })}
                      placeholder="email.jefe@itzoilandgas.com"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">N° de Orden (Folio):</label>
                    <input
                      type="text"
                      value={formData.no_orden}
                      onChange={(e) => setFormData({ ...formData, no_orden: e.target.value })}
                      placeholder="Ej. M365-0001 (Auto-generado si vacío)"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Fecha de Solicitud:</label>
                    <input
                      type="date"
                      value={formData.fecha_solicitud}
                      onChange={(e) => setFormData({ ...formData, fecha_solicitud: e.target.value })}
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nombre del Proyecto / Empresa:</label>
                  <input
                    type="text"
                    value={formData.nombre_proyecto}
                    onChange={(e) => setFormData({ ...formData, nombre_proyecto: e.target.value })}
                    placeholder="Generalmente es la empresa (Ej. ITZ OIL & GAS)"
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* SECCIÓN 2: REQUERIMIENTO DE CUENTA MICROSOFT (DATOS DEL EMPLEADO DESTINO) */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Requerimiento de Cuenta Microsoft</h4>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Cargar Datos desde Empleado Registrado:</label>
                    <select
                      onChange={(e) => handleSelectEmpleadoAsignado(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Empleado Registrado --</option>
                      {empleadosList.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} ({e.puesto || 'Sin puesto'} - {e.area || 'General'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Tipo de Licencia Microsoft 365 *:</label>
                      <select
                        value={formData.tipo_licencia}
                        onChange={(e) => setFormData({ ...formData, tipo_licencia: e.target.value })}
                        className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                      >
                        {LICENCIAS_M365.map(lic => (
                          <option key={lic} value={lic}>{lic}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Nombre Completo del Empleado *:</label>
                      <input
                        type="text"
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                        placeholder="Nombre completo del nuevo empleado"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Puesto del Empleado:</label>
                      <input
                        type="text"
                        value={formData.puesto}
                        onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                        placeholder="Puesto del empleado"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Departamento:</label>
                      <input
                        type="text"
                        value={formData.departamento}
                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                        placeholder="Departamento al que pertenece"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Correo Sugerido / Asignado *:</label>
                      <input
                        type="email"
                        value={formData.correo_sugerido}
                        onChange={(e) => setFormData({ ...formData, correo_sugerido: e.target.value })}
                        placeholder="ejemplo@itzoilandgas.com"
                        className="w-full p-2 bg-blue-50 border border-blue-300 font-mono font-bold text-blue-900 rounded-xl"
                      />
                      <p className="text-[10px] text-blue-700 mt-1">
                        * Al guardar, este correo se asignará y actualizará automáticamente en el expediente de Personal.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Jefe Directo:</label>
                      <input
                        type="text"
                        value={formData.jefe_directo}
                        onChange={(e) => setFormData({ ...formData, jefe_directo: e.target.value })}
                        placeholder="Nombre del jefe directo o coordinador"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Ciudad:</label>
                      <input
                        type="text"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Teléfono de la Empresa:</label>
                      <input
                        type="text"
                        value={formData.telefono_empresa}
                        onChange={(e) => setFormData({ ...formData, telefono_empresa: e.target.value })}
                        placeholder="Ej. 981 123 4567"
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Coordinador TI:</label>
                      <input
                        type="text"
                        value={formData.coordinador_ti}
                        onChange={(e) => setFormData({ ...formData, coordinador_ti: e.target.value })}
                        className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: FIRMAS DIGITALES */}
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Firmas de Conformidad</h4>
                  <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    <input
                      type="checkbox"
                      checked={useDigitalSignatures}
                      onChange={(e) => setUseDigitalSignatures(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-blue-900 text-xs">Capturar Firmas Digitales Ahora</span>
                  </label>
                </div>

                {useDigitalSignatures && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {/* Firma Solicitante */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-center">Firma Coordinador del Área Solicitante</label>
                      <SignatureCanvas
                        value={formData.firma_solicitante}
                        onChange={(sig) => setFormData(prev => ({ ...prev, firma_solicitante: sig }))}
                      />
                      <p className="text-[10px] text-gray-500 text-center mt-1">{formData.solicitante_nombre || 'Jefe de Área'}</p>
                    </div>

                    {/* Firma Empleado */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-center">Firma Solicitante (Empleado)</label>
                      <SignatureCanvas
                        value={formData.firma_empleado}
                        onChange={(sig) => setFormData(prev => ({ ...prev, firma_empleado: sig }))}
                      />
                      <p className="text-[10px] text-gray-500 text-center mt-1">{formData.nombre_completo || 'Empleado Solicitante'}</p>
                    </div>

                    {/* Firma Coordinador TI */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 text-center">Firma Coordinador TI</label>
                      <SignatureCanvas
                        value={formData.firma_ti}
                        onChange={(sig) => setFormData(prev => ({ ...prev, firma_ti: sig }))}
                      />
                      <p className="text-[10px] text-gray-500 text-center mt-1">{formData.coordinador_ti}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie del Modal con botones */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Guardar Solicitud M365</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
