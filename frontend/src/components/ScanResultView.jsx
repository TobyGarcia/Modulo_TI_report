import React, { useEffect, useState } from 'react';
import {
  Laptop, Cpu, HardDrive, Cpu as GpuIcon, User, Building2, MapPin,
  CheckCircle, Wifi, FileText, AlertTriangle, LogOut, Calendar, Plus, History, Download, Wrench,
  UserCheck, UserPlus, ArrowRightLeft, ShieldCheck
} from 'lucide-react';
import ScheduleMaintenanceModal from './ScheduleMaintenanceModal';
import MaintenanceReportModal from './MaintenanceReportModal';
import AssignmentModal from './AssignmentModal';
import UnassignmentModal from './UnassignmentModal';
import { generarReportePDF, generarFormatoAsignacionPDF, generarFormatoDesasignacionPDF } from '../utils/pdfGenerator';

export default function ScanResultView({ equipmentId, token, onLogout }) {
  const [equipo, setEquipo] = useState(null);
  const [historialMantenimientos, setHistorialMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'history'

  // Modales Mantenimiento
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);

  // Modales Asignación / Desasignación
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isUnassignmentModalOpen, setIsUnassignmentModalOpen] = useState(false);

  const fetchEquipoYHistorial = async () => {
    try {
      const resEq = await fetch(`/api/equipos/${equipmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resEq.status === 401 || resEq.status === 403) {
        throw new Error('Sesión expirada o no autorizada');
      }
      if (!resEq.ok) throw new Error('Equipo no encontrado');
      const dataEq = await resEq.json();
      setEquipo(dataEq);

      // Cargar historial de mantenimientos
      const resHist = await fetch(`/api/mantenimientos/equipo/${equipmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resHist.ok) {
        const dataHist = await resHist.json();
        setHistorialMantenimientos(dataHist);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipoYHistorial();

    try {
      const hasDraft = localStorage.getItem(`draft_report_${equipmentId}`);
      if (hasDraft) {
        setIsReportModalOpen(true);
      }
    } catch (e) {}
  }, [equipmentId, token]);

  const handleSaveSchedule = async (scheduleData) => {
    try {
      const res = await fetch('/api/mantenimientos/programar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(scheduleData)
      });
      if (!res.ok) throw new Error('Error al agendar mantenimiento');
      setIsScheduleModalOpen(false);
      fetchEquipoYHistorial();
      alert('¡Mantenimiento programado con éxito!');
    } catch (err) {
      alert(err.message);
    }
  };

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
      fetchEquipoYHistorial();
      alert('¡Reporte de mantenimiento guardado y registrado en la bitácora!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Callback tras asignar equipo
  const handleAssignmentSuccess = (data) => {
    setIsAssignmentModalOpen(false);
    fetchEquipoYHistorial();

    // Generar automáticamente el Formato PDF de Asignación (R1PTI2)
    try {
      generarFormatoAsignacionPDF(data.historial, data.equipo, data.empleado);
    } catch (e) {
      console.error('Error al generar PDF de Asignación:', e);
    }
    alert('¡Equipo asignado con éxito y Formato de Asignación PDF generado!');
  };

  // Callback tras desasignar / reasignar equipo
  const handleUnassignmentSuccess = (data) => {
    setIsUnassignmentModalOpen(false);
    fetchEquipoYHistorial();

    try {
      // 1. Generar PDF de Desasignación (R3PTI2)
      generarFormatoDesasignacionPDF(data.historial, data.equipo, data.empleadoAnterior, data.motivo);

      // 2. Si fue reasignación directa, generar también el PDF de Asignación para el nuevo usuario
      if (data.isReassign && data.nuevoEmpleado) {
        setTimeout(() => {
          generarFormatoAsignacionPDF(data.historial, data.equipo, data.nuevoEmpleado);
        }, 1000);
      }
    } catch (e) {
      console.error('Error al generar PDF de Desasignación:', e);
    }
    alert('¡Proceso completado con éxito y Formato(s) PDF generado(s)!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Validando autorización de TI y cargando equipo...</p>
        </div>
      </div>
    );
  }

  if (error || !equipo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl text-center max-w-sm w-full space-y-4">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">Acceso Restringido o No Encontrado</h2>
          <p className="text-sm text-gray-600">{error || 'No se pudo cargar la información del equipo.'}</p>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs"
            >
              Volver a Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    );
  }

  const isAssigned = !!(equipo.empleado_id || (equipo.personal_asignado && equipo.personal_asignado.trim() && equipo.personal_asignado !== 'No asignado'));

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      {/* Botón superior de Cerrar Sesión */}
      {onLogout && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-semibold uppercase tracking-wider">Acceso Técnico TI</span>
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 bg-white px-2.5 py-1 rounded-lg border font-semibold shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      )}

      {/* Banner de Mantenimiento Programado */}
      {(() => {
        const safeHistorial = Array.isArray(historialMantenimientos) ? historialMantenimientos : [];
        const pendiente = safeHistorial.find(m => m && m.estado === 'programado');
        if (!pendiente) return null;

        const fechaDisplay = pendiente.fecha_programada
          ? String(pendiente.fecha_programada).split('T')[0]
          : 'Próximamente';

        return (
          <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-lg border-2 border-amber-300 animate-pulse space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>¡ALERTA DE MANTENIMIENTO PROGRAMADO!</span>
            </div>
            <p className="text-xs text-amber-100 leading-relaxed">
              Este equipo tiene una cita agendada para el <strong className="text-white">{fechaDisplay}</strong> a las <strong className="text-white">{pendiente.hora_programada || 'Pendiente'}</strong> ({pendiente.turno || 'Matutino'}).
            </p>
            <button
              onClick={() => {
                setSelectedMaintenance(pendiente);
                setIsReportModalOpen(true);
              }}
              className="w-full mt-2 py-2 px-3 bg-white text-amber-900 font-bold rounded-xl text-xs shadow hover:bg-amber-100 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Completar Mantenimiento Programado Ahora</span>
            </button>
          </div>
        );
      })()}

      {/* Tarjeta Ficha Móvil */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border">
        {/* Encabezado Principal */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-white text-center relative">
          <Laptop className="w-12 h-12 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold font-mono tracking-tight">{equipo.hostname || 'SIN HOSTNAME'}</h1>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mt-1">
            Serial: {equipo.serial}
          </p>
          <div className="inline-block mt-3 px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium backdrop-blur-sm">
            {equipo.marca} {equipo.modelo}
          </div>
        </div>

        {/* Pestañas Rápidas: Info vs Historial */}
        <div className="flex border-b bg-gray-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'info' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500'
            }`}
          >
            Ficha del Equipo
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center space-x-1 ${
              activeTab === 'history' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial ({historialMantenimientos.length})</span>
          </button>
        </div>

        {/* PANEL 1: ACCIONES RÁPIDAS DE MANTENIMIENTO Y ASIGNACIÓN */}
        <div className="p-4 bg-indigo-50/70 border-b space-y-2">
          {/* Botón de Asignación / Desasignación según el Estado */}
          {!isAssigned ? (
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Asignar Equipo (Actualmente en Resguardo)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUnassignmentModalOpen(true)}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Desasignar / Reasignar Equipo</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex-1 py-2.5 px-3 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition-all"
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Programar</span>
            </button>

            <button
              onClick={() => {
                setSelectedMaintenance(null);
                setIsReportModalOpen(true);
              }}
              className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Levantar Reporte</span>
            </button>
          </div>
        </div>

        {/* PANEL 2: FICHA DEL EQUIPO */}
        {activeTab === 'info' && (
          <div className="p-5 space-y-5">
            {/* Estado de Asignación */}
            <div className={`rounded-xl p-4 border space-y-2 ${
              isAssigned ? 'bg-indigo-50/40 border-indigo-100' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center space-x-2 text-indigo-900">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Personal Asignado</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isAssigned ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isAssigned ? 'ASIGNADO' : 'EN RESGUARDO'}
                </span>
              </div>

              <p className="text-base font-bold text-gray-900 pl-6">
                {equipo.empleado_nombre || equipo.personal_asignado || 'No asignado (Equipo en Resguardo)'}
              </p>

              <div className="grid grid-cols-2 gap-2 pl-6 pt-2 text-xs text-gray-600 border-t border-indigo-100">
                <div className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{equipo.empresa || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{equipo.ciudad} ({equipo.area})</span>
                </div>
              </div>
            </div>

            {/* Especificaciones Hardware */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Especificaciones Técnicas</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-xl border">
                  <div className="flex items-center space-x-1.5 text-gray-500 text-xs mb-1">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>Procesador</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-xs">{equipo.cpu || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border">
                  <div className="flex items-center space-x-1.5 text-gray-500 text-xs mb-1">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span>Memoria RAM</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-xs">{equipo.ram_capacidad || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border">
                  <div className="flex items-center space-x-1.5 text-gray-500 text-xs mb-1">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Almacenamiento</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-xs">{equipo.disco_capacidad || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border">
                  <div className="flex items-center space-x-1.5 text-gray-500 text-xs mb-1">
                    <GpuIcon className="w-4 h-4 text-emerald-600" />
                    <span>Gráficos ({equipo.gpu_tipo})</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-xs">{equipo.gpu_modelo || 'Integrada'}</p>
                </div>
              </div>
            </div>

            {/* Sistema Operativo & Red */}
            <div className="space-y-2 border-t pt-4 text-xs text-gray-700">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Sistema Operativo:</span>
                <span className="font-semibold">{equipo.so || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 flex items-center space-x-1">
                  <Wifi className="w-3.5 h-3.5 text-gray-400" />
                  <span>MAC Wi-Fi:</span>
                </span>
                <span className="font-mono font-semibold">{equipo.mac_wifi || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Estado Físico:</span>
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{equipo.estado_fisico || 'Excelente'}</span>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 3: HISTORIAL DE MANTENIMIENTOS DEL EQUIPO */}
        {activeTab === 'history' && (
          <div className="p-5 space-y-3">
            {historialMantenimientos.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Este equipo aún no tiene registros de mantenimiento.</p>
            ) : (
              historialMantenimientos.map(m => (
                <div key={m.id} className="p-3.5 rounded-xl border bg-gray-50 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                      m.tipo_mantenimiento === 'preventivo' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {m.tipo_mantenimiento} • {m.estado}
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">
                      {m.fecha_realizado ? String(m.fecha_realizado).split('T')[0] : (m.fecha_programada ? String(m.fecha_programada).split('T')[0] : 'N/A')}
                    </span>
                  </div>

                  <p className="text-gray-800 font-medium">{m.trabajo_realizado || m.observaciones_equipo || 'Sin descripción'}</p>

                  <div className="flex justify-between items-center pt-2 border-t text-[11px] text-gray-500">
                    <span>Técnico: {m.tecnico_nombre || 'TI'}</span>
                    {m.estado === 'completado' && (
                      <button
                        onClick={() => generarReportePDF(m, equipo)}
                        className="text-indigo-600 hover:underline font-semibold flex items-center space-x-1 bg-white px-2 py-1 rounded border shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF R2PTI1</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="bg-gray-50 p-4 text-center border-t text-[11px] text-gray-400 font-mono">
          Acceso Restringido • Exclusivo Personal TI
        </div>
      </div>

      {/* Modales */}
      <ScheduleMaintenanceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleSaveSchedule}
        equipment={equipo}
      />

      <MaintenanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedMaintenance(null);
        }}
        onSave={handleSaveReport}
        equipment={equipo}
        existingMaintenance={selectedMaintenance}
      />

      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        equipment={equipo}
        token={token}
        onAssignmentSuccess={handleAssignmentSuccess}
      />

      <UnassignmentModal
        isOpen={isUnassignmentModalOpen}
        onClose={() => setIsUnassignmentModalOpen(false)}
        equipment={equipo}
        token={token}
        onUnassignmentSuccess={handleUnassignmentSuccess}
      />
    </div>
  );
}
