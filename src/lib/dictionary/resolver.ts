import { dice } from './normalize';
import type { DictEntry, Linea, ResolverResult } from '@/lib/types';

const UMBRAL_FUZZY_DEFAULT = 0.82;
const MARGEN_PRECIO_DEFAULT = 0.5;

/**
 * Resuelve una línea contra el diccionario:
 * 1. Búsqueda exacta (norm === norm)
 * 2. Búsqueda aproximada (Dice ≥ umbral)
 * 3. Filtro de precio (RF-12e): si el precio cae fuera del rango conocido ±50%,
 *    pasa a 'sugerida' para que el usuario confirme.
 */
export function resolver(
  dict: DictEntry[],
  linea: Linea,
  umbralFuzzy = UMBRAL_FUZZY_DEFAULT,
  margenPrecio = MARGEN_PRECIO_DEFAULT,
): ResolverResult {
  const porCadena = dict.filter(d => d.cadena === linea.cadena);

  let mejor: DictEntry | undefined;
  let tipo: 'exacta' | 'aprox' | undefined;

  const exacto = porCadena.find(d => d.norm === linea.norm);
  if (exacto) {
    mejor = exacto;
    tipo = 'exacta';
  } else {
    let maxSim = 0;
    for (const d of porCadena) {
      const sim = dice(d.norm, linea.norm);
      if (sim > maxSim) { maxSim = sim; mejor = d; }
    }
    if (mejor && maxSim >= umbralFuzzy) tipo = 'aprox'; else mejor = undefined;
  }

  if (!mejor) return { estado: 'sin_identificar' };

  // RF-12e: filtro de precio — si sale del rango conocido ±50%, pide confirmación
  const precioLinea = linea.precioRef ?? linea.precio;
  if (mejor.precioMin !== undefined && mejor.precioMax !== undefined) {
    const lo = mejor.precioMin * (1 - margenPrecio);
    const hi = mejor.precioMax * (1 + margenPrecio);
    if (precioLinea < lo || precioLinea > hi) {
      return {
        estado: 'sugerida',
        productoId: mejor.productoId,
        productoNombre: mejor.productoNombre,
        tipo,
        aliasId: mejor.id,
      };
    }
  }

  return {
    estado: 'auto',
    productoId: mejor.productoId,
    productoNombre: mejor.productoNombre,
    tipo,
    aliasId: mejor.id,
  };
}

/**
 * Agrupa líneas con el mismo cadena y norms similares (Dice ≥ umbral).
 * Las variantes del mismo producto (ej. errores de OCR) reciben el norm
 * de la primera ocurrencia del grupo.
 */
export function agruparVariantes(lineas: Linea[], umbral = 0.88): Linea[] {
  type Grupo = { norm: string; cadena: string; indices: number[] };
  const grupos: Grupo[] = [];

  lineas.forEach((linea, i) => {
    if (linea.descartado) return;
    for (const g of grupos) {
      if (g.cadena === linea.cadena && dice(g.norm, linea.norm) >= umbral) {
        g.indices.push(i);
        return;
      }
    }
    grupos.push({ norm: linea.norm, cadena: linea.cadena, indices: [i] });
  });

  const result = lineas.map(l => ({ ...l }));
  for (const g of grupos) {
    for (const idx of g.indices) {
      result[idx]!.norm = g.norm;
    }
  }
  return result;
}
