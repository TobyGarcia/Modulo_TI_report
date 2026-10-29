import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

const CURRENT_VERSION = __APP_VERSION__;

export default function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const registrationRef = useRef(null);
  const reloadAfterUpdateRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkBuildVersion = async () => {
      try {
        const response = await fetch(`/version.json?check=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const { version } = await response.json();
        if (!cancelled && version && version !== CURRENT_VERSION) setUpdateAvailable(true);
      } catch {
        // Estar sin red no debe afectar el uso normal de la PWA.
      }
    };

    const registerWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        registrationRef.current = registration;
        if (registration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateAvailable(true);
          });
        });
      } catch (error) {
        console.warn('No se pudo registrar el Service Worker:', error);
      }
    };

    const onControllerChange = () => {
      if (reloadAfterUpdateRef.current) window.location.reload();
    };

    registerWorker();
    checkBuildVersion();
    const timer = window.setInterval(checkBuildVersion, 15 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && checkBuildVersion();
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    setIsUpdating(true);
    reloadAfterUpdateRef.current = true;
    const waitingWorker = registrationRef.current?.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // En algunos navegadores la activación no dispara controllerchange si la
      // pestaña no está controlada todavía; el reinicio sigue siendo seguro.
      window.setTimeout(() => window.location.reload(), 1500);
      return;
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed z-[100] inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[390px] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl animate-fade-in" role="status">
      <button type="button" onClick={() => setUpdateAvailable(false)} className="absolute right-2 top-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
      <div className="flex gap-3 pr-5">
        <div className="shrink-0 rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><Download className="w-5 h-5" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Nueva actualización disponible</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">Hay una versión nueva de Sistema QR lista para descargar.</p>
          <button type="button" onClick={applyUpdate} disabled={isUpdating} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-70">
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}
