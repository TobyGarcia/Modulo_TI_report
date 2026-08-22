import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess, token }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/equipos/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al importar archivo');
      }

      setResult(data);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex justify-between items-center bg-emerald-700 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6" />
            <h2 className="text-xl font-bold">Importar Equipos desde Excel</h2>
          </div>
          <button onClick={onClose} className="hover:bg-emerald-600 p-1 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!result ? (
            <>
              <p className="text-sm text-gray-600">
                Selecciona tu archivo de Excel para alimentar la base de datos de PostgreSQL. El sistema mapeará automáticamente las 19 columnas de tu plantilla.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition cursor-pointer relative bg-gray-50">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">
                  {file ? file.name : 'Haz clic o arrastra tu archivo Excel aquí'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Soporta formatos .xlsx y .xls</p>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className={`flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition ${
                    loading || !file ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Cargar e Importar</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-gray-800">{result.message}</h3>
              
              <div className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-900 grid grid-cols-3 gap-2 font-medium">
                <div>
                  <span className="block text-xs text-emerald-600">Total Leídos</span>
                  <span className="text-lg font-bold">{result.totalProcesados}</span>
                </div>
                <div>
                  <span className="block text-xs text-emerald-600">Nuevos Inserts</span>
                  <span className="text-lg font-bold">{result.insertados}</span>
                </div>
                <div>
                  <span className="block text-xs text-emerald-600">Actualizados</span>
                  <span className="text-lg font-bold">{result.actualizados}</span>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-center space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Subir otro archivo
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
