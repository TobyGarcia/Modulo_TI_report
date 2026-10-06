import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, RefreshCw, FolderTree, Building2, MapPin, Briefcase, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';

export default function CatalogosView({ token }) {
  const [catalogos, setCatalogos] = useState({
    tipos_equipo: [],
    empresas: [],
    bases: [],
    areas: []
  });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('tipos'); // 'tipos' | 'empresas' | 'bases' | 'areas'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Forms
  const [newTipo, setNewTipo] = useState({ nombre: '', descripcion: '' });
  const [newEmpresa, setNewEmpresa] = useState({ nombre: '', acronimo: '' });
  const [newBase, setNewBase] = useState('');
  const [newArea, setNewArea] = useState('');

  const fetchCatalogos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/catalogos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar la información de catálogos');
      const data = await res.json();
      setCatalogos({
        tipos_equipo: Array.isArray(data.tipos_equipo) ? data.tipos_equipo : [],
        empresas: Array.isArray(data.empresas) ? data.empresas : [],
        bases: Array.isArray(data.bases) ? data.bases : [],
        areas: Array.isArray(data.areas) ? data.areas : []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, [token]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // --- Handlers for Tipos ---
  const handleAddTipo = async (e) => {
    e.preventDefault();
    if (!newTipo.nombre.trim()) return;
    try {
      const res = await fetch('/api/catalogos/tipos-equipo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTipo)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar tipo');
      setNewTipo({ nombre: '', descripcion: '' });
      showNotification('Categoría / Tipo de equipo añadido correctamente');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteTipo = async (id, nombre) => {
    if (id === 1) {
      alert('No es posible eliminar la categoría predeterminada "Equipo de Cómputo".');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${nombre}"? Los equipos que pertenezcan a esta categoría volverán al tipo predeterminado "Equipo de Cómputo".`)) return;

    try {
      const res = await fetch(`/api/catalogos/tipos-equipo/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      showNotification('Categoría eliminada correctamente');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Handlers for Empresas ---
  const handleAddEmpresa = async (e) => {
    e.preventDefault();
    if (!newEmpresa.nombre.trim() || !/^[a-zA-Z]{3}$/.test(newEmpresa.acronimo.trim())) return;
    try {
      const res = await fetch('/api/catalogos/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newEmpresa)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar empresa');
      setNewEmpresa({ nombre: '', acronimo: '' });
      showNotification('Empresa añadida al catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleEditCatalog = async (type, item) => {
    const labels = { 'tipos-equipo': 'la categoría', empresas: 'la empresa', bases: 'la base/ciudad', areas: 'el área' };
    const nombre = window.prompt(`Editar nombre de ${labels[type]}:`, item.nombre);
    if (nombre === null || !nombre.trim()) return;
    const payload = { nombre: nombre.trim() };
    if (type === 'empresas') {
      const acronimo = window.prompt('Acrónimo de 3 letras para los equipos:', item.acronimo || '');
      if (acronimo === null) return;
      if (!/^[a-zA-Z]{3}$/.test(acronimo.trim())) {
        showNotification('El acrónimo debe tener exactamente 3 letras.', true);
        return;
      }
      payload.acronimo = acronimo.trim().toUpperCase();
    }
    if (type === 'tipos-equipo') payload.descripcion = item.descripcion || '';
    try {
      const res = await fetch(`/api/catalogos/${type}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      showNotification('Registro actualizado correctamente');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteEmpresa = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la empresa "${nombre}" del catálogo?`)) return;
    try {
      const res = await fetch(`/api/catalogos/empresas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      showNotification('Empresa eliminada del catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Handlers for Bases ---
  const handleAddBase = async (e) => {
    e.preventDefault();
    if (!newBase.trim()) return;
    try {
      const res = await fetch('/api/catalogos/bases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newBase })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar base');
      setNewBase('');
      showNotification('Base / Ciudad añadida al catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteBase = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la base/ciudad "${nombre}" del catálogo?`)) return;
    try {
      const res = await fetch(`/api/catalogos/bases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      showNotification('Base / Ciudad eliminada del catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Handlers for Areas ---
  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newArea.trim()) return;
    try {
      const res = await fetch('/api/catalogos/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newArea })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar área');
      setNewArea('');
      showNotification('Área / Departamento añadido al catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteArea = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el área "${nombre}" del catálogo?`)) return;
    try {
      const res = await fetch(`/api/catalogos/areas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      showNotification('Área eliminada del catálogo');
      fetchCatalogos();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            <FolderTree className="w-7 h-7 text-[#c68a1d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogos del Sistema</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Administración libre de clasificaciones: Tipos de Equipo, Empresas, Bases y Áreas.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCatalogos}
          className="p-2.5 bg-white border rounded-xl hover:bg-amber-50 text-gray-700 hover:text-black transition self-start sm:self-auto"
          title="Recargar Catálogos"
        >
          <RefreshCw className="w-4 h-4 text-[#c68a1d]" />
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="flex items-center space-x-2 bg-red-50 text-red-700 p-4 rounded-xl text-xs font-semibold border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-semibold border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Navegación por Sub-Pestañas */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('tipos')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'tipos'
              ? 'bg-[#e6b520] text-black shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tipos / Categorías ({catalogos.tipos_equipo.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('empresas')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'empresas'
              ? 'bg-[#e6b520] text-black shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresas ({catalogos.empresas.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bases')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'bases'
              ? 'bg-[#e6b520] text-black shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Bases / Ciudades ({catalogos.bases.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('areas')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'areas'
              ? 'bg-[#e6b520] text-black shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Áreas / Departamentos ({catalogos.areas.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border text-center text-gray-500">
          <div className="w-8 h-8 border-4 border-[#e6b520] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando catálogos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulario de Alta a la Izquierda */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4 md:col-span-1 h-fit">
            <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
              <Plus className="w-4 h-4 text-[#c68a1d]" />
              <span>
                {activeSubTab === 'tipos' && 'Añadir Categoría de Equipo'}
                {activeSubTab === 'empresas' && 'Añadir Nueva Empresa'}
                {activeSubTab === 'bases' && 'Añadir Nueva Base / Ciudad'}
                {activeSubTab === 'areas' && 'Añadir Nueva Área'}
              </span>
            </h3>

            {activeSubTab === 'tipos' && (
              <form onSubmit={handleAddTipo} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Categoría *</label>
                  <input
                    type="text"
                    required
                    value={newTipo.nombre}
                    onChange={(e) => setNewTipo({ ...newTipo, nombre: e.target.value })}
                    placeholder="Ej. Impresora / Multifuncional"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción (Opcional)</label>
                  <textarea
                    rows={2}
                    value={newTipo.descripcion}
                    onChange={(e) => setNewTipo({ ...newTipo, descripcion: e.target.value })}
                    placeholder="Ej. Impresoras láser, térmicas y multifuncionales"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-neutral-800 text-[#e6b520] font-bold rounded-xl text-xs shadow transition border border-amber-900/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar Categoría</span>
                </button>
              </form>
            )}

            {activeSubTab === 'empresas' && (
              <form onSubmit={handleAddEmpresa} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre completo de la Empresa *</label>
                  <input
                    type="text"
                    required
                    value={newEmpresa.nombre}
                    onChange={(e) => setNewEmpresa({ ...newEmpresa, nombre: e.target.value })}
                    placeholder="Ej. ITZ OIL & GAS"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Acrónimo para equipos (3 letras) *</label>
                  <input type="text" required maxLength="3" value={newEmpresa.acronimo}
                    onChange={(e) => setNewEmpresa({ ...newEmpresa, acronimo: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                    placeholder="Ej. ITZ" className="w-full border rounded-xl px-3 py-2 text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 outline-none" />
                  <p className="mt-1 text-[10px] text-gray-500">Se mostrará sólo en el inventario de equipos.</p>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-neutral-800 text-[#e6b520] font-bold rounded-xl text-xs shadow transition border border-amber-900/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar Empresa</span>
                </button>
              </form>
            )}

            {activeSubTab === 'bases' && (
              <form onSubmit={handleAddBase} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Base / Ciudad *</label>
                  <input
                    type="text"
                    required
                    value={newBase}
                    onChange={(e) => setNewBase(e.target.value)}
                    placeholder="Ej. Ciudad del Carmen, Campeche"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-neutral-800 text-[#e6b520] font-bold rounded-xl text-xs shadow transition border border-amber-900/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar Base / Ciudad</span>
                </button>
              </form>
            )}

            {activeSubTab === 'areas' && (
              <form onSubmit={handleAddArea} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Área / Depto *</label>
                  <input
                    type="text"
                    required
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Ej. Telecomunicaciones"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-neutral-800 text-[#e6b520] font-bold rounded-xl text-xs shadow transition border border-amber-900/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar Área</span>
                </button>
              </form>
            )}
          </div>

          {/* Lista de Registros a la Derecha */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden md:col-span-2">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Registros en Catálogo ({activeSubTab})
              </h3>
              <span className="text-[11px] text-gray-500 font-mono">Total: {
                activeSubTab === 'tipos' ? catalogos.tipos_equipo.length :
                activeSubTab === 'empresas' ? catalogos.empresas.length :
                activeSubTab === 'bases' ? catalogos.bases.length :
                catalogos.areas.length
              }</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {activeSubTab === 'tipos' && (
                catalogos.tipos_equipo.length === 0 ? (
                  <p className="p-8 text-center text-xs text-gray-400">No hay tipos de equipo registrados.</p>
                ) : (
                  catalogos.tipos_equipo.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 text-sm">{item.nombre}</span>
                          {item.id === 1 && (
                            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 font-extrabold rounded uppercase">
                              Predeterminado BD
                            </span>
                          )}
                        </div>
                        {item.descripcion && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.descripcion}</p>
                        )}
                      </div>
                      {item.id !== 1 ? (
                        <div className="flex items-center gap-1">
                        <button onClick={() => handleEditCatalog('tipos-equipo', item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Editar categoría"><Edit3 className="w-4 h-4" /></button>
                        <button
                          onClick={() => handleDeleteTipo(item.id, item.nombre)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Sistema</span>
                      )}
                    </div>
                  ))
                )
              )}

              {activeSubTab === 'empresas' && (
                catalogos.empresas.length === 0 ? (
                  <p className="p-8 text-center text-xs text-gray-400">No hay empresas registradas en catálogo.</p>
                ) : (
                  catalogos.empresas.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div><span className="font-semibold text-gray-900 text-sm">{item.nombre}</span><p className="text-[10px] text-gray-500 font-mono">Equipos: {item.acronimo || 'Sin acrónimo'}</p></div>
                      </div>
                      <div className="flex items-center gap-1"><button onClick={() => handleEditCatalog('empresas', item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Editar empresa"><Edit3 className="w-4 h-4" /></button><button
                        onClick={() => handleDeleteEmpresa(item.id, item.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Eliminar empresa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button></div>
                    </div>
                  ))
                )
              )}

              {activeSubTab === 'bases' && (
                catalogos.bases.length === 0 ? (
                  <p className="p-8 text-center text-xs text-gray-400">No hay bases o ciudades registradas en catálogo.</p>
                ) : (
                  catalogos.bases.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-gray-900 text-sm">{item.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1"><button onClick={() => handleEditCatalog('bases', item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Editar base/ciudad"><Edit3 className="w-4 h-4" /></button><button
                        onClick={() => handleDeleteBase(item.id, item.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Eliminar base/ciudad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button></div>
                    </div>
                  ))
                )
              )}

              {activeSubTab === 'areas' && (
                catalogos.areas.length === 0 ? (
                  <p className="p-8 text-center text-xs text-gray-400">No hay áreas registradas en catálogo.</p>
                ) : (
                  catalogos.areas.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-gray-900 text-sm">{item.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1"><button onClick={() => handleEditCatalog('areas', item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Editar área"><Edit3 className="w-4 h-4" /></button><button
                        onClick={() => handleDeleteArea(item.id, item.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="Eliminar área"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button></div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
