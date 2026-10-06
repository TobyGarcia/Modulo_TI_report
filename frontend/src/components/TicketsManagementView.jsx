import React, { useState, useEffect } from 'react';
import {
  Ticket, Search, Filter, Plus, RefreshCw, CheckCircle, Clock,
  AlertTriangle, UserCheck, Star, ExternalLink, QrCode, Download,
  Eye, CheckSquare, XCircle, ChevronRight, User, Laptop, Smartphone, Wrench, ShieldCheck
} from 'lucide-react';

export default function TicketsManagementView({ token, currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterQuery, setFilterQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');

  // Modal Detalle
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = '/api/tickets?';
      if (filterEstado) url += `estado=${filterEstado}&`;
      if (filterPrioridad) url += `prioridad=${filterPrioridad}&`;
      if (filterQuery) url += `q=${encodeURIComponent(filterQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }

      const resStats = await fetch('/api/tickets/stats/resumen', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStats.ok) {
        const sData = await resStats.json();
        setStats(sData);
      }
    } catch (err) {
      console.error('Error al cargar tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterEstado, filterPrioridad]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-blue-600" />
            <span>Mesa de Ayuda & Tickets de Mantenimiento</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gestión centralizada del ciclo de vida de tickets, integrando las 3 PWAs (Cliente, Técnico y Supervisor)
          </p>
        </div>

        {/* Accesos directos a las 3 PWAs */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/cliente"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>PWA Cliente</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/tecnico"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>PWA Técnico</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/supervisor"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PWA Supervisor</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
            <div className="text-xl font-black text-gray-900 mt-0.5">{stats.total || 0}</div>
          </div>
          <div className="bg-amber-50/70 p-4 rounded-2xl shadow-sm border border-amber-200 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-600">Abiertos</span>
            <div className="text-xl font-black text-amber-700 mt-0.5">{stats.abiertos || 0}</div>
          </div>
          <div className="bg-blue-50/70 p-4 rounded-2xl shadow-sm border border-blue-200 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-600">Asignados</span>
            <div className="text-xl font-black text-blue-700 mt-0.5">{stats.asignados || 0}</div>
          </div>
          <div className="bg-indigo-50/70 p-4 rounded-2xl shadow-sm border border-indigo-200 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-600">En Proceso</span>
            <div className="text-xl font-black text-indigo-700 mt-0.5">{stats.en_proceso || 0}</div>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl shadow-sm border border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Resueltos</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.resueltos || 0}</div>
          </div>
          <div className="bg-yellow-50/70 p-4 rounded-2xl shadow-sm border border-yellow-200 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold text-yellow-700">Satisfacción</span>
            <div className="text-base font-black text-yellow-800 mt-0.5 flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{stats.promedio_satisfaccion || '5.0'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Buscar por folio, solicitante, serie o equipo..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los Estados</option>
            <option value="abierto">Abiertos (Pendientes)</option>
            <option value="asignado">Asignados</option>
            <option value="en_proceso">En Proceso</option>
            <option value="resuelto">Resueltos</option>
            <option value="cerrado">Cerrados</option>
            <option value="rechazado">Rechazados</option>
          </select>

          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las Prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>

          <button
            onClick={() => fetchTickets()}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla de Tickets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Equipo / S/N</th>
                <th className="px-4 py-3">Falla Reportada</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    Cargando listado de tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    No se encontraron tickets con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                tickets.map((tck) => {
                  const statusBadges = {
                    abierto: 'bg-amber-100 text-amber-800 border-amber-300',
                    asignado: 'bg-blue-100 text-blue-800 border-blue-300',
                    en_proceso: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                    resuelto: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    cerrado: 'bg-gray-100 text-gray-700 border-gray-300',
                    rechazado: 'bg-red-100 text-red-800 border-red-300'
                  };

                  const priorityBadges = {
                    critica: 'text-red-700 bg-red-100 border-red-300',
                    alta: 'text-orange-700 bg-orange-100 border-orange-300',
                    media: 'text-yellow-700 bg-yellow-100 border-yellow-300',
                    baja: 'text-slate-700 bg-slate-100 border-slate-300'
                  };

                  return (
                    <tr key={tck.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">
                        {tck.folio}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{tck.solicitante_nombre}</div>
                        <div className="text-[11px] text-gray-400">{tck.area_solicitante || 'General'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {tck.equipo_id ? (
                          <div>
                            <div className="font-medium text-gray-900">{tck.marca} {tck.modelo}</div>
                            <div className="text-[11px] font-mono text-gray-400">{tck.serial}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No vinculado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={tck.descripcion_problema}>
                        <div className="font-medium text-gray-800">{tck.categoria_falla}</div>
                        <div className="text-[11px] text-gray-500 truncate">{tck.descripcion_problema}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${priorityBadges[tck.prioridad] || 'bg-gray-100'}`}>
                          {tck.prioridad}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">
                          {tck.tecnico_nombre || <span className="text-gray-400 italic">Sin asignar</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadges[tck.estado] || 'bg-gray-100'}`}>
                          {tck.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedTicket(tck)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle Completo de Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Ticket {selectedTicket.folio}
                </h3>
                <span className="text-xs text-gray-500">
                  Fecha: {new Date(selectedTicket.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Falla Reportada</span>
                <p className="font-bold text-gray-800 text-sm">{selectedTicket.categoria_falla}</p>
                <p className="text-gray-600 mt-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {selectedTicket.descripcion_problema}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Solicitante</span>
                  <div className="font-bold text-gray-800">{selectedTicket.solicitante_nombre}</div>
                  <div className="text-gray-500">{selectedTicket.solicitante_email || 'Sin correo'}</div>
                  <div className="text-gray-500">{selectedTicket.area_solicitante}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Asignación TI</span>
                  <div className="font-bold text-gray-800">{selectedTicket.tecnico_nombre || 'Pendiente'}</div>
                  <div className="text-gray-500">Supervisor: {selectedTicket.supervisor_nombre || 'N/A'}</div>
                  <div className="text-gray-500">Estado: <strong className="text-gray-700">{selectedTicket.estado}</strong></div>
                </div>
              </div>

              {selectedTicket.diagnostico_tecnico && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Solución Técnica Aplicada</span>
                  <p className="text-gray-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    {selectedTicket.diagnostico_tecnico}
                  </p>
                </div>
              )}

              {selectedTicket.calificacion_servicio && (
                <div className="flex items-center gap-2 bg-yellow-50 p-2.5 rounded-xl border border-yellow-200">
                  <span className="font-bold text-yellow-800">Calificación del usuario:</span>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= selectedTicket.calificacion_servicio ? 'fill-amber-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  {selectedTicket.comentarios_cierre && (
                    <span className="text-gray-600 italic">"{selectedTicket.comentarios_cierre}"</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
