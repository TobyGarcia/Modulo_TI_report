import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const INITIAL_FORM = {
  item: '',
  personal_asignado: '',
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

export default function EquipmentFormModal({ isOpen, onClose, onSave, equipmentToEdit }) {
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    if (equipmentToEdit) {
      setFormData(equipmentToEdit);
    } else {
      setFormData(INITIAL_FORM);
    }
  }, [equipmentToEdit, isOpen]);

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
          <h2 className="text-xl font-bold">
            {equipmentToEdit ? 'Editar Equipo' : 'Nuevo Equipo de Cómputo'}
          </h2>
          <button onClick={onClose} className="hover:bg-indigo-600 p-1 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Datos Generales */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Información General & Asignación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ítem</label>
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
                  value={formData.empresa || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Empresa"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Área</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Sistemas, Finanzas"
                />
              </div>
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
            </div>
          </div>

          {/* Especificaciones del Hardware */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Identificación y Hardware
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Serial (Número de Serie)</label>
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
                  placeholder="Windows 11 Pro"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">CPU (Modelo/Generación)</label>
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo GPU</label>
                <input
                  type="text"
                  name="gpu_modelo"
                  value={formData.gpu_modelo || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nvidia RTX 3050 / Iris Xe"
                />
              </div>
            </div>
          </div>

          {/* Detalles Técnicos Adicionales */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3 border-b pb-1">
              Red & Estado
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
