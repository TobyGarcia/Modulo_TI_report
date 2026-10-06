import React, { useState, useEffect } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle, User, LogOut,
  Laptop, ShieldCheck, ChevronRight, Play, CheckSquare,
  Package, PenTool, X, Search, QrCode, Calendar
} from 'lucide-react';
import logoITZ from '../../assets/logotiposQR/ITZ.png';
import SignatureCanvas from '../SignatureCanvas';

export default function TechnicianPortal({ token, currentUser, onLogout, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'insumos'
  const [tickets, setTickets] = useState([]);
  const [insumosList, setInsumosList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Login de técnico si no hay token
  const [username, setUsername] = useState('tecnico');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Modal para resolver ticket
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [diagnostico, setDiagnostico] = useState('');
  const [trabajoRealizado, setTrabajoRealizado] = useState('');
  const [insumosConsumidos, setInsumosConsumidos] = useState([]); // [{ insumo_id, cantidad }]
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('1');
  const [firmaTecnico, setFirmaTecnico] = useState(null);
  const [firmaResponsable, setFirmaResponsable] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Cargar tickets del técnico
  const fetchMisTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/tecnico/mis-tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Error al cargar tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar catálogo de insumos
  const fetchInsumos = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/insumos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInsumosList(data);
      }
    } catch (err) {
      console.warn('Error al cargar insumos:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMisTickets();
      fetchInsumos();
    }
  }, [token]);

  // Manejador de login rápido
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

  // Iniciar atención (cambiar estado a en_proceso)
  const handleIniciarAtencion = async (ticketId) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/iniciar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMisTickets();
      }
    } catch (err) {
      alert('Error al iniciar atención');
    }
  };

  // Agregar insumo al carrito de consumo
  const handleAddInsumo = () => {
    if (!insumoSeleccionado) return;
    const insumoObj = insumosList.find((i) => i.id === parseInt(insumoSeleccionado, 10));
    if (!insumoObj) return;

    setInsumosConsumidos((prev) => [
      ...prev,
      {
        insumo_id: insumoObj.id,
        nombre: insumoObj.nombre,
        codigo: insumoObj.codigo,
        cantidad: parseFloat(cantidadInsumo) || 1,
        unidad_medida: insumoObj.unidad_medida
      }
    ]);
    setInsumoSeleccionado('');
    setCantidadInsumo('1');
  };

  // Resolver y cerrar ticket
  const handleFinalizarResolucion = async () => {
    if (!diagnostico.trim() && !trabajoRealizado.trim()) {
      alert('Por favor describe el trabajo o diagnóstico realizado');
      return;
    }

    setResolving(true);
    try {
      const payload = {
        diagnostico_tecnico: diagnostico.trim(),
        trabajo_realizado: trabajoRealizado.trim() || diagnostico.trim(),
        insumos_consumidos: insumosConsumidos.map((i) => ({
          insumo_id: i.insumo_id,
          cantidad: i.cantidad
        })),
        firma_tecnico: firmaTecnico,
        firma_responsable: firmaResponsable
      };

      const res = await fetch(`/api/tickets/${selectedTicket.id}/resolver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al resolver ticket');

      alert('¡Ticket resuelto y reporte de mantenimiento generado con éxito!');
      setSelectedTicket(null);
      setDiagnostico('');
      setTrabajoRealizado('');
      setInsumosConsumidos([]);
      setFirmaTecnico(null);
      setFirmaResponsable(null);
      fetchMisTickets();
    } catch (err) {
      alert(err.message);
    } finally {
      setResolving(false);
    }
  };

  // 1. Si no hay sesión iniciada, mostrar Login de Soporte Técnico
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-amber-500/30">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500 text-black rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Wrench className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Portal Soporte Técnico</h2>
            <p className="text-xs text-slate-500">Ingresa tus credenciales de técnico para gestionar tareas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            {loginError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Usuario Técnico
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. tecnico"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs shadow-md transition"
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar Sesión Técnica'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Vista principal del técnico autenticado
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Header Mobile */}
      <header className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-white rounded-xl p-1 flex items-center justify-center shadow">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black">Soporte Técnico</h1>
                <span className="text-[9px] bg-amber-400/30 text-amber-100 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                  PWA Técnico
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">
                {currentUser?.nombre || 'Técnico Operativo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMisTickets()}
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
        <div className="max-w-2xl mx-auto px-4 flex border-t border-amber-600/40">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'tickets'
                ? 'border-white text-white'
                : 'border-transparent text-amber-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><CheckSquare className="w-3.5 h-3.5" /> Mis Tareas ({tickets.filter((t) => t.estado !== 'resuelto').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'insumos'
                ? 'border-white text-white'
                : 'border-transparent text-amber-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Insumos & Stock</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* ================= TAB 1: TICKETS ASIGNADOS ================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Cargando tareas...</div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                <h3 className="font-bold text-slate-700 text-sm">¡Al día! No tienes tickets pendientes</h3>
                <p className="text-xs">Los nuevos tickets asignados por el supervisor aparecerán aquí.</p>
              </div>
            ) : (
              tickets.map((tck) => {
                const isUrgent = ['alta', 'critica'].includes(tck.prioridad);
                return (
                  <div
                    key={tck.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition ${
                      tck.estado === 'en_proceso'
                        ? 'border-indigo-400 ring-1 ring-indigo-300'
                        : isUrgent
                        ? 'border-red-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Fila superior: Folio y Prioridad */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tck.folio}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {tck.prioridad}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tck.estado === 'en_proceso'
                            ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                            : tck.estado === 'resuelto'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tck.estado === 'en_proceso'
                          ? 'En Reparación'
                          : tck.estado === 'resuelto'
                          ? 'Resuelto'
                          : 'Asignado'}
                      </span>
                    </div>

                    {/* Falla y Solicitante */}
                    <div className="mt-2">
                      <h3 className="font-bold text-slate-900 text-sm">{tck.categoria_falla}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{tck.descripcion_problema}</p>
                    </div>

                    {/* Ficha rápida del equipo si está asignado */}
                    {tck.equipo_id && (
                      <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{tck.marca} {tck.modelo}</span>
                          <span className="text-[11px] text-slate-500 font-mono ml-2">S/N: {tck.serial}</span>
                        </div>
                        <a
                          href={`/scan/${tck.equipo_id}`}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline"
                        >
                          Ver Historial
                        </a>
                      </div>
                    )}

                    {/* Solicitante y Fecha */}
                    <div className="mt-2 text-[11px] text-slate-500 flex justify-between items-center">
                      <span>Solicitante: <strong className="text-slate-700">{tck.solicitante_nombre}</strong></span>
                      {tck.fecha_programada_atencion && (
                        <span>Prog: {new Date(tck.fecha_programada_atencion).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Botones de acción según el estado */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end gap-2">
                      {tck.estado === 'asignado' && (
                        <button
                          onClick={() => handleIniciarAtencion(tck.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Iniciar Atención</span>
                        </button>
                      )}

                      {tck.estado === 'en_proceso' && (
                        <button
                          onClick={() => {
                            setSelectedTicket(tck);
                            setTrabajoRealizado(`Reparación realizada para reporte: ${tck.descripcion_problema}`);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Finalizar y Reportar</span>
                        </button>
                      )}

                      {tck.estado === 'resuelto' && (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>Servicio Concluido</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= TAB 2: INSUMOS ================= */}
        {activeTab === 'insumos' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Stock Actual de Insumos para Mantenimiento</span>
            </h2>

            <div className="divide-y divide-slate-100">
              {insumosList.map((insumo) => (
                <div key={insumo.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{insumo.nombre}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Cód: {insumo.codigo} • {insumo.categoria}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded-full ${
                        Number(insumo.stock_actual) <= Number(insumo.stock_minimo)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {insumo.stock_actual} {insumo.unidad_medida}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= MODAL DE RESOLUCIÓN Y REPORTE SGI ================= */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-emerald-500 my-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Resolver y Generar Reporte SGI
                  </h3>
                  <p className="text-xs text-slate-500">
                    Folio: <strong className="text-amber-600">{selectedTicket.folio}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Diagnóstico técnico */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Diagnóstico y Trabajo Realizado *
                </label>
                <textarea
                  rows={3}
                  required
                  value={trabajoRealizado}
                  onChange={(e) => setTrabajoRealizado(e.target.value)}
                  placeholder="Describe la solución aplicada, cambio de piezas, limpieza, formateo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Insumos consumidos */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Insumos / Refacciones del Almacén Utilizados
                </label>
                <div className="flex gap-2">
                  <select
                    value={insumoSeleccionado}
                    onChange={(e) => setInsumoSeleccionado(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">Selecciona material...</option>
                    {insumosList.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} (Stock: {ins.stock_actual})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={cantidadInsumo}
                    onChange={(e) => setCantidadInsumo(e.target.value)}
                    className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddInsumo}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition"
                  >
                    Agregar
                  </button>
                </div>

                {insumosConsumidos.length > 0 && (
                  <div className="divide-y divide-slate-200 bg-white rounded-xl p-2 border border-slate-200">
                    {insumosConsumidos.map((ins, i) => (
                      <div key={i} className="py-1 flex justify-between items-center text-xs">
                        <span>{ins.nombre}</span>
                        <div className="flex items-center gap-2 font-mono font-bold text-emerald-700">
                          <span>{ins.cantidad} {ins.unidad_medida}</span>
                          <button
                            type="button"
                            onClick={() => setInsumosConsumidos((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Firmas Digitales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Firma del Técnico
                  </label>
                  <SignatureCanvas onSave={(sig) => setFirmaTecnico(sig)} />
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Firma del Responsable
                  </label>
                  <SignatureCanvas onSave={(sig) => setFirmaResponsable(sig)} />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={resolving}
                  onClick={handleFinalizarResolucion}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  {resolving ? 'Guardando...' : 'Completar y Generar Reporte'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
