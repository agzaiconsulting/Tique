import fs from 'fs';
import path from 'path';
import type { Sugerencia } from '@/lib/types';
import { CADENAS } from '@/../config/cadenas';
import type { Cadena } from '@/../config/cadenas';
import { CATEGORIAS, type Categoria } from '@/lib/categorias';
export { CATEGORIAS } from '@/lib/categorias';
export type { Categoria } from '@/lib/categorias';

const NO_SE: Sugerencia = {
  producto: 'NO_SE', marca: '', formato: '', categoria: '', confianza: 0,
  motivo: 'respuesta no válida',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ parse tolerante
/**
 * Extrae el primer objeto JSON de un texto que puede tener texto antes/después
 * o estar envuelto en un bloque de código.
 */
export function parsearRespuestaIA(text: string): Sugerencia {
  if (!text.trim()) return { ...NO_SE };

  // Extrae el primer {...} del texto (tolera bloques de código y texto antes/después)
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) return { ...NO_SE };

  try {
    const obj = JSON.parse(m[0]) as Partial<Sugerencia>;
    // Validar campos mínimos
    if (typeof obj.producto !== 'string') return { ...NO_SE };
    // Validar categoría contra lista cerrada
    const cat = CATEGORIAS.includes(obj.categoria as Categoria)
      ? (obj.categoria as string)
      : '';
    return {
      producto: obj.producto,
      marca: obj.marca ?? '',
      formato: obj.formato ?? '',
      categoria: cat,
      confianza: typeof obj.confianza === 'number' ? obj.confianza : 0,
      motivo: (obj.motivo ?? '').slice(0, 80),
    };
  } catch {
    return { ...NO_SE };
  }
}

// ------------------------------------------------------------------ prompt
function buildPrompt(params: {
  norm: string;
  cadena: string;
  precioTxt: string;
}): string {
  const cfg = CADENAS[params.cadena as Cadena];
  const marcasPista = cfg?.marcasPropias.length
    ? `Marcas propias de ${params.cadena}: ${cfg.marcasPropias.join(', ')}.`
    : '';

  const categoriasStr = CATEGORIAS.join(', ');

  return `Eres un asistente que identifica productos de supermercado a partir del texto abreviado de un ticket español.
Supermercado: ${params.cadena}
Texto del ticket: "${params.norm}"
Precio de referencia: ${params.precioTxt}
${marcasPista}

Categorías válidas: ${categoriasStr}

Responde SOLO con un objeto JSON, sin texto antes ni después ni bloques de código, con estos campos exactos:
{"producto":"nombre claro en español","marca":"","formato":"","categoria":"","confianza":<0 a 1>,"motivo":"una frase de menos de 15 palabras"}

Si el texto no corresponde a un producto (cabecera, IVA, ruido), pon "producto":"NO_PRODUCTO".
Si no puedes deducir de qué producto se trata, pon "producto":"NO_SE" y confianza < 0.3.
No inventes marca ni formato: déjalos vacíos si no se deducen del texto.`;
}

// ------------------------------------------------------------------ callAI (una consulta)
interface CallAIParams {
  norm: string;
  cadena: string;
  precioMin: number;
  precioMax: number;
  fixtureKey?: string;
}

export async function callAI(params: CallAIParams): Promise<Sugerencia> {
  if (process.env.MOCK_EXTERNAL === '1') {
    const p = path.join(
      process.cwd(), 'fixtures', 'ai', `${params.fixtureKey ?? 'default'}.json`,
    );
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as { content: Array<{ text: string }> };
    return parsearRespuestaIA(raw.content[0]?.text ?? '');
  }

  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada');

  const precioTxt =
    params.precioMin === params.precioMax
      ? `${params.precioMin} €`
      : `${params.precioMin}–${params.precioMax} €`;

  const prompt = buildPrompt({ norm: params.norm, cadena: params.cadena, precioTxt });

  let lastText = '';
  let intentoJson = 0;

  for (let intento = 0; intento < 5; intento++) {
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch {
      await sleep(3000 * (intento + 1));
      continue;
    }

    // Rate limit o sobrecarga: reintento con espera creciente
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      await sleep(3000 * (intento + 1));
      continue;
    }

    const json = (await res.json()) as { content: Array<{ text: string }>; error?: { message: string } };
    if (!res.ok) throw new Error(`Anthropic: ${JSON.stringify(json).slice(0, 200)}`);

    lastText = json.content.map(c => c.text).join('');
    const result = parsearRespuestaIA(lastText);

    // Si el JSON no pudo leerse, un reintento más
    if (result.producto === 'NO_SE' && result.motivo === 'respuesta no válida' && intentoJson === 0) {
      intentoJson++;
      await sleep(1000);
      continue;
    }

    return result;
  }

  return { ...NO_SE, motivo: `respuesta tras 5 reintentos: ${lastText.slice(0, 100)}` };
}

// ------------------------------------------------------------------ sugerirBatch
const CONCURRENCIA = 5;

type ItemBatch = { norm: string; cadena: string; precioMin: number; precioMax: number };

/**
 * Llama a la IA para un lote de textos únicos (cadena+norm).
 * Concurrencia máxima: 5. Un fallo en un ítem no detiene los demás.
 */
export async function sugerirBatch(
  items: ItemBatch[],
): Promise<Map<string, Sugerencia>> {
  const resultado = new Map<string, Sugerencia>();
  const cola = [...items];

  async function worker() {
    while (cola.length) {
      const item = cola.shift();
      if (!item) break;
      const key = `${item.cadena}|${item.norm}`;
      try {
        resultado.set(key, await callAI(item));
      } catch {
        resultado.set(key, { ...NO_SE });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCIA }, worker));
  return resultado;
}
