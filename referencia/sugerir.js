// Sugerencias de producto para el diccionario de Gastico: Open Food Facts + IA (Anthropic).
// Uso:
//   set ANTHROPIC_KEY=sk-ant-...        (opcional; sin ella solo se listan candidatos de Open Food Facts)
//   node sugerir.js [etiquetas.csv] [--max 40] [--evaluar] [--pausa 7000]
// Por defecto trabaja sobre los textos SIN etiqueta. Con --evaluar trabaja sobre los YA etiquetados
// (sin mirar la etiqueta) y compara, para medir cuánto acierta.
// Escribe sugerencias.csv. Guarda las respuestas de Open Food Facts en off_cache.json.
const fs = require('fs');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const fichero = args.find(a => a.endsWith('.csv')) || 'etiquetas.csv';
const MAX = parseInt(opt('--max', '100000')), PAUSA = parseInt(opt('--pausa', '7000')), EVAL = args.includes('--evaluar');
const KEY = process.env.ANTHROPIC_KEY, MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const MOCK = !!process.env.GASTICO_MOCK;
const USAR_OFF = args.includes('--off'); // Open Food Facts es lento e inestable: solo si se pide
const PARALELO = USAR_OFF ? 1 : 5;
const UA = 'Gastico-prototipo/0.1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = s => parseFloat(String(s).replace(',', '.'));
const csvEsc = v => { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function readCsv(f) {
  const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = t[0].split(';');
  return t.slice(1).map(l => { const c = l.split(';'); const o = {}; head.forEach((h, i) => o[h] = (c[i] || '').replace(/^"|"$/g, '')); return o; });
}
const bg = s => { const b = [], t = ' ' + s + ' '; for (let i = 0; i < t.length - 1; i++) b.push(t.slice(i, i + 2)); return b; };
function dice(a, b) { a = a.toUpperCase(); b = b.toUpperCase(); const A = bg(a), B = bg(b), m = new Map(); A.forEach(x => m.set(x, (m.get(x) || 0) + 1)); let h = 0; B.forEach(x => { if (m.get(x) > 0) { h++; m.set(x, m.get(x) - 1); } }); return 2 * h / (A.length + B.length); }

// ---- Open Food Facts ----
const cachePath = 'off_cache.json';
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
let offFallos = 0; // fallos seguidos; tras 4 se deja de consultar OFF en esta ejecución
async function off(q) {
  if (cache[q]) return cache[q];
  if (offFallos >= 4) return [];
  let prods;
  if (MOCK) { prods = [{ code: '8480000000001', product_name: 'Leche semidesnatada ' + q, brands: 'Hacendado', quantity: '1 L' }]; if (process.env.GASTICO_MOCK_FAIL) throw new Error('mock 503'); }
  else {
    const url = 'https://es.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=8' +
      '&fields=code,product_name,brands,quantity&search_terms=' + encodeURIComponent(q);
    let ok = false;
    for (let intento = 0; intento < 3 && !ok; intento++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA } });
        if (r.status === 503 || r.status === 429) throw new Error('HTTP ' + r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        prods = (await r.json()).products || []; ok = true;
      } catch (e) { await sleep(10000 * (intento + 1)); }
    }
    if (!ok) { offFallos++; process.stdout.write('(OFF no responde) '); return []; } // no se guarda en caché
    offFallos = 0; await sleep(PAUSA);
  }
  prods = prods.filter(p => p.product_name).map(p => ({ ean: p.code, nombre: p.product_name, marca: p.brands || '', formato: p.quantity || '' }));
  cache[q] = prods; fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  return prods;
}
const MARCA_PROPIA = { Mercadona: 'Hacendado', Eroski: 'Eroski', Gadis: 'Gadis', Froiz: 'Froiz' };
async function candidatos(chain, norm) {
  const tokens = norm.split(' ').filter(t => t.length > 1);
  const qs = [tokens.join(' ')];
  if (MARCA_PROPIA[chain]) qs.push(tokens.join(' ') + ' ' + MARCA_PROPIA[chain]);
  const vistos = new Set(), out = [];
  for (const q of qs) for (const p of await off(q)) if (!vistos.has(p.ean)) { vistos.add(p.ean); out.push(p); }
  return out.slice(0, 8);
}

// ---- IA ----
async function preguntarIA(e, cands, precioTxt) {
  const lista = cands.length ? cands.map((c, i) => `${i + 1}. ${c.nombre} | marca: ${c.marca || '?'} | formato: ${c.formato || '?'}`).join('\n') : '(ninguno)';
  const prompt = `Eres un asistente que identifica productos de supermercado a partir del texto abreviado de un ticket español.
Supermercado: ${e.chain}
Texto del ticket: "${e.norm}"
Precio de referencia: ${precioTxt}
Candidatos de Open Food Facts (pueden no corresponder):
${lista}

Responde SOLO con un objeto JSON, sin texto antes ni después ni bloques de código, con "motivo" de menos de 15 palabras: {"producto":"nombre claro en español","marca":"","formato":"","categoria":"","candidato":<número o null>,"confianza":<0 a 1>,"motivo":"una frase"}.
Si el texto es demasiado críptico para saber qué es, pon "producto":"NO_SE" y confianza menor que 0.3. No inventes marca ni formato: déjalos vacíos si no se deducen del texto o de un candidato.`;
  if (MOCK) return { producto: 'Leche semidesnatada', marca: 'Hacendado', formato: '1 L', categoria: 'Lácteos', candidato: cands.length ? 1 : null, confianza: 0.9, motivo: 'mock' };
  let r, j;
  for (let intento = 0; intento < 5; intento++) {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, messages: [{ role: 'user', content: prompt }] }) });
    j = await r.json();
    if (r.status === 429 || r.status === 529 || r.status >= 500) { await sleep(3000 * (intento + 1)); continue; } // límite o saturación: reintento
    break;
  }
  if (!r.ok) throw new Error('Anthropic: ' + JSON.stringify(j).slice(0, 300));
  const t = j.content.map(c => c.text || '').join('');
  const m = t.match(/\{[\s\S]*\}/) || [''];
  try { return JSON.parse(m[0]); } catch (e) { return { producto: 'NO_SE', marca: '', formato: '', categoria: '', candidato: null, confianza: 0, motivo: 'respuesta de la IA no válida: ' + t.slice(0, 200).replace(/\s+/g, ' ') }; }
}

(async () => {
  let filas = readCsv(fichero);
  filas = filas.filter(f => EVAL ? f.producto.trim() : !f.producto.trim()).sort((a, b) => b.veces - a.veces).slice(0, MAX);
  if (!filas.length) return console.log(EVAL ? 'No hay textos etiquetados para evaluar.' : 'No hay textos sin etiquetar.');
  if (!KEY && !MOCK) console.log('Aviso: sin ANTHROPIC_KEY solo se listan candidatos de Open Food Facts.');
  const salida = []; let n = 0, idx = 0, parar = false;
  // memoria: lo ya sugerido antes no se vuelve a pedir (salvo --rehacer, o si la sugerencia anterior fue NO_SE)
  if (!args.includes('--rehacer') && fs.existsSync('sugerencias.csv')) {
    const previas = readCsv('sugerencias.csv').filter(p => p.sugerido && p.sugerido !== 'NO_SE');
    const ya = new Set(previas.map(p => p.chain + '|' + p.norm));
    previas.forEach(p => salida.push(p));
    const antes = filas.length; filas = filas.filter(f => !ya.has(f.chain + '|' + f.norm));
    console.log(`Ya sugeridas antes: ${antes - filas.length} (no se repiten). Pendientes: ${filas.length}.`);
    if (!filas.length) return console.log('Nada nuevo que sugerir. Usa --rehacer para repetirlas todas.');
  }
  const cabecera = ['chain','norm','veces','precio','sugerido','marca','formato','categoria','confianza','ean','candidato_off','n_candidatos','motivo','etiqueta_tuya','coincide'];
  const guardar = () => fs.writeFileSync('sugerencias.csv', '\ufeff' + [cabecera.join(';'), ...salida.map(r => cabecera.map(h => csvEsc(r[h])).join(';'))].join('\n'));
  async function trabajar() {
    while (idx < filas.length && !parar) {
      const e = filas[idx++]; const mi = ++n;
      try {
        let cands = []; if (USAR_OFF) { try { cands = await candidatos(e.chain, e.norm); } catch (err) { cands = []; } }
        const precio = e.pmin === e.pmax ? e.pmin + ' €' : `${e.pmin}–${e.pmax} €`;
        let ia = null; if (KEY || MOCK) ia = await preguntarIA(e, cands, precio);
        const c = ia && ia.candidato ? cands[ia.candidato - 1] : null;
        const gold = EVAL ? (e.producto.trim() === '=' ? e.norm : e.producto.trim()) : '';
        const ok = EVAL && ia ? (dice(ia.producto, gold) >= 0.6 ? 'parecido' : 'DISTINTO') : '';
        salida.push({ chain: e.chain, norm: e.norm, veces: e.veces, precio, sugerido: ia ? ia.producto : '', marca: ia ? ia.marca : '', formato: ia ? ia.formato : '',
          categoria: ia ? ia.categoria : '', confianza: ia ? ia.confianza : '', ean: c ? c.ean : '', candidato_off: c ? c.nombre : (cands[0] ? '(1º) ' + cands[0].nombre : ''),
          n_candidatos: cands.length, motivo: ia ? ia.motivo : '', etiqueta_tuya: gold, coincide: ok });
        console.log(`[${mi}/${filas.length}] ${e.chain} | ${e.norm} -> ` + (ia ? `${ia.producto} (${ia.confianza})` + (ia.producto === 'NO_SE' ? '  motivo: ' + ia.motivo : '') : cands.length + ' candidatos'));
        guardar();
      } catch (err) { console.log(`[${mi}] ERROR ${err.message}`); if (/Anthropic/.test(err.message)) { console.log('Paro para no insistir.'); parar = true; } }
    }
  }
  await Promise.all(Array.from({ length: PARALELO }, trabajar));
  guardar();
  if (EVAL) {
    const t = salida.length, p = salida.filter(s => s.coincide === 'parecido').length;
    const altos = salida.filter(s => num(s.confianza) >= 0.7), altosOk = altos.filter(s => s.coincide === 'parecido').length;
    console.log(`\nParecido a tu etiqueta: ${p}/${t}. Con confianza >= 0.7: ${altosOk}/${altos.length} parecidos. Mira las filas DISTINTO a mano: "parecido" es una medida aproximada.`);
  }
  console.log('Escrito sugerencias.csv');
})();