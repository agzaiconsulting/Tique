import fs from 'fs';
import path from 'path';
import type { Palabra, CheckResult } from '@/lib/types';

// ------------------------------------------------------------------ tipos Vision
interface VisionVertex { x?: number; y?: number }
interface VisionSymbol {
  text: string;
  property?: { detectedBreak?: { type: string } };
}
interface VisionWord {
  symbols: VisionSymbol[];
  boundingBox: { vertices: VisionVertex[] };
}
export interface VisionResponse {
  fullTextAnnotation?: {
    pages: Array<{
      blocks: Array<{ paragraphs: Array<{ words: VisionWord[] }> }>;
    }>;
  };
  error?: { message: string };
}

// ------------------------------------------------------------------ helpers
const SPACE_BREAKS = new Set(['SPACE', 'SURE_SPACE', 'EOL_SURE_SPACE', 'LINE_BREAK']);
const parseNum = (s: string) => parseFloat(s.replace(',', '.'));
const isPrice = (t: string) => /^-?\d+[.,]\d{2}$/.test(t);
function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)] ?? 0;
}

// ------------------------------------------------------------------ extractWords
/**
 * Lee las palabras de la respuesta de Vision, corrige la inclinación/giro
 * (ángulo mediano del vector v0→v1 de cada palabra) y gira las coordenadas
 * para que las filas queden horizontales.
 */
export function extractWords(resp: VisionResponse): { words: Palabra[]; angle: number } {
  const raw: Array<{
    text: string; cx: number; cy: number; w: number; h: number; ang: number; space: boolean;
  }> = [];

  const pages = resp.fullTextAnnotation?.pages ?? [];
  for (const pg of pages)
    for (const b of pg.blocks)
      for (const p of b.paragraphs)
        for (const w of p.words) {
          const v = w.boundingBox.vertices.map(a => ({ x: a.x ?? 0, y: a.y ?? 0 }));
          const lastSym = w.symbols[w.symbols.length - 1];
          const brk = lastSym?.property?.detectedBreak?.type;
          const [v0, v1, , v3] = v as [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
          ];
          raw.push({
            text: w.symbols.map(s => s.text).join(''),
            cx: (v[0]!.x + v[1]!.x + v[2]!.x + v[3]!.x) / 4,
            cy: (v[0]!.y + v[1]!.y + v[2]!.y + v[3]!.y) / 4,
            w: Math.hypot(v1.x - v0.x, v1.y - v0.y),
            h: Math.hypot(v3.x - v0.x, v3.y - v0.y),
            ang: Math.atan2(v1.y - v0.y, v1.x - v0.x),
            space: SPACE_BREAKS.has(brk ?? ''),
          });
        }

  if (!raw.length) return { words: [], angle: 0 };

  const angle = median(raw.map(r => r.ang));
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  const words: Palabra[] = raw.map(r => {
    const x = r.cx * c + r.cy * s;
    const y = -r.cx * s + r.cy * c;
    return { text: r.text, x: x - r.w / 2, xr: x + r.w / 2, y, h: r.h, space: r.space };
  });

  return { words, angle: (angle * 180) / Math.PI };
}

// ------------------------------------------------------------------ buildRows
/**
 * Agrupa palabras en filas por centro Y con tolerancia 0,6 × altura mediana.
 * Inserta espacio cuando hay detectedBreak o hueco > 0,5 × altura mediana.
 */
export function buildRows(words: Palabra[]): string[] {
  if (!words.length) return [];
  const medH = median(words.map(w => w.h));
  const tol = 0.6 * medH;

  const sorted = [...words].sort((a, b) => a.y - b.y);
  const grupos: Array<{ words: Palabra[]; meanY: number }> = [];

  for (const w of sorted) {
    const last = grupos[grupos.length - 1];
    if (last && Math.abs(w.y - last.meanY) <= tol) {
      last.words.push(w);
      last.meanY = last.words.reduce((s, a) => s + a.y, 0) / last.words.length;
    } else {
      grupos.push({ words: [w], meanY: w.y });
    }
  }

  return grupos.map(g => {
    const ws = g.words.sort((a, b) => a.x - b.x);
    let s = '';
    ws.forEach((w, i) => {
      s += w.text;
      const next = ws[i + 1];
      if (next && (w.space || next.x - w.xr > 0.5 * medH)) s += ' ';
    });
    return s;
  });
}

// ------------------------------------------------------------------ check
/**
 * Valida que la suma de líneas = total impreso, que cantidad × unitario = importe
 * y que kg × €/kg = importe. Devuelve si cuadra, la suma, el total y los avisos.
 *
 * Limitación conocida: no detecta dos precios intercambiados entre líneas.
 */
export function check(rows: string[]): CheckResult {
  let start = rows.findIndex(r => /Descripci|Producto/i.test(r));
  if (start < 0) start = rows.findIndex(r => /\d{2}[\/. -]\d{2}[\/. -]\d{4}/.test(r));

  const avisos: string[] = [];
  if (start < 0) {
    avisos.push('sin cabecera ni fecha: posible foto recortada, suma parcial');
  }

  let sum = 0;
  let first: { s: number; total: number } | null = null;

  for (const r of rows.slice(start + 1)) {
    // "T?" porque en algunas fotos se corta la primera letra de TOTAL(ES)
    if (/^\*?T?OTAL/i.test(r.trim())) {
      const m = r.match(/-?\d+[.,]\d{2}/);
      if (m) {
        const s = Math.round(sum * 100) / 100;
        const total = parseNum(m[0]);
        if (!first) first = { s, total };
        if (s === total) return { cuadra: true, suma: s, total, avisos };
      }
      continue;
    }
    if (/P\. ?Unit|Importe|IMPORTE|P\.V\.P|CANT\./.test(r)) continue;

    // Ignora palabras de fondo sin dígitos al final
    const t = r.split(' ');
    while (t.length && !/\d/.test(t[t.length - 1]!) && !/^(€|Eur\.?)$/i.test(t[t.length - 1]!))
      t.pop();
    if (t.length >= 3 && t.every(isPrice)) continue; // filas de la tabla de IVA

    const last = t[t.length - 1];
    if (!last || !isPrice(last)) continue;

    const amount = parseNum(last);
    sum += amount;
    if (first) continue; // después del primer TOTAL ya no emitimos avisos de fila

    const row = t.join(' ');
    const mKg = row.match(/(\d+[.,]\d{3}) ?kg (\d+[.,]\d{2}) ?(?:€|Eu)\/kg (-?\d+[.,]\d{2})$/i);
    if (mKg) {
      if (Math.abs(parseNum(mKg[1]!) * parseNum(mKg[2]!) - parseNum(mKg[3]!)) > 0.011)
        avisos.push(`peso × precio/kg no cuadra: ${row}`);
      continue;
    }

    if (t.length >= 3 && isPrice(t[t.length - 2]!)) {
      // Los tickets de Froiz empiezan la fila con un código de producto de 5-6 dígitos
      const qi = /^\d{5,6}\D?$/.test(t[0]!) ? 1 : 0;
      if (qi === 1 && t.length === 3) continue; // falta la cantidad, no se puede comprobar
      const qty = t[qi];
      if (qty && /^\d+([.,]\d+)?$/.test(qty)) {
        const computed = parseNum(qty) * parseNum(t[t.length - 2]!);
        if (Math.abs(computed - amount) > 0.011)
          avisos.push(`cantidad × unitario no cuadra: ${row}`);
      }
    }
  }

  if (first) {
    const diff = Math.abs(first.s - first.total).toFixed(2);
    avisos.push(
      `La suma (${first.s.toFixed(2)} €) no coincide con el total (${first.total.toFixed(2)} €) — diferencia ${diff} €.` +
        ' Nota: la comprobación no detecta precios intercambiados entre líneas.',
    );
    return { cuadra: false, suma: first.s, total: first.total, avisos };
  }

  avisos.push('no se encontró la fila del TOTAL');
  return { cuadra: false, suma: Math.round(sum * 100) / 100, total: null, avisos };
}

// ------------------------------------------------------------------ detectarFecha / detectarTotal
export function detectarFecha(filas: string[]): string | null {
  for (const r of filas) {
    const m = r.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{2,4})/);
    if (m) {
      const [, d, mo, y] = m;
      const year = y!.length === 2 ? `20${y}` : y!;
      return `${year}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
    }
  }
  return null;
}

export function detectarTotal(filas: string[]): number | null {
  for (const r of filas) {
    if (/^\*?T?OTAL/i.test(r.trim())) {
      const m = r.match(/-?\d+[.,]\d{2}/);
      if (m) return parseNum(m[0]);
    }
  }
  return null;
}

// ------------------------------------------------------------------ callVision
/**
 * Llama a Google Cloud Vision con DOCUMENT_TEXT_DETECTION.
 * Con MOCK_EXTERNAL=1 lee de fixtures/vision/<fixtureKey>.json.
 */
export async function callVision(
  imageBase64: string,
  fixtureKey = 'default',
): Promise<VisionResponse> {
  if (process.env.MOCK_EXTERNAL === '1') {
    const p = path.join(process.cwd(), 'fixtures', 'vision', `${fixtureKey}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as VisionResponse;
  }

  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) throw new Error('GOOGLE_VISION_API_KEY no configurada');

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;
  const body = {
    requests: [
      {
        image: { content: imageBase64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['es'] },
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { responses?: VisionResponse[]; error?: { message: string } };
  const r = (json.responses && json.responses[0]) ?? (json as unknown as VisionResponse);
  if (r.error) throw new Error(`Vision API: ${r.error.message}`);
  return r;
}
