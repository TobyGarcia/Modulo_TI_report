import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Users,
  Wrench,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Layers,
  Activity,
  Clock,
  AlertTriangle,
  FolderTree,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

export default function DashboardView({ token, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setError(null);
      const res = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: Error al cargar métricas del dashboard`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [token]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-gray-200 rounded-2xl"></div>
          <div className="h-72 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { resumen, porCategoria, porEstado, kpisMantenimiento, proximosMantenimientos } = data || {};
  const totalEquipos = resumen?.totalEquipos || 0;

  // Asignar colores a los estados de equipo
  const getEstadoBadge = (nombre) => {
    const norm = (nombre || '').toLowerCase();
    if (norm.includes('asignado')) return { bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    if (norm.includes('resguardo')) return { bg: 'bg-amber-500/10 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    if (norm.includes('mantenimiento')) return { bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
    if (norm.includes('baja')) return { bg: 'bg-rose-500/10 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    return { bg: 'bg-gray-500/10 text-gray-700 border-gray-200', dot: 'bg-gray-500' };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-black to-neutral-900 text-white p-6 rounded-3xl shadow-xl border border-amber-900/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#e6b520] text-black font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Control TI
            </span>
            <span className="text-xs text-amber-200/80 font-mono">Actualizado en tiempo real</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Dashboard <span className="text-[#e6b520]">General</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl">
            Resumen ejecutivo del parque informático, estado de inventario y KPIs del programa de mantenimiento.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-400 font-semibold rounded-xl text-xs transition shadow-md border border-neutral-700 border-[#e6b520]/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#e6b520]' : ''}`} />
          <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Métricas'}</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Clave (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Equipos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Equipos Activos</span>
            <div className="p-3 bg-amber-50 text-[#c68a1d] rounded-xl group-hover:scale-110 transition">
              <Monitor className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">{resumen?.totalEquipos || 0}</span>
            <button
              onClick={() => onNavigateTab && onNavigateTab('inventory')}
              className="text-xs font-semibold text-[#c68a1d] hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Equipos registrados en inventario</p>
        </div>

        {/* Personal con Equipos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Activo</span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">{resumen?.totalEmpleados || 0}</span>
            <button
              onClick={() => onNavigateTab && onNavigateTab('empleados')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Ver personal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Colaboradores registrados en el sistema</p>
        </div>

        {/* Mantenimientos este Mes */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mantenimientos del Mes</span>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">{resumen?.mantenimientosMes || 0}</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Total: {resumen?.totalMantenimientos || 0}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Servicios ejecutados en el mes actual</p>
        </div>

        {/* Cumplimiento Preventivo */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eficiencia Preventiva</span>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">
              {kpisMantenimiento?.cumplimientoPreventivo ?? 100}%
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {kpisMantenimiento?.preventivos || 0} Preventivos
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Tasa de resolución de mantenimientos</p>
        </div>
      </div>

      {/* Fila 2: Categorías de Equipo y Estados de Equipos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Desglose por Categorías de Equipo */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-[#c68a1d] rounded-xl">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Categorías de Equipos</h2>
                <p className="text-xs text-gray-500">Distribución de inventario por clasificación</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('catalogos')}
              className="text-xs font-semibold text-[#c68a1d] hover:underline flex items-center gap-1"
            >
              Catálogos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {porCategoria && porCategoria.length > 0 ? (
              porCategoria.map((cat) => {
                const porcentaje = totalEquipos > 0 ? Math.round((cat.cantidad / totalEquipos) * 100) : 0;
                return (
                  <div key={cat.tipo_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-800 font-semibold">{cat.tipo_nombre}</span>
                      <div className="space-x-2 text-right">
                        <span className="text-gray-900 font-bold">{cat.cantidad} unidades</span>
                        <span className="text-gray-400">({porcentaje}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-[#e6b520] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(porcentaje, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No hay datos de categorías registrados.</p>
            )}
          </div>
        </div>

        {/* Distribución por Estados */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Estado de los Equipos</h2>
              <p className="text-xs text-gray-500">Condición operativa actual del inventario</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {porEstado && porEstado.length > 0 ? (
              porEstado.map((est) => {
                const badge = getEstadoBadge(est.estado_nombre);
                return (
                  <div
                    key={est.estado_id}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${badge.bg}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">{est.estado_nombre}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`}></span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold">{est.cantidad}</span>
                      <span className="text-[11px] font-semibold opacity-75">
                        {totalEquipos > 0 ? Math.round((est.cantidad / totalEquipos) * 100) : 0}% del total
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center col-span-2">No hay estados configurados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Fila 3: KPIs de Mantenimiento Desglosados */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-6 rounded-3xl shadow-lg border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#e6b520] text-black rounded-xl font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">KPIs de Mantenimiento</h2>
              <p className="text-xs text-amber-200/80">Desglose de servicios de mantenimiento preventivo y correctivo</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('bitacora')}
            className="text-xs font-bold text-black bg-[#e6b520] hover:bg-amber-400 px-3 py-1.5 rounded-xl transition shadow"
          >
            Abrir Bitácora & Agenda
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Preventivos</span>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{kpisMantenimiento?.preventivos || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">Servicios programados</p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Correctivos</span>
            <p className="text-2xl font-extrabold text-orange-400 mt-1">{kpisMantenimiento?.correctivos || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">Reparaciones de emergencia</p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Realizados</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{kpisMantenimiento?.realizados || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">Completados con éxito</p>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Programados / Pendientes</span>
            <p className="text-2xl font-extrabold text-blue-400 mt-1">{kpisMantenimiento?.programados || 0}</p>
            <p className="text-[10px] text-gray-500 mt-1">En cola de trabajo</p>
          </div>
        </div>
      </div>

      {/* Fila 4: Próximos Mantenimientos */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Mantenimientos Próximos</h2>
              <p className="text-xs text-gray-500">Próximos servicios agendados en el calendario</p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('bitacora')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Ver agenda completa <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {proximosMantenimientos && proximosMantenimientos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Fecha / Turno</th>
                  <th className="py-3 px-3">Equipo</th>
                  <th className="py-3 px-3">Asignado a / Área</th>
                  <th className="py-3 px-3">Tipo Serv.</th>
                  <th className="py-3 px-3">Técnico</th>
                  <th className="py-3 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proximosMantenimientos.map((item) => {
                  const fecha = item.fecha_programada
                    ? new Date(item.fecha_programada).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Sin Fecha';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{fecha}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block font-normal">{item.turno || item.hora_programada}</span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900">{item.hostname || 'Sin Hostname'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{item.serial || 'Sin Serial'}</p>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800">{item.equipo_personal_asignado || 'Resguardo'}</p>
                        <p className="text-[10px] text-gray-400">{item.equipo_area || 'Sin Área'}</p>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-700 capitalize">
                          {item.tipo_mantenimiento || 'Preventivo'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-gray-600 font-medium">
                          {item.tecnico_nombre || 'Por asignar'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">No hay mantenimientos pendientes agendados</p>
            <p className="text-[11px] text-gray-400">Todos los mantenimientos programados se encuentran al día.</p>
          </div>
        )}
      </div>
    </div>
  );
}
