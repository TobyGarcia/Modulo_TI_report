import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, X, Check, Laptop, Clock, Search } from 'lucide-react';

export default function ScheduleMaintenanceModal({
  isOpen,
  onClose,
  onSave,
  equipment,
  equiposList = [],
  currentUser,
  initialDate = null,
  existingSchedule = null
}) {
  const [selectedEq, setSelectedEq] = useState(equipment);
  const [searchFilter, setSearchFilter] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    equipo_id: '',
    tipo_mantenimiento: 'preventivo',
    fecha_programada: '',
    hora_programada: '09:00 AM',
    turno: 'Matutino',
    tecnico_nombre: '',
    observaciones_equipo: ''
  });

  // Inicialización ÚNICA al abrir el modal o cambiar el equipo base/agenda
  useEffect(() => {
    if (!isOpen) return;

    if (existingSchedule) {
      const foundEq = (equiposList || []).find(e => e.id === existingSchedule.equipo_id) || equipment;
      setSelectedEq(foundEq);

      const fechaStr = existingSchedule.fecha_programada
        ? String(existingSchedule.fecha_programada).split('T')[0]
        : (initialDate || new Date().toISOString().split('T')[0]);

      setFormData({
        id: existingSchedule.id,
        equipo_id: existingSchedule.equipo_id,
        tipo_mantenimiento: existingSchedule.tipo_mantenimiento || 'preventivo',
        fecha_programada: fechaStr,
        hora_programada: existingSchedule.hora_programada || '09:00 AM',
        turno: existingSchedule.turno || 'Matutino',
        tecnico_nombre: existingSchedule.tecnico_nombre || currentUser?.nombre || '',
        observaciones_equipo: existingSchedule.observaciones_equipo || ''
      });
    } else {
      const activeEq = equipment || (equiposList.length > 0 ? equiposList[0] : null);
      setSelectedEq(activeEq);

      if (activeEq) {
        let fechaStr = initialDate;
        if (!fechaStr) {
          const manana = new Date();
          manana.setDate(manana.getDate() + 1);
          fechaStr = manana.toISOString().split('T')[0];
        }

        setFormData({
          id: null,
          equipo_id: activeEq.id,
          tipo_mantenimiento: 'preventivo',
          fecha_programada: fechaStr,
          hora_programada: '09:00 AM',
          turno: 'Matutino',
          tecnico_nombre: currentUser?.nombre || '',
          observaciones_equipo: ''
        });
      }
    }
    setSearchFilter('');
  }, [isOpen, equipment?.id, existingSchedule?.id, initialDate]);

  // Lista de equipos filtrados con useMemo para prevenir recreaciones de referencia innecesarias
  const filteredEquipments = useMemo(() => {
    if (!searchFilter.trim()) return equiposList || [];
    const term = searchFilter.toLowerCase();
    return (equiposList || []).filter(eq =>
      (eq.hostname && eq.hostname.toLowerCase().includes(term)) ||
      (eq.serial && eq.serial.toLowerCase().includes(term)) ||
      (eq.personal_asignado && eq.personal_asignado.toLowerCase().includes(term)) ||
      (eq.marca && eq.marca.toLowerCase().includes(term)) ||
      (eq.modelo && eq.modelo.toLowerCase().includes(term)) ||
      (eq.area && eq.area.toLowerCase().includes(term))
    );
  }, [equiposList, searchFilter]);

  // Manejo directo de búsqueda para auto-seleccionar el primer resultado coincidente sin bucles de useEffect
  const handleSearchFilterChange = (e) => {
    const val = e.target.value;
    setSearchFilter(val);

    if (val.trim()) {
      const term = val.toLowerCase();
      const matches = (equiposList || []).filter(eq =>
        (eq.hostname && eq.hostname.toLowerCase().includes(term)) ||
        (eq.serial && eq.serial.toLowerCase().includes(term)) ||
        (eq.personal_asignado && eq.personal_asignado.toLowerCase().includes(term)) ||
        (eq.marca && eq.marca.toLowerCase().includes(term)) ||
        (eq.modelo && eq.modelo.toLowerCase().includes(term)) ||
        (eq.area && eq.area.toLowerCase().includes(term))
      );

      if (matches.length > 0 && !matches.some(eq => eq.id === selectedEq?.id)) {
        const firstMatch = matches[0];
        setSelectedEq(firstMatch);
        setFormData(prev => ({ ...prev, equipo_id: firstMatch.id }));
      }
    }
  };

  const handleSelectEquipment = (e) => {
    const eqId = parseInt(e.target.value, 10);
    const found = (equiposList || []).find(item => item.id === eqId);
    if (found) {
      setSelectedEq(found);
      setFormData(prev => ({
        ...prev,
        equipo_id: found.id
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.equipo_id) {
      alert('Por favor seleccione un equipo.');
      return;
    }
    if (!formData.fecha_programada) {
      alert('Por favor seleccione una fecha programada.');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <h2 className="font-bold text-base">
              {existingSchedule ? 'Reprogramar Mantenimiento' : 'Programar Mantenimiento'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Selector de Equipo de la Base de Datos con Búsqueda */}
          <div className="space-y-2 border-b pb-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Seleccionar Equipo de la Base de Datos
            </label>

            {/* Buscador Rápido de Equipos */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por Hostname, Serial, Personal, Área, Marca..."
                value={searchFilter}
                onChange={handleSearchFilterChange}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Selector Desplegable */}
            <select
              value={selectedEq?.id || ''}
              onChange={handleSelectEquipment}
              className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {filteredEquipments.length === 0 ? (
                <option value="">No se encontraron equipos con esa búsqueda</option>
              ) : (
                filteredEquipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.hostname || 'SIN HOSTNAME'}] - Serial: {eq.serial} ({eq.marca} {eq.modelo}) - Assigned: {eq.personal_asignado || 'N/A'}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Ficha Resumen del Equipo Seleccionado */}
          {selectedEq && (
            <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 text-xs space-y-1">
              <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>{selectedEq.hostname || 'SIN HOSTNAME'}</span>
              </div>
              <p className="text-gray-600">
                <span className="font-semibold">Serial:</span> {selectedEq.serial} | <span className="font-semibold">Marca:</span> {selectedEq.marca} {selectedEq.modelo}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Asignado a:</span> {selectedEq.personal_asignado || 'No asignado'} ({selectedEq.area || 'N/A'})
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo de Mantenimiento */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Mantenimiento</label>
              <select
                value={formData.tipo_mantenimiento}
                onChange={(e) => setFormData({ ...formData, tipo_mantenimiento: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </div>

            {/* Turno */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Turno</label>
              <select
                value={formData.turno}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Nocturno">Nocturno</option>
              </select>
            </div>
          </div>

          {/* Fecha Programada y Hora Programada */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Programada</label>
              <input
                type="date"
                required
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hora Programada</span>
              </label>
              <select
                value={formData.hora_programada}
                onChange={(e) => setFormData({ ...formData, hora_programada: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
              >
                <option value="08:00 AM">08:00 AM</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:00 PM">05:00 PM</option>
                <option value="06:00 PM">06:00 PM</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          {/* Técnico Asignado */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Técnico TI Responsable</label>
            <input
              type="text"
              value={formData.tecnico_nombre}
              onChange={(e) => setFormData({ ...formData, tecnico_nombre: e.target.value })}
              placeholder="Nombre del técnico"
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Observaciones iniciales */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notas / Motivo del Mantenimiento</label>
            <textarea
              rows="2"
              value={formData.observaciones_equipo}
              onChange={(e) => setFormData({ ...formData, observaciones_equipo: e.target.value })}
              placeholder="Ej: Limpieza interna, cambio de pasta térmica, actualización de SO..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2 pt-2 border-t shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center space-x-1 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{existingSchedule ? 'Guardar Reprogramación' : 'Agendar Mantenimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
