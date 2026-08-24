import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';

import logoAGR from '../assets/logotiposQR/AGR.png';
import logoAQR from '../assets/logotiposQR/AQR.png';
import logoASP from '../assets/logotiposQR/ASP.png';
import logoBLM from '../assets/logotiposQR/BLM.png';
import logoITZ from '../assets/logotiposQR/ITZ.png';
import logoMOS from '../assets/logotiposQR/MOS.png';

const logoMap = {
  AGR: logoAGR,
  AQR: logoAQR,
  ASP: logoASP,
  BLM: logoBLM,
  ITZ: logoITZ,
  MOS: logoMOS,
};

const empresaColors = {
  ITZ: { primary: '#000000', accent: '#ffcb24' },
  AQR: { primary: '#000000', accent: '#2e81ab' },
  BLM: { primary: '#000000', accent: '#f8931f' },
  ASP: { primary: '#561c30', accent: '#d0a13a' },
  MOS: { primary: '#142b4d', accent: '#4f4f4f' },
  AGR: { primary: '#2e5b1e', accent: '#4caf50' },
};

// Dimensiones ampliadas que respetan la relación de aspecto (Aspect Ratio) exacta de cada logotipo
const logoDimensions = {
  AGR: { width: 32, height: 32 },
  AQR: { width: 38, height: 18 },
  ASP: { width: 44, height: 12 },
  BLM: { width: 42, height: 15 },
  ITZ: { width: 39, height: 19 },
  MOS: { width: 43, height: 15 },
};

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
      {/* Definiciones globales de degradados por empresa en SVG */}
      <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="qr-grad-ITZ" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="100%" stopColor="#ffcb24" />
          </linearGradient>
          <linearGradient id="qr-grad-AQR" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2e81ab" />
            <stop offset="100%" stopColor="#51c8f3" />
          </linearGradient>
          <linearGradient id="qr-grad-BLM" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="100%" stopColor="#f8931f" />
          </linearGradient>
          <linearGradient id="qr-grad-ASP" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#561c30" />
            <stop offset="100%" stopColor="#d0a13a" />
          </linearGradient>
          <linearGradient id="qr-grad-[#561c30]" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#561c30" />
            <stop offset="100%" stopColor="#d0a13a" />
          </linearGradient>
          <linearGradient id="qr-grad-MOS" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#142b4d" />
            <stop offset="100%" stopColor="#4f4f4f" />
          </linearGradient>
          <linearGradient id="qr-grad-AGR" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a472a" />
            <stop offset="100%" stopColor="#4caf50" />
          </linearGradient>
        </defs>
      </svg>

      {/* Barra de Acciones Superior (Se oculta al imprimir) */}
      <div className="no-print flex justify-between items-center bg-white p-4 rounded-xl shadow mb-6 border border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inventario</span>
          </button>
          <h2 className="text-lg font-bold text-black">
            Vista Previa de Etiquetas ({selectedEquipments.length} Seleccionados)
          </h2>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-5 py-2 text-sm font-bold text-black bg-[#ffcb24] hover:bg-[#e6b520] rounded-lg shadow transition"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Etiquetas</span>
        </button>
      </div>

      {/* Grilla de Etiquetas Modernas con Degradados (Optimizado para Impresión) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-3">
        {selectedEquipments.map((equipo) => {
          const qrUrl = `${baseUrl}/scan/${equipo.id}`;
          const empresaKey = (equipo.empresa || 'ITZ').trim().toUpperCase();
          const logoSrc = logoMap[empresaKey] || logoMap.ITZ;
          const colors = empresaColors[empresaKey] || empresaColors.ITZ;
          const logoDim = logoDimensions[empresaKey] || logoDimensions.ITZ;
          const gradientId = `url(#qr-grad-${empresaKey})`;

          return (
            <div
              key={equipo.id}
              className="bg-white border-2 border-black rounded-2xl p-3.5 shadow-sm flex flex-col items-center justify-center print:border-black print:shadow-none print:break-inside-avoid relative overflow-hidden"
              style={{ minWidth: '135px' }}
            >
              {/* Barra de Acento Superior con Color Corporativo */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 print:bg-black"
                style={{ backgroundColor: colors.accent }}
              />

              {/* QR Moderno con Degradado de Marca + Logo central (Aspect Ratio) */}
              <div className="p-2 bg-white border border-gray-300 rounded-2xl shadow-xs mt-1 flex items-center justify-center">
                <QRCodeSVG
                  value={qrUrl}
                  size={105}
                  level="H"
                  fgColor={gradientId}
                  imageSettings={{
                    src: logoSrc,
                    x: undefined,
                    y: undefined,
                    height: logoDim.height,
                    width: logoDim.width,
                    excavate: true,
                  }}
                />
              </div>

              {/* Insignia con Número de Serie */}
              <div className="mt-2.5 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-gray-800 print:text-black tracking-tight text-center shadow-2xs">
                S/N: {equipo.serial || 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
