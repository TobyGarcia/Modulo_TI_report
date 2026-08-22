import React from 'react';
import { Monitor, Users, LogOut, UserCheck, ClipboardList } from 'lucide-react';

export default function TopBar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <header className="bg-indigo-900 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
        {/* Marca / Logotipo */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-700 p-2 rounded-xl border border-indigo-500 shadow-inner">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Inventario QR</h1>
            <p className="text-[10px] text-indigo-300 font-mono font-medium">Control de Equipos & Mantenimiento</p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'inventory'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Inventario</span>
          </button>

          <button
            onClick={() => setActiveTab('bitacora')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'bitacora'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Bitácora & Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'users'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </button>
        </nav>

        {/* Datos de Usuario & Logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-indigo-800/80 px-3 py-1.5 rounded-xl border border-indigo-700">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <p className="font-bold text-white leading-tight">{user?.nombre || user?.username || 'Usuario'}</p>
              <p className="text-[10px] text-indigo-300 font-mono uppercase">{user?.role || 'Admin'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition shadow"
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
