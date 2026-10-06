import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, Clock, Camera, Send, Search,
  QrCode, Laptop, User, Mail, Phone, Building, ArrowRight,
  Star, ChevronRight, RefreshCw, MessageSquare, ShieldCheck, X
} from 'lucide-react';
import logoITZ from '../../assets/logotiposQR/ITZ.png';

const CLIENT_TICKET_ACCESS_KEY = 'cliente_ticket_access';

function getStoredTicketAccess() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_TICKET_ACCESS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveTicketAccess(ticket, accessToken) {
  if (!ticket?.folio || !accessToken) return;
  const saved = getStoredTicketAccess();
  saved[ticket.folio] = accessToken;
  localStorage.setItem(CLIENT_TICKET_ACCESS_KEY, JSON.stringify(saved));
}

export default function ClientPortal({ initialEquipmentId }) {
  const [activeTab, setActiveTab] = useState('reportar'); // 'reportar' | 'mis_reportes'
  const [selectedEquipo, setSelectedEquipo] = useState(null);

  // Formulario
  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  const [solicitanteEmail, setSolicitanteEmail] = useState('');
  const [solicitanteTelefono, setSolicitanteTelefono] = useState('');
  const [areaSolicitante, setAreaSolicitante] = useState('');
  const [empresa, setEmpresa] = useState('ITZ OIL & GAS');
  const [tipoServicio, setTipoServicio] = useState('correctivo');
  const [categoriaFalla, setCategoriaFalla] = useState('Hardware / Pantalla');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [fotos, setFotos] = useState([]);

  // Estado de carga y éxito
  const [submitting, setSubmitting] = useState(false);
  const [ticketCreado, setTicketCreado] = useState(null);
  const [error, setError] = useState(null);

  // Consulta y Seguimiento
  const [misTickets, setMisTickets] = useState([]);
  const [buscandoTickets, setBuscandoTickets] = useState(false);
  const [ticketParaCalificar, setTicketParaCalificar] = useState(null);
  const [rating, setRating] = useState(5);
  const [comentariosCalificacion, setComentariosCalificacion] = useState('');

  // Un QR sólo expone datos mínimos del equipo escaneado, sin abrir el inventario.
  useEffect(() => {
    // Revisar si viene de parámetro ?equipo=ID o initialEquipmentId
    const queryParams = new URLSearchParams(window.location.search);
    const eqIdFromUrl = initialEquipmentId || queryParams.get('equipo');
    if (eqIdFromUrl) {
      fetch(`/api/equipos/public/${eqIdFromUrl}`)
        .then((res) => res.json())
        .then((eq) => {
          if (eq && eq.id) {
            setSelectedEquipo(eq);
            if (eq.personal_asignado) setSolicitanteNombre(eq.personal_asignado);
            if (eq.area) setAreaSolicitante(eq.area);
            if (eq.empresa) setEmpresa(eq.empresa);
          }
        })
        .catch(() => {});
    }

    // Cargar email previo guardado
    try {
      const savedEmail = localStorage.getItem('cliente_ticket_email');
      if (savedEmail) {
        setSolicitanteEmail(savedEmail);
      }
      const savedName = localStorage.getItem('cliente_ticket_nombre');
      if (savedName) setSolicitanteNombre(savedName);
    } catch (e) {}
  }, [initialEquipmentId]);

  // Manejar fotos cargadas desde la cámara del celular
  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    if (fotos.length + files.length > 3) {
      setError('Puedes adjuntar un máximo de 3 fotografías.');
      return;
    }
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setError('Cada fotografía debe pesar como máximo 2 MB.');
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Enviar nuevo ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!solicitanteNombre.trim() || !descripcionProblema.trim()) {
        throw new Error('Por favor completa tu nombre y la descripción del problema');
      }

      const payload = {
        equipo_id: selectedEquipo?.id || null,
        solicitante_nombre: solicitanteNombre.trim(),
        solicitante_email: solicitanteEmail.trim() || null,
        solicitante_telefono: solicitanteTelefono.trim() || null,
        area_solicitante: areaSolicitante || selectedEquipo?.area || 'General',
        empresa: empresa || selectedEquipo?.empresa || 'ITZ OIL & GAS',
        tipo_servicio: tipoServicio,
        categoria_falla: categoriaFalla,
        descripcion_problema: descripcionProblema.trim(),
        prioridad,
        fotos_evidencia: fotos
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al levantar ticket');

      setTicketCreado(data.ticket);
      saveTicketAccess(data.ticket, data.access_token);
      // Guardar email para futuras consultas
      if (solicitanteEmail) {
        try {
          localStorage.setItem('cliente_ticket_email', solicitanteEmail);
          localStorage.setItem('cliente_ticket_nombre', solicitanteNombre);
        } catch (e) {}
      }

      // Limpiar formulario parcial
      setDescripcionProblema('');
      setFotos([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Consultar mis tickets
  const fetchMisTickets = async () => {
    const ticketAccess = getStoredTicketAccess();
    const entries = Object.entries(ticketAccess);
    setBuscandoTickets(true);
    try {
      const tickets = await Promise.all(entries.map(async ([folio, accessToken]) => {
        const res = await fetch(`/api/tickets/cliente?folio=${encodeURIComponent(folio)}&access_token=${encodeURIComponent(accessToken)}`);
        if (!res.ok) return null;
        const ticket = await res.json();
        return { ...ticket, access_token: accessToken };
      }));
      setMisTickets(tickets.filter(Boolean).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error('Error al buscar tickets:', err);
    } finally {
      setBuscandoTickets(false);
    }
  };

  // Enviar calificación de ticket
  const handleCalificarTicket = async () => {
    if (!ticketParaCalificar) return;
    try {
      const res = await fetch(`/api/tickets/${ticketParaCalificar.id}/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calificacion: rating,
          comentarios_cierre: comentariosCalificacion,
          access_token: ticketParaCalificar.access_token
        })
      });
      if (res.ok) {
        alert('¡Gracias por tu evaluación!');
        setTicketParaCalificar(null);
        fetchMisTickets();
      }
    } catch (e) {
      alert('Error al guardar calificación');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header Mobile Friendly */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl p-1.5 flex items-center justify-center shadow">
              <img src={logoITZ} alt="ITZ Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                Mesa de Ayuda TI
                <span className="text-[10px] bg-blue-500/40 text-blue-100 font-bold px-1.5 py-0.5 rounded-full uppercase border border-blue-400/30">
                  PWA Cliente
                </span>
              </h1>
              <p className="text-xs text-blue-200">Soporte y Mantenimiento de Equipos</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'reportar') {
                setActiveTab('mis_reportes');
                fetchMisTickets();
              } else {
                setActiveTab('reportar');
              }
            }}
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20 transition flex items-center gap-1.5"
          >
            {activeTab === 'reportar' ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Mis Tickets</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Nuevo Reporte</span>
              </>
            )}
          </button>
        </div>

        {/* Tab switcher */}
        <div className="max-w-2xl mx-auto px-4 flex border-t border-blue-600/50">
          <button
            onClick={() => setActiveTab('reportar')}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'reportar'
                ? 'border-white text-white'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><Send className="w-3.5 h-3.5" /> Levantar Ticket</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('mis_reportes');
              fetchMisTickets();
            }}
            className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'mis_reportes'
                ? 'border-white text-white'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5" /> Seguimiento de Mis Tickets</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* ================= VISTA 1: LEVANTAR TICKET ================= */}
        {activeTab === 'reportar' && (
          <div className="space-y-4">
            {/* Si se acaba de crear un ticket con éxito */}
            {ticketCreado && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 shadow-md animate-fade-in text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-extrabold text-emerald-900">¡Ticket Registrado con Éxito!</h3>
                <p className="text-xs text-emerald-700">
                  Tu solicitud ha sido turnada al Supervisor de TI para su aprobación y asignación técnica.
                </p>
                <div className="bg-white p-3 rounded-xl border border-emerald-200 inline-block font-mono font-bold text-base text-emerald-800 shadow-sm">
                  Folio: <span className="text-blue-700">{ticketCreado.folio}</span>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setTicketCreado(null);
                      setActiveTab('mis_reportes');
                      fetchMisTickets();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                  >
                    Ver Estado en Vivo
                  </button>
                  <button
                    onClick={() => setTicketCreado(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Levantar Otro
                  </button>
                </div>
              </div>
            )}

            {!ticketCreado && (
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. SELECCIÓN O DETECCIÓN DE EQUIPO */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm">
                      <Laptop className="w-4 h-4" />
                      <span>Equipo que Presenta la Falla</span>
                    </div>
                    {selectedEquipo && (
                      <button
                        type="button"
                        onClick={() => setSelectedEquipo(null)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Cambiar equipo
                      </button>
                    )}
                  </div>

                  {selectedEquipo ? (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-start justify-between">
                      <div className="space-y-1 text-xs">
                        <div className="font-extrabold text-blue-900 text-sm">
                          {selectedEquipo.marca} {selectedEquipo.modelo}
                        </div>
                        <div className="text-slate-600 font-mono">
                          Serie: <span className="font-semibold text-slate-800">{selectedEquipo.serial}</span>
                        </div>
                        {selectedEquipo.hostname && (
                          <div className="text-slate-600">
                            Hostname: <span className="font-semibold text-slate-800">{selectedEquipo.hostname}</span>
                          </div>
                        )}
                        <div className="text-slate-500 text-[11px]">
                          Asignado a: {selectedEquipo.personal_asignado || 'Sin asignar'} ({selectedEquipo.area || 'General'})
                        </div>
                      </div>
                      <div className="bg-blue-600 text-white p-2 rounded-xl">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Escanea la etiqueta QR del equipo para asociarlo automáticamente. También puedes levantar un reporte general sin seleccionar equipo.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. DATOS DEL SOLICITANTE */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Datos del Solicitante</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={solicitanteNombre}
                        onChange={(e) => setSolicitanteNombre(e.target.value)}
                        placeholder="ej. Juan Pérez García"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Correo Corporativo
                      </label>
                      <input
                        type="email"
                        value={solicitanteEmail}
                        onChange={(e) => setSolicitanteEmail(e.target.value)}
                        placeholder="juan.perez@itz.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Teléfono / Extensión
                      </label>
                      <input
                        type="text"
                        value={solicitanteTelefono}
                        onChange={(e) => setSolicitanteTelefono(e.target.value)}
                        placeholder="ej. Ext 104 o 981-123-4567"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Área / Departamento
                      </label>
                      <input
                        type="text"
                        value={areaSolicitante}
                        onChange={(e) => setAreaSolicitante(e.target.value)}
                        placeholder="ej. Operaciones, Contabilidad"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DESCRIPCIÓN DE LA FALLA */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Detalle del Problema</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Categoría
                      </label>
                      <select
                        value={categoriaFalla}
                        onChange={(e) => setCategoriaFalla(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      >
                        <option value="Hardware / Pantalla">Hardware / Pantalla</option>
                        <option value="Batería / Cargador">Batería / Cargador</option>
                        <option value="Lentitud / Sistema Operativo">Lentitud / Sistema Operativo</option>
                        <option value="Red / Internet / Wi-Fi">Red / Internet / Wi-Fi</option>
                        <option value="Impresora / Multifuncional">Impresora / Multifuncional</option>
                        <option value="Periféricos (Teclado/Mouse/Cámara)">Periféricos (Teclado/Mouse/Cámara)</option>
                        <option value="Solicitud de Software / Acceso">Solicitud de Software / Acceso</option>
                        <option value="Otro">Otro problema</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Urgencia Percibida
                      </label>
                      <select
                        value={prioridad}
                        onChange={(e) => setPrioridad(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                      >
                        <option value="baja">Baja (No me impide trabajar)</option>
                        <option value="media">Media (Afecta parte de mi trabajo)</option>
                        <option value="alta">Alta (Trabajo detenido parcialmente)</option>
                        <option value="critica">Crítica (Operación completamente parada)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Describe con tus palabras lo que sucede *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={descripcionProblema}
                      onChange={(e) => setDescripcionProblema(e.target.value)}
                      placeholder="Ejemplo: La laptop se apaga repentinamente a los 10 minutos de uso y el ventilador suena muy fuerte..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Captura de fotografías con la cámara del celular */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Adjuntar Fotografías / Evidencias (Opcional)
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs border border-blue-200 transition">
                        <Camera className="w-4 h-4" />
                        <span>Tomar Foto con Celular</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={handlePhotoCapture}
                          className="hidden"
                        />
                      </label>

                      {fotos.map((src, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 shadow-sm group">
                          <img src={src} alt="Evidencia" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold rounded-2xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-sm"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Reporte a TI</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= VISTA 2: MIS REPORTES Y SEGUIMIENTO ================= */}
        {activeTab === 'mis_reportes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Consultar Mis Solicitudes de Soporte</span>
              </h2>
              <div className="flex gap-2 items-center">
                <p className="flex-1 text-xs text-slate-500">Mostrando los tickets creados desde este dispositivo.</p>
                <button
                  onClick={() => fetchMisTickets()}
                  disabled={buscandoTickets}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {buscandoTickets ? '...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Listado de tickets */}
            {misTickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No hay tickets guardados en este dispositivo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {misTickets.map((tck) => {
                  const statusColors = {
                    abierto: 'bg-amber-100 text-amber-800 border-amber-300',
                    asignado: 'bg-blue-100 text-blue-800 border-blue-300',
                    en_proceso: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                    resuelto: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    cerrado: 'bg-gray-100 text-gray-800 border-gray-300',
                    rechazado: 'bg-red-100 text-red-800 border-red-300'
                  };

                  const statusLabels = {
                    abierto: 'En Revisión de Supervisor',
                    asignado: 'Técnico Asignado',
                    en_proceso: 'En Reparación',
                    resuelto: 'Listo para Entrega',
                    cerrado: 'Completado y Conforme',
                    rechazado: 'No Procede'
                  };

                  return (
                    <div
                      key={tck.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-blue-700 text-xs bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                          {tck.folio}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusColors[tck.estado] || 'bg-slate-100'
                          }`}
                        >
                          {statusLabels[tck.estado] || tck.estado}
                        </span>
                      </div>

                      {/* Datos del equipo o falla */}
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{tck.categoria_falla}</div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{tck.descripcion_problema}</p>
                      </div>

                      {/* Stepper visual del avance */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-4 gap-1 text-center">
                          <div className={`p-1 rounded text-[10px] font-bold ${
                            ['abierto', 'asignado', 'en_proceso', 'resuelto', 'cerrado'].includes(tck.estado)
                              ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            1. Recibido
                          </div>
                          <div className={`p-1 rounded text-[10px] font-bold ${
                            ['asignado', 'en_proceso', 'resuelto', 'cerrado'].includes(tck.estado)
                              ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            2. Aprobado
                          </div>
                          <div className={`p-1 rounded text-[10px] font-bold ${
                            ['en_proceso', 'resuelto', 'cerrado'].includes(tck.estado)
                              ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            3. En Proceso
                          </div>
                          <div className={`p-1 rounded text-[10px] font-bold ${
                            ['resuelto', 'cerrado'].includes(tck.estado)
                              ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            4. Resuelto
                          </div>
                        </div>

                        {tck.tecnico_nombre && (
                          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Técnico asignado: <strong className="text-slate-700">{tck.tecnico_nombre}</strong></span>
                            {tck.fecha_programada_atencion && (
                              <span>Fecha: {new Date(tck.fecha_programada_atencion).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Si está resuelto y aún no se califica, permitir calificar */}
                      {tck.estado === 'resuelto' && !tck.calificacion_servicio && (
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs text-emerald-700 font-semibold">¿Ya recibiste tu equipo?</span>
                          <button
                            onClick={() => {
                              setTicketParaCalificar(tck);
                              setRating(5);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
                          >
                            Calificar y Cerrar
                          </button>
                        </div>
                      )}

                      {tck.calificacion_servicio && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-xs text-amber-600 font-semibold">
                          <span>Tu evaluación:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= tck.calificacion_servicio ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal de Calificación de Servicio */}
        {ticketParaCalificar && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-emerald-200 text-center animate-scale-up">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800">
                Califica la Atención Recibida
              </h3>
              <p className="text-xs text-slate-500">
                Ticket: <strong className="text-blue-600">{ticketParaCalificar.folio}</strong>
              </p>

              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1.5 focus:outline-none transition transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={comentariosCalificacion}
                onChange={(e) => setComentariosCalificacion(e.target.value)}
                placeholder="Comentarios adicionales sobre el servicio..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setTicketParaCalificar(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCalificarTicket}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow"
                >
                  Confirmar y Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
