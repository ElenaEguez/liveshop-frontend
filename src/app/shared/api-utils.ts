/** Normaliza respuestas DRF: lista directa o paginada { results: [] }. */
export function unwrapList<T>(data: T[] | { results?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Mensaje legible para errores HTTP (evita mostrar HTML de error 500). */
export function httpErrorMessage(error: unknown, fallback = 'Ocurrió un error.'): string {
  const err = error as { status?: number; message?: string; error?: unknown };
  const body = err?.error;

  if (typeof body === 'string') {
    if (body.trim().startsWith('<!') || body.includes('<html')) {
      if (err.status === 500) {
        return 'Error interno del servidor (500). Revisa los logs del backend o contacta soporte.';
      }
      if (err.status === 0 || err.message?.includes('Http failure')) {
        return 'No se pudo conectar con el servidor. Verifica tu conexión y que la API esté activa.';
      }
      return fallback;
    }
    return body;
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === 'string') {
      return obj.detail;
    }
    const firstKey = Object.keys(obj)[0];
    if (firstKey) {
      const val = obj[firstKey];
      const msg = Array.isArray(val) ? val.join(' ') : String(val);
      return `${firstKey}: ${msg}`;
    }
  }

  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
  }

  return fallback;
}
