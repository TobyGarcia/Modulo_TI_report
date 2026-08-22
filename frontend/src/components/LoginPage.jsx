import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, ShieldCheck, QrCode } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, isScanAccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-indigo-100">
        {/* Encabezado del Formulario */}
        <div className="bg-indigo-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
            {isScanAccess ? (
              <QrCode className="w-10 h-10 text-white" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Acceso Exclusivo TI</h1>
          <p className="text-xs text-indigo-200 mt-1 font-medium">
            {isScanAccess
              ? 'Escaneo de QR Protegido - Se requiere credenciales de TI'
              : 'Inventario & Control de Etiquetas QR'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {isScanAccess && (
            <div className="flex items-center space-x-2 bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-semibold border border-amber-200">
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Información sensible de equipo: Solo el personal técnico de TI puede consultar los detalles tras autenticarse.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Usuario de TI
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. usuario"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition duration-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Autenticar y Ver Equipo</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
