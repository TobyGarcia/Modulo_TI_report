const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function toApiUrl(input) {
  if (!apiBaseUrl || typeof input !== 'string' || !input.startsWith('/api/')) {
    return input;
  }

  return `${apiBaseUrl}${input.slice('/api'.length)}`;
}

// El frontend existente usa rutas relativas (/api/*) para el proxy de Vite y
// para Render. En Android no existe ese proxy: esta adaptación mantiene las
// mismas llamadas y las dirige a VITE_API_URL durante la compilación nativa.
export function configureApiBaseUrl() {
  if (!apiBaseUrl || typeof window === 'undefined') return;

  const browserFetch = window.fetch.bind(window);
  window.fetch = (input, init) => browserFetch(toApiUrl(input), init);
}
