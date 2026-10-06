import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle, Clock, AlertTriangle, UserCheck,
  Calendar, CheckSquare, XCircle, ChevronRight, Search,
  LogOut, Star, BarChart3, Filter, X, Inbox
} from 'lucide-react';
import logoITZ from '../../assets/logotiposQR/ITZ.png';

export default function SupervisorPortal({ token, currentUser, onLogout, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('aprobaciones'); // 'aprobaciones' | 'agenda' | 'metricas'
  const [pendientes, setPendientes] = useState([]);
  const [todosLosTickets, setTodosLosTickets] = useState([]);
  const [tecnicosList, setTecnicosList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login de supervisor si no hay token
  const [username, setUsername] = useState('supervisor');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Modal para Aprobar y Asignar
  const [ticketToAssign, setTicketToAssign] = useState(null);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState('');
  const [asignPrioridad, setAsignPrioridad] = useState('media');
  const [asignFecha, setAsignFecha] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [asignTipo, setAsignTipo] = useState('correctivo');
  const [assigning, setAssigning] = useState(false);

  // Modal para Rechazar
  const [ticketToReject, setTicketToReject] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Cargar datos
  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Tickets pendientes
      const resPend = await fetch('/api/tickets/supervisor/pendientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resPend.ok) {
        const dataPend = await resPend.json();
        setPendientes(dataPend);
      }

      // 2. Todos los tickets para agenda
      const resAll = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resAll.ok) {
        const dataAll = await resAll.json();
        setTodosLosTickets(dataAll);
      }

      // 3. Métricas
      const resStats = await fetch('/api/tickets/stats/resumen', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // 4. Directorio mínimo de técnicos autorizado para supervisión
      const resUsers = await fetch('/api/usuarios/tecnicos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resUsers.ok) {
        const users = await resUsers.json();
        setTecnicosList(users);
      }
    } catch (err) {
      console.error('Error al cargar datos del supervisor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  // Manejo de Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');

      if (onLoginSuccess) {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Confirmar Aprobación y Asignación
  const handleConfirmAssign = async () => {
    if (!selectedTecnicoId) {
      alert('Por favor selecciona un técnico responsable');
      return;
    }
    setAssigning(true);
    try {
      const tecObj = tecnicosList.find((t) => t.id === parseInt(selectedTecnicoId, 10));
      const payload = {
        tecnico_id: parseInt(selectedTecnicoId, 10),
        tecnico_nombre: tecObj?.nombre || 'Técnico TI',
        prioridad: asignPrioridad,
        tipo_servicio: asignTipo,
        fecha_programada_atencion: asignFecha
      };

      const res = await fetch(`/api/tickets/${ticketToAssign.id}/aprobar-asignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al asignar ticket');

      alert('¡Ticket aprobado y asignado correctamente!');
      setTicketToAssign(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Confirmar Rechazo
  const handleConfirmReject = async () => {
    if (!motivoRechazo.trim()) {
      alert('Por favor escribe el motivo del rechazo');
      return;
    }
    setRejecting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketToReject.id}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ motivo_rechazo: motivoRechazo.trim() })
      });

      if (!res.ok) throw new Error('Error al rechazar ticket');

      alert('El ticket ha sido marcado como Rechazado.');
      setTicketToReject(null);
      setMotivoRechazo('');
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setRejecting(false);
    }
  };

  // 1. Login de Supervisor si no está autenticado
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-emerald-500/30">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Portal Supervisión TI</h2>
            <p className="text-xs text-slate-500">Aprobación, asignación de tareas y agenda de mantenimiento</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            {loginError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Usuario Supervisor
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. supervisor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition"
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar Sesión Supervisor'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Panel Principal del Supervisor
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Header Mobile */}
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-white rounded-xl p-1 flex items-center justify-center shadow">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black">Supervisión TI</h1>
                <span className="text-[9px] bg-emerald-500/40 text-emerald-100 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                  PWA Supervisor
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 font-medium">
                {currentUser?.nombre || 'Coordinador TI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition"
              title="Refrescar"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="max-w-3xl mx-auto px-4 flex border-t border-emerald-600/40">
          <button
            onClick={() => setActiveTab('aprobaciones')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'aprobaciones'
                ? 'border-white text-white'
                : 'border-transparent text-emerald-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><Inbox className="w-3.5 h-3.5" /> Aprobaciones ({pendientes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'agenda'
                ? 'border-white text-white'
                : 'border-transparent text-emerald-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><Calendar className="w-3.5 h-3.5" /> Agenda & Calendario</span>
          </button>
          <button
            onClick={() => setActiveTab('metricas')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'metricas'
                ? 'border-white text-white'
                : 'border-transparent text-emerald-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Métricas SLA</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* ================= TAB 1: BANDEJA DE APROBACIONES ================= */}
        {activeTab === 'aprobaciones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">
                Tickets Entrantes Pendientes de Revisión
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {pendientes.length} pendientes
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Cargando bandeja...</div>
            ) : pendientes.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                <h3 className="font-bold text-slate-700 text-sm">¡Bandeja al día!</h3>
                <p className="text-xs">No hay tickets pendientes de aprobación.</p>
              </div>
            ) : (
              pendientes.map((tck) => (
                <div
                  key={tck.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {tck.folio}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                        {new Date(tck.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Prioridad Sugerida: {tck.prioridad}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{tck.categoria_falla}</h3>
                    <p className="text-xs text-slate-700 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{tck.descripcion_problema}"
                    </p>
                  </div>

                  {/* Datos del solicitante y equipo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Solicitante:</span>
                      <strong className="text-slate-800">{tck.solicitante_nombre}</strong>
                      <div className="text-[11px] text-slate-500">{tck.area_solicitante || 'General'} • {tck.solicitante_email || 'Sin correo'}</div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Equipo:</span>
                      {tck.equipo_id ? (
                        <div>
                          <strong className="text-slate-800">{tck.marca} {tck.modelo}</strong>
                          <div className="text-[11px] text-slate-500 font-mono">S/N: {tck.serial}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No especificado (Soporte General)</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Supervisión */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setTicketToReject(tck);
                        setMotivoRechazo('');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold text-xs rounded-xl transition"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => {
                        setTicketToAssign(tck);
                        setAsignPrioridad(tck.prioridad || 'media');
                        if (tecnicosList.length > 0) setSelectedTecnicoId(String(tecnicosList[0].id));
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aprobar y Asignar Técnico</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= TAB 2: AGENDA Y CALENDARIO ================= */}
        {activeTab === 'agenda' && (
          <div className="space-y-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Programación y Seguimiento de Tareas</span>
            </h2>

            <div className="space-y-2">
              {todosLosTickets
                .filter((t) => ['asignado', 'en_proceso', 'resuelto'].includes(t.estado))
                .slice(0, 20)
                .map((tck) => (
                  <div
                    key={tck.id}
                    className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">{tck.folio}</span>
                        <span className="font-semibold text-slate-700">• {tck.solicitante_nombre}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Técnico: <strong className="text-emerald-700">{tck.tecnico_nombre || 'Pendiente'}</strong> • Fecha: {tck.fecha_programada_atencion ? new Date(tck.fecha_programada_atencion).toLocaleDateString() : 'Hoy'}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tck.estado === 'en_proceso'
                          ? 'bg-indigo-100 text-indigo-800'
                          : tck.estado === 'resuelto'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tck.estado}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MÉTRICAS ================= */}
        {activeTab === 'metricas' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                <span className="block text-[11px] font-bold text-slate-400 uppercase">Total Tickets</span>
                <span className="text-2xl font-black text-slate-800">{stats.total || 0}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                <span className="block text-[11px] font-bold text-amber-500 uppercase">Pendientes</span>
                <span className="text-2xl font-black text-amber-600">{stats.abiertos || 0}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                <span className="block text-[11px] font-bold text-indigo-500 uppercase">En Proceso</span>
                <span className="text-2xl font-black text-indigo-600">{stats.en_proceso || 0}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                <span className="block text-[11px] font-bold text-emerald-500 uppercase">Resueltos</span>
                <span className="text-2xl font-black text-emerald-600">{stats.resueltos || 0}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Satisfacción Promedio del Cliente</h3>
                <p className="text-xs text-slate-500">Basado en las evaluaciones de los empleados</p>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-black text-base text-amber-700">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{stats.promedio_satisfaccion || '5.0'} / 5</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Aprobar y Asignar */}
        {ticketToAssign && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-emerald-500 animate-scale-up">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-800">
                  Aprobar y Asignar Ticket
                </h3>
                <button onClick={() => setTicketToAssign(null)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Técnico Responsable *
                  </label>
                  <select
                    value={selectedTecnicoId}
                    onChange={(e) => setSelectedTecnicoId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecciona un técnico...</option>
                    {tecnicosList.map((tec) => (
                      <option key={tec.id} value={tec.id}>
                        {tec.nombre} ({tec.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prioridad Oficial
                  </label>
                  <select
                    value={asignPrioridad}
                    onChange={(e) => setAsignPrioridad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica (Urgente)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha Programada de Atención
                  </label>
                  <input
                    type="date"
                    value={asignFecha}
                    onChange={(e) => setAsignFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketToAssign(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={handleConfirmAssign}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  {assigning ? 'Asignando...' : 'Aprobar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Rechazar */}
        {ticketToReject && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-red-400">
              <h3 className="font-extrabold text-sm text-slate-800">
                Rechazar Ticket: {ticketToReject.folio}
              </h3>
              <p className="text-xs text-slate-500">
                Indica el motivo por el cual no procede esta solicitud. El solicitante podrá ver este mensaje.
              </p>

              <textarea
                rows={3}
                required
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="ej. El equipo no pertenece a la flotilla corporativa o se requiere solicitud formal de compra..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setTicketToReject(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={rejecting}
                  onClick={handleConfirmReject}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  {rejecting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
