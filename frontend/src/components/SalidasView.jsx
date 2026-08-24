import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Search, RefreshCw, FileText, Download, Edit3, Trash2, Calendar, User, MapPin, CheckCircle, X, ShieldAlert, PlusCircle, Printer } from 'lucide-react';
import { generarFormatoSalidaPDF } from '../utils/pdfGenerator';
import SignatureCanvas from './SignatureCanvas';
import Pagination from './Pagination';

export default function SalidasView({ token, currentUser }) {
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Auxiliares para autopoblar
  const [empleadosList, setEmpleadosList] = useState([]);
  const [equiposList, setEquiposList] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalida, setEditingSalida] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    requisicion: '',
    lugar_emision: 'san Francisco de Campeche, Campeche',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    tipo_solicitud: 'temporal',
    solicitante_nombre: '',
    solicitante_email: '',
    solicitante_puesto: '',
    departamento: 'General',
    jefe_inmediato: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_termino: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    direccion_resguardo: '',
    observaciones: '',
    equipos_json: [
      { cantidad: 1, tipo_equipo: 'Laptop', modelo_serial: '', marca: '' }
    ],
    equipo_id: null,
    empleado_id: null,
    firma_empleado: null,
    firma_jefe: null,
    firma_ti: null,
    estado: 'activo'
  });

  const [useDigitalSignatures, setUseDigitalSignatures] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchSalidas = async (query = '', estado = '') => {
    setLoading(true);
    try {
      let url = `/api/salidas?q=${encodeURIComponent(query)}`;
      if (estado) url += `&estado=${encodeURIComponent(estado)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSalidas(Array.isArray(data) ? data : []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error al obtener pases de salida:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaries = async () => {
    try {
      const [empRes, eqRes] = await Promise.all([
        fetch('/api/empleados', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/equipos', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (empRes.ok) {
        const dataEmp = await empRes.json();
        setEmpleadosList(Array.isArray(dataEmp) ? dataEmp : []);
      }
      if (eqRes.ok) {
        const dataEq = await eqRes.json();
        setEquiposList(Array.isArray(dataEq) ? dataEq : []);
      }
    } catch (err) {
      console.error('Error al cargar datos auxiliares:', err);
    }
  };

  useEffect(() => {
    fetchSalidas();
    fetchAuxiliaries();
  }, [token]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchSalidas(val, filterEstado);
  };

  const handleFilterEstadoChange = (e) => {
    const val = e.target.value;
    setFilterEstado(val);
    fetchSalidas(search, val);
  };

  const totalPages = Math.ceil(salidas.length / pageSize) || 1;
  const currentSalidas = salidas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Autopoblar desde Empleado Seleccionado
  const handleSelectEmpleado = (empId) => {
    if (!empId) return;
    const emp = empleadosList.find(e => e.id === parseInt(empId, 10));
    if (emp) {
      setFormData(prev => ({
        ...prev,
        empleado_id: emp.id,
        solicitante_nombre: emp.nombre || '',
        solicitante_email: emp.email || '',
        departamento: emp.area || prev.departamento,
        solicitante_puesto: emp.puesto || prev.solicitante_puesto
      }));
    }
  };

  // Autopoblar desde Equipo Seleccionado
  const handleSelectEquipo = (eqId) => {
    if (!eqId) return;
    const eq = equiposList.find(e => e.id === parseInt(eqId, 10));
    if (eq) {
      const mainItem = {
        cantidad: 1,
        tipo_equipo: 'Laptop',
        modelo_serial: `${eq.modelo || ''} / ${eq.serial || ''}`.trim(),
        marca: eq.marca || ''
      };

      setFormData(prev => {
        // Mantener otros ítems accesorios si ya fueron agregados
        const otherItems = (prev.equipos_json || []).slice(1);
        return {
          ...prev,
          equipo_id: eq.id,
          solicitante_nombre: prev.solicitante_nombre || eq.personal_asignado || '',
          departamento: eq.area || prev.departamento,
          equipos_json: [mainItem, ...otherItems]
        };
      });
    }
  };

  // Manejar cambio de tipo de solicitud (Temporal / Permanente)
  const handleTipoSolicitudChange = (tipo) => {
    const fechaIniObj = formData.fecha_inicio ? new Date(formData.fecha_inicio) : new Date();
    let fechaTerminoStr = formData.fecha_termino;

    if (tipo === 'permanente') {
      // Para pase permanente es un periodo de renovación de 6 meses por defecto
      const seisMesesDespues = new Date(fechaIniObj);
      seisMesesDespues.setMonth(seisMesesDespues.getMonth() + 6);
      fechaTerminoStr = seisMesesDespues.toISOString().split('T')[0];
    } else {
      const unMesDespues = new Date(fechaIniObj);
      unMesDespues.setMonth(unMesDespues.getMonth() + 1);
      fechaTerminoStr = unMesDespues.toISOString().split('T')[0];
    }

    setFormData(prev => ({
      ...prev,
      tipo_solicitud: tipo,
      fecha_termino: fechaTerminoStr
    }));
  };

  // Manejar cambio en la lista de equipos / accesorios
  const handleItemChange = (index, field, value) => {
    const updated = [...formData.equipos_json];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, equipos_json: updated }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      equipos_json: [
        ...prev.equipos_json,
        { cantidad: 1, tipo_equipo: 'Mouse Bluetooth / Accesorio', modelo_serial: '', marca: '' }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.equipos_json.length <= 1) return;
    const updated = formData.equipos_json.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, equipos_json: updated }));
  };

  const handleOpenAddModal = () => {
    setEditingSalida(null);
    setFormData({
      requisicion: '',
      lugar_emision: 'san Francisco de Campeche, Campeche',
      fecha_solicitud: new Date().toISOString().split('T')[0],
      tipo_solicitud: 'temporal',
      solicitante_nombre: '',
      solicitante_email: '',
      solicitante_puesto: '',
      departamento: 'General',
      jefe_inmediato: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_termino: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      direccion_resguardo: '',
      observaciones: '',
      equipos_json: [
        { cantidad: 1, tipo_equipo: 'Laptop', modelo_serial: '', marca: '' }
      ],
      equipo_id: null,
      empleado_id: null,
      firma_empleado: null,
      firma_jefe: null,
      firma_ti: null,
      estado: 'activo'
    });
    setUseDigitalSignatures(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (salida) => {
    setEditingSalida(salida);
    const parsedEquipos = Array.isArray(salida.equipos_json) 
      ? salida.equipos_json 
      : typeof salida.equipos_json === 'string' 
        ? JSON.parse(salida.equipos_json || '[]') 
        : [{ cantidad: 1, tipo_equipo: 'Laptop', modelo_serial: '', marca: '' }];

    setFormData({
      requisicion: salida.requisicion || '',
      lugar_emision: salida.lugar_emision || 'san Francisco de Campeche, Campeche',
      fecha_solicitud: salida.fecha_solicitud ? new Date(salida.fecha_solicitud).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tipo_solicitud: salida.tipo_solicitud || 'temporal',
      solicitante_nombre: salida.solicitante_nombre || '',
      solicitante_email: salida.solicitante_email || '',
      solicitante_puesto: salida.solicitante_puesto || '',
      departamento: salida.departamento || 'General',
      jefe_inmediato: salida.jefe_inmediato || '',
      fecha_inicio: salida.fecha_inicio ? new Date(salida.fecha_inicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      fecha_termino: salida.fecha_termino ? new Date(salida.fecha_termino).toISOString().split('T')[0] : '',
      direccion_resguardo: salida.direccion_resguardo || '',
      observaciones: salida.observaciones || '',
      equipos_json: parsedEquipos.length > 0 ? parsedEquipos : [{ cantidad: 1, tipo_equipo: 'Laptop', modelo_serial: '', marca: '' }],
      equipo_id: salida.equipo_id || null,
      empleado_id: salida.empleado_id || null,
      firma_empleado: salida.firma_empleado || null,
      firma_jefe: salida.firma_jefe || null,
      firma_ti: salida.firma_ti || null,
      estado: salida.estado || 'activo'
    });
    setUseDigitalSignatures(!!(salida.firma_empleado || salida.firma_jefe || salida.firma_ti));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveSalida = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const isEdit = !!editingSalida;
      const url = isEdit ? `/api/salidas/${editingSalida.id}` : '/api/salidas';
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
        throw new Error(errData.error || 'Error al guardar la solicitud de salida');
      }

      const data = await res.json();
      setIsModalOpen(false);
      await fetchSalidas(search, filterEstado);
      return data;
    } catch (err) {
      console.error('Error al guardar solicitud de salida:', err);
      setError(err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSalida = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta solicitud de salida?')) return;
    try {
      const res = await fetch(`/api/salidas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSalidas(search, filterEstado);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDownloadPDF = (salida, firmaEnBlanco = false) => {
    const parsedEquipos = Array.isArray(salida.equipos_json)
      ? salida.equipos_json
      : typeof salida.equipos_json === 'string'
        ? JSON.parse(salida.equipos_json || '[]')
        : [];

    generarFormatoSalidaPDF({
      ...salida,
      equipos_json: parsedEquipos
    }, { firmaEnBlanco });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Título y Acciones de Encabezado */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <ExternalLink className="w-6 h-6 text-[#c68a1d]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Salidas de Equipos Informáticos</h2>
              <p className="text-xs text-gray-500 font-medium">Formato SGI R1PTI3 - Pases de salida para trabajo remoto, home office o traslados foráneos</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#e6b520] hover:bg-[#d0a11b] text-black font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg border border-[#c68a1d]"
        >
          <Plus className="w-4 h-4 text-black stroke-[3]" />
          <span>Nueva Solicitud de Salida</span>
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
            placeholder="Buscar por solicitante, serie, modelo, dept..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#e6b520] focus:border-black focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={filterEstado}
            onChange={handleFilterEstadoChange}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todos los Estados</option>
            <option value="activo">Activos</option>
            <option value="vencido">Vencidos</option>
            <option value="finalizado">Finalizados</option>
          </select>

          <button
            onClick={() => fetchSalidas(search, filterEstado)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition"
            title="Actualizar tabla"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla de Pases de Salida */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-xs font-medium">Cargando pases de salida...</p>
          </div>
        ) : salidas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No se encontraron solicitudes de salida</p>
            <p className="text-xs text-gray-400 mt-1">Haga clic en "Nueva Solicitud de Salida" para registrar el primer pase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Solicitante / Depto.</th>
                  <th className="py-3 px-4">Tipo & Vigencia</th>
                  <th className="py-3 px-4">Equipos / Serie</th>
                  <th className="py-3 px-4">Lugar Resguardo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones (PDF SGI R1PTI3)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {currentSalidas.map((item) => {
                  const equiposArr = Array.isArray(item.equipos_json) 
                    ? item.equipos_json 
                    : typeof item.equipos_json === 'string'
                      ? JSON.parse(item.equipos_json || '[]')
                      : [];

                  const esPermanente = item.tipo_solicitud === 'permanente';
                  const fechaIni = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX') : 'N/A';
                  const fechaFin = item.fecha_termino ? new Date(item.fecha_termino).toLocaleDateString('es-MX') : 'Indefinido';

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-amber-600" />
                          <div>
                            <p className="font-bold text-gray-900">{item.solicitante_nombre || 'N/A'}</p>
                            <p className="text-[10px] text-gray-500 font-normal">{item.departamento || 'General'} • {item.solicitante_puesto || 'Solicitante'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          esPermanente ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.tipo_solicitud || 'Temporal'}
                        </span>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          <span className="font-medium text-gray-700">{fechaIni}</span> al <span className="font-medium text-gray-700">{fechaFin}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {equiposArr.length > 0 ? (
                          <div className="space-y-1">
                            {equiposArr.map((eq, idx) => (
                              <div key={idx} className="text-[11px] font-mono text-gray-800">
                                • <span className="font-bold">{eq.tipo_equipo}:</span> {eq.modelo_serial} ({eq.marca})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Laptop / Equipo estándar</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 font-normal max-w-xs truncate" title={item.direccion_resguardo}>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.direccion_resguardo || 'No especificada'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' :
                          item.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.estado ? item.estado.toUpperCase() : 'ACTIVO'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botón Imprimir Firma en Blanco */}
                          <button
                            onClick={() => handleDownloadPDF(item, true)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                            title="Imprimir PDF con Firma en Blanco (Física)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Botón Descargar PDF Digital */}
                          <button
                            onClick={() => handleDownloadPDF(item, false)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition font-semibold text-[11px] shadow-sm"
                            title="Descargar PDF Formato SGI R1PTI3"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF R1PTI3</span>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title="Editar pase"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteSalida(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar pase"
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
              totalItems={salidas.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PASE DE SALIDA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-amber-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-extrabold text-base">
                  {editingSalida ? 'Editar Solicitud de Salida (Formato SGI R1PTI3)' : 'Nueva Solicitud de Salida de Equipo Informático (R1PTI3)'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-amber-100 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalida} className="p-6 space-y-6 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECCIÓN 0: AUTOPOBLAR DESDE CATALOGO DE EMPLEADOS O EQUIPOS */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-3">
                <p className="font-bold text-amber-900 flex items-center space-x-1.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Autopoblar datos desde Inventario o Personal Registrado:</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">Seleccionar Personal Registrado:</label>
                    <select
                      onChange={(e) => handleSelectEmpleado(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Seleccionar Empleado --</option>
                      {empleadosList.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre} ({e.area || 'General'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">Seleccionar Equipo de Inventario:</label>
                    <select
                      onChange={(e) => handleSelectEquipo(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Seleccionar Equipo (Hostname / Serial) --</option>
                      {equiposList.map(eq => (
                        <option key={eq.id} value={eq.id}>[{eq.serial}] {eq.hostname || eq.modelo} ({eq.personal_asignado || 'Resguardo'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 1: METADATOS Y TIPO DE SOLICITUD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No. Requisición (Opcional):</label>
                  <input
                    type="text"
                    value={formData.requisicion}
                    onChange={(e) => setFormData({ ...formData, requisicion: e.target.value })}
                    placeholder="Ej. REQ-2026-042"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Fecha de Solicitud:</label>
                  <input
                    type="date"
                    value={formData.fecha_solicitud}
                    onChange={(e) => setFormData({ ...formData, fecha_solicitud: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo de Solicitud de Salida:</label>
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_solicitud"
                        checked={formData.tipo_solicitud === 'temporal'}
                        onChange={() => handleTipoSolicitudChange('temporal')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-gray-800">Temporal</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_solicitud"
                        checked={formData.tipo_solicitud === 'permanente'}
                        onChange={() => handleTipoSolicitudChange('permanente')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full text-[10px]">Permanente (6 Meses)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL SOLICITANTE */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider text-amber-700">Información del Solicitante</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nombre del Solicitante *:</label>
                    <input
                      type="text"
                      value={formData.solicitante_nombre}
                      onChange={(e) => setFormData({ ...formData, solicitante_nombre: e.target.value })}
                      placeholder="Nombre completo del empleado"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Correo Electrónico:</label>
                    <input
                      type="email"
                      value={formData.solicitante_email}
                      onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })}
                      placeholder="ejemplo@itzoilandgas.com"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jefe Inmediato:</label>
                    <input
                      type="text"
                      value={formData.jefe_inmediato}
                      onChange={(e) => setFormData({ ...formData, jefe_inmediato: e.target.value })}
                      placeholder="Nombre del jefe directo"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Departamento:</label>
                    <input
                      type="text"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      placeholder="Área o Departamento"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Puesto del Solicitante:</label>
                    <input
                      type="text"
                      value={formData.solicitante_puesto}
                      onChange={(e) => setFormData({ ...formData, solicitante_puesto: e.target.value })}
                      placeholder="Puesto u Operación"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PERIODO DE SALIDA */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider text-amber-700">Periodo de Salida del Equipo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Fecha de Inicio del Periodo:</label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Fecha de Término del Periodo:</label>
                    <input
                      type="date"
                      value={formData.fecha_termino}
                      onChange={(e) => setFormData({ ...formData, fecha_termino: e.target.value })}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">* Para pase permanente se asigna por defecto renovación a 6 meses.</p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: TABLA DINÁMICA DE EQUIPOS Y GADGETS */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider text-amber-700">Equipos Informáticos y Gadgets que Solicitan Salida</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-bold text-[11px] transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Agregar Accesorio / Gadget</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.equipos_json.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 items-center">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500">Cant.</label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', parseInt(e.target.value, 10) || 1)}
                          className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-center font-bold"
                        />
                      </div>

                      <div className="col-span-10 sm:col-span-3">
                        <label className="block text-[10px] font-bold text-gray-500">Tipo de Equipo / Accesorio</label>
                        <input
                          type="text"
                          value={item.tipo_equipo}
                          onChange={(e) => handleItemChange(idx, 'tipo_equipo', e.target.value)}
                          placeholder="Ej. Laptop, Mouse Bluetooth, Teclado..."
                          className="w-full p-1.5 bg-white border border-gray-300 rounded-lg"
                          required
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500">Modelo / Número de Serie</label>
                        <input
                          type="text"
                          value={item.modelo_serial}
                          onChange={(e) => handleItemChange(idx, 'modelo_serial', e.target.value)}
                          placeholder="Modelo / Serial"
                          className="w-full p-1.5 bg-white border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-3">
                        <label className="block text-[10px] font-bold text-gray-500">Marca</label>
                        <input
                          type="text"
                          value={item.marca}
                          onChange={(e) => handleItemChange(idx, 'marca', e.target.value)}
                          placeholder="Marca"
                          className="w-full p-1.5 bg-white border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        {formData.equipos_json.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 5: DIRECCIÓN DE RESGUARDO & OBSERVACIONES */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Lugar en donde estará en resguardo (Dirección completa) *:</label>
                  <textarea
                    rows={2}
                    value={formData.direccion_resguardo}
                    onChange={(e) => setFormData({ ...formData, direccion_resguardo: e.target.value })}
                    placeholder="Dirección del domicilio de resguardo o base foránea"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Observaciones (Estado del equipo y accesorios):</label>
                  <textarea
                    rows={2}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Detalles sobre el estado físico, accesorios adicionales (cargador, mochila, funda, estuche...)"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* SECCIÓN 6: FIRMAS DIGITALES O IMPRESIÓN EN BLANCO */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider text-amber-700">Firmas de Conformidad</h4>
                  
                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 px-3 py-1 rounded-xl text-[11px] font-bold">
                    <input
                      type="checkbox"
                      checked={useDigitalSignatures}
                      onChange={(e) => setUseDigitalSignatures(e.target.checked)}
                      className="text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span>Capturar Firmas Digitales en Pantalla</span>
                  </label>
                </div>

                {useDigitalSignatures ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <SignatureCanvas
                        label="Firma Solicitante (Empleado)"
                        onSave={(dataUrl) => setFormData(prev => ({ ...prev, firma_empleado: dataUrl }))}
                        initialSignature={formData.firma_empleado}
                      />
                    </div>
                    <div>
                      <SignatureCanvas
                        label="Vo. Bo. Gerente / Coordinador"
                        onSave={(dataUrl) => setFormData(prev => ({ ...prev, firma_jefe: dataUrl }))}
                        initialSignature={formData.firma_jefe}
                      />
                    </div>
                    <div>
                      <SignatureCanvas
                        label="Vo. Bo. Tecnología de la Información"
                        onSave={(dataUrl) => setFormData(prev => ({ ...prev, firma_ti: dataUrl }))}
                        initialSignature={formData.firma_ti}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Modo Firma Física activado: El PDF se generará con las áreas de firma en blanco para impresos y firma autógrafa en papel.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones del Modal */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={async (e) => {
                    const saved = await handleSaveSalida(e);
                    if (saved) {
                      handleDownloadPDF(saved, !useDigitalSignatures);
                    }
                  }}
                  className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{submitting ? 'Guardando...' : 'Guardar y Descargar PDF'}</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
