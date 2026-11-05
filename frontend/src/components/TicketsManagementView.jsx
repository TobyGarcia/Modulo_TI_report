import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye, RefreshCw, Ticket } from 'lucide-react';

const COLUMNS = [
  { key: 'nuevo', title: 'Nuevos', tone: 'amber' },
  { key: 'abierto', title: 'Abiertos', tone: 'blue' },
  { key: 'en_proceso', title: 'En progreso', tone: 'indigo' },
  { key: 'resuelto', title: 'Resueltos', tone: 'emerald' }
];

function minutesSince(date, now) {
  if (!date) return 0;
  return Math.max(0, Math.floor((now - new Date(date)) / 60000));
}
function displayMinutes(minutes) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

export default function TicketsManagementView({ token }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tickets', { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setTickets(await response.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const timeFor = (ticket) => {
    const start = ticket.estado === 'resuelto' ? ticket.fecha_resolucion : ticket.estado === 'en_proceso' ? ticket.fecha_inicio_atencion : ticket.estado === 'abierto' ? ticket.fecha_abierto : ticket.created_at;
    return displayMinutes(minutesSince(start || ticket.created_at, now));
  };

  return <div className="p-6 max-w-[1500px] mx-auto space-y-5">
    <header className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between gap-4 items-center"><div><h1 className="text-xl font-black text-slate-900 flex gap-2 items-center"><Ticket className="text-blue-600" /> Seguimiento de Mesa de Ayuda</h1><p className="text-xs text-slate-500 mt-1">Los técnicos toman directamente los tickets nuevos; el administrador sólo supervisa el flujo.</p></div><button onClick={load} className="inline-flex gap-2 items-center px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold"><RefreshCw className="w-4 h-4" />Actualizar</button></header>
    {loading ? <div className="text-center p-12 text-sm text-slate-400">Cargando tickets…</div> : <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-4">{COLUMNS.map((column) => { const items = tickets.filter((ticket) => ticket.estado === column.key); return <section key={column.key} className={`rounded-2xl border bg-${column.tone}-50/50 border-${column.tone}-200 overflow-hidden`}><div className={`px-4 py-3 bg-${column.tone}-100/70 text-${column.tone}-900 flex items-center justify-between`}><h2 className="font-black text-sm">{column.title}</h2><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70">{items.length}</span></div><div className="p-3 space-y-3 min-h-40">{items.length === 0 ? <p className="text-xs text-slate-400 text-center pt-6">Sin tickets.</p> : items.map((ticket) => <article key={ticket.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-2"><div className="flex justify-between gap-2"><b className="font-mono text-xs text-blue-700">{ticket.folio}</b><span className="text-[10px] uppercase font-bold text-slate-500">{ticket.prioridad}</span></div><p className="font-bold text-xs text-slate-800">{ticket.categoria_falla}</p><p className="text-[11px] text-slate-500">{ticket.solicitante_nombre} · {ticket.area_solicitante || 'General'}</p><div className={`flex items-center justify-between text-[11px] font-bold text-${column.tone}-800 bg-${column.tone}-50 rounded-lg px-2 py-1.5`}><span className="flex gap-1 items-center"><Clock className="w-3 h-3" />Tiempo en estado</span><span>{timeFor(ticket)}</span></div><button onClick={() => setSelected(ticket)} className="w-full text-[11px] font-bold text-slate-600 hover:text-blue-700 flex justify-center items-center gap-1"><Eye className="w-3.5 h-3.5" />Ver detalle</button></article>)}</div></section>; })}</div>}
    {selected && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4"><div className="flex justify-between"><div><h2 className="font-black">{selected.folio}</h2><p className="text-xs text-slate-500">{selected.estado.replace('_', ' ')}</p></div><button onClick={() => setSelected(null)} className="text-slate-400">✕</button></div><div className="text-xs space-y-3"><p><b>Solicitante:</b> {selected.solicitante_nombre} · {selected.area_solicitante || 'General'}</p><p><b>Solicitud:</b> {selected.categoria_falla}</p><p className="bg-slate-50 rounded-xl p-3">{selected.descripcion_problema}</p><p><b>Técnico:</b> {selected.tecnico_nombre || 'Aún no tomado'}</p><p><b>Tiempo en estado:</b> {timeFor(selected)}</p>{selected.diagnostico_tecnico && <p className="bg-emerald-50 rounded-xl p-3"><b>Diagnóstico:</b> {selected.diagnostico_tecnico}<br/><b>Solución:</b> {selected.solucion_tecnico}</p>}</div><button onClick={() => setSelected(null)} className="w-full py-2 bg-slate-100 rounded-xl text-xs font-bold">Cerrar</button></div></div>}
  </div>;
}
