import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Clock, Laptop, Search, User, X } from 'lucide-react';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const employeeName = (item) => item?.personal_asignado?.trim() || '';

export default function ScheduleMaintenanceModal({ isOpen, onClose, onSave, equipment, equiposList = [], employees = [], technicians = [], currentUser, initialDate = null, existingSchedule = null }) {
  const [selectedEq, setSelectedEq] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({ id: null, equipo_id: '', tipo_mantenimiento: 'preventivo', fecha_programada: '', hora_programada: '09:00', turno: 'Horario laboral', tecnico_nombre: '', observaciones_equipo: '' });

  const assignedEmployees = useMemo(() => {
    const names = new Map();
    employees.forEach((employee) => employee?.nombre?.trim() && names.set(employee.nombre.trim().toLowerCase(), employee.nombre.trim()));
    equiposList.forEach((item) => employeeName(item) && names.set(employeeName(item).toLowerCase(), employeeName(item)));
    return [...names.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [employees, equiposList]);

  const employeeEquipment = useMemo(() => equiposList.filter((item) => selectedEmployee && employeeName(item).toLowerCase() === selectedEmployee.toLowerCase()), [equiposList, selectedEmployee]);
  const filteredEquipment = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    return !term ? employeeEquipment : employeeEquipment.filter((item) => [item.hostname, item.serial, item.marca, item.modelo, item.area].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [employeeEquipment, searchFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const initialEquipment = existingSchedule ? equiposList.find((item) => item.id === existingSchedule.equipo_id) || equipment : equipment || null;
    const date = existingSchedule?.fecha_programada ? String(existingSchedule.fecha_programada).split('T')[0] : initialDate || new Date().toISOString().split('T')[0];
    const technicianName = existingSchedule?.tecnico_nombre || (technicians.some((technician) => technician.nombre === currentUser?.nombre)
      ? currentUser?.nombre
      : technicians[0]?.nombre || currentUser?.nombre || '');
    setSelectedEmployee(employeeName(initialEquipment));
    setSelectedEq(initialEquipment);
    setSearchFilter('');
    setFormData({ id: existingSchedule?.id || null, equipo_id: initialEquipment?.id || '', tipo_mantenimiento: 'preventivo', fecha_programada: date, hora_programada: TIME_SLOTS.includes(existingSchedule?.hora_programada) ? existingSchedule.hora_programada : '09:00', turno: 'Horario laboral', tecnico_nombre: technicianName, observaciones_equipo: existingSchedule?.observaciones_equipo || '' });
  }, [isOpen, equipment?.id, existingSchedule?.id, initialDate, equiposList, technicians, currentUser?.nombre]);

  const selectEmployee = (name) => {
    const nextEquipment = equiposList.find((item) => employeeName(item).toLowerCase() === name.toLowerCase()) || null;
    setSelectedEmployee(name); setSelectedEq(nextEquipment); setSearchFilter('');
    setFormData((current) => ({ ...current, equipo_id: nextEquipment?.id || '' }));
  };
  const selectEquipment = (id) => {
    const nextEquipment = employeeEquipment.find((item) => item.id === Number(id)) || null;
    setSelectedEq(nextEquipment); setFormData((current) => ({ ...current, equipo_id: nextEquipment?.id || '' }));
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedEmployee || !formData.equipo_id) return alert('Selecciona un usuario y uno de sus equipos asignados.');
    onSave(formData);
  };
  if (!isOpen) return null;

  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
    <div className="w-full sm:max-w-2xl max-h-[94vh] overflow-hidden bg-white shadow-2xl sm:rounded-2xl border border-gray-100 flex flex-col rounded-t-3xl">
      <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-4 text-white flex justify-between items-center shrink-0"><div className="flex items-center gap-2"><Calendar className="w-5 h-5" /><div><h2 className="font-bold text-base">{existingSchedule ? 'Reprogramar preventivo' : 'Programar preventivo'}</h2><p className="text-[11px] text-indigo-100">Disponible de 09:00 a 16:00 h</p></div></div><button type="button" onClick={onClose} className="p-2 -mr-1 rounded-lg hover:bg-white/15" aria-label="Cerrar"><X className="w-5 h-5" /></button></div>
      <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-indigo-800 mb-3">1. Usuario y equipo asignado</p><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-gray-700"><User className="inline w-3.5 h-3.5 mr-1 text-indigo-600" />Usuario</label><select required value={selectedEmployee} onChange={(event) => selectEmployee(event.target.value)} className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"><option value="">Selecciona un usuario</option>{assignedEmployees.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold text-gray-700"><Laptop className="inline w-3.5 h-3.5 mr-1 text-indigo-600" />Equipo asignado</label><select required disabled={!selectedEmployee || !employeeEquipment.length} value={selectedEq?.id || ''} onChange={(event) => selectEquipment(event.target.value)} className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 focus:ring-2 focus:ring-indigo-500"><option value="">{selectedEmployee ? 'Selecciona un equipo' : 'Primero selecciona un usuario'}</option>{filteredEquipment.map((item) => <option key={item.id} value={item.id}>{item.hostname || 'Sin hostname'} · {item.serial || 'Sin serie'}</option>)}</select></div></div>
          {selectedEmployee && !employeeEquipment.length && <p className="mt-2 text-xs text-amber-700">Este usuario no tiene equipos asignados.</p>}
          {employeeEquipment.length > 1 && <div className="relative mt-3"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" /><input value={searchFilter} onChange={(event) => setSearchFilter(event.target.value)} placeholder="Filtrar equipos del usuario" className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-xs" />{searchFilter && <div className="mt-1 text-[11px] text-gray-500">{filteredEquipment.length} equipo(s) encontrado(s)</div>}</div>}
        </div>
        {selectedEq && <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"><b className="text-gray-900">{selectedEq.hostname || 'Equipo sin hostname'}</b> · {selectedEq.marca} {selectedEq.modelo} · Área: {selectedEq.area || 'Sin área'}</div>}
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-gray-700 mb-3">2. Fecha y horario</p><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-gray-700">Día</label><input type="date" required value={formData.fecha_programada} onChange={(event) => setFormData({ ...formData, fecha_programada: event.target.value })} className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" /></div><div><label className="mb-1 block text-xs font-semibold text-gray-700"><Clock className="inline w-3.5 h-3.5 mr-1 text-indigo-600" />Hora</label><select value={formData.hora_programada} onChange={(event) => setFormData({ ...formData, hora_programada: event.target.value })} className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500">{TIME_SLOTS.map((time) => <option key={time} value={time}>{time} h</option>)}</select></div></div></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-gray-700">Técnico asignado</label>{technicians.length ? <select required value={formData.tecnico_nombre} onChange={(event) => setFormData({ ...formData, tecnico_nombre: event.target.value })} className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"><option value="">Selecciona un técnico</option>{technicians.map((technician) => <option key={technician.id || technician.nombre} value={technician.nombre}>{technician.nombre}</option>)}</select> : <input required value={formData.tecnico_nombre} onChange={(event) => setFormData({ ...formData, tecnico_nombre: event.target.value })} placeholder="Nombre del técnico responsable" className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />}</div><div><label className="mb-1 block text-xs font-semibold text-gray-700">Notas</label><input value={formData.observaciones_equipo} onChange={(event) => setFormData({ ...formData, observaciones_equipo: event.target.value })} placeholder="Limpieza, revisión, actualización..." className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500" /></div></div>
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-white pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancelar</button><button type="submit" className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Check className="w-4 h-4" />{existingSchedule ? 'Guardar cambios' : 'Agendar preventivo'}</button></div>
      </form>
    </div>
  </div>;
}
