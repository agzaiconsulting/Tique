'use client';

import { useState, useRef, useCallback } from 'react';

type Estado = 'idle' | 'cargando' | 'ok' | 'error';

export default function SubirPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const aceptarArchivo = useCallback((f: File) => {
    setArchivo(f);
    setEstado('idle');
    setMensajeError('');
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setArrastrando(true);
  }

  function handleDragLeave() {
    setArrastrando(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files[0];
    if (f) aceptarArchivo(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) aceptarArchivo(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;

    setEstado('cargando');
    setMensajeError('');

    const form = new FormData();
    form.append('file', archivo);

    try {
      const res = await fetch('/api/tickets', { method: 'POST', body: form });
      const json = (await res.json()) as { id?: string; error?: string };

      if (!res.ok || !json.id) {
        setMensajeError(json.error ?? 'Error desconocido');
        setEstado('error');
        return;
      }

      setTicketId(json.id);
      setEstado('ok');
    } catch {
      setMensajeError('No se pudo conectar con el servidor');
      setEstado('error');
    }
  }

  function resetear() {
    setArchivo(null);
    setEstado('idle');
    setTicketId(null);
    setMensajeError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  if (estado === 'ok' && ticketId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div role="status" className="w-full max-w-sm text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-linea bg-white/40">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7 text-verde">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-tinta mb-2">Ticket procesado</h1>
          <p className="text-tinta/60 text-sm mb-6">
            Revisa y confirma los productos detectados.
          </p>
          <a
            href={`/tickets/${ticketId}`}
            className="inline-block w-full rounded-md bg-verde px-4 py-2.5 text-sm font-medium text-papel text-center transition-opacity hover:opacity-90 mb-3"
          >
            Revisar ticket
          </a>
          <button
            onClick={resetear}
            className="w-full rounded-md border border-linea px-4 py-2.5 text-sm font-medium text-tinta/70 transition-colors hover:border-tinta/40"
          >
            Subir otro ticket
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-tinta mb-1">Subir ticket</h1>
        <p className="text-tinta/60 text-sm mb-6">
          Foto del ticket físico o archivo del digital.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Zona de arrastre */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label="Seleccionar archivo"
            className={[
              'w-full mb-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              arrastrando
                ? 'border-verde bg-verde/5'
                : archivo
                  ? 'border-laton bg-laton/5'
                  : 'border-linea hover:border-tinta/30',
            ].join(' ')}
          >
            {archivo ? (
              <>
                <p className="text-sm font-medium text-tinta truncate">{archivo.name}</p>
                <p className="text-xs text-tinta/50 mt-1">
                  {(archivo.size / 1024).toFixed(0)} KB · toca para cambiar
                </p>
              </>
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 h-8 w-8 text-tinta/30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16" />
                </svg>
                <p className="text-sm text-tinta/50">
                  Arrastra aquí o <span className="text-verde underline">elige un archivo</span>
                </p>
                <p className="text-xs text-tinta/30 mt-1">JPG, PNG, WEBP, HEIC, PDF · máx. 10 MB</p>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={handleChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />

          {mensajeError && (
            <p role="alert" className="mb-4 rounded-md bg-pimenton/10 px-3 py-2 text-sm text-pimenton">
              {mensajeError}
            </p>
          )}

          <button
            type="submit"
            disabled={!archivo || estado === 'cargando'}
            className="w-full rounded-md bg-verde px-4 py-2.5 text-sm font-medium text-papel transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {estado === 'cargando' ? (
              <>
                <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analizando ticket…
              </>
            ) : (
              'Analizar ticket'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
