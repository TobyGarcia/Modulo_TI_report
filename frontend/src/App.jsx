import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import LoginPage from './components/LoginPage';
import EquipmentList from './components/EquipmentList';
import EquipmentFormModal from './components/EquipmentFormModal';
import ExcelImportModal from './components/ExcelImportModal';
import LabelPrintView from './components/LabelPrintView';
import ScanResultView from './components/ScanResultView';
import UserManagement from './components/UserManagement';
import BitacoraView from './components/BitacoraView';
import EmployeeManagement from './components/EmployeeManagement';

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

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'empleados' | 'bitacora' | 'users'
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'print' | 'scan'
  const [scanId, setScanId] = useState(null);
  const [selectedEquipmentsToPrint, setSelectedEquipmentsToPrint] = useState([]);
  const [networkIp, setNetworkIp] = useState('');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/scan/')) {
        const id = path.replace('/scan/', '');
        if (id) {
          setScanId(id);
          setCurrentView('scan');
        }
      }
    } catch (e) {
      console.error('Error al detectar ruta de escaneo:', e);
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

  // 1. Si se escanea un código QR desde un celular (/scan/:id)
  if (currentView === 'scan' && scanId) {
    if (!token) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} isScanAccess={true} />;
    }
    return <ScanResultView equipmentId={scanId} token={token} onLogout={handleLogout} />;
  }

  // 2. Si no ha iniciado sesión, mostrar la pantalla de Login
  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} isScanAccess={false} />;
  }

  // 3. Vista de Impresión de Etiquetas
  if (currentView === 'print') {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setCurrentView('main');
          }}
          user={user}
          onLogout={handleLogout}
        />
        <LabelPrintView
          selectedEquipments={selectedEquipmentsToPrint}
          networkIp={networkIp}
          onBack={() => setCurrentView('main')}
        />
      </div>
    );
  }

  // 4. Panel de Administración Principal (Pestañas de Inventario / Personal / Bitácora / Usuarios)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main>
        <ErrorBoundary>
          {activeTab === 'inventory' && (
            <EquipmentList
              token={token}
              onAddClick={handleOpenAddModal}
              onEditClick={handleOpenEditModal}
              onImportClick={() => setIsImportModalOpen(true)}
              onPrintLabelsClick={handleOpenPrintView}
            />
          )}
          {activeTab === 'empleados' && (
            <EmployeeManagement token={token} />
          )}
          {activeTab === 'bitacora' && (
            <BitacoraView token={token} currentUser={user} />
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
