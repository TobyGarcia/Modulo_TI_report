import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Edit3, X, PenTool } from 'lucide-react';

export default function SignatureCanvas({
  label = 'Firma',
  onSave,
  initialDataUrl = null,
  savedSignature = null
}) {
  const canvasRef = useRef(null);
  const activeSignature = savedSignature || initialDataUrl;

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(activeSignature);

  useEffect(() => {
    setCurrentSignature(savedSignature || initialDataUrl);
  }, [savedSignature, initialDataUrl]);

  useEffect(() => {
    if (!isOpenModal) return;
    setHasDrawn(false);
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 450;
      canvas.height = rect.height || 200;

      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // Slate-900

      if (currentSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasDrawn(true);
        };
        img.src = currentSignature;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpenModal, currentSignature]);

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
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      setCurrentSignature(null);
      if (onSave) onSave(null);
      setIsOpenModal(false);
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    setCurrentSignature(dataUrl);
    if (onSave) onSave(dataUrl);
    setIsOpenModal(false);
  };

  const handleRemoveSignature = () => {
    setCurrentSignature(null);
    if (onSave) onSave(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
        <span className="flex items-center space-x-1">
          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
        </span>
        {currentSignature ? (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsOpenModal(true)}
              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200"
            >
              Modificar
            </button>
            <button
              type="button"
              onClick={handleRemoveSignature}
              className="text-red-600 hover:text-red-700 flex items-center space-x-1 text-[11px] font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Borrar</span>
            </button>
          </div>
        ) : null}
      </div>

      {currentSignature ? (
        <div
          onClick={() => setIsOpenModal(true)}
          className="relative border-2 border-indigo-200 rounded-xl bg-white p-2 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors shadow-sm group"
        >
          <img src={currentSignature} alt={label} className="max-h-24 object-contain" />
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-indigo-900 bg-white/80 rounded-xl">
            Clic para editar firma
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl bg-gray-50 hover:bg-indigo-50/50 p-4 transition flex flex-col items-center justify-center space-y-1 group"
        >
          <div className="bg-indigo-100 text-indigo-700 p-2 rounded-full group-hover:scale-110 transition-transform">
            <PenTool className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-900">
            Capturar Firma Manuscrita
          </span>
          <span className="text-[10px] text-gray-400">
            Abrir canvas para dibujar firma
          </span>
        </button>
      )}

      {/* Modal Canvas de Captura de Firma */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="bg-indigo-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">{label} - Captura Digital</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 text-center">
                Dibuje su firma dentro del recuadro usando su dedo (en móvil/pantalla táctil) o mouse.
              </p>

              <div className="relative border-2 border-dashed border-indigo-300 rounded-xl bg-gray-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-48 cursor-crosshair bg-white"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 text-xs select-none">
                    <span className="font-medium">Dibuje aquí su firma manuscrita</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">(Táctil en pantalla o mouse)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar Firma</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Firma</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
