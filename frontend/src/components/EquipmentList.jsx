import React, { useState, useEffect } from 'react';
import { Search, Plus, FileSpreadsheet, Printer, Edit3, Trash2, QrCode, Monitor, RefreshCw, Globe, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function EquipmentList({
  token,
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
  
  // URL o IP para los códigos QR (detecta VITE_NGROK_DOMAIN de .env o localStorage u origin actual)
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

  const fetchEquipments = async (query = '') => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/equipos?q=${encodeURIComponent(query)}`, { headers });
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
    } catch (err) {
      console.error('Error al cargar equipos:', err);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [token]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchEquipments(val);
  };

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
    if (!window.confirm('¿Estás seguro de que deseas eliminar este equipo?')) return;
    try {
      const res = await fetch(`/api/equipos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEquipments(search);
        setSelectedIds(prev => prev.filter(itemId => itemId !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  // Calcular la URL Base efectiva para construir el enlace del QR
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
            <Monitor className="w-7 h-7 text-indigo-600" />
            <span>Inventario de Equipos & Etiquetas QR</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión centralizada de equipos de cómputo, generación de etiquetas e importación desde PostgreSQL / Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Campo para Ngrok / Dominio */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900">
              <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>URL Ngrok:</span>
            </div>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="ej. https://tu-dominio.ngrok-free.app"
              className="bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-900 outline-none w-64 focus:ring-2 focus:ring-indigo-500"
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
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Equipo</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado de Ngrok */}
      {effectiveBaseUrl && effectiveBaseUrl.includes('ngrok') && (
        <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900">
          <Globe className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold">Túnel Ngrok Activo:</span> Todos los códigos QR están configurados para usar el dominio seguro <span className="font-mono font-bold underline">{effectiveBaseUrl}</span>. ¡Cualquier dispositivo con Internet podrá escanearlos!
          </div>
        </div>
      )}

      {/* Barra de Filtros, Búsqueda y Selección Masiva */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por Hostname, Serial, Persona, Marca, Área..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchEquipments(search)}
            className="p-2.5 bg-white border rounded-xl hover:bg-gray-50 text-gray-600 transition"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handlePrintSelected}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {selectedIds.length} Etiquetas</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Cargando registros de PostgreSQL...
          </div>
        ) : equipments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Monitor className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-600 font-medium">
              {authError ? 'Atención: Sesión de TI Expirada' : 'No se encontraron equipos registrados.'}
            </p>
            <p className="text-xs text-gray-400">
              {authError
                ? 'Su token de inicio de sesión ha vencido o requiere volver a identificarse.'
                : 'Prueba importando tu plantilla de Excel o añadiendo un nuevo registro.'}
            </p>
            {authError && (
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition"
              >
                Volver a Iniciar Sesión
              </button>
            )}
          </div>
        ) : (
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
                  <th className="p-4">Personal Asignado</th>
                  <th className="p-4">Empresa / Área</th>
                  <th className="p-4">Marca & Modelo</th>
                  <th className="p-4">Hardware (CPU / RAM / Disco)</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {equipments.map((eq) => {
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
                        <div className="font-mono text-gray-900 font-bold">{eq.hostname || 'N/A'}</div>
                        <div className="text-xs font-mono text-gray-500">S/N: {eq.serial}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{eq.personal_asignado || 'No asignado'}</div>
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
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-md">
                          {eq.estado_fisico || 'Excelente'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
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
                            onClick={() => handleDelete(eq.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Eliminar"
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
    </div>
  );
}
