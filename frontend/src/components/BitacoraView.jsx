import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, ClipboardList, Plus, FileText, Download, CheckCircle,
  Clock, AlertCircle, Search, Filter, Wrench, RefreshCw, User, Laptop, X,
  ArrowRightLeft, UserCheck, ShieldCheck, FileCheck
} from 'lucide-react';
import {
  generarReportePDF,
  generarBitacoraPDF,
  generarFormatoAsignacionPDF,
  generarFormatoDesasignacionPDF
} from '../utils/pdfGenerator';
import MaintenanceReportModal from './MaintenanceReportModal';
import ScheduleMaintenanceModal from './ScheduleMaintenanceModal';
import CalendarView from './CalendarView';
import Pagination from './Pagination';

const safeFormatDate = (rawDate) => {
  if (!rawDate) return 'N/A';
  try {
    const clean = String(rawDate).replace(' ', 'T').split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  } catch (e) {
    return 'N/A';
  }
};

export default function BitacoraView({ token, currentUser }) {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [historialAsignaciones, setHistorialAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'calendar' | 'bitacora' | 'asignaciones'
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos'); // 'todos' | 'preventivo' | 'correctivo'
  const [selectedDateForSchedule, setSelectedDateForSchedule] = useState(null);
  const [currentProgramadosPage, setCurrentProgramadosPage] = useState(1);
  const [currentHistorialPage, setCurrentHistorialPage] = useState(1);
  const pageSize = 20;

  // Modales
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [existingScheduleToEdit, setExistingScheduleToEdit] = useState(null);

  const fetchMantenimientos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mantenimientos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMantenimientos(data);
      }
    } catch (e) {
      console.error('Error al obtener mantenimientos:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipos = async () => {
    try {
      const res = await fetch('/api/equipos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEquipos(data);
      }
    } catch (e) {
      console.error('Error al obtener equipos:', e);
    }
  };

  const fetchHistorialAsignaciones = async () => {
    try {
      const res = await fetch('/api/asignaciones/historial', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistorialAsignaciones(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error al obtener historial de asignaciones:', e);
    }
  };

  useEffect(() => {
    fetchMantenimientos();
    fetchEquipos();
    fetchHistorialAsignaciones();
  }, [token]);

  // Guardar / Reprogramar Mantenimiento
  const handleSaveSchedule = async (scheduleData) => {
    try {
      const isEdit = !!scheduleData.id;
      const url = isEdit ? `/api/mantenimientos/${scheduleData.id}` : '/api/mantenimientos/programar';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(scheduleData)
      });
      if (!res.ok) throw new Error('Error al procesar la programación del mantenimiento');
      setIsScheduleModalOpen(false);
      setSelectedDateForSchedule(null);
      setExistingScheduleToEdit(null);
      fetchMantenimientos();
    } catch (err) {
      alert(err.message);
    }
  };

  // Cancelar Programado
  const handleCancelarProgramado = async (maint) => {
    if (!window.confirm('¿Estás seguro de cancelar este mantenimiento programado?')) return;
    try {
      const res = await fetch(`/api/mantenimientos/${maint.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...maint,
          estado: 'cancelado'
        })
      });
      if (!res.ok) throw new Error('Error al cancelar el mantenimiento');
      fetchMantenimientos();
    } catch (err) {
      alert(err.message);
    }
  };

  // Guardar Reporte Completado
  const handleSaveReport = async (reportData) => {
    try {
      const res = await fetch('/api/mantenimientos/reporte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });
      if (!res.ok) throw new Error('Error al registrar reporte de mantenimiento');
      setIsReportModalOpen(false);
      setSelectedMaintenance(null);
      fetchMantenimientos();
    } catch (err) {
      alert(err.message);
    }
  };

  // Abrir modal de reporte para un mantenimiento programado existente
  const handleCompletarProgramado = (maint) => {
    const eq = equipos.find(e => e.id === maint.equipo_id) || {
      id: maint.equipo_id,
      hostname: maint.hostname,
      serial: maint.serial,
      marca: maint.marca,
      modelo: maint.modelo,
      personal_asignado: maint.equipo_personal_asignado,
      area: maint.equipo_area,
      so: maint.equipo_so,
      cpu: maint.equipo_cpu,
      ram_capacidad: maint.equipo_ram,
      disco_capacidad: maint.equipo_disco
    };
    setSelectedEquipment(eq);
    setSelectedMaintenance(maint);
    setIsReportModalOpen(true);
  };

  // Abrir nuevo reporte directo
  const handleNuevoReporteDirecto = () => {
    if (equipos.length === 0) {
      alert('No hay equipos registrados en el sistema.');
      return;
    }
    setSelectedEquipment(equipos[0]);
    setSelectedMaintenance(null);
    setIsReportModalOpen(true);
  };

  // Descargar PDF Reporte Individual
  const handleDownloadReportPDF = (maint) => {
    const eq = equipos.find(e => e.id === maint.equipo_id) || {
      hostname: maint.hostname,
      serial: maint.serial,
      marca: maint.marca,
      modelo: maint.modelo,
      personal_asignado: maint.equipo_personal_asignado,
      area: maint.equipo_area,
      so: maint.equipo_so,
      cpu: maint.equipo_cpu,
      ram_capacidad: maint.equipo_ram,
      disco_capacidad: maint.equipo_disco
    };
    generarReportePDF(maint, eq);
  };

  // Descargar PDF de Asignación o Desasignación desde la tabla de historial
  const handleDownloadAsignacionPDF = (hist) => {
    const equipoObj = {
      id: hist.equipo_id,
      hostname: hist.hostname,
      serial: hist.serial,
      marca: hist.marca,
      modelo: hist.modelo,
      so: hist.so,
      cpu: hist.cpu,
      ram_capacidad: hist.ram_capacidad,
      disco_capacidad: hist.disco_capacidad,
      estado_fisico: hist.estado_fisico,
      personal_asignado: hist.empleado_nombre || hist.equipo_personal_actual,
      area: hist.empleado_area,
      empresa: hist.empleado_empresa
    };

    const empleadoObj = {
      nombre: hist.empleado_nombre || hist.equipo_personal_actual || 'Empleado Responsable',
      area: hist.empleado_area || 'General',
      empresa: hist.empleado_empresa || 'ITZ OIL & GAS',
      no_empleado: hist.no_empleado
    };

    if (hist.tipo_movimiento === 'desasignacion') {
      generarFormatoDesasignacionPDF(hist, equipoObj, empleadoObj, hist.motivo);
    } else {
      generarFormatoAsignacionPDF(hist, equipoObj, empleadoObj);
    }
  };

  // Filtrado de mantenimientos
  const filteredMantenimientos = mantenimientos.filter(m => {
    if (!m) return false;
    const matchSearch =
      !searchTerm.trim() ||
      (m.hostname && m.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.serial && m.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.tecnico_nombre && m.tecnico_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.trabajo_realizado && m.trabajo_realizado.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchTipo = tipoFilter === 'todos' || m.tipo_mantenimiento === tipoFilter;

    return matchSearch && matchTipo;
  });

  // Filtrado de historial de asignaciones
  const filteredHistorialAsignaciones = historialAsignaciones.filter(h => {
    if (!h) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (h.hostname && h.hostname.toLowerCase().includes(term)) ||
      (h.serial && h.serial.toLowerCase().includes(term)) ||
      (h.empleado_nombre && h.empleado_nombre.toLowerCase().includes(term)) ||
      (h.motivo && h.motivo.toLowerCase().includes(term)) ||
      (h.tipo_movimiento && h.tipo_movimiento.toLowerCase().includes(term))
    );
  });

  const programados = filteredMantenimientos.filter(m => m.estado === 'programado');
  const completados = filteredMantenimientos.filter(m => m.estado === 'completado');

  const totalProgramadosPages = Math.ceil(programados.length / pageSize) || 1;
  const currentProgramados = programados.slice((currentProgramadosPage - 1) * pageSize, currentProgramadosPage * pageSize);

  const totalHistorialPages = Math.ceil(filteredHistorialAsignaciones.length / pageSize) || 1;
  const currentHistorial = filteredHistorialAsignaciones.slice((currentHistorialPage - 1) * pageSize, currentHistorialPage * pageSize);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <span>Bitácora, Agenda & Asignaciones SGI</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Calendario de mantenimientos, bitácora oficial y control de PDFs de asignación/desasignación
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedDateForSchedule(null);
              setSelectedEquipment(equipos[0] || null);
              setIsScheduleModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agendar Mantenimiento</span>
          </button>

          <button
            onClick={handleNuevoReporteDirecto}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Levantar Reporte Directo</span>
          </button>

          <button
            onClick={() => generarBitacoraPDF(completados, "BITACORA DE MANTENIMIENTO SGI")}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Bitácora PDF (A1PTI1)</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Programados</span>
            <span className="text-xl font-bold text-gray-900">{programados.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Completados</span>
            <span className="text-xl font-bold text-gray-900">{completados.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Asignaciones</span>
            <span className="text-xl font-bold text-gray-900">{historialAsignaciones.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Total Registros</span>
            <span className="text-xl font-bold text-gray-900">{mantenimientos.length}</span>
          </div>
        </div>
      </div>

      {/* Barra de Control y Navegación entre Pestañas */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        {/* Pestañas de Vista */}
        <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl w-full sm:w-auto text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeTab === 'calendar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeTab === 'agenda' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Agenda Programada ({programados.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bitacora')}
            className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeTab === 'bitacora' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Bitácora SGI ({completados.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('asignaciones')}
            className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeTab === 'asignaciones' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <span>Historial Asignaciones & PDFs ({historialAsignaciones.length})</span>
          </button>
        </div>

        {/* Buscador & Filtro */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por equipo, persona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => {
              fetchMantenimientos();
              fetchHistorialAsignaciones();
            }}
            className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl border"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTENIDO PESTAÑA 1: CALENDARIO MENSUAL DE CICLO DE VIDA */}
      {activeTab === 'calendar' && (
        <CalendarView
          mantenimientos={filteredMantenimientos}
          onSelectDate={(dateStr) => {
            setSelectedDateForSchedule(dateStr);
            setSelectedEquipment(equipos[0] || null);
            setIsScheduleModalOpen(true);
          }}
        />
      )}

      {/* CONTENIDO PESTAÑA 2: AGENDA PROGRAMADA */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white font-bold text-sm flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Agenda de Mantenimientos Pendientes y Programados</span>
            </div>
            <span className="bg-white text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
              {programados.length} citas
            </span>
          </div>

          {programados.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
              <p className="font-semibold text-gray-700">No hay mantenimientos pendientes agendados.</p>
              <p className="text-xs text-gray-400">Utiliza el botón superior para agendar una nueva cita.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 uppercase text-[11px] font-bold text-gray-500 border-b">
                  <tr>
                    <th className="p-3">Fecha & Hora</th>
                    <th className="p-3">Equipo / Hostname</th>
                    <th className="p-3">Personal Asignado</th>
                    <th className="p-3">Tipo Mantenimiento</th>
                    <th className="p-3">Turno</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentProgramados.map(m => (
                    <tr key={m.id} className="hover:bg-amber-50/40 transition">
                      <td className="p-3 font-semibold text-amber-900">
                        <div>{safeFormatDate(m.fecha_programada)}</div>
                        <div className="text-[10px] text-amber-700 font-mono">Hora: {m.hora_programada || 'Pendiente'}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-900">
                        {m.hostname || 'SIN HOSTNAME'}
                        <div className="text-[10px] text-gray-400 font-sans">S/N: {m.serial}</div>
                      </td>
                      <td className="p-3 font-medium">
                        {m.equipo_personal_asignado || 'No asignado'}
                        <div className="text-[10px] text-gray-400">{m.equipo_area}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.tipo_mantenimiento === 'preventivo' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {m.tipo_mantenimiento}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{m.turno || 'Matutino'}</td>
                      <td className="p-3 text-center space-x-2">
                        <button
                          onClick={() => handleCompletarProgramado(m)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                        >
                          Completar y Firmar Reporte
                        </button>
                        <button
                          onClick={() => handleCancelarProgramado(m)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentProgramadosPage}
                totalPages={totalProgramadosPages}
                totalItems={programados.length}
                pageSize={pageSize}
                onPageChange={setCurrentProgramadosPage}
              />
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: BITÁCORA CONSOLIDADA SGI (A1PTI1) */}
      {activeTab === 'bitacora' && (
        <div className="space-y-4">
          <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
              <h2 className="font-bold text-sm">Bitácora General SGI A1PTI1</h2>
              <p className="text-xs text-indigo-200">Consolidado de reportes de mantenimiento preventivo y correctivo ejecutados.</p>
            </div>
            <button
              onClick={() => generarBitacoraPDF(completados, "BITACORA DE MANTENIMIENTO SGI")}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF A1PTI1</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Preventivos */}
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
              <div className="bg-indigo-700 p-3 text-white font-bold text-xs uppercase tracking-wider text-center flex justify-between items-center">
                <span>MANTENIMIENTO REALIZADO (PREVENTIVO)</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[11px]">
                  {completados.filter(m => m.tipo_mantenimiento === 'preventivo').length}
                </span>
              </div>
              <div className="p-3 divide-y max-h-[600px] overflow-y-auto">
                {completados.filter(m => m.tipo_mantenimiento === 'preventivo').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Sin registros de mantenimiento preventivo.</p>
                ) : (
                  completados.filter(m => m.tipo_mantenimiento === 'preventivo').map(m => (
                    <div key={m.id} className="py-3 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{m.hostname || 'Equipo'}</span>
                        <span className="text-[10px] text-gray-400">{safeFormatDate(m.fecha_realizado)}</span>
                      </div>
                      <p className="text-gray-700">{m.trabajo_realizado || 'Mantenimiento preventivo ejecutado'}</p>
                      {m.material_utilizado && (
                        <p className="text-[11px] text-indigo-700 font-medium">Material: {m.material_utilizado}</p>
                      )}
                      <div className="flex justify-between items-center pt-1 text-[11px] text-gray-500 border-t border-gray-100">
                        <span>Técnico: {m.tecnico_nombre}</span>
                        <button
                          onClick={() => handleDownloadReportPDF(m)}
                          className="text-indigo-600 hover:underline font-semibold flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF R2PTI1</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Columna Correctivos */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
              <div className="bg-red-700 p-3 text-white font-bold text-xs uppercase tracking-wider text-center flex justify-between items-center">
                <span>MANTENIMIENTO REALIZADO (CORRECTIVO)</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[11px]">
                  {completados.filter(m => m.tipo_mantenimiento === 'correctivo').length}
                </span>
              </div>
              <div className="p-3 divide-y max-h-[600px] overflow-y-auto">
                {completados.filter(m => m.tipo_mantenimiento === 'correctivo').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Sin registros de mantenimiento correctivo.</p>
                ) : (
                  completados.filter(m => m.tipo_mantenimiento === 'correctivo').map(m => (
                    <div key={m.id} className="py-3 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{m.hostname || 'Equipo'}</span>
                        <span className="text-[10px] text-gray-400">{safeFormatDate(m.fecha_realizado)}</span>
                      </div>
                      <p className="text-gray-700">{m.trabajo_realizado || 'Mantenimiento correctivo ejecutado'}</p>
                      {m.material_utilizado && (
                        <p className="text-[11px] text-red-700 font-medium">Material: {m.material_utilizado}</p>
                      )}
                      <div className="flex justify-between items-center pt-1 text-[11px] text-gray-500 border-t border-gray-100">
                        <span>Técnico: {m.tecnico_nombre}</span>
                        <button
                          onClick={() => handleDownloadReportPDF(m)}
                          className="text-red-600 hover:underline font-semibold flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF R2PTI1</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 4: NUEVA PESTAÑA DE HISTORIAL DE ASIGNACIONES & PDFS */}
      {activeTab === 'asignaciones' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-indigo-800 p-4 text-white font-bold text-sm flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5" />
              <span>Historial de Movimientos de Asignación y Formatos PDF SGI</span>
            </div>
            <span className="bg-white text-emerald-950 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
              {filteredHistorialAsignaciones.length} registros
            </span>
          </div>

          {filteredHistorialAsignaciones.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <FileCheck className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
              <p className="font-semibold text-gray-700">No se encontraron movimientos de asignación registrados.</p>
              <p className="text-xs text-gray-400">Los movimientos realizados desde la app móvil o el inventario aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 uppercase text-[11px] font-bold text-gray-500 border-b">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Movimiento</th>
                    <th className="p-3">Equipo / Serial</th>
                    <th className="p-3">Empleado / Personal</th>
                    <th className="p-3">Motivo / Notas</th>
                    <th className="p-3">Registrado por</th>
                    <th className="p-3 text-center">Acciones / Descargar PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentHistorial.map(hist => {
                    const isDesasignacion = hist.tipo_movimiento === 'desasignacion';
                    return (
                      <tr key={hist.id} className="hover:bg-indigo-50/30 transition">
                        <td className="p-3 font-semibold text-gray-900">
                          {safeFormatDate(hist.fecha_movimiento)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${
                            isDesasignacion ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {hist.tipo_movimiento}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="font-bold text-gray-900">{hist.hostname || 'EQUIPO'}</div>
                          <div className="text-[10px] text-gray-400">S/N: {hist.serial}</div>
                        </td>
                        <td className="p-3 font-medium">
                          <div className="text-gray-900 font-bold">{hist.empleado_nombre || hist.equipo_personal_actual || 'N/A'}</div>
                          <div className="text-[10px] text-gray-400">{hist.empleado_area || 'General'}</div>
                        </td>
                        <td className="p-3 text-gray-700">
                          <div className="font-semibold text-gray-800">{hist.motivo || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500 italic">{hist.observaciones || ''}</div>
                        </td>
                        <td className="p-3 text-gray-600 font-medium">
                          {hist.usuario_ti_nombre || 'TI Admin'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDownloadAsignacionPDF(hist)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1.5 mx-auto transition-colors ${
                              isDesasignacion
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isDesasignacion ? 'PDF Acta (R3PTI2)' : 'PDF Responsiva (R1PTI2)'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                currentPage={currentHistorialPage}
                totalPages={totalHistorialPages}
                totalItems={filteredHistorialAsignaciones.length}
                pageSize={pageSize}
                onPageChange={setCurrentHistorialPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal para Agendar / Reprogramar Mantenimiento */}
      <ScheduleMaintenanceModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedDateForSchedule(null);
          setExistingScheduleToEdit(null);
        }}
        onSave={handleSaveSchedule}
        equipment={selectedEquipment}
        equiposList={equipos}
        currentUser={currentUser}
        initialDate={selectedDateForSchedule}
        existingSchedule={existingScheduleToEdit}
      />

      {/* Modal para Levantar / Completar Reporte */}
      <MaintenanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedMaintenance(null);
        }}
        onSave={handleSaveReport}
        equipment={selectedEquipment}
        equiposList={equipos}
        currentUser={currentUser}
        existingMaintenance={selectedMaintenance}
      />
    </div>
  );
}
