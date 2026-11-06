'use client';

import { useState } from 'react';
import { CATEGORIAS } from '@/lib/ai';
import type { Categoria } from '@/lib/ai';

// ------------------------------------------------------------------ tipos
export interface AliasItem {
  id: string;
  cadena: string;
  norm: string;
  estado: 'pendiente' | 'sugerido_ia' | 'confirmado' | 'ignorado';
  nConfirmaciones: number;
  sugerencia: { producto: string; marca: string; formato: string; categoria: string; confianza: number } | null;
  ejemplo: string | null;
  fmt: string | null;
  productoId: string | null;
  productoNombre: string | null;
}

interface FormData {
  nombre: string;
  marca: string;
  categoria: string;
  fmt: string;
}

// ------------------------------------------------------------------ subcomponente

function AliasRow({
  item,
  onConfirmar,
  onIgnorar,
  onRestaurar,
}: {
  item: AliasItem;
  onConfirmar: (id: string, data: FormData) => Promise<void>;
  onIgnorar: (id: string) => Promise<void>;
  onRestaurar: (id: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState<FormData>({
    nombre: item.sugerencia?.producto ?? '',
    marca: item.sugerencia?.marca ?? '',
    categoria: item.sugerencia?.categoria ?? '',
    fmt: item.sugerencia?.formato ?? item.fmt ?? '',
  });

  async function handleConfirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setCargando(true);
    await onConfirmar(item.id, form);
    setCargando(false);
    setAbierto(false);
  }

  async function handleIgnorar() {
    setCargando(true);
    await onIgnorar(item.id);
    setCargando(false);
  }

  async function handleRestaurar() {
    setCargando(true);
    await onRestaurar(item.id);
    setCargando(false);
  }

  const productoMostrado = item.productoNombre ?? item.sugerencia?.producto;

  return (
    <li className="rounded-xl border border-linea bg-white/30 overflow-hidden">
      {/* Fila principal */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-medium text-tinta/40 bg-tinta/5 rounded px-1.5 py-0.5">
              {item.cadena}
            </span>
            {item.nConfirmaciones > 0 && (
              <span className="text-xs text-tinta/30">×{item.nConfirmaciones}</span>
            )}
          </div>
          <p className="text-sm font-mono text-tinta truncate">{item.norm}</p>
          {item.ejemplo && item.ejemplo !== item.norm && (
            <p className="text-xs text-tinta/40 truncate mt-0.5">{item.ejemplo}</p>
          )}
          {productoMostrado && (
            <p className="text-xs text-verde mt-1 truncate">{productoMostrado}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-1.5 shrink-0 mt-0.5">
          {item.estado === 'confirmado' ? (
            <span className="text-xs text-verde/70 font-medium self-center">✓</span>
          ) : item.estado === 'ignorado' ? (
            <button
              onClick={handleRestaurar}
              disabled={cargando}
              className="text-xs text-tinta/40 underline hover:text-tinta/70 transition-colors disabled:opacity-40"
            >
              Restaurar
            </button>
          ) : (
            <>
              <button
                onClick={() => setAbierto((v) => !v)}
                disabled={cargando}
                aria-expanded={abierto}
                className="rounded-md border border-verde/30 bg-verde/8 px-2.5 py-1 text-xs font-medium text-verde hover:bg-verde/15 transition-colors disabled:opacity-40"
              >
                {abierto ? 'Cerrar' : 'Confirmar'}
              </button>
              <button
                onClick={handleIgnorar}
                disabled={cargando}
                className="rounded-md border border-linea px-2.5 py-1 text-xs font-medium text-tinta/40 hover:border-tinta/30 transition-colors disabled:opacity-40"
              >
                Ignorar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulario de confirmación */}
      {abierto && (
        <form
          onSubmit={handleConfirmar}
          className="border-t border-linea/60 bg-white/40 px-4 py-3 space-y-2"
        >
          <div>
            <label className="block text-xs font-medium text-tinta/60 mb-1">
              Nombre del producto <span className="text-pimenton">*</span>
            </label>
            <input
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Leche entera Hacendado 1 l"
              className="w-full rounded-md border border-linea bg-white/70 px-2.5 py-1.5 text-sm text-tinta placeholder:text-tinta/30 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-tinta/60 mb-1">Marca</label>
              <input
                value={form.marca}
                onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                placeholder="Hacendado"
                className="w-full rounded-md border border-linea bg-white/70 px-2.5 py-1.5 text-sm text-tinta placeholder:text-tinta/30 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tinta/60 mb-1">Formato</label>
              <input
                value={form.fmt}
                onChange={(e) => setForm((f) => ({ ...f, fmt: e.target.value }))}
                placeholder="1 l"
                className="w-full rounded-md border border-linea bg-white/70 px-2.5 py-1.5 text-sm text-tinta placeholder:text-tinta/30 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tinta/60 mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              className="w-full rounded-md border border-linea bg-white/70 px-2.5 py-1.5 text-sm text-tinta focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde"
            >
              <option value="">— Sin categoría —</option>
              {(CATEGORIAS as readonly string[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xs text-tinta/40 hover:text-tinta/70 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !form.nombre.trim()}
              className="rounded-md bg-verde px-3 py-1.5 text-xs font-medium text-papel hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {cargando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ DiccionarioClient

export default function DiccionarioClient({
  items: initialItems,
  estadoActivo,
}: {
  items: AliasItem[];
  estadoActivo: string;
}) {
  const [items, setItems] = useState<AliasItem[]>(initialItems);

  function eliminar(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function actualizar(id: string, cambios: Partial<AliasItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));
  }

  async function confirmar(id: string, data: FormData) {
    const res = await fetch(`/api/alias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'confirmar', ...data }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { productoNombre?: string };
    // Eliminar de la lista si estamos filtrando por 'sugerido_ia'/'pendiente'
    if (estadoActivo !== 'confirmado') {
      eliminar(id);
    } else {
      actualizar(id, { estado: 'confirmado', productoNombre: json.productoNombre });
    }
  }

  async function ignorar(id: string) {
    const res = await fetch(`/api/alias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'ignorar' }),
    });
    if (!res.ok) return;
    eliminar(id);
  }

  async function restaurar(id: string) {
    const res = await fetch(`/api/alias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'restaurar' }),
    });
    if (!res.ok) return;
    eliminar(id);
  }

  if (items.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-linea bg-white/30 px-6 py-12 text-center">
        <p className="text-sm text-verde font-medium">¡Todo revisado!</p>
        <p className="text-xs text-tinta/40 mt-1">No quedan entradas pendientes.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <AliasRow
          key={item.id}
          item={item}
          onConfirmar={confirmar}
          onIgnorar={ignorar}
          onRestaurar={restaurar}
        />
      ))}
    </ul>
  );
}
