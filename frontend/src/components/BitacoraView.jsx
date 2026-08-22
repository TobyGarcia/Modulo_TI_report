import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, ClipboardList, Plus, FileText, Download, CheckCircle,
  Clock, AlertCircle, Search, Filter, Wrench, RefreshCw, User, Laptop, X
} from 'lucide-react';
import { generarReportePDF, generarBitacoraPDF } from '../utils/pdfGenerator';
import MaintenanceReportModal from './MaintenanceReportModal';
import ScheduleMaintenanceModal from './ScheduleMaintenanceModal';
import CalendarView from './CalendarView';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'calendar' | 'bitacora'
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos'); // 'todos' | 'preventivo' | 'correctivo'
  const [selectedDateForSchedule, setSelectedDateForSchedule] = useState(null);

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

  useEffect(() => {
    fetchMantenimientos();
    fetchEquipos();
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

  // Cancelar Mantenimiento Programado
  const handleCancelarProgramado = async (maint) => {
    if (!window.confirm(`¿Está seguro de que desea cancelar el mantenimiento programado para ${maint.hostname || 'este equipo'}?`)) {
      return;
    }
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

  // Guardas de seguridad para evitar pantallas en blanco si la API está cargando
  const safeMantenimientos = Array.isArray(mantenimientos) ? mantenimientos : [];
  const safeEquipos = Array.isArray(equipos) ? equipos : [];

  // Filtrado de mantenimientos
  const filteredMantenimientos = safeMantenimientos.filter(m => {
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

  const programados = filteredMantenimientos.filter(m => m.estado === 'programado');
  const completados = filteredMantenimientos.filter(m => m.estado === 'completado');

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <span>Mantenimiento & Bitácora SGI</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Calendario de ciclo de vida, citas por hora y bitácora oficial SGI (R2PTI1 y A1PTI1)
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
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Preventivos</span>
            <span className="text-xl font-bold text-gray-900">
              {mantenimientos.filter(m => m.tipo_mantenimiento === 'preventivo').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold block">Correctivos</span>
            <span className="text-xl font-bold text-gray-900">
              {mantenimientos.filter(m => m.tipo_mantenimiento === 'correctivo').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros y Pestañas de Vista */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        {/* Pestañas de Vista (Calendario Mensual | Lista Agenda | Bitácora SGI) */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'calendar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendario Mensual</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'agenda' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Agenda Programada ({programados.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bitacora')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'bitacora' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Bitácora SGI A1PTI1 ({completados.length})</span>
          </button>
        </div>

        {/* Buscador & Filtro Tipo */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por equipo, técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="text-xs p-2 border rounded-xl bg-gray-50 text-gray-700 focus:bg-white"
          >
            <option value="todos">Todos los tipos</option>
            <option value="preventivo">Preventivos</option>
            <option value="correctivo">Correctivos</option>
          </select>

          <button
            onClick={fetchMantenimientos}
            className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl border"
            title="Recargar mantenimientos"
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
          onSelectMaintenance={(maint) => {
            if (maint.estado === 'programado') {
              handleCompletarProgramado(maint);
            } else {
              handleDownloadReportPDF(maint);
            }
          }}
        />
      )}

      {/* CONTENIDO PESTAÑA 2: AGENDA PROGRAMADA */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {programados.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="font-medium text-sm">No hay mantenimientos programados pendientes.</p>
              <button
                onClick={() => {
                  setSelectedDateForSchedule(null);
                  setSelectedEquipment(equipos[0] || null);
                  setIsScheduleModalOpen(true);
                }}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                + Agendar un nuevo mantenimiento futuro
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {programados.map((m) => (
                <div key={m.id} className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-1">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-gray-900">{m.hostname || 'SIN HOSTNAME'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          m.tipo_mantenimiento === 'preventivo' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {m.tipo_mantenimiento}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">Serial: {m.serial}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-semibold">Fecha Programada:</span> {m.fecha_programada ? String(m.fecha_programada).split('T')[0] : 'N/A'} • <span className="font-bold text-indigo-600">Hora: {m.hora_programada || 'Pendiente'}</span> ({m.turno || 'Matutino'})
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Técnico TI:</span> {m.tecnico_nombre || 'No asignado'}
                      </p>
                      {m.observaciones_equipo && (
                        <p className="text-xs text-gray-500 italic mt-0.5">"{m.observaciones_equipo}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCompletarProgramado(m)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-colors"
                      title="Completar y guardar reporte SGI"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Completar</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEquipment(equipos.find(e => e.id === m.equipo_id) || equipos[0]);
                        setExistingScheduleToEdit(m);
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-colors"
                      title="Cambiar fecha u hora de programación"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reprogramar</span>
                    </button>

                    <button
                      onClick={() => handleCancelarProgramado(m)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-xs flex items-center space-x-1 border border-red-200 transition-colors"
                      title="Cancelar esta cita de mantenimiento"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: BITÁCORA SGI A1PTI1 (2 COLUMNAS PREVENTIVO VS CORRECTIVO) */}
      {activeTab === 'bitacora' && (
        <div className="space-y-6">
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
