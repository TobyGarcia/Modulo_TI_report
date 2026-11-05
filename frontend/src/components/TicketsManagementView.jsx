import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle, Clock, Eye, RefreshCw, Ticket } from 'lucide-react';

const COLUMNS = [
  { key: 'nuevo', title: 'Nuevos', classes: 'bg-amber-50 border-amber-200', header: 'bg-amber-100 text-amber-900', accent: 'text-amber-800 bg-amber-50' },
  { key: 'abierto', title: 'Abiertos', classes: 'bg-blue-50 border-blue-200', header: 'bg-blue-100 text-blue-900', accent: 'text-blue-800 bg-blue-50' },
  { key: 'en_proceso', title: 'En progreso', classes: 'bg-indigo-50 border-indigo-200', header: 'bg-indigo-100 text-indigo-900', accent: 'text-indigo-800 bg-indigo-50' },
  { key: 'resuelto', title: 'Resueltos', classes: 'bg-emerald-50 border-emerald-200', header: 'bg-emerald-100 text-emerald-900', accent: 'text-emerald-800 bg-emerald-50' }
];
// Medición KPI: sólo jornada laboral, lunes a viernes de 08:00 a 17:00.
const minutes = (from, to = new Date()) => {
  if (!from) return 0;
  let cursor = new Date(from); const end = new Date(to); let total = 0;
  while (cursor < end) {
    const open = new Date(cursor); open.setHours(8, 0, 0, 0);
    const close = new Date(cursor); close.setHours(17, 0, 0, 0);
    const start = new Date(Math.max(cursor, open)); const finish = new Date(Math.min(end, close));
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && finish > start) total += (finish - start) / 60000;
    cursor.setDate(cursor.getDate() + 1); cursor.setHours(0, 0, 0, 0);
  }
  return Math.floor(total);
};
const duration = (value) => value >= 60 ? `${Math.floor(value / 60)} h ${value % 60} min` : `${value} min`;

export default function TicketsManagementView({ token }) {
  const [tickets, setTickets] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null); const [tab, setTab] = useState('activos'); const [now, setNow] = useState(new Date());
  const load = async () => { setLoading(true); try { const response = await fetch('/api/tickets', { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) setTickets(await response.json()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [token]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(id); }, []);
  const closed = tickets.filter((ticket) => ticket.estado === 'cerrado');
  const kpi = useMemo(() => {
    const valued = closed.filter((ticket) => Number(ticket.calificacion_servicio) > 0);
    const opened = closed.filter((ticket) => ticket.fecha_abierto);
    const started = closed.filter((ticket) => ticket.fecha_inicio_atencion);
    const resolved = closed.filter((ticket) => ticket.fecha_resolucion);
    const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    const response = average(opened.map((ticket) => minutes(ticket.created_at, ticket.fecha_abierto)));
    const analysis = average(started.map((ticket) => minutes(ticket.fecha_abierto || ticket.created_at, ticket.fecha_inicio_atencion)));
    const execution = average(resolved.map((ticket) => minutes(ticket.fecha_inicio_atencion || ticket.fecha_abierto || ticket.created_at, ticket.fecha_resolucion)));
    return { total: closed.length, rating: valued.length ? (valued.reduce((sum, ticket) => sum + Number(ticket.calificacion_servicio), 0) / valued.length).toFixed(1) : '—', response, analysis, execution, accumulated: response + analysis + execution };
  }, [closed]);
  const timeInState = (ticket) => ticket.estado === 'resuelto' ? 'Sin conteo' : duration(minutes(ticket.estado === 'en_proceso' ? ticket.fecha_inicio_atencion : ticket.estado === 'abierto' ? ticket.fecha_abierto : ticket.created_at, now));
  const TicketCard = ({ ticket, accent = 'text-slate-700 bg-slate-50' }) => <article className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-2"><div className="flex justify-between gap-2"><b className="font-mono text-xs text-blue-700">{ticket.folio}</b><span className="text-[10px] uppercase font-bold text-slate-500">{ticket.prioridad}</span></div><p className="font-bold text-xs text-slate-800">{ticket.categoria_falla}</p><p className="text-[11px] text-slate-500">{ticket.solicitante_nombre} · {ticket.area_solicitante || 'General'}</p><div className={`flex justify-between text-[11px] font-bold rounded-lg px-2 py-1.5 ${accent}`}><span className="flex gap-1 items-center"><Clock className="w-3 h-3" />Tiempo</span><span>{timeInState(ticket)}</span></div><button onClick={() => setSelected(ticket)} className="w-full text-[11px] font-bold text-slate-600 hover:text-blue-700 flex justify-center gap-1"><Eye className="w-3.5 h-3.5" />Ver detalle</button></article>;
  return <div className="p-6 max-w-[1500px] mx-auto space-y-5"><header className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between gap-4 items-center"><div><h1 className="text-xl font-black text-slate-900 flex gap-2 items-center"><Ticket className="text-blue-600" /> Mesa de Ayuda</h1><p className="text-xs text-slate-500 mt-1">Supervisión del flujo y resultados de atención.</p></div><button onClick={load} className="inline-flex gap-2 items-center px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold"><RefreshCw className="w-4 h-4" />Actualizar</button></header><div className="bg-white border border-slate-200 rounded-2xl p-2 flex gap-2"><button onClick={() => setTab('activos')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === 'activos' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Tickets activos</button><button onClick={() => setTab('cerrados')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === 'cerrados' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Cerrados y estadísticas</button></div>
    {loading ? <div className="text-center p-12 text-sm text-slate-400">Cargando tickets…</div> : tab === 'activos' ? <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-4">{COLUMNS.map((column) => { const items = tickets.filter((ticket) => ticket.estado === column.key); return <section key={column.key} className={`rounded-2xl border overflow-hidden ${column.classes}`}><div className={`px-4 py-3 flex justify-between ${column.header}`}><h2 className="font-black text-sm">{column.title}</h2><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70">{items.length}</span></div><div className="p-3 space-y-3 min-h-40">{items.length ? items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} accent={column.accent} />) : <p className="text-xs text-slate-400 text-center pt-6">Sin tickets.</p>}</div></section>; })}</div> : <div className="space-y-5"><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3"><Metric label="Tickets cerrados" value={kpi.total} /><Metric label="Nuevo · tiempo de respuesta" value={duration(kpi.response)} /><Metric label="Abierto · análisis" value={duration(kpi.analysis)} /><Metric label="En progreso · ejecución" value={duration(kpi.execution)} /><Metric label="Total acumulado medido" value={duration(kpi.accumulated)} /><Metric label="Calificación promedio" value={kpi.rating === '—' ? 'Sin evaluaciones' : `${kpi.rating} / 5`} highlight /></div><section className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><div className="p-4 border-b"><h2 className="font-black text-sm text-slate-800">Tickets cerrados</h2><p className="text-xs text-slate-500">Sólo aparecen solicitudes confirmadas y calificadas por el cliente.</p></div>{closed.length ? <div className="divide-y">{closed.map((ticket) => <div key={ticket.id} className="p-4 flex flex-wrap justify-between gap-3 text-xs"><div><b className="font-mono text-blue-700">{ticket.folio}</b><p className="font-bold mt-1">{ticket.categoria_falla}</p><p className="text-slate-500 mt-1">{ticket.solicitante_nombre} · Cerrado: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('es-MX') : '—'}</p></div><div className="text-right"><p className="font-bold text-amber-700">Calificación: {ticket.calificacion_servicio || '—'} / 5</p><p className="text-slate-500 mt-1">Tiempo acumulado: {duration(minutes(ticket.created_at, ticket.fecha_resolucion || ticket.updated_at))}</p><button onClick={() => setSelected(ticket)} className="mt-2 font-bold text-blue-700">Ver detalle</button></div></div>)}</div> : <p className="p-10 text-center text-sm text-slate-400">Aún no hay tickets cerrados.</p>}</section></div>}
    {selected && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4"><div className="flex justify-between"><div><h2 className="font-black">{selected.folio}</h2><p className="text-xs text-slate-500">{selected.estado.replace('_', ' ')}</p></div><button onClick={() => setSelected(null)} className="text-slate-400">✕</button></div><div className="text-xs space-y-3"><p><b>Solicitante:</b> {selected.solicitante_nombre} · {selected.area_solicitante || 'General'}</p><p><b>Solicitud:</b> {selected.categoria_falla}</p><p className="bg-slate-50 rounded-xl p-3">{selected.descripcion_problema}</p><p><b>Técnico:</b> {selected.tecnico_nombre || 'Aún no tomado'}</p><p><b>Calificación:</b> {selected.calificacion_servicio || 'Sin calificación'}{selected.comentarios_cierre ? ` · ${selected.comentarios_cierre}` : ''}</p>{selected.diagnostico_tecnico && <p className="bg-emerald-50 rounded-xl p-3"><b>Diagnóstico:</b> {selected.diagnostico_tecnico}<br/><b>Solución:</b> {selected.solucion_tecnico}</p>}</div><button onClick={() => setSelected(null)} className="w-full py-2 bg-slate-100 rounded-xl text-xs font-bold">Cerrar</button></div></div>}
  </div>;
}
function Metric({ label, value, highlight }) {
  const numeric = Number.parseFloat(String(value));
  const width = Number.isFinite(numeric) ? Math.min(100, highlight ? (numeric / 5) * 100 : numeric) : 0;
  return <div className={`p-4 rounded-2xl border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}><span className="block text-[10px] uppercase font-bold text-slate-500">{label}</span><span className="block text-lg font-black mt-1 text-slate-800">{value}</span><div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" aria-label={`${label}: ${value}`}><div className={`h-full rounded-full ${highlight ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${width}%` }} /></div></div>;
}
