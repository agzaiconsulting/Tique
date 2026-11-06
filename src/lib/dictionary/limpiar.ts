import { norm } from './normalize';
import type { LimpiarResult } from '@/lib/types';
import { RUIDO_PREFIJOS, RUIDO_LINEAS } from '@/../config/ruido';

// ------------------------------------------------------------------ formato
const FMT_RE = /\b(\d+(?:[.,]\d+)?)\s*(KG|G|GR|ML|L|CL|UDS?)\b/i;
const UNIT_NORM: Record<string, string> = {
  KG: 'kg', G: 'g', GR: 'g', ML: 'ml', L: 'l', CL: 'cl', UD: 'u', UDS: 'u',
};

function extraerFmt(texto: string): string | undefined {
  const m = texto.toUpperCase().match(FMT_RE);
  if (!m) return undefined;
  const cantidad = m[1]!.replace(',', '.');
  const unidad = UNIT_NORM[m[2]!.toUpperCase()] ?? m[2]!.toLowerCase();
  return `${cantidad} ${unidad}`;
}

// ------------------------------------------------------------------ Froiz
// IVA al final de la descripción (4%, 10%, 21%)
const FROIZ_IVA = /\s+(?:4|10|21)\s*%\s*$/;
// Litros mal reconocidos: "2 1" al final = "2 l" (el OCR lee "l" como "1")
const FROIZ_LITROS = /\b(\d{1,3})\s+1\s*$/;

// ------------------------------------------------------------------ limpiar
/**
 * Limpia el texto de una línea de ticket y extrae metadatos.
 *
 * @param texto   - Texto original de la línea
 * @param cadena  - Cadena de supermercado (para reglas específicas)
 * @param precio  - Importe total de la línea (< 0 → descuento)
 * @param precio2 - Precio de referencia (unitario o €/kg)
 */
export function limpiar(
  texto: string,
  cadena?: string,
  precio?: number,
  precio2?: number,
): LimpiarResult {
  // --- Descarte por precio negativo (descuento) o cero ---
  if (precio !== undefined && precio <= 0) {
    return { norm: '', descartado: true, motivoDescarte: 'descuento o precio cero' };
  }

  const textoUpper = texto.toUpperCase().trim();

  // --- Descarte por expresiones de ruido global ---
  for (const re of RUIDO_LINEAS) {
    if (re.test(textoUpper)) {
      return { norm: '', descartado: true, motivoDescarte: 'ruido (no es producto)' };
    }
  }

  let t = texto.trim();

  // --- Frutería / peso: texto empieza con kg (3 decimales) ---
  let kg: number | undefined;
  let eurkg: number | undefined;
  const kgIni = t.match(/^(\d+[.,]\d{3})\s+/);
  if (kgIni) {
    kg = parseFloat(kgIni[1]!.replace(',', '.'));
    t = t.slice(kgIni[0].length);
    if (precio2 !== undefined) eurkg = precio2;
  }

  // --- Froiz: limpiar IVA al final y convertir "N 1" → "N l" ---
  let fmt: string | undefined;
  if (cadena === 'Froiz') {
    t = t.replace(FROIZ_IVA, '');
    const mLit = t.match(FROIZ_LITROS);
    if (mLit) {
      fmt = `${mLit[1]} l`;
      t = t.slice(0, t.length - mLit[0].length).trim();
    }
  }

  // --- Extraer formato del texto (antes de que norm() lo elimine) ---
  if (!fmt) fmt = extraerFmt(t);

  // --- Eliminar prefijos de ruido al inicio ---
  for (const prefix of RUIDO_PREFIJOS) {
    const re = new RegExp(`^${prefix.replace('.', '\\.')}\\s+`, 'i');
    t = t.replace(re, '');
  }

  // --- Normalizar ---
  const n = norm(t);

  if (!n) {
    return { norm: '', descartado: true, motivoDescarte: 'texto vacío tras limpiar' };
  }

  return { norm: n, fmt, kg, eurkg, descartado: false };
}
