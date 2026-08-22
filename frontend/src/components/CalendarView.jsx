import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Laptop, Plus, CheckCircle, Wrench, X } from 'lucide-react';

export default function CalendarView({ mantenimientos, onSelectDate, onSelectMaintenance }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Navegación de meses
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Cálculo de días en el mes y día inicial (Ajustado a Lunes = 0)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // getDay(): 0 = Domingo, 1 = Lunes. Queremos Lunes = 0, Domingo = 6
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Domingo

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  // Mapear mantenimientos a fechas YYYY-MM-DD (Guardas de seguridad)
  const safeMantenimientos = Array.isArray(mantenimientos) ? mantenimientos : [];

  const getMantenimientosForDay = (dayNum) => {
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    const targetDateStr = `${year}-${monthStr}-${dayStr}`;

    return safeMantenimientos.filter(m => {
      if (!m) return false;
      if (m.fecha_programada) {
        const fechaProg = String(m.fecha_programada).split('T')[0];
        return fechaProg === targetDateStr;
      }
      if (m.fecha_realizado) {
        const fechaReal = String(m.fecha_realizado).split('T')[0];
        return fechaReal === targetDateStr;
      }
      return false;
    });
  };

  const todayObj = new Date();
  const isToday = (dayNum) => {
    return (
      dayNum === todayObj.getDate() &&
      month === todayObj.getMonth() &&
      year === todayObj.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-4 sm:p-6">
      {/* Barra Superior del Calendario: Mes, Año, Selector y Navegación */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[month]} <span className="text-indigo-600">{year}</span>
            </h2>
            <p className="text-xs text-gray-500">Ciclo de vida y programación de mantenimientos por fecha y hora</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Selector de Mes directo */}
          <select
            value={month}
            onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value, 10), 1))}
            className="text-xs p-2 border rounded-xl bg-gray-50 font-semibold text-gray-700 focus:bg-white"
          >
            {monthNames.map((mName, idx) => (
              <option key={idx} value={idx}>{mName}</option>
            ))}
          </select>

          {/* Selector de Año */}
          <select
            value={year}
            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1))}
            className="text-xs p-2 border rounded-xl bg-gray-50 font-semibold text-gray-700 focus:bg-white"
          >
            {[year - 1, year, year + 1, year + 2].map((yVal) => (
              <option key={yVal} value={yVal}>{yVal}</option>
            ))}
          </select>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition-colors"
          >
            Hoy
          </button>

          <div className="flex items-center space-x-1 border rounded-xl p-1 bg-gray-50">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded-lg text-gray-600 transition-colors"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded-lg text-gray-600 transition-colors"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid del Calendario (Días de la semana) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider py-2 bg-gray-50 rounded-xl border">
        {dayNames.map((d, idx) => (
          <div key={idx} className={idx >= 5 ? 'text-purple-600' : 'text-gray-700'}>
            {d}
          </div>
        ))}
      </div>

      {/* Celdas de Días del Mes */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Días en blanco antes del día 1 */}
        {blankDays.map((_, idx) => (
          <div key={`blank-${idx}`} className="h-28 bg-gray-50/40 rounded-xl border border-dashed border-gray-100" />
        ))}

        {/* Días del mes */}
        {daysArray.map((dayNum) => {
          const maintsForDay = getMantenimientosForDay(dayNum);
          const isCurrentDay = isToday(dayNum);

          const monthStr = String(month + 1).padStart(2, '0');
          const dayStr = String(dayNum).padStart(2, '0');
          const dateFormattedStr = `${year}-${monthStr}-${dayStr}`;

          return (
            <div
              key={`day-${dayNum}`}
              className={`h-28 sm:h-32 p-1.5 rounded-xl border flex flex-col justify-between transition-all group hover:border-indigo-400 hover:shadow-md ${
                isCurrentDay ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-gray-200'
              }`}
            >
              {/* Encabezado del Día */}
              <div className="flex justify-between items-center text-xs">
                <span
                  className={`font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-800'
                  }`}
                >
                  {dayNum}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectDate(dateFormattedStr)}
                  className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:bg-indigo-100 p-1 rounded-md transition-opacity"
                  title="Agendar en este día"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Contenido de Citas del Día */}
              <div className="flex-1 overflow-y-auto space-y-1 my-1 pr-0.5 custom-scrollbar">
                {maintsForDay.map((m) => {
                  const isCancelado = m.estado === 'cancelado';
                  const isProgramado = m.estado === 'programado';

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMaintenance(m)}
                      className={`p-1 rounded-lg text-[10px] leading-tight cursor-pointer border transition-all ${
                        isCancelado
                          ? 'bg-red-50/80 border-red-200 text-red-700 line-through opacity-75 hover:bg-red-100'
                          : (isProgramado
                            ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100')
                      }`}
                    >
                      <div className="font-bold flex justify-between items-center">
                        <span className="truncate max-w-[70px]">{m.hostname || 'Equipo'}</span>
                        <span className="text-[9px] opacity-80 font-mono">{m.hora_programada || 'Pend.'}</span>
                      </div>
                      <div className="flex items-center space-x-0.5 text-[9px] mt-0.5 opacity-90">
                        {isCancelado ? (
                          <X className="w-2.5 h-2.5 text-red-600 shrink-0" />
                        ) : isProgramado ? (
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="capitalize truncate">
                          {isCancelado ? 'Cancelado' : m.tipo_mantenimiento}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón flotante al pasar mouse si está vacío */}
              {maintsForDay.length === 0 && (
                <button
                  onClick={() => onSelectDate(dateFormattedStr)}
                  className="w-full py-0.5 text-[10px] text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded font-medium border border-transparent hover:border-indigo-100 transition-colors"
                >
                  + Agendar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
