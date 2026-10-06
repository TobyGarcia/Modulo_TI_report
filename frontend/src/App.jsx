import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import EquipmentList from './components/EquipmentList';
import EquipmentFormModal from './components/EquipmentFormModal';
import ExcelImportModal from './components/ExcelImportModal';
import LabelPrintView from './components/LabelPrintView';
import ScanResultView from './components/ScanResultView';
import UserManagement from './components/UserManagement';
import BitacoraView from './components/BitacoraView';
import EmployeeManagement from './components/EmployeeManagement';
import SalidasView from './components/SalidasView';
import M365View from './components/M365View';
import CatalogosView from './components/CatalogosView';
import DashboardView from './components/DashboardView';
import InsumosView from './components/InsumosView';
import TicketsManagementView from './components/TicketsManagementView';

// PWAs
import ClientPortal from './components/pwa/ClientPortal';
import TechnicianPortal from './components/pwa/TechnicianPortal';
import SupervisorPortal from './components/pwa/SupervisorPortal';

// Assets
import logoITZ from './assets/logotiposQR/ITZ.png';
import { Wrench, ShieldCheck, Laptop, Lock, ArrowRight, User } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 rounded-2xl max-w-lg mx-auto my-8 border border-red-200 text-center space-y-3 shadow-lg">
          <h3 className="font-bold text-base">Atención: Error de Carga de Componente</h3>
          <p className="text-xs text-red-700 font-mono bg-red-100/80 p-2.5 rounded-xl break-all">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Reintentar y Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('jwt_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('jwt_user');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Detección inicial de la PWA o portal
  const [portalMode, setPortalMode] = useState(() => {
    try {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/cliente')) return 'cliente';
      if (p.startsWith('/tecnico')) return 'tecnico';
      if (p.startsWith('/supervisor')) return 'supervisor';
      if (p.startsWith('/scan/')) return 'scan';
      return 'admin';
    } catch {
      return 'admin';
    }
  });

  const [activeTab, setActiveTab] = useState('inicio');
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'print'
  const [scanId, setScanId] = useState(null);
  const [showScanLogin, setShowScanLogin] = useState(false);
  const [selectedEquipmentsToPrint, setSelectedEquipmentsToPrint] = useState([]);
  const [networkIp, setNetworkIp] = useState('');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/scan/')) {
        const id = window.location.pathname.replace(/^\/scan\//i, '');
        if (id) {
          setScanId(id);
          setPortalMode('scan');
        }
      } else if (path.startsWith('/cliente')) {
        setPortalMode('cliente');
      } else if (path.startsWith('/tecnico')) {
        setPortalMode('tecnico');
      } else if (path.startsWith('/supervisor')) {
        setPortalMode('supervisor');
      }
    } catch (e) {
      console.error('Error al detectar ruta:', e);
    }
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem('jwt_token', newToken);
      localStorage.setItem('jwt_user', JSON.stringify(newUser));
    } catch (e) {
      console.error('Error al guardar credenciales:', e);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('jwt_user');
    } catch (e) {
      console.error('Error al remover credenciales:', e);
    }
  };

  const handleSaveEquipment = async (formData) => {
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/equipos/${formData.id}` : '/api/equipos';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }

      setIsFormModalOpen(false);
      setEquipmentToEdit(null);
      setCurrentView('main');
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAddModal = () => {
    setEquipmentToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (equipo) => {
    setEquipmentToEdit(equipo);
    setIsFormModalOpen(true);
  };

  const handleOpenPrintView = (equipments, ip) => {
    setSelectedEquipmentsToPrint(equipments);
    if (ip) setNetworkIp(ip);
    setCurrentView('print');
  };

  // ================= 1. PWA CLIENTE (/cliente) =================
  if (portalMode === 'cliente') {
    return <ClientPortal initialEquipmentId={scanId} />;
  }

  // ================= 2. PWA TÉCNICO (/tecnico) =================
  if (portalMode === 'tecnico') {
    return (
      <TechnicianPortal
        token={token}
        currentUser={user}
        onLogout={handleLogout}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ================= 3. PWA SUPERVISOR (/supervisor) =================
  if (portalMode === 'supervisor') {
    return (
      <SupervisorPortal
        token={token}
        currentUser={user}
        onLogout={handleLogout}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ================= 4. ESCANEO QR INTELIGENTE (/scan/:id) =================
  if (portalMode === 'scan' && scanId) {
    // Si ya está autenticado con credenciales de TI, mostrar consola técnica directa
    if (token) {
      return (
        <ScanResultView
          equipmentId={scanId}
          token={token}
          onLogout={handleLogout}
          currentUser={user}
        />
      );
    }

    // Si el usuario presiona "Acceso Técnico", mostrar login
    if (showScanLogin) {
      return (
        <div className="relative">
          <button
            onClick={() => setShowScanLogin(false)}
            className="fixed top-4 left-4 z-50 px-3 py-1.5 bg-black/70 text-white rounded-xl text-xs font-semibold backdrop-blur"
          >
            ← Volver
          </button>
          <LoginPage onLoginSuccess={handleLoginSuccess} isScanAccess={true} />
        </div>
      );
    }

    // Landing inteligente al escanear QR sin credenciales previas
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center border border-amber-500/40 animate-fade-in">
          <div className="w-14 h-14 bg-white rounded-2xl p-2 flex items-center justify-center mx-auto shadow-md border border-amber-300">
            <img src={logoITZ} alt="ITZ Logo" className="max-h-full max-w-full object-contain" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">Equipo Identificado</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Etiqueta QR escaneada exitosamente (ID #{scanId})
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {/* Opción 1: Empleado reporta falla */}
            <button
              onClick={() => setPortalMode('cliente')}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-black text-xs shadow-lg flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-200" />
                <div className="text-left">
                  <div className="leading-tight">Reportar Falla o Falla Técnica</div>
                  <div className="text-[10px] text-blue-200 font-normal">Levantar ticket en Mesa de Ayuda</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>

            {/* Opción 2: Personal técnico */}
            <button
              onClick={() => setShowScanLogin(true)}
              className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-2xl font-bold text-xs flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <div className="text-left">
                  <div className="leading-tight">Acceso Técnico / TI</div>
                  <div className="text-[10px] text-amber-700 font-normal">Consultar bitácora y mantenimiento</div>
                </div>
              </div>
              <span className="text-xs font-black text-amber-700">Ingresar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 5. PANEL GENERAL DE ADMINISTRACIÓN =================
  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} isScanAccess={false} />;
  }

  // Vista de Impresión de Etiquetas
  if (currentView === 'print') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setCurrentView('main');
          }}
          user={user}
          onLogout={handleLogout}
        />
        <div className="flex-1 lg:pl-64 transition-all">
          <LabelPrintView
            selectedEquipments={selectedEquipmentsToPrint}
            networkIp={networkIp}
            onBack={() => setCurrentView('main')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col lg:flex-row">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 lg:pl-64 transition-all min-w-0">
        <ErrorBoundary>
          {activeTab === 'inicio' && (
            <DashboardView token={token} onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'tickets' && (
            <TicketsManagementView token={token} currentUser={user} />
          )}
          {activeTab === 'inventory' && (
            <EquipmentList
              token={token}
              currentUser={user}
              onAddClick={handleOpenAddModal}
              onEditClick={handleOpenEditModal}
              onImportClick={() => setIsImportModalOpen(true)}
              onPrintLabelsClick={handleOpenPrintView}
            />
          )}
          {activeTab === 'insumos' && (
            <InsumosView token={token} user={user} />
          )}
          {activeTab === 'catalogos' && (
            <CatalogosView token={token} />
          )}
          {activeTab === 'empleados' && (
            <EmployeeManagement token={token} />
          )}
          {activeTab === 'bitacora' && (
            <BitacoraView token={token} currentUser={user} />
          )}
          {activeTab === 'salidas' && (
            <SalidasView token={token} currentUser={user} />
          )}
          {activeTab === 'm365' && (
            <M365View token={token} currentUser={user} />
          )}
          {activeTab === 'users' && (
            <UserManagement token={token} currentUser={user} />
          )}
        </ErrorBoundary>
      </main>

      <EquipmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveEquipment}
        equipmentToEdit={equipmentToEdit}
      />

      <ExcelImportModal
        token={token}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
