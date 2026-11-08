'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ------------------------------------------------------------------ tipos
export interface Sugerencia {
  producto: string;
  marca: string;
  formato: string;
  categoria: string;
  confianza: number;
  motivo: string;
}

export interface LineaConSugerencia {
  id: string;
  orden: number;
  texto_original: string;
  norm: string;
  precio: number;
  precio_ref: number | null;
  cant: number | null;
  kg: number | null;
  eurkg: number | null;
  fmt: string | null;
  estado: 'auto' | 'sugerida' | 'confirmada' | 'sin_identificar' | 'descartada';
  motivo_descarte: string | null;
  alias_id: string | null;
  producto_id: string | null;
  sugerencia: Sugerencia | null;
  productoNombre: string | null;
}

export interface TicketRow {
  id: string;
  cadena: string | null;
  fecha: string | null;
  total: number | null;
  cuadra: boolean | null;
  avisos: string[];
  estado: 'procesando' | 'revision' | 'confirmado' | 'error';
  imagen_path: string;
}

// ------------------------------------------------------------------ helpers
function fmtFecha(fecha: string | null) {
  if (!fecha) return null;
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function fmtEuros(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function nombreLinea(l: LineaConSugerencia): string | null {
  return l.productoNombre ?? l.sugerencia?.producto ?? null;
}

// ------------------------------------------------------------------ subcomponentes

function LineaItem({
  linea,
  onConfirmar,
  onRechazar,
}: {
  linea: LineaConSugerencia;
  onConfirmar: (id: string) => void;
  onRechazar: (id: string) => void;
}) {
  const nombre = nombreLinea(linea);

  if (linea.estado === 'descartada') return null;

  return (
    <li className="flex gap-3 py-3 border-b border-linea/60 last:border-0">
      {/* Indicador de estado */}
      <div className="mt-0.5 shrink-0">
        {linea.estado === 'auto' || linea.estado === 'confirmada' ? (
          <span aria-label="Identificado" className="flex h-5 w-5 items-center justify-center rounded-full bg-verde/15">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3 text-verde">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : linea.estado === 'sugerida' ? (
          <span aria-label="Por confirmar" className="flex h-5 w-5 items-center justify-center rounded-full bg-laton/15">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3 text-laton">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </span>
        ) : (
          <span aria-label="Sin identificar" className="flex h-5 w-5 items-center justify-center rounded-full bg-tinta/8">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-tinta/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {nombre ? (
          <>
            <p className="text-sm text-tinta leading-snug">{nombre}</p>
            <p className="text-xs text-tinta/40 mt-0.5 truncate">{linea.texto_original}</p>
          </>
        ) : (
          <p className="text-sm text-tinta/60 leading-snug">{linea.texto_original}</p>
        )}

        {/* Botones para sugeridas */}
        {linea.estado === 'sugerida' && nombre && (
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => onConfirmar(linea.id)}
              className="rounded-md border border-verde/30 bg-verde/8 px-2 py-0.5 text-xs font-medium text-verde hover:bg-verde/15 transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={() => onRechazar(linea.id)}
              className="rounded-md border border-linea px-2 py-0.5 text-xs font-medium text-tinta/50 hover:border-tinta/30 transition-colors"
            >
              No es correcto
            </button>
          </div>
        )}
      </div>

      {/* Precio */}
      <div className="shrink-0 text-right">
        <span className="font-mono text-sm font-medium text-tinta">
          {fmtEuros(linea.precio)}
        </span>
        {linea.kg != null && linea.eurkg != null && (
          <p className="text-xs text-tinta/40 mt-0.5">
            {linea.kg.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg
          </p>
        )}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ ReviewClient
export default function ReviewClient({
  ticket,
  lineas: initialLineas,
}: {
  ticket: TicketRow;
  lineas: LineaConSugerencia[];
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState<LineaConSugerencia[]>(initialLineas);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // ---------------------------------------------------------------- estados especiales
  if (ticket.estado === 'procesando') {
    return (
      <main className="min-h-screen">
        <div className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Link href="/tickets" className="text-tinta/50 hover:text-tinta transition-colors" aria-label="Volver a mis tickets">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <p className="font-medium text-tinta text-sm">{ticket.cadena ?? 'Ticket'}</p>
          </div>
        </div>
        <div role="status" className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <svg aria-hidden="true" className="h-8 w-8 animate-spin text-verde mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-tinta">Analizando ticket…</p>
          <p className="text-xs text-tinta/40 mt-1">Puedes cerrar esta pantalla, el análisis continuará.</p>
        </div>
      </main>
    );
  }

  if (ticket.estado === 'error') {
    return (
      <main className="min-h-screen">
        <div className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Link href="/tickets" className="text-tinta/50 hover:text-tinta transition-colors" aria-label="Volver a mis tickets">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <p className="font-medium text-tinta text-sm">{ticket.cadena ?? 'Ticket'}</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-10">
          <div role="alert" className="rounded-xl border border-pimenton/20 bg-pimenton/5 p-6 text-center">
            <p className="text-sm font-medium text-pimenton mb-1">Error al procesar el ticket</p>
            <p className="text-xs text-tinta/50 mb-4">
              No se pudo analizar la imagen. Intenta subir de nuevo con una foto más clara.
            </p>
            <Link
              href="/subir"
              className="inline-block rounded-md bg-verde px-4 py-2 text-sm font-medium text-papel hover:opacity-90 transition-opacity"
            >
              Subir de nuevo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const yaConfirmado = ticket.estado === 'confirmado';
  const lineasVisibles = lineas.filter((l) => l.estado !== 'descartada');

  async function actualizarLinea(id: string, accion: 'confirmar' | 'rechazar') {
    const nuevoEstado = accion === 'confirmar' ? 'confirmada' : 'sin_identificar';
    // Optimistic update
    setLineas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, estado: nuevoEstado } : l)),
    );
    try {
      const res = await fetch(`/api/ticket-lineas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setLineas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, estado: 'sugerida' as const } : l)),
      );
    }
  }

  async function confirmarTicket() {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/confirmar`, { method: 'POST' });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Error al confirmar');
        return;
      }
      router.push('/tickets');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/tickets" className="text-tinta/50 hover:text-tinta transition-colors" aria-label="Volver a mis tickets">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-tinta text-sm truncate">
              {ticket.cadena ?? 'Ticket'}
              {ticket.fecha && (
                <span className="text-tinta/40 font-normal"> · {fmtFecha(ticket.fecha)}</span>
              )}
            </p>
          </div>
          {ticket.total != null && (
            <span className="font-mono text-sm font-semibold text-tinta shrink-0">
              {fmtEuros(ticket.total)}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Avisos si no cuadra */}
        {ticket.cuadra === false && ticket.avisos?.length > 0 && (
          <div className="mb-4 rounded-lg border border-pimenton/20 bg-pimenton/5 p-3">
            <p className="text-xs font-medium text-pimenton mb-1">Revisa estos importes</p>
            {ticket.avisos.map((a, i) => (
              <p key={i} className="text-xs text-pimenton/80 leading-snug">
                {a}
              </p>
            ))}
          </div>
        )}

        {/* Ya confirmado */}
        {yaConfirmado && (
          <div className="mb-4 rounded-lg border border-verde/20 bg-verde/5 px-3 py-2">
            <p className="text-xs font-medium text-verde">Ticket confirmado</p>
          </div>
        )}

        {/* Lista de líneas */}
        {lineasVisibles.length === 0 ? (
          <p className="text-sm text-tinta/40 py-8 text-center">
            No se detectaron líneas de producto.
          </p>
        ) : (
          <ul>
            {lineasVisibles.map((l) => (
              <LineaItem
                key={l.id}
                linea={l}
                onConfirmar={(id) => actualizarLinea(id, 'confirmar')}
                onRechazar={(id) => actualizarLinea(id, 'rechazar')}
              />
            ))}
          </ul>
        )}

        {/* Resumen */}
        {lineasVisibles.length > 0 && (
          <div role="status" aria-live="polite" className="mt-4 pt-4 border-t border-linea flex justify-between text-xs text-tinta/40">
            <span>
              {lineasVisibles.filter((l) => l.estado === 'auto' || l.estado === 'confirmada').length} identificadas
            </span>
            <span>
              {lineasVisibles.filter((l) => l.estado === 'sugerida').length} por revisar
            </span>
            <span>
              {lineasVisibles.filter((l) => l.estado === 'sin_identificar').length} sin identificar
            </span>
          </div>
        )}
      </div>

      {/* Botón confirmar sticky */}
      {!yaConfirmado && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-linea bg-papel/95 backdrop-blur-sm p-4">
          <div className="max-w-lg mx-auto space-y-2">
            {error && (
              <p role="alert" className="text-xs text-pimenton text-center">
                {error}
              </p>
            )}
            <button
              onClick={confirmarTicket}
              disabled={cargando}
              aria-busy={cargando}
              className="w-full rounded-md bg-verde px-4 py-2.5 text-sm font-medium text-papel transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando…
                </>
              ) : (
                'Confirmar y guardar ticket'
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
