import React, { useState, useEffect } from 'react';
import { Search, Plus, FileSpreadsheet, Printer, Edit3, Trash2, QrCode, Monitor, RefreshCw, Globe, ShieldAlert, FileText, Download, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Pagination from './Pagination';
import BajaModal from './BajaModal';
import { generarFormatoBajaPDF } from '../utils/pdfGenerator';

export default function EquipmentList({
  token,
  currentUser,
  onAddClick,
  onEditClick,
  onImportClick,
  onPrintLabelsClick
}) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [qrModalEquipo, setQrModalEquipo] = useState(null);
  const [bajaModalEquipo, setBajaModalEquipo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('activos'); // 'activos' | 'bajas'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filtros activos por catálogos
  const [filterTipoEquipo, setFilterTipoEquipo] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');
  const [filterArea, setFilterArea] = useState('');

  const [catalogosOptions, setCatalogosOptions] = useState({
    tipos_equipo: [],
    empresas: [],
    bases: [],
    areas: []
  });

  // URL o IP para los códigos QR
  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    const saved = localStorage.getItem('qr_base_url');
    if (saved) return saved;

    const envDomain = import.meta.env.VITE_NGROK_DOMAIN;
    if (envDomain && envDomain.trim() !== '') {
      return envDomain.startsWith('http') ? envDomain.trim() : `https://${envDomain.trim()}`;
    }

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return '';
  });

  const handleBaseUrlChange = (val) => {
    setCustomBaseUrl(val);
    localStorage.setItem('qr_base_url', val);
  };

  const [authError, setAuthError] = useState(false);

  // Cargar catálogos para filtros desplegables
  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/catalogos', { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setCatalogosOptions({
            tipos_equipo: Array.isArray(data.tipos_equipo) ? data.tipos_equipo : [],
            empresas: Array.isArray(data.empresas) ? data.empresas : [],
            bases: Array.isArray(data.bases) ? data.bases : [],
            areas: Array.isArray(data.areas) ? data.areas : []
          });
        }
      })
      .catch(err => console.error('Error al cargar catálogos para filtros:', err));
  }, [token]);

  const fetchEquipments = async (query = search, filter = statusFilter) => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let endpoint = filter === 'bajas'
        ? `/api/bajas?q=${encodeURIComponent(query)}`
        : `/api/equipos?q=${encodeURIComponent(query)}`;

      if (filter === 'activos') {
        if (filterTipoEquipo) endpoint += `&tipo_equipo_id=${encodeURIComponent(filterTipoEquipo)}`;
        if (filterEmpresa) endpoint += `&empresa=${encodeURIComponent(filterEmpresa)}`;
        if (filterCiudad) endpoint += `&ciudad=${encodeURIComponent(filterCiudad)}`;
        if (filterArea) endpoint += `&area=${encodeURIComponent(filterArea)}`;
      }

      const res = await fetch(endpoint, { headers });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        setEquipments([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setAuthError(false);
      setEquipments(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments(search, statusFilter);
  }, [token, statusFilter, filterTipoEquipo, filterEmpresa, filterCiudad, filterArea]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchEquipments(val, statusFilter);
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setSelectedIds([]);
    fetchEquipments(search, filter);
  };

  const clearActiveFilters = () => {
    setFilterTipoEquipo('');
    setFilterEmpresa('');
    setFilterCiudad('');
    setFilterArea('');
    setSearch('');
  };

  const totalPages = Math.ceil(equipments.length / pageSize) || 1;
  const currentEquipments = equipments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(equipments.map(eq => eq.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro permanentemente de la base de datos?')) return;
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEquipments(search, statusFilter);
        setSelectedIds(prev => prev.filter(itemId => itemId !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const getEffectiveBaseUrl = () => {
    if (customBaseUrl.trim()) {
      let url = customBaseUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      return url.replace(/\/$/, '');
    }
    return window.location.origin;
  };

  const effectiveBaseUrl = getEffectiveBaseUrl();

  const getQrUrlForEquipment = (equipoId) => {
    return `${effectiveBaseUrl}/scan/${equipoId}`;
  };

  const handlePrintSelected = () => {
    const selectedList = equipments.filter(eq => selectedIds.includes(eq.id));
    onPrintLabelsClick(selectedList, effectiveBaseUrl);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado e Inicios de Acción */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Monitor className="w-7 h-7 text-[#c68a1d]" />
            <span>Inventario de Equipos & Etiquetas QR</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión centralizada de equipos de cómputo, bajas de activos TI (R3PTI1) y etiquetas QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Campo para Ngrok / Dominio */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-black">
              <Globe className="w-4 h-4 text-[#c68a1d] flex-shrink-0" />
              <span>URL Ngrok:</span>
            </div>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="ej. https://tu-dominio.ngrok-free.app"
              className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono font-bold text-black outline-none w-64 focus:ring-2 focus:ring-[#e6b520]"
            />
          </div>

          <button
            onClick={onImportClick}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Excel</span>
          </button>

          <button
            onClick={onAddClick}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-[#e6b520] bg-black hover:bg-neutral-800 rounded-xl shadow transition border border-amber-900/40"
          >
            <Plus className="w-4 h-4 text-[#e6b520]" />
            <span>Nuevo Equipo</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado de Ngrok */}
      {effectiveBaseUrl && effectiveBaseUrl.includes('ngrok') && (
        <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-black">
          <Globe className="w-5 h-5 text-[#c68a1d] flex-shrink-0" />
          <div>
            <span className="font-bold">Túnel Ngrok Activo:</span> Todos los códigos QR están configurados para usar el dominio seguro <span className="font-mono font-bold underline">{effectiveBaseUrl}</span>.
          </div>
        </div>
      )}

      {/* Barra de Pestañas de Estado (Activos vs Historial de Bajas) */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border text-xs font-bold">
        <div className="flex space-x-2">
          <button
            onClick={() => handleFilterChange('activos')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 ${
              statusFilter === 'activos'
                ? 'bg-[#e6b520] text-black font-bold shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Monitor className="w-4 h-4 text-black" />
            <span>Equipos Activos</span>
          </button>

          <button
            onClick={() => handleFilterChange('bajas')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 ${
              statusFilter === 'bajas'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Equipos Dados de Baja (Historial R3PTI1)</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Selección Masiva */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder={statusFilter === 'bajas' ? "Buscar en bajas por Hostname, Serial, Motivo..." : "Buscar por Hostname, Serial, Persona, Marca, Área..."}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#e6b520] focus:border-black outline-none shadow-xs"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchEquipments(search, statusFilter)}
              className="p-2 bg-white border rounded-xl hover:bg-[#e6b520] text-gray-700 hover:text-black transition"
              title="Recargar"
            >
              <RefreshCw className="w-4 h-4 text-[#c68a1d]" />
            </button>

            {statusFilter === 'activos' && (filterTipoEquipo || filterEmpresa || filterCiudad || filterArea || search) && (
              <button
                onClick={clearActiveFilters}
                className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-200"
              >
                Limpiar Filtros
              </button>
            )}

            {statusFilter === 'activos' && selectedIds.length > 0 && (
              <button
                onClick={handlePrintSelected}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-black bg-[#e6b520] hover:bg-[#d0a11b] rounded-xl shadow transition border border-[#c68a1d]"
              >
                <Printer className="w-4 h-4 text-black" />
                <span>Imprimir {selectedIds.length} Etiquetas</span>
              </button>
            )}
          </div>
        </div>

        {/* Desplegables de Filtración Activa por Catálogos */}
        {statusFilter === 'activos' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t text-xs">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Categoría / Tipo</label>
              <select
                value={filterTipoEquipo}
                onChange={(e) => setFilterTipoEquipo(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-semibold focus:ring-2 focus:ring-[#e6b520] outline-none"
              >
                <option value="">Todas las categorías</option>
                {catalogosOptions.tipos_equipo.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Empresa</label>
              <select
                value={filterEmpresa}
                onChange={(e) => setFilterEmpresa(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-semibold focus:ring-2 focus:ring-[#e6b520] outline-none"
              >
                <option value="">Todas las empresas</option>
                {catalogosOptions.empresas.map(emp => (
                  <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Base / Ciudad</label>
              <select
                value={filterCiudad}
                onChange={(e) => setFilterCiudad(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-semibold focus:ring-2 focus:ring-[#e6b520] outline-none"
              >
                <option value="">Todas las bases</option>
                {catalogosOptions.bases.map(b => (
                  <option key={b.id} value={b.nombre}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Área / Depto</label>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-semibold focus:ring-2 focus:ring-[#e6b520] outline-none"
              >
                <option value="">Todas las áreas</option>
                {catalogosOptions.areas.map(a => (
                  <option key={a.id} value={a.nombre}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Cargando registros...
          </div>
        ) : equipments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            {statusFilter === 'bajas' ? (
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto text-amber-500" />
            ) : (
              <Monitor className="w-12 h-12 text-gray-300 mx-auto" />
            )}
            <p className="text-gray-600 font-medium">
              {authError
                ? 'Atención: Sesión de TI Expirada'
                : statusFilter === 'bajas'
                ? 'No hay registros de bajas de equipos en el historial.'
                : 'No se encontraron equipos activos registrados.'}
            </p>
            <p className="text-xs text-gray-400">
              {authError
                ? 'Su token de inicio de sesión ha vencido o requiere volver a identificarse.'
                : statusFilter === 'bajas'
                ? 'Los equipos que desincorpore del inventario aparecerán en esta lista con su Acta R3PTI1 en PDF.'
                : 'Prueba importando tu plantilla de Excel o añadiendo un nuevo registro.'}
            </p>
          </div>
        ) : statusFilter === 'bajas' ? (
          /* TABLA DE HISTORIAL DE BAJAS (R3PTI1) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-red-50 text-xs font-semibold text-red-900 uppercase tracking-wider border-b border-red-200">
                <tr>
                  <th className="p-4">Fecha Baja / Formato</th>
                  <th className="p-4">Hostname / Serial</th>
                  <th className="p-4">Marca & Modelo</th>
                  <th className="p-4">Motivo de la Baja</th>
                  <th className="p-4">Ubicación / Área</th>
                  <th className="p-4">Solicitó / Autorizó (TI)</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentEquipments.map((baja) => {
                  const fechaStr = baja.fecha_baja ? String(baja.fecha_baja).split('T')[0] : 'N/A';

                  return (
                    <tr key={baja.id} className="hover:bg-red-50/40 transition bg-red-50/10">
                      <td className="p-4">
                        <div className="font-bold text-red-900">{fechaStr}</div>
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-red-100 text-red-800 border border-red-200">
                          {baja.codigo_formato || 'R3PTI1'}
                        </span>
                      </td>
                      <td className="p-4 font-medium">
                        <div className="font-mono text-gray-900 font-bold">{baja.hostname || 'N/A'}</div>
                        <div className="text-xs font-mono text-gray-500">S/N: {baja.serial}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 font-semibold">{baja.marca}</div>
                        <div className="text-xs text-gray-500">{baja.modelo}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 rounded-lg border border-amber-300">
                          {baja.motivo}
                        </span>
                        {baja.observaciones && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">{baja.observaciones}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900">{baja.empresa || 'ITZ OIL & GAS'}</div>
                        <div className="text-xs text-gray-500">{baja.area || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="text-gray-800"><strong>Solicitó:</strong> {baja.solicitante_nombre || 'Soporte TI'}</div>
                        <div className="text-gray-600"><strong>Autorizó:</strong> {baja.autoriza_nombre || 'Jefe de TI'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => generarFormatoBajaPDF(baja, baja)}
                            className="px-3 py-1.5 text-xs font-bold text-red-800 bg-red-100 hover:bg-red-200 border border-red-300 rounded-xl transition shadow-xs flex items-center space-x-1"
                            title="Descargar Acta de Baja R3PTI1 en PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar PDF (R3PTI1)</span>
                          </button>

                          {baja.equipo_id && (
                            <button
                              onClick={() => setQrModalEquipo({ id: baja.equipo_id, hostname: baja.hostname, serial: baja.serial })}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                              title="Ver Código QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={equipments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          /* TABLA DE EQUIPOS ACTIVOS */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === equipments.length && equipments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-4">Hostname / Serial</th>
                  <th className="p-4">Personal / Ubicación</th>
                  <th className="p-4">Empresa / Área</th>
                  <th className="p-4">Marca & Modelo</th>
                  <th className="p-4">Hardware (CPU / RAM / Disco)</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentEquipments.map((eq) => {
                  const isSelected = selectedIds.includes(eq.id);

                  return (
                    <tr
                      key={eq.id}
                      className={`hover:bg-indigo-50/40 transition ${isSelected ? 'bg-indigo-50/60' : ''}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(eq.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-4 font-medium">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-950 border border-amber-300 mb-1">
                          {eq.tipo_equipo_nombre || 'Equipo de Cómputo'}
                        </span>
                        <div className="font-mono text-gray-900 font-bold">{eq.hostname || 'N/A'}</div>
                        <div className="text-xs font-mono text-gray-500">S/N: {eq.serial}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">
                          {eq.empleado_nombre || eq.personal_asignado || 'No asignado (Resguardo)'}
                        </div>
                        <div className="text-xs text-gray-500">{eq.ciudad}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900">{eq.empresa || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{eq.area || 'N/A'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 font-medium">{eq.marca}</div>
                        <div className="text-xs text-gray-500">{eq.modelo}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        <div>{eq.cpu}</div>
                        <div className="text-gray-400">{eq.ram_capacidad} RAM | {eq.disco_capacidad}</div>
                      </td>
                      <td className="p-4 space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                          eq.estado_nombre === 'Asignado' || eq.empleado_id
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {eq.estado_nombre || (eq.empleado_id ? 'Asignado' : 'Resguardo')}
                        </span>
                        <div className="text-[11px] text-gray-500">{eq.estado_fisico || 'Excelente'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setQrModalEquipo(eq)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                            title="Ver Código QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditClick(eq)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="Editar Equipo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setBajaModalEquipo(eq)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                            title="Dar de Baja Equipo (Formato R3PTI1)"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(eq.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Eliminar de BD"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={equipments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal de Previsualización de QR Individual */}
      {qrModalEquipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 relative">
            <button
              onClick={() => setQrModalEquipo(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-800">Código QR del Equipo</h3>
            <p className="text-xs text-gray-500 font-mono">{qrModalEquipo.hostname} ({qrModalEquipo.serial})</p>

            <div className="bg-white p-4 border rounded-xl inline-block shadow-inner">
              <QRCodeSVG
                value={getQrUrlForEquipment(qrModalEquipo.id)}
                size={180}
                level="M"
              />
            </div>

            <p className="text-xs text-indigo-900 font-semibold break-all bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 font-mono">
              {getQrUrlForEquipment(qrModalEquipo.id)}
            </p>

            <button
              onClick={() => {
                onPrintLabelsClick([qrModalEquipo], effectiveBaseUrl);
                setQrModalEquipo(null);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Etiqueta de este Equipo</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Baja de Equipos (Formato R3PTI1) */}
      <BajaModal
        isOpen={!!bajaModalEquipo}
        onClose={() => setBajaModalEquipo(null)}
        equipment={bajaModalEquipo}
        token={token}
        currentUser={currentUser}
        onBajaSuccess={() => {
          setBajaModalEquipo(null);
          fetchEquipments(search, statusFilter);
        }}
      />
    </div>
  );
}
