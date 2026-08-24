import React from 'react';
import { Monitor, Users, LogOut, UserCheck, ClipboardList, UserPlus, ExternalLink, Mail } from 'lucide-react';

export default function TopBar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <header className="bg-black text-white shadow-lg border-b border-amber-900/40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
        {/* Marca / Logotipo */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#e6b520] p-2 rounded-xl text-black shadow-md border border-[#c68a1d]">
            <Monitor className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              Inventario <span className="text-[#e6b520]">QR</span>
            </h1>
            <p className="text-[10px] text-amber-200/80 font-mono font-medium">Control de Equipos & Mantenimiento</p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'inventory'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <Monitor className="w-4 h-4 text-[#c68a1d]" />
            <span>Inventario</span>
          </button>

          <button
            onClick={() => setActiveTab('empleados')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'empleados'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#c68a1d]" />
            <span>Personal</span>
          </button>

          <button
            onClick={() => setActiveTab('bitacora')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'bitacora'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#c68a1d]" />
            <span>Bitácora & Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('salidas')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'salidas'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-[#c68a1d]" />
            <span>Salidas Equipos</span>
          </button>

          <button
            onClick={() => setActiveTab('m365')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'm365'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <Mail className="w-4 h-4 text-[#c68a1d]" />
            <span>Cuentas M365</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'users'
                ? 'bg-[#e6b520] text-black font-bold shadow-md'
                : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
            }`}
          >
            <Users className="w-4 h-4 text-[#c68a1d]" />
            <span>Usuarios TI</span>
          </button>
        </nav>

        {/* Datos de Usuario & Logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-amber-900/40">
            <UserCheck className="w-4 h-4 text-[#e6b520]" />
            <div className="text-xs">
              <p className="font-bold text-white leading-tight">{user?.nombre || user?.username || 'Usuario'}</p>
              <p className="text-[10px] text-[#e6b520] font-mono uppercase">{user?.role || 'Admin'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-red-600 text-gray-200 hover:text-white text-xs font-semibold rounded-xl transition shadow"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
