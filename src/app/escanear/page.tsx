'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Estado = 'opciones' | 'seleccionado' | 'analizando' | 'error';

export default function EscanearPage() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>('opciones');
  const [mensajeError, setMensajeError] = useState('');
  const camaraRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const aceptarArchivo = useCallback((f: File) => {
    setArchivo(f);
    setEstado('seleccionado');
    setMensajeError('');
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) aceptarArchivo(f);
  }

  async function analizar() {
    if (!archivo) return;
    setEstado('analizando');

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

      router.push(`/tickets/${json.id}`);
    } catch {
      setMensajeError('No se pudo conectar con el servidor');
      setEstado('error');
    }
  }

  function resetear() {
    setArchivo(null);
    setEstado('opciones');
    setMensajeError('');
    if (camaraRef.current) camaraRef.current.value = '';
    if (archivoRef.current) archivoRef.current.value = '';
  }

  const ocupado = estado === 'analizando';

  return (
    <div className="min-h-screen bg-tq-bg font-jakarta flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-14 pb-4">
        <Link
          href="/inicio"
          aria-label="Volver al inicio"
          className="w-10 h-10 rounded-[14px] border border-tq-line bg-tq-card text-tq-ink flex items-center justify-center no-underline transition-transform active:scale-[0.95]"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-0.5px]">Escanear ticket</h1>
      </header>

      <main className="flex-1 px-5 pb-10 flex flex-col gap-4 max-w-[480px] mx-auto w-full">
        {/* File selected: show preview + confirm */}
        {(estado === 'seleccionado' || estado === 'analizando' || estado === 'error') && archivo ? (
          <>
            {/* File preview card */}
            <div className="bg-tq-card rounded-[24px] shadow-tq-card p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-[14px] bg-tq-mint-soft text-tq-mint-text flex items-center justify-center flex-none">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate">{archivo.name}</p>
                <p className="text-xs text-tq-ink2 mt-0.5">
                  {(archivo.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {!ocupado && (
                <button
                  onClick={resetear}
                  aria-label="Eliminar archivo"
                  className="w-8 h-8 rounded-full text-tq-ink2 hover:text-tq-coral-text flex items-center justify-center transition-colors"
                >
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Error */}
            {estado === 'error' && (
              <p role="alert" className="rounded-[16px] bg-tq-coral-soft px-4 py-3 text-sm font-medium text-tq-coral-text">
                {mensajeError}
              </p>
            )}

            {/* Analyze button */}
            <button
              onClick={analizar}
              disabled={ocupado}
              className="w-full h-14 rounded-[18px] bg-tq-mint text-tq-mint-ink text-base font-bold flex items-center justify-center gap-2.5 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ocupado ? (
                <>
                  <svg aria-hidden="true" className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analizando ticket…
                </>
              ) : (
                <>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
                    <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" /><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
                    <path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" />
                  </svg>
                  Analizar ticket
                </>
              )}
            </button>

            {!ocupado && (
              <button
                onClick={resetear}
                className="w-full text-sm font-semibold text-tq-ink2 py-2 hover:text-tq-ink transition-colors"
              >
                Elegir otro archivo
              </button>
            )}
          </>
        ) : (
          <>
            {/* Options: camera + file */}
            <p className="text-[13px] text-tq-ink2 mt-1">
              Fotografía el ticket en papel o sube el archivo digital.
            </p>

            {/* Hacer foto */}
            <button
              onClick={() => camaraRef.current?.click()}
              className="bg-tq-card rounded-[24px] shadow-tq-card p-6 flex items-center gap-4 text-left w-full transition-transform active:scale-[0.98] hover:-translate-y-px"
            >
              <span className="w-14 h-14 rounded-[18px] bg-tq-mint flex-none flex items-center justify-center text-tq-mint-ink">
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              <div>
                <p className="text-[17px] font-bold">Hacer foto</p>
                <p className="text-[13px] text-tq-ink2 mt-0.5">Abre la cámara del móvil</p>
              </div>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-tq-ink2 flex-none">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-tq-line" />
              <span className="text-xs font-semibold text-tq-ink2">o</span>
              <span className="flex-1 h-px bg-tq-line" />
            </div>

            {/* Subir archivo */}
            <button
              onClick={() => archivoRef.current?.click()}
              className="bg-tq-card rounded-[24px] shadow-tq-card p-6 flex items-center gap-4 text-left w-full transition-transform active:scale-[0.98] hover:-translate-y-px"
            >
              <span className="w-14 h-14 rounded-[18px] bg-tq-chip flex-none flex items-center justify-center text-tq-ink">
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                  <path d="M4 20h16" />
                </svg>
              </span>
              <div>
                <p className="text-[17px] font-bold">Subir foto o PDF</p>
                <p className="text-[13px] text-tq-ink2 mt-0.5">JPG, PNG, WEBP, HEIC, PDF · máx. 10 MB</p>
              </div>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-tq-ink2 flex-none">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}

        {/* Hidden file inputs */}
        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={archivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={handleChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </main>
    </div>
  );
}
