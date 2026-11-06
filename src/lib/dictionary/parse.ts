import { detectarCadena } from '@/../config/cadenas';
import type { Linea } from '@/lib/types';
import { limpiar } from './limpiar';
import { norm } from './normalize';

const PRICE = /^-?\d+[.,]\d{2}$/;
const KG_RE = /^(\d+[.,]\d{3})\s*kg$/i;
const isPrice = (t: string) => PRICE.test(t);
const parseNum = (s: string) => parseFloat(String(s).replace(',', '.'));

/**
 * Extrae las líneas de producto a partir de las filas de texto del ticket.
 * Porta la lógica de parseFilas de dic_proto.js con soporte para:
 * - Tickets de dos filas (Froiz: línea de producto + línea de cantidad/kg)
 * - Productos al peso (Mercadona, Eroski, frutería)
 */
export function parseFilas(filas: string[]): Linea[] {
  const cadena = detectarCadena(filas);
  const items: Linea[] = [];
  let pend: Partial<Linea> | null = null;
  let started = false;

  for (const r of filas) {
    // Detectar inicio del contenido (tras la cabecera)
    if (!started) {
      if (/Descripci|Producto/i.test(r)) { started = true; continue; }
      if (/\d{2}[\/.-]\d{2}[\/.-]\d{2,4}/.test(r)) { started = true; continue; }
      continue;
    }
    if (/^\*?T?OTAL/i.test(r.trim())) break;

    const tk = r.trim().split(/\s+/);
    // Línea de kg con precio/kg (segunda fila del producto al peso)
    const kgm = r.match(/(\d+[.,]\d{3})\s*kg.*?(\d+[.,]\d{2})\s*(?:€|eu|eur)?\s*\/\s*kg/i);
    const nums = tk.filter(t => isPrice(t)).map(parseNum);
    const words = tk.filter(t => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(t) && !/^kg$/i.test(t));

    if (kgm && pend) {
      pend.kg = parseNum(kgm[1]!);
      pend.eurkg = parseNum(kgm[2]!);
      pend.precioRef = pend.eurkg;
      if (nums.length) pend.precio = nums[nums.length - 1];
      items.push(confirmar(pend, cadena));
      pend = null;
      continue;
    }

    if (words.length && nums.length) {
      // Línea completa con descripción y precio
      const desc = tk.filter(t => !isPrice(t)).join(' ').replace(/^\d+\s+/, '');
      const precio = nums[nums.length - 1]!;
      const precioRef = nums.length >= 2 ? nums[nums.length - 2] : undefined;
      const linea: Partial<Linea> = { cadena, textoOriginal: desc, precio, precioRef };

      // Detectar KG al inicio (peso)
      if (KG_RE.test(tk[0] ?? '')) {
        linea.kg = parseNum(tk[0]!);
        linea.precioRef = precioRef;
      }

      items.push(confirmar(linea, cadena));
      pend = null;
    } else if (words.length && !nums.length) {
      // Solo texto — puede ser la primera fila de un producto de dos líneas (Froiz)
      const texto = tk.join(' ').replace(/^\d+\s+/, '');
      if (pend?.precio == null) {
        pend = pend ? { cadena: pend.cadena ?? cadena, textoOriginal: `${pend.textoOriginal ?? ''} ${texto}`, precio: pend.precio } : { cadena, textoOriginal: texto, precio: 0 };
      } else {
        pend = { cadena, textoOriginal: texto, precio: 0 };
      }
    } else if (nums.length && pend) {
      // Solo números — precio de la fila pendiente
      pend.precio = nums[nums.length - 1];
      items.push(confirmar(pend, cadena));
      pend = null;
    }
  }

  // Aplica limpiar a cada línea para obtener norm y metadatos
  return items.map(item => {
    const r = limpiar(item.textoOriginal, item.cadena, item.precio, item.precioRef);
    return {
      ...item,
      norm: r.norm,
      fmt: r.fmt ?? item.fmt,
      kg: r.kg ?? item.kg,
      eurkg: r.eurkg ?? item.eurkg,
      descartado: r.descartado,
      motivoDescarte: r.motivoDescarte,
    };
  });
}

function confirmar(p: Partial<Linea>, cadena: string): Linea {
  return {
    cadena: p.cadena ?? cadena,
    textoOriginal: p.textoOriginal ?? '',
    norm: p.norm ?? norm(p.textoOriginal ?? ''),
    precio: p.precio ?? 0,
    precioRef: p.precioRef,
    cant: p.cant,
    kg: p.kg,
    eurkg: p.eurkg,
    fmt: p.fmt,
    descartado: p.descartado ?? false,
    motivoDescarte: p.motivoDescarte,
  };
}
