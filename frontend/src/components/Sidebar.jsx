import React, { useState } from 'react';
import {
  LayoutDashboard,
  Monitor,
  Users,
  LogOut,
  UserCheck,
  ClipboardList,
  UserPlus,
  ExternalLink,
  Mail,
  FolderTree,
  Package,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario Equipos', icon: Monitor },
    { id: 'insumos', label: 'Insumos & Consumos', icon: Package },
    { id: 'catalogos', label: 'Catálogos', icon: FolderTree },
    { id: 'empleados', label: 'Personal', icon: UserPlus },
    { id: 'bitacora', label: 'Bitácora & Agenda', icon: ClipboardList },
    { id: 'salidas', label: 'Salidas Equipos', icon: ExternalLink },
    { id: 'm365', label: 'Cuentas M365', icon: Mail },
    { id: 'users', label: 'Usuarios TI', icon: Users },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Topbar para móviles */}
      <header className="lg:hidden bg-black text-white px-4 py-3 flex items-center justify-between border-b border-amber-900/40 sticky top-0 z-40 no-print">
        <div className="flex items-center space-x-3">
          <div className="bg-[#e6b520] p-1.5 rounded-lg text-black font-bold">
            <Monitor className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
              Inventario <span className="text-[#e6b520]">QR</span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-neutral-800 text-amber-400 hover:text-white transition"
          aria-label="Abrir menú"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 no-print"
        />
      )}

      {/* Sidebar contenedor */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-black text-white border-r border-amber-900/40 flex flex-col justify-between transition-all duration-300 no-print ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Encabezado del Sidebar */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="bg-[#e6b520] p-2 rounded-xl text-black shadow-md border border-[#c68a1d] shrink-0">
                <Monitor className="w-6 h-6 stroke-[2.5]" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="whitespace-nowrap">
                  <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                    Inventario <span className="text-[#e6b520]">QR</span>
                  </h1>
                  <p className="text-[10px] text-amber-200/80 font-mono font-medium">Equipos & Mantenimiento</p>
                </div>
              )}
            </div>

            {/* Botón de Colapsar sólo en Desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white transition ml-1"
              title={isCollapsed ? 'Expandir Menú' : 'Plegar Menú'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Menú de Navegación Vertical */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#e6b520] text-black font-bold shadow-md'
                      : 'text-gray-300 hover:bg-neutral-800 hover:text-[#e6b520]'
                  } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-black' : 'text-[#c68a1d]'}`} />
                  {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sección de Usuario y Cerrar Sesión */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 space-y-2">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center space-x-3 px-3 py-2 bg-neutral-900 rounded-xl border border-amber-900/40">
              <UserCheck className="w-5 h-5 text-[#e6b520] shrink-0" />
              <div className="text-xs truncate">
                <p className="font-bold text-white leading-tight truncate">{user?.nombre || user?.username || 'Usuario'}</p>
                <p className="text-[10px] text-[#e6b520] font-mono uppercase">{user?.role || 'Admin'}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1" title={user?.nombre || user?.username}>
              <UserCheck className="w-5 h-5 text-[#e6b520]" />
            </div>
          )}

          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className={`w-full flex items-center space-x-2 px-3 py-2.5 bg-neutral-800 hover:bg-red-600 text-gray-200 hover:text-white text-xs font-semibold rounded-xl transition shadow ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Salir</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
