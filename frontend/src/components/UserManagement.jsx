import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, X, Save, AlertCircle, Mail, Edit3, KeyRound } from 'lucide-react';
import Pagination from './Pagination';

export default function UserManagement({ token, currentUser }) {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    role: 'tecnico',
    empleado_id: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsers(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetch('/api/empleados', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  const totalPages = Math.ceil(users.length / pageSize) || 1;
  const currentUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      nombre: '',
      username: '',
      email: '',
      password: '',
      role: 'tecnico',
      empleado_id: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      nombre: u.nombre || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      role: u.role || 'tecnico',
      empleado_id: u.empleado_id || ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar usuario');

      setIsModalOpen(false);
      setEditingUser(null);
      if (data.generated_pin) {
        window.alert(`Cuenta de cliente creada. Entrega este PIN de 6 dígitos al empleado: ${data.generated_pin}`);
      }
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGeneratePin = async (user) => {
    try {
      const res = await fetch(`/api/usuarios/${user.id}/generar-pin`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No fue posible generar el PIN');
      window.alert(`Nuevo PIN para ${user.empleado_nombre || user.nombre}: ${data.generated_pin}\nCompártelo de forma segura; no se volverá a mostrar.`);
      fetchUsers();
    } catch (err) { window.alert(err.message); }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${username}"?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            <Users className="w-6 h-6 text-[#c68a1d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios y Clientes</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cuentas de TI y clientes con PIN vinculados a los equipos asignados.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-black hover:bg-neutral-800 text-[#e6b520] font-bold rounded-xl text-sm shadow transition border border-amber-900/40"
        >
          <UserPlus className="w-4 h-4 text-[#e6b520]" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 text-red-600 p-4 rounded-xl text-xs font-semibold border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-[#e6b520] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Cargando usuarios...
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Usuario / Empleado</th>
                  <th className="p-4">Email (M365 / Corporativo)</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Fecha Registro</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-50/40 transition">
                    <td className="p-4 font-mono text-gray-400 font-bold">#{u.id}</td>
                    <td className="p-4 font-semibold text-gray-900">{u.nombre}</td>
                    <td className="p-4 font-mono font-bold text-black">{u.role === 'cliente' ? (u.empleado_nombre || 'Cliente') : u.username}</td>
                    <td className="p-4">
                      {u.email ? (
                        <div className="flex items-center space-x-1.5 text-xs text-indigo-900 font-mono font-medium">
                          <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{u.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono italic">Sin email registrado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3" />
                        <span className="uppercase">{u.role}</span>
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Editar usuario"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.role === 'cliente' && (
                          <button onClick={() => handleGeneratePin(u)} className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition" title="Generar nuevo PIN">
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {currentUser?.id !== u.id ? (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            Sesión Activa
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={users.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center bg-indigo-700 px-6 py-4 text-white">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <span>{editingUser ? 'Editar Usuario TI' : 'Crear Nuevo Usuario TI'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-indigo-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formData.role !== 'cliente' && <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. Carlos Pérez"
                />
              </div>}

              {formData.role !== 'cliente' && <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de Usuario (Username) *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. cperez"
                />
              </div>}

              {formData.role !== 'cliente' && <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email / Correo M365 (Opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ej. cperez@itz.com.mx"
                />
              </div>}

              {formData.role !== 'cliente' && <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="••••••••"
                />
              </div>}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rol de Usuario</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="admin">Administrador (Acceso Completo)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="tecnico">Técnico</option>
                  <option value="cliente">Cliente (acceso por PIN)</option>
                </select>
              </div>

              {formData.role === 'cliente' && (
                <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <label className="block text-xs font-semibold text-blue-950">Empleado asociado *</label>
                  <select required disabled={Boolean(editingUser)} value={formData.empleado_id} onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                    <option value="">Selecciona un empleado...</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nombre} · {employee.area || 'General'}</option>)}
                  </select>
                  <p className="text-[11px] text-blue-800">{editingUser ? 'Usa el icono de llave en la lista para generar un nuevo PIN.' : 'Se generará un PIN único de 6 dígitos, asociado a los equipos que tenga asignados este empleado.'}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
