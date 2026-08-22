import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Edit3 } from 'lucide-react';

export default function SignatureCanvas({ label = "Firma", onSave, initialDataUrl = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialDataUrl);
  const [signatureData, setSignatureData] = useState(initialDataUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Configurar dimensiones reales del canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 180;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Slate-900

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsEmpty(false);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    if (onSave) onSave(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSignatureData(null);
    if (onSave) onSave(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
        <span className="flex items-center space-x-1">
          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-red-600 hover:text-red-700 flex items-center space-x-1 text-[11px] font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Borrar</span>
          </button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden touch-none hover:border-indigo-400 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 cursor-crosshair bg-white"
        />

        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 text-xs select-none">
            <span className="font-medium">Dibuje aquí su firma manuscrita</span>
            <span className="text-[10px] text-gray-400 mt-0.5">(Táctil en pantalla o mouse)</span>
          </div>
        )}
      </div>
    </div>
  );
}
