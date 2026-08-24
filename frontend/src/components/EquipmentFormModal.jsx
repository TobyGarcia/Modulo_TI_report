import React, { useState, useEffect } from 'react';
import { X, Save, Layers } from 'lucide-react';

const INITIAL_FORM = {
  item: '',
  personal_asignado: '',
  tipo_equipo_id: 1,
  empresa: '',
  ciudad: '',
  area: '',
  hostname: '',
  marca: '',
  modelo: '',
  serial: '',
  so: '',
  cpu: '',
  ram_capacidad: '',
  disco_capacidad: '',
  gpu_tipo: 'Integrada',
  gpu_modelo: '',
  estado_fisico: 'Excelente',
  mac_wifi: '',
  uso_recomendado: '',
  observaciones: ''
};

export default function EquipmentFormModal({ isOpen, onClose, onSave, equipmentToEdit, token }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [catalogos, setCatalogos] = useState({
    tipos_equipo: [],
    empresas: [],
    bases: [],
    areas: []
  });

  useEffect(() => {
    if (isOpen) {
      if (equipmentToEdit) {
        setFormData({
          ...INITIAL_FORM,
          ...equipmentToEdit,
          tipo_equipo_id: equipmentToEdit.tipo_equipo_id || 1
        });
      } else {
        setFormData(INITIAL_FORM);
      }

      // Cargar catálogos para llenar selectores
      const storedToken = token || localStorage.getItem('jwt_token');
      if (storedToken) {
        fetch('/api/catalogos', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setCatalogos({
                tipos_equipo: Array.isArray(data.tipos_equipo) ? data.tipos_equipo : [],
                empresas: Array.isArray(data.empresas) ? data.empresas : [],
                bases: Array.isArray(data.bases) ? data.bases : [],
                areas: Array.isArray(data.areas) ? data.areas : []
              });
            }
          })
          .catch(err => console.error('Error al cargar catálogos en modal:', err));
      }
    }
  }, [equipmentToEdit, isOpen, token]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden">
        <div className="flex justify-between items-center bg-indigo-700 px-6 py-4 text-white">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-300" />
            <span>{equipmentToEdit ? 'Editar Equipo' : 'Nuevo Equipo de Inventario'}</span>
          </h2>
          <button onClick={onClose} className="hover:bg-indigo-600 p-1 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Clasificación de Categoría & Datos Generales */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Categoría del Equipo & Asignación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Tipo de Equipo / Categoría *
                </label>
                <select
                  name="tipo_equipo_id"
                  value={formData.tipo_equipo_id || 1}
                  onChange={handleChange}
                  className="w-full border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {catalogos.tipos_equipo.length > 0 ? (
                    catalogos.tipos_equipo.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))
                  ) : (
                    <option value={1}>Equipo de Cómputo</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ítem (Número)</label>
                <input
                  type="number"
                  name="item"
                  value={formData.item || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. 1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Personal Asignado</label>
                <input
                  type="text"
                  name="personal_asignado"
                  value={formData.personal_asignado || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nombre de la persona"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  list="empresas-list"
                  value={formData.empresa || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. ITZ OIL & GAS"
                />
                <datalist id="empresas-list">
                  {catalogos.empresas.map(emp => (
                    <option key={emp.id} value={emp.nombre} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ciudad / Base</label>
                <input
                  type="text"
                  name="ciudad"
                  list="bases-list"
                  value={formData.ciudad || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. San Francisco de Campeche"
                />
                <datalist id="bases-list">
                  {catalogos.bases.map(b => (
                    <option key={b.id} value={b.nombre} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Área / Depto</label>
                <input
                  type="text"
                  name="area"
                  list="areas-list"
                  value={formData.area || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Sistemas, Finanzas"
                />
                <datalist id="areas-list">
                  {catalogos.areas.map(a => (
                    <option key={a.id} value={a.nombre} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Especificaciones del Hardware / Equipo */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Identificación y Hardware / Especificaciones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hostname (Nombre Red)</label>
                <input
                  type="text"
                  name="hostname"
                  value={formData.hostname || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="PC-SYS-001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Marca</label>
                <input
                  type="text"
                  name="marca"
                  value={formData.marca || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Dell, Lenovo, HP"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
                <input
                  type="text"
                  name="modelo"
                  value={formData.modelo || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Latitude 5420"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Serial (Número de Serie) *</label>
                <input
                  type="text"
                  name="serial"
                  required
                  value={formData.serial || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-semibold"
                  placeholder="SN12345678"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sistema Operativo</label>
                <input
                  type="text"
                  name="so"
                  value={formData.so || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Windows 11 Pro / Linux / N/A"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">CPU (Procesador)</label>
                <input
                  type="text"
                  name="cpu"
                  value={formData.cpu || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Intel i7 11th Gen"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Capacidad RAM</label>
                <input
                  type="text"
                  name="ram_capacidad"
                  value={formData.ram_capacidad || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="16 GB"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Capacidad Disco</label>
                <input
                  type="text"
                  name="disco_capacidad"
                  value={formData.disco_capacidad || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="512 GB SSD"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo GPU</label>
                <select
                  name="gpu_tipo"
                  value={formData.gpu_tipo || 'Integrada'}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Integrada">Integrada</option>
                  <option value="Dedicada">Dedicada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detalles Técnicos Adicionales */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Red & Estado Físico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">MAC Wi-Fi</label>
                <input
                  type="text"
                  name="mac_wifi"
                  value={formData.mac_wifi || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="AA:BB:CC:DD:EE:FF"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Estado Físico</label>
                <input
                  type="text"
                  name="estado_fisico"
                  value={formData.estado_fisico || 'Excelente'}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Excelente, Bueno, Regular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Uso Recomendado</label>
                <input
                  type="text"
                  name="uso_recomendado"
                  value={formData.uso_recomendado || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Desarrollo, Diseño, Ofimática"
                />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea
              name="observaciones"
              rows={3}
              value={formData.observaciones || ''}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Detalles adicionales, accesorios o historial del equipo..."
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition"
            >
              <Save className="w-4 h-4" />
              <span>{equipmentToEdit ? 'Guardar Cambios' : 'Crear Equipo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
