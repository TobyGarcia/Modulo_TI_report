import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, ShieldCheck, QrCode } from 'lucide-react';

import bgLogin from '../assets/backgrounLog/loginBackground.jpg';
import logoITZ from '../assets/logotiposQR/ITZ.png';

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
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgLogin})` }}
    >
      {/* Capa oscura superpuesta para legibilidad y elegancia visual */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

      <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-500/30">
        {/* Encabezado del Formulario con Logo ITZ */}
        <div className="bg-black p-6 text-center text-white relative border-b-4 border-[#e6b520]">
          <div className="bg-white p-2.5 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md border border-[#c68a1d] max-w-[170px] h-16">
            <img src={logoITZ} alt="Logo ITZ" className="max-h-full max-w-full object-contain" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Acceso Exclusivo TI</h1>
          <p className="text-xs text-[#e6b520] mt-1 font-mono font-medium">
            {isScanAccess
              ? 'Escaneo de QR Protegido - Se requiere credenciales de TI'
              : 'Inventario & Control de Etiquetas QR'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {isScanAccess && (
            <div className="flex items-center space-x-2 bg-amber-50 text-amber-900 p-3 rounded-xl text-xs font-semibold border border-amber-200">
              <Lock className="w-4 h-4 flex-shrink-0 text-[#c68a1d]" />
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
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#e6b520] focus:border-black focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#e6b520] focus:border-black focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-[#e6b520] hover:bg-[#d0a11b] text-black font-bold rounded-xl shadow-lg transition duration-200 border border-[#c68a1d]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock className="w-4 h-4 text-black" />
                <span>Autenticar y Ver Equipo</span>
              </>
            )}
          </button>

          <div className="pt-1 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 mb-2">¿Eres cliente y quieres reportar una falla?</p>
            <button
              type="button"
              onClick={() => {
                const equipmentId = isScanAccess ? window.location.pathname.replace(/^\/scan\//i, '') : '';
                window.location.href = equipmentId ? `/cliente?equipo=${encodeURIComponent(equipmentId)}` : '/cliente';
              }}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
            >
              Entrar con PIN de cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
