import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  BookOpen,
  TrendingUp,
  Filter,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Info,
  X
} from 'lucide-react';

const PRESET_CATEGORIAS = [
  'General',
  'Limpieza y Mantenimiento',
  'Pastas y Disipadores Térmicos',
  'Componentes y Refacciones',
  'Cables y Conectores',
  'Consumibles e Impresión',
  'Herramientas y Accesorios',
  'Redes y Comunicaciones'
];

const PRESET_UNIDADES_MEDIDA = [
  'Pza',
  'ml',
  'L',
  'g',
  'kg',
  'Lata',
  'Bote / Frasco',
  'Caja / Paquete',
  'Metro',
  'Kit'
];

export default function InsumosView({ token: tokenProp, user }) {
  const [activeTab, setActiveTab] = useState('inventario'); // 'inventario' | 'recetas' | 'reportes' | 'movimientos'

  // Token robusto (prop > jwt_token > token)
  const token = tokenProp || localStorage.getItem('jwt_token') || localStorage.getItem('token');

  // Estados del inventario de insumos
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [solobajoStock, setSoloBajoStock] = useState(false);

  // Estados de Modales
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [insumoForm, setInsumoForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'General',
    unidad_medida: 'Pza',
    presentacion: 1.0,
    stock_actual: 0,
    stock_minimo: 1
  });

  const [showReabastecerModal, setShowReabastecerModal] = useState(false);
  const [reabastecerItem, setReabastecerItem] = useState(null);
  const [reabastecerForm, setReabastecerForm] = useState({
    cantidad: 1,
    motivo: 'Reabastecimiento de inventario'
  });

  // Estados de Recetas
  const [recetas, setRecetas] = useState([]);
  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [editingReceta, setEditingReceta] = useState(null);
  const [recetaForm, setRecetaForm] = useState({
    nombre: '',
    tipo_mantenimiento: 'preventivo',
    descripcion: '',
    insumos: [] // [{ insumo_id, cantidad }]
  });

  // Estados del Reporte de Consumo / Control por Área
  const [reporteData, setReporteData] = useState(null);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [filtrosReporte, setFiltrosReporte] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    area: '',
    empresa: '',
    tipo_mantenimiento: ''
  });

  // Estados del Historial de Movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const fetchInsumos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('q', searchQuery);
      if (categoriaFilter) queryParams.append('categoria', categoriaFilter);
      if (solobajoStock) queryParams.append('bajo_stock', 'true');

      const res = await fetch(`/api/insumos?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInsumos(data);
      }
    } catch (err) {
      console.error('Error al cargar insumos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecetas = async () => {
    try {
      setLoadingRecetas(true);
      const res = await fetch('/api/insumos/recetas/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecetas(data);
      }
    } catch (err) {
      console.error('Error al cargar recetas:', err);
    } finally {
      setLoadingRecetas(false);
    }
  };

  const fetchReporteConsumo = async () => {
    try {
      setLoadingReporte(true);
      const queryParams = new URLSearchParams();
      if (filtrosReporte.fecha_inicio) queryParams.append('fecha_inicio', filtrosReporte.fecha_inicio);
      if (filtrosReporte.fecha_fin) queryParams.append('fecha_fin', filtrosReporte.fecha_fin);
      if (filtrosReporte.area) queryParams.append('area', filtrosReporte.area);
      if (filtrosReporte.empresa) queryParams.append('empresa', filtrosReporte.empresa);
      if (filtrosReporte.tipo_mantenimiento) queryParams.append('tipo_mantenimiento', filtrosReporte.tipo_mantenimiento);

      const res = await fetch(`/api/insumos/reportes/consumo?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReporteData(data);
      }
    } catch (err) {
      console.error('Error al cargar reporte:', err);
    } finally {
      setLoadingReporte(false);
    }
  };

  const fetchMovimientos = async () => {
    try {
      setLoadingMovimientos(true);
      const res = await fetch('/api/insumos/historial/movimientos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      }
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, [searchQuery, categoriaFilter, solobajoStock]);

  useEffect(() => {
    if (activeTab === 'recetas') fetchRecetas();
    if (activeTab === 'reportes') fetchReporteConsumo();
    if (activeTab === 'movimientos') fetchMovimientos();
  }, [activeTab]);

  // Obtener categorías únicas para filtro
  const categoriasUnicas = useMemo(() => {
    const set = new Set([...PRESET_CATEGORIAS, ...insumos.map((i) => i.categoria).filter(Boolean)]);
    return Array.from(set);
  }, [insumos]);

  // Contadores rápidos
  const totalBajoStockCount = useMemo(() => {
    return insumos.filter((i) => parseFloat(i.stock_actual) <= parseFloat(i.stock_minimo)).length;
  }, [insumos]);

  // -------------------------------------------------------------
  // HANDLERS INSUMOS
  // -------------------------------------------------------------
  const handleOpenAddInsumo = () => {
    setEditingInsumo(null);
    setInsumoForm({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'General',
      unidad_medida: 'Pza',
      presentacion: 1.0,
      stock_actual: 0,
      stock_minimo: 1
    });
    setShowInsumoModal(true);
  };

  const handleOpenEditInsumo = (item) => {
    setEditingInsumo(item);
    setInsumoForm({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      categoria: item.categoria || 'General',
      unidad_medida: item.unidad_medida || 'Pza',
      presentacion: item.presentacion || 1.0,
      stock_actual: item.stock_actual || 0,
      stock_minimo: item.stock_minimo || 1
    });
    setShowInsumoModal(true);
  };

  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    try {
      const url = editingInsumo ? `/api/insumos/${editingInsumo.id}` : '/api/insumos';
      const method = editingInsumo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(insumoForm)
      });

      if (res.ok) {
        setShowInsumoModal(false);
        fetchInsumos();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Error ${res.status}: No se pudo guardar el insumo`);
      }
    } catch (err) {
      console.error('Error al guardar insumo:', err);
      alert('Error de comunicación con el servidor: ' + (err.message || err));
    }
  };

  const handleDeleteInsumo = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar/desactivar este insumo?')) return;
    try {
      const res = await fetch(`/api/insumos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchInsumos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar insumo');
      }
    } catch (err) {
      console.error('Error al eliminar insumo:', err);
    }
  };

  // Reabastecimiento
  const handleOpenReabastecer = (item) => {
    setReabastecerItem(item);
    setReabastecerForm({ cantidad: 1, motivo: 'Reabastecimiento de inventario' });
    setShowReabastecerModal(true);
  };

  const handleSaveReabastecer = async (e) => {
    e.preventDefault();
    if (!reabastecerItem) return;
    try {
      const res = await fetch(`/api/insumos/${reabastecerItem.id}/reabastecer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reabastecerForm)
      });

      if (res.ok) {
        setShowReabastecerModal(false);
        fetchInsumos();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al reabastecer');
      }
    } catch (err) {
      console.error('Error al reabastecer:', err);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS RECETAS
  // -------------------------------------------------------------
  const handleOpenAddReceta = () => {
    setEditingReceta(null);
    setRecetaForm({
      nombre: '',
      tipo_mantenimiento: 'preventivo',
      descripcion: '',
      insumos: []
    });
    setShowRecetaModal(true);
  };

  const handleOpenEditReceta = (receta) => {
    setEditingReceta(receta);
    setRecetaForm({
      nombre: receta.nombre || '',
      tipo_mantenimiento: receta.tipo_mantenimiento || 'preventivo',
      descripcion: receta.descripcion || '',
      insumos: (receta.insumos || []).map((i) => ({
        insumo_id: i.insumo_id,
        cantidad: i.cantidad
      }))
    });
    setShowRecetaModal(true);
  };

  const handleAddInsumoToReceta = () => {
    if (insumos.length === 0) return;
    const firstInsumoId = insumos[0].id;
    setRecetaForm((prev) => ({
      ...prev,
      insumos: [...prev.insumos, { insumo_id: firstInsumoId, cantidad: 1 }]
    }));
  };

  const handleRemoveInsumoFromReceta = (index) => {
    setRecetaForm((prev) => ({
      ...prev,
      insumos: prev.insumos.filter((_, idx) => idx !== index)
    }));
  };

  const handleInsumoChangeInReceta = (index, field, value) => {
    setRecetaForm((prev) => {
      const updated = [...prev.insumos];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, insumos: updated };
    });
  };

  const handleSaveReceta = async (e) => {
    e.preventDefault();
    try {
      const url = editingReceta
        ? `/api/insumos/recetas/list/${editingReceta.id}`
        : '/api/insumos/recetas/list';
      const method = editingReceta ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(recetaForm)
      });

      if (res.ok) {
        setShowRecetaModal(false);
        fetchRecetas();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar receta');
      }
    } catch (err) {
      console.error('Error al guardar receta:', err);
    }
  };

  const handleDeleteReceta = async (id) => {
    if (!window.confirm('¿Desea eliminar esta receta de mantenimiento?')) return;
    try {
      const res = await fetch(`/api/insumos/recetas/list/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRecetas();
      }
    } catch (err) {
      console.error('Error al eliminar receta:', err);
    }
  };

  // -------------------------------------------------------------
  // RENDERIZADO
  // -------------------------------------------------------------
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-black p-6 rounded-2xl border border-amber-900/40 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="bg-[#e6b520] p-3 rounded-2xl text-black shadow-lg shadow-amber-500/20">
            <Package className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Inventario de Insumos <span className="text-[#e6b520] text-sm font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">Control & Recetas</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              Administración de materiales, recetas de mantenimiento y control de consumos por área.
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación del Módulo */}
        <div className="flex flex-wrap items-center bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 gap-1">
          <button
            onClick={() => setActiveTab('inventario')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'inventario'
                ? 'bg-[#e6b520] text-black shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Materiales / Stock</span>
            {totalBajoStockCount > 0 && (
              <span className="ml-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {totalBajoStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('recetas')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'recetas'
                ? 'bg-[#e6b520] text-black shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Recetas Mantenimiento</span>
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'reportes'
                ? 'bg-[#e6b520] text-black shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Consumos por Área</span>
          </button>

          <button
            onClick={() => setActiveTab('movimientos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'movimientos'
                ? 'bg-[#e6b520] text-black shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Movimientos / Bitácora</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 1: INVENTARIO DE INSUMOS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventario' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Acciones */}
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 text-white text-xs pl-9 pr-4 py-2.5 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="bg-neutral-950 text-neutral-300 text-xs px-3 py-2.5 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
              >
                <option value="">Todas las Categorías</option>
                {categoriasUnicas.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSoloBajoStock(!solobajoStock)}
                className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition ${
                  solobajoStock
                    ? 'bg-red-950/60 border-red-600 text-red-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Sólo Bajo Stock</span>
              </button>
            </div>

            <button
              onClick={handleOpenAddInsumo}
              className="w-full md:w-auto flex items-center justify-center space-x-2 bg-[#e6b520] hover:bg-amber-400 text-black text-xs font-bold px-4 py-2.5 rounded-lg transition shadow"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Insumo</span>
            </button>
          </div>

          {/* Tabla de Insumos */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono font-medium border-b border-neutral-800">
                  <tr>
                    <th className="px-4 py-3.5">Código</th>
                    <th className="px-4 py-3.5">Material / Insumo</th>
                    <th className="px-4 py-3.5">Categoría</th>
                    <th className="px-4 py-3.5">Medida</th>
                    <th className="px-4 py-3.5 text-center">Presentación</th>
                    <th className="px-4 py-3.5 text-center">Stock Actual</th>
                    <th className="px-4 py-3.5 text-center">Stock Mín.</th>
                    <th className="px-4 py-3.5 text-center">Estado Stock</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-neutral-500">
                        Cargando catálogo de insumos...
                      </td>
                    </tr>
                  ) : insumos.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-neutral-500">
                        No se encontraron insumos o materiales en el inventario.
                      </td>
                    </tr>
                  ) : (
                    insumos.map((item) => {
                      const stockVal = parseFloat(item.stock_actual);
                      const minVal = parseFloat(item.stock_minimo);
                      const esBajo = stockVal <= minVal;
                      const esAgotado = stockVal === 0;

                      return (
                        <tr key={item.id} className="hover:bg-neutral-800/50 transition">
                          <td className="px-4 py-3 font-mono text-amber-400 font-bold">{item.codigo}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-white leading-tight">{item.nombre}</p>
                            {item.descripcion && (
                              <p className="text-[11px] text-neutral-400 truncate max-w-xs">{item.descripcion}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded text-[11px]">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{item.unidad_medida}</td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-200">
                            {parseFloat(item.presentacion)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-base">
                            <span className={esAgotado ? 'text-red-500' : esBajo ? 'text-amber-400' : 'text-emerald-400'}>
                              {stockVal}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-400">{minVal}</td>
                          <td className="px-4 py-3 text-center">
                            {esAgotado ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-800">
                                Agotado
                              </span>
                            ) : esBajo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
                                Reabastecer
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                Suficiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => handleOpenReabastecer(item)}
                              title="Reabastecer Almacén (+ Stock)"
                              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-800/80 text-emerald-400 border border-emerald-800/60 transition inline-flex items-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditInsumo(item)}
                              title="Editar Insumo"
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 transition inline-flex items-center"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInsumo(item.id)}
                              title="Eliminar / Desactivar Insumo"
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/60 text-red-400 border border-neutral-700 transition inline-flex items-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 2: RECETAS DE MANTENIMIENTO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'recetas' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Recetas & Plantillas de Insumos</h2>
              <p className="text-xs text-neutral-400">
                Define la lista estándar de materiales requeridos según el tipo de mantenimiento.
              </p>
            </div>
            <button
              onClick={handleOpenAddReceta}
              className="flex items-center space-x-2 bg-[#e6b520] hover:bg-amber-400 text-black text-xs font-bold px-4 py-2.5 rounded-lg transition shadow"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nueva Receta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingRecetas ? (
              <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
                Cargando recetas de mantenimiento...
              </div>
            ) : recetas.length === 0 ? (
              <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
                No hay recetas predefinidas. ¡Crea una nueva receta para agilizar la captura de insumos!
              </div>
            ) : (
              recetas.map((receta) => (
                <div
                  key={receta.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3 flex flex-col justify-between hover:border-amber-900/60 transition shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {receta.tipo_mantenimiento}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditReceta(receta)}
                          className="p-1 rounded bg-neutral-800 text-amber-400 hover:bg-neutral-700 transition"
                          title="Editar Receta"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReceta(receta.id)}
                          className="p-1 rounded bg-neutral-800 text-red-400 hover:bg-red-900/50 transition"
                          title="Eliminar Receta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mt-2 leading-snug">{receta.nombre}</h3>
                    {receta.descripcion && (
                      <p className="text-xs text-neutral-400 mt-1">{receta.descripcion}</p>
                    )}

                    <div className="mt-4 space-y-2 border-t border-neutral-800 pt-3">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                        Materiales Requeridos ({receta.insumos?.length || 0}):
                      </p>
                      <ul className="space-y-1.5">
                        {(receta.insumos || []).map((item) => (
                          <li
                            key={item.id || item.insumo_id}
                            className="flex items-center justify-between text-xs bg-neutral-950 p-2 rounded-lg border border-neutral-850"
                          >
                            <span className="font-semibold text-neutral-200">{item.insumo_nombre}</span>
                            <span className="font-mono text-amber-400 font-bold">
                              {parseFloat(item.cantidad)} {item.unidad_medida}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 3: CONSUMOS POR ÁREA & REPORTES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reportes' && (
        <div className="space-y-5">
          {/* Filtros del Reporte */}
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase font-mono mb-1">
                Fecha Inicio:
              </label>
              <input
                type="date"
                value={filtrosReporte.fecha_inicio}
                onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fecha_inicio: e.target.value })}
                className="w-full bg-neutral-950 text-white text-xs px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase font-mono mb-1">
                Fecha Término:
              </label>
              <input
                type="date"
                value={filtrosReporte.fecha_fin}
                onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fecha_fin: e.target.value })}
                className="w-full bg-neutral-950 text-white text-xs px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase font-mono mb-1">
                Tipo Muestreo:
              </label>
              <select
                value={filtrosReporte.tipo_mantenimiento}
                onChange={(e) => setFiltrosReporte({ ...filtrosReporte, tipo_mantenimiento: e.target.value })}
                className="w-full bg-neutral-950 text-neutral-300 text-xs px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
              >
                <option value="">Todos los Tipos</option>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </div>

            <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-2">
              <button
                onClick={fetchReporteConsumo}
                className="w-full flex items-center justify-center space-x-2 bg-[#e6b520] hover:bg-amber-400 text-black text-xs font-bold px-4 py-2.5 rounded-lg transition shadow"
              >
                <Filter className="w-4 h-4" />
                <span>Generar Reporte de Consumo</span>
              </button>
            </div>
          </div>

          {/* Tarjetas resumen */}
          {reporteData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Mantenimientos con Consumo</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {reporteData.resumen?.total_mantenimientos || 0}
                  </h3>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl text-amber-400 border border-amber-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Unidades Totales Consumidas</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">
                    {parseFloat(reporteData.resumen?.total_unidades_consumidas || 0)}
                  </h3>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Items de Insumo Utilizados</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1">
                    {reporteData.resumen?.total_registros_consumo || 0}
                  </h3>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl text-amber-400 border border-amber-500/20">
                  <Boxes className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Tablas de Desglose por Área y Top Insumos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Consumo por Área */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#e6b520]" />
                <span>Consumo por Área / Departamento</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono border-b border-neutral-800">
                    <tr>
                      <th className="px-3 py-2.5">Área</th>
                      <th className="px-3 py-2.5 text-center">Mantenimientos</th>
                      <th className="px-3 py-2.5 text-right">Unidades Consumidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {loadingReporte ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-neutral-500">
                          Cargando consumos por área...
                        </td>
                      </tr>
                    ) : !reporteData?.consumo_por_area || reporteData.consumo_por_area.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-neutral-500">
                          No hay consumos registrados en el periodo seleccionado.
                        </td>
                      </tr>
                    ) : (
                      reporteData.consumo_por_area.map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-800/40">
                          <td className="px-3 py-2.5 font-bold text-white">{row.area}</td>
                          <td className="px-3 py-2.5 text-center font-mono">{row.mantenimientos_count}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                            {parseFloat(row.unidades_consumidas)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Insumos Más Consumidos */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#e6b520]" />
                <span>Insumos de Mayor Consumo</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono border-b border-neutral-800">
                    <tr>
                      <th className="px-3 py-2.5">Código</th>
                      <th className="px-3 py-2.5">Insumo</th>
                      <th className="px-3 py-2.5 text-center">Unidad</th>
                      <th className="px-3 py-2.5 text-right">Cant. Consumida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {loadingReporte ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-neutral-500">
                          Cargando top insumos...
                        </td>
                      </tr>
                    ) : !reporteData?.top_insumos || reporteData.top_insumos.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-neutral-500">
                          No hay consumos registrados.
                        </td>
                      </tr>
                    ) : (
                      reporteData.top_insumos.map((row) => (
                        <tr key={row.insumo_id} className="hover:bg-neutral-800/40">
                          <td className="px-3 py-2.5 font-mono text-amber-400 font-bold">{row.codigo}</td>
                          <td className="px-3 py-2.5 font-bold text-white">{row.nombre}</td>
                          <td className="px-3 py-2.5 text-center font-mono">{row.unidad_medida}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">
                            {parseFloat(row.cantidad_consumida)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PESTAÑA 4: HISTORIAL DE MOVIMIENTOS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'movimientos' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#e6b520]" />
              <span>Bitácora de Entradas y Salidas de Inventario</span>
            </h3>
            <button
              onClick={fetchMovimientos}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white transition"
              title="Refrescar Bitácora"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3 text-center">Tipo Movimiento</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3">Motivo / Mantenimiento</th>
                  <th className="px-4 py-3">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-medium">
                {loadingMovimientos ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-neutral-500">
                      Cargando movimientos de almacén...
                    </td>
                  </tr>
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-neutral-500">
                      No hay registro de movimientos de insumos.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-800/40">
                      <td className="px-4 py-3 font-mono text-neutral-400">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{m.insumo_nombre}</p>
                        <span className="font-mono text-[10px] text-amber-400">{m.insumo_codigo}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.tipo_movimiento === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <ArrowDownLeft className="w-3 h-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
                            <ArrowUpRight className="w-3 h-3" /> Salida
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-base">
                        {parseFloat(m.cantidad)} {m.unidad_medida}
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{m.motivo || '-'}</td>
                      <td className="px-4 py-3 font-mono text-neutral-400">{m.usuario_nombre || 'Sistema'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREAR / EDITAR INSUMO */}
      {/* ------------------------------------------------------------- */}
      {showInsumoModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingInsumo ? 'Editar Insumo' : 'Registrar Nuevo Insumo / Material'}
              </h3>
              <button
                onClick={() => setShowInsumoModal(false)}
                className="p-1 rounded font-bold text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInsumo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Código (Autogenerado opcional):</label>
                  <input
                    type="text"
                    placeholder="Ej: INS-0001"
                    value={insumoForm.codigo}
                    onChange={(e) => setInsumoForm({ ...insumoForm, codigo: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Categoría *:</label>
                  <select
                    value={insumoForm.categoria}
                    onChange={(e) => setInsumoForm({ ...insumoForm, categoria: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {PRESET_CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 font-mono mb-1">Nombre del Material / Insumo *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alcohol Isopropílico, Pasta Térmica Arctic MX-4"
                  value={insumoForm.nombre}
                  onChange={(e) => setInsumoForm({ ...insumoForm, nombre: e.target.value })}
                  className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Unidad de Medida *:</label>
                  <select
                    value={insumoForm.unidad_medida}
                    onChange={(e) => setInsumoForm({ ...insumoForm, unidad_medida: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {PRESET_UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Presentación (Unidad en números):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej: 500 para bote 500ml, 1 para pza"
                    value={insumoForm.presentacion}
                    onChange={(e) => setInsumoForm({ ...insumoForm, presentacion: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Stock Actual (Existencias):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={insumoForm.stock_actual}
                    onChange={(e) => setInsumoForm({ ...insumoForm, stock_actual: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={insumoForm.stock_minimo}
                    onChange={(e) => setInsumoForm({ ...insumoForm, stock_minimo: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 font-mono mb-1">Descripción / Observaciones:</label>
                <textarea
                  rows="2"
                  value={insumoForm.descripcion}
                  onChange={(e) => setInsumoForm({ ...insumoForm, descripcion: e.target.value })}
                  className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowInsumoModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e6b520] hover:bg-amber-400 text-black font-bold rounded-lg transition shadow"
                >
                  {editingInsumo ? 'Guardar Cambios' : 'Registrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REABASTECER ALMACÉN */}
      {/* ------------------------------------------------------------- */}
      {showReabastecerModal && reabastecerItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Reabastecer Almacén</span>
              </h3>
              <button
                onClick={() => setShowReabastecerModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs space-y-1">
              <p className="font-bold text-white">{reabastecerItem.nombre}</p>
              <p className="text-neutral-400 font-mono">
                Código: <span className="text-amber-400 font-bold">{reabastecerItem.codigo}</span> | Stock Actual: <span className="text-emerald-400 font-bold">{parseFloat(reabastecerItem.stock_actual)} {reabastecerItem.unidad_medida}</span>
              </p>
            </div>

            <form onSubmit={handleSaveReabastecer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 font-mono mb-1">
                  Cantidad a Ingresar ({reabastecerItem.unidad_medida}) *:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={reabastecerForm.cantidad}
                  onChange={(e) => setReabastecerForm({ ...reabastecerForm, cantidad: e.target.value })}
                  className="w-full bg-neutral-950 text-white text-base px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-300 font-mono mb-1">Motivo / Referencia:</label>
                <input
                  type="text"
                  value={reabastecerForm.motivo}
                  onChange={(e) => setReabastecerForm({ ...reabastecerForm, motivo: e.target.value })}
                  className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowReabastecerModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREAR / EDITAR RECETA DE MANTENIMIENTO */}
      {/* ------------------------------------------------------------- */}
      {showRecetaModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingReceta ? 'Editar Receta de Mantenimiento' : 'Crear Nueva Receta / Plantilla'}
              </h3>
              <button
                onClick={() => setShowRecetaModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceta} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Nombre de la Receta *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Preventivo Laptop Estándar"
                    value={recetaForm.nombre}
                    onChange={(e) => setRecetaForm({ ...recetaForm, nombre: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 font-mono mb-1">Tipo de Mantenimiento:</label>
                  <select
                    value={recetaForm.tipo_mantenimiento}
                    onChange={(e) => setRecetaForm({ ...recetaForm, tipo_mantenimiento: e.target.value })}
                    className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="preventivo">Preventivo</option>
                    <option value="correctivo">Correctivo</option>
                    <option value="especializado">Especializado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 font-mono mb-1">Descripción de la Plantilla:</label>
                <textarea
                  rows="2"
                  placeholder="Detalles sobre cuándo aplicar esta receta..."
                  value={recetaForm.descripcion}
                  onChange={(e) => setRecetaForm({ ...recetaForm, descripcion: e.target.value })}
                  className="w-full bg-neutral-950 text-white px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              {/* Lista de Insumos Requeridos */}
              <div className="space-y-2 border-t border-neutral-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white font-mono uppercase text-[11px]">
                    Insumos y Cantidades Requeridas:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInsumoToReceta}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md font-bold transition text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Material</span>
                  </button>
                </div>

                {recetaForm.insumos.length === 0 ? (
                  <p className="text-neutral-500 text-center py-4 bg-neutral-950 rounded-xl border border-neutral-850">
                    No has agregado insumos a esta receta. Haz clic en "Añadir Material".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recetaForm.insumos.map((item, idx) => {
                      const selectedInsumo = insumos.find((i) => i.id === parseInt(item.insumo_id, 10));
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800"
                        >
                          <select
                            value={item.insumo_id}
                            onChange={(e) => handleInsumoChangeInReceta(idx, 'insumo_id', e.target.value)}
                            className="flex-1 bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 focus:outline-none focus:border-amber-500"
                          >
                            {insumos.map((ins) => (
                              <option key={ins.id} value={ins.id}>
                                {ins.nombre} ({ins.codigo}) [{ins.unidad_medida}]
                              </option>
                            ))}
                          </select>

                          <div className="w-28 flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.cantidad}
                              onChange={(e) => handleInsumoChangeInReceta(idx, 'cantidad', e.target.value)}
                              className="w-full bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 text-center font-mono font-bold"
                            />
                            <span className="text-[10px] text-neutral-400 font-mono truncate">
                              {selectedInsumo?.unidad_medida || 'Pza'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveInsumoFromReceta(idx)}
                            className="p-1.5 rounded bg-neutral-900 text-red-400 hover:bg-red-950 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowRecetaModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e6b520] hover:bg-amber-400 text-black font-bold rounded-lg transition shadow"
                >
                  {editingReceta ? 'Guardar Receta' : 'Crear Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
