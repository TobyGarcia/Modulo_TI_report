import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';

export default function LabelPrintView({ selectedEquipments, networkIp, onBack }) {
  let baseUrl = networkIp || window.location.origin;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}:5173`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Barra de Acciones Superior (Se oculta al imprimir) */}
      <div className="no-print flex justify-between items-center bg-white p-4 rounded-xl shadow mb-6 border">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inventario</span>
          </button>
          <h2 className="text-lg font-bold text-gray-800">
            Vista Previa de Etiquetas ({selectedEquipments.length} Seleccionados)
          </h2>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Etiquetas</span>
        </button>
      </div>

      {/* Grilla de Etiquetas (Optimizado para Impresión) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
        {selectedEquipments.map((equipo) => {
          const qrUrl = `${baseUrl}/scan/${equipo.id}`;
          return (
            <div
              key={equipo.id}
              className="bg-white border-2 border-gray-900 rounded-lg p-3 shadow-sm flex flex-col justify-between print:border-black print:shadow-none print:break-inside-avoid"
              style={{ minHeight: '160px' }}
            >
              {/* Encabezado de la Etiqueta */}
              <div className="border-b border-gray-400 pb-1 mb-2 flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-900 print:text-black">
                  {equipo.empresa || 'CONTROL DE INVENTARIO'}
                </span>
                <span className="text-[10px] font-mono bg-gray-100 print:bg-transparent px-1 rounded font-bold border">
                  S/N: {equipo.serial}
                </span>
              </div>

              {/* Cuerpo: QR + Datos */}
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-white border rounded">
                  <QRCodeSVG value={qrUrl} size={90} level="M" />
                </div>
                <div className="flex-1 text-xs space-y-1 overflow-hidden">
                  <div className="font-mono font-bold text-sm text-gray-900 truncate">
                    {equipo.hostname || 'SIN-HOSTNAME'}
                  </div>
                  <div className="text-gray-700 truncate">
                    <span className="font-semibold">Asignado:</span> {equipo.personal_asignado || 'N/A'}
                  </div>
                  <div className="text-gray-600 truncate">
                    <span className="font-semibold">Equipo:</span> {equipo.marca} {equipo.modelo}
                  </div>
                  <div className="text-gray-500 text-[10px] truncate">
                    {equipo.cpu} | {equipo.ram_capacidad} RAM | {equipo.disco_capacidad}
                  </div>
                </div>
              </div>

              {/* Pie de Etiqueta */}
              <div className="border-t border-gray-300 pt-1 mt-2 flex justify-between items-center text-[9px] text-gray-500 font-mono">
                <span>Área: {equipo.area || 'N/A'}</span>
                <span>ID: #{equipo.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
