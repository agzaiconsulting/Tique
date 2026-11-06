// Prototipo del diccionario de Gastico.
// Uso:
//   node dic_proto.js extraer <carpeta_con_filas.txt> [etiquetas.csv]   -> lineas.csv + etiquetas.csv (plantilla)
//   node dic_proto.js medir  [lineas.csv] [etiquetas.csv]               -> informe.txt + errores.csv
const fs = require('fs'), path = require('path');
const cmd = process.argv[2];
const num = s => parseFloat(String(s).replace(',', '.'));
const PRICE = /^-?\d+[.,]\d{2}$/;
const KG = /^(\d+[.,]\d{3})\s*kg$/i;

// ---------- normalización ----------
const ABREV = { 'S/GAS':'SIN GAS','C/GAS':'CON GAS','DESN':'DESNATADO','DESNAT':'DESNATADO','SEMI':'SEMIDESNATADO','SEMIDESN':'SEMIDESNATADO','UD':'','UDS':'' };
function norm(t) {
  let s = t.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/\*+/g, ' ').replace(/\[\d+\]/g, ' ');
  for (const [a, b] of Object.entries(ABREV)) s = s.replace(new RegExp('(^|\\s)' + a.replace('/', '\\/') + '(?=\\s|$)', 'g'), '$1' + b);
  s = s.replace(/\b\d+([.,]\d+)?\s*(KG|G|GR|ML|L|CL|UD|UDS|X)\b/g, ' ');
  s = s.replace(/[^A-Z0-9 ]/g, ' ').replace(/\b\d{1,2}\s*%/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ---------- extracción de líneas desde *.filas.txt ----------
function parseFilas(txt, nombre) {
  const rows = txt.split(/\r?\n/).filter(r => r.trim());
  const items = []; let pend = null, started = false;
  const chain = /MERCADONA/i.test(txt) ? 'Mercadona' : /GADIS/i.test(txt) ? 'Gadis' : /FROIZ/i.test(txt) ? 'Froiz' :
                /EROSKI|E\.?CENTER/i.test(txt) ? 'Eroski' : /PRIMOS/i.test(txt) ? 'Fruteria' : 'Otro';
  for (const r of rows) {
    if (!started) { if (/Descripci|Producto/i.test(r) || /\d{2}[\/.-]\d{2}[\/.-]\d{2,4}/.test(r)) started = true; if (/Descripci|Producto/i.test(r)) continue; else if (started) continue; else continue; }
    if (/^\*?T?OTAL/i.test(r.trim())) break;
    const tk = r.trim().split(/\s+/);
    const kgm = r.match(/(\d+[.,]\d{3})\s*kg.*?(\d+[.,]\d{2})\s*(?:€|eu|eur)?\s*\/\s*kg/i);
    const nums = tk.filter(t => PRICE.test(t)).map(num);
    const words = tk.filter(t => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(t) && !/^kg$/i.test(t));
    if (kgm && pend) { pend.kg = num(kgm[1]); pend.eurkg = num(kgm[2]); pend.precio = nums.length ? nums[nums.length - 1] : pend.precio; pend.ref = pend.eurkg; items.push(pend); pend = null; continue; }
    if (words.length && nums.length) {
      let desc = tk.filter(t => !PRICE.test(t)).join(' ').replace(/^\d+\s+/, '');
      const it = { chain, ticket: nombre, texto: desc, precio: nums[nums.length - 1], ref: '', kg: '', eurkg: '' };
      if (nums.length >= 2 && !kgm) it.ref = nums[nums.length - 2];
      items.push(it); pend = null;
    } else if (words.length && !nums.length) {
      if (pend && pend.precio == null) pend.texto += ' ' + tk.join(' '); else pend = { chain, ticket: nombre, texto: tk.join(' ').replace(/^\d+\s+/, ''), precio: null, kg: '', eurkg: '' };
    } else if (nums.length && pend) { pend.precio = nums[nums.length - 1]; items.push(pend); pend = null; }
  }
  return items;
}

const csvEsc = v => { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const writeCsv = (f, head, rows) => fs.writeFileSync(f, '﻿' + [head.join(';'), ...rows.map(r => head.map(h => csvEsc(r[h])).join(';'))].join('\n'));
function readCsv(f) {
  const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = t[0].split(';');
  return t.slice(1).map(l => { const c = l.split(';'); const o = {}; head.forEach((h, i) => o[h] = (c[i] || '').replace(/^"|"$/g, '')); return o; });
}

if (cmd === 'extraer') {
  const dir = process.argv[3]; const all = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.filas.txt'))) {
    const its = parseFilas(fs.readFileSync(path.join(dir, f), 'utf8'), f.replace('.filas.txt', ''));
    all.push(...its);
  }
  all.forEach(i => { i.norm = norm(i.texto); });
  all.forEach(i => { if (i.ref === '' || i.ref == null) i.ref = i.precio; });
  writeCsv('lineas.csv', ['chain', 'ticket', 'texto', 'norm', 'precio', 'ref', 'kg', 'eurkg'], all);
  // plantilla de etiquetas: una fila por (cadena, texto normalizado)
  const g = {};
  for (const i of all) { const k = i.chain + '|' + i.norm; (g[k] = g[k] || { chain: i.chain, norm: i.norm, veces: 0, pmin: 1e9, pmax: -1e9, producto: '' }); const x = g[k]; x.veces++; x.pmin = Math.min(x.pmin, i.ref); x.pmax = Math.max(x.pmax, i.ref); }
  const prev = fs.existsSync(process.argv[4] || 'etiquetas.csv') ? Object.fromEntries(readCsv(process.argv[4] || 'etiquetas.csv').map(r => [r.chain + '|' + r.norm, r.producto])) : {};
  const rows = Object.entries(g).map(([k, x]) => ({ ...x, producto: prev[k] || '' })).sort((a, b) => b.veces - a.veces);
  writeCsv(process.argv[4] || 'etiquetas.csv', ['chain', 'norm', 'veces', 'pmin', 'pmax', 'producto'], rows);
  console.log(`${all.length} líneas, ${rows.length} textos distintos. Rellena la columna "producto" en etiquetas.csv (pon = para usar el propio texto).`);
}

// ---------- motor ----------
function bigrams(s) { const b = []; const t = ' ' + s + ' '; for (let i = 0; i < t.length - 1; i++) b.push(t.slice(i, i + 2)); return b; }
function dice(a, b) { const A = bigrams(a), B = bigrams(b); const m = new Map(); A.forEach(x => m.set(x, (m.get(x) || 0) + 1)); let h = 0; B.forEach(x => { if (m.get(x) > 0) { h++; m.set(x, m.get(x) - 1); } }); return 2 * h / (A.length + B.length); }

function resolver(dict, linea, umbralFuzzy = 0.82, margenPrecio = 0.5) {
  // dict: [{chain,norm,producto,pmin,pmax}]
  const c = dict.filter(d => d.chain === linea.chain);
  let mejor = null, tipo = null;
  const ex = c.find(d => d.norm === linea.norm);
  if (ex) { mejor = ex; tipo = 'exacta'; }
  else {
    let s = 0; for (const d of c) { const v = dice(d.norm, linea.norm); if (v > s) { s = v; mejor = d; } }
    if (mejor && s >= umbralFuzzy) tipo = 'aprox'; else mejor = null;
  }
  if (!mejor) return { estado: 'sin_identificar' };
  // filtro de precio (RF-12e): si se sale del rango conocido +-50 %, pide confirmación
  const lo = mejor.pmin * (1 - margenPrecio), hi = mejor.pmax * (1 + margenPrecio);
  if (linea.precio < lo || linea.precio > hi) return { estado: 'confirmar_precio', producto: mejor.producto, tipo };
  return { estado: 'auto', producto: mejor.producto, tipo };
}

if (cmd === 'medir') {
  const lineas = readCsv(process.argv[3] || 'lineas.csv').map(l => ({ ...l, precio: num(l.ref || l.precio) }));
  const et = readCsv(process.argv[4] || 'etiquetas.csv').filter(e => e.producto.trim());
  const gold = e => e.producto.trim() === '=' ? e.norm : e.producto.trim().toUpperCase();
  const dict = et.map(e => ({ chain: e.chain, norm: e.norm, producto: gold(e), pmin: num(e.pmin), pmax: num(e.pmax) }));
  const etiq = new Map(et.map(e => [e.chain + '|' + e.norm, gold(e)]));
  // validación cruzada: para cada texto etiquetado, se quita del diccionario y se intenta resolver
  const res = { auto_ok: 0, auto_mal: 0, confirmar: 0, sin: 0 }; const errores = [];
  for (const e of et) {
    const sinEste = dict.filter(d => !(d.chain === e.chain && d.norm === e.norm));
    const ls = lineas.filter(l => l.chain === e.chain && l.norm === e.norm);
    for (const l of ls) {
      const r = resolver(sinEste, l);
      if (r.estado === 'auto') { if (r.producto === gold(e)) res.auto_ok++; else { res.auto_mal++; errores.push({ chain: l.chain, texto: l.texto, precio: l.precio, esperado: gold(e), obtenido: r.producto, tipo: r.tipo }); } }
      else if (r.estado === 'confirmar_precio') { res.confirmar++; errores.push({ chain: l.chain, texto: l.texto, precio: l.precio, esperado: gold(e), obtenido: r.producto + ' (pide confirmar por precio)', tipo: r.tipo }); }
      else res.sin++;
    }
  }
  // cobertura sobre TODAS las líneas con el diccionario completo
  const cob = { exacta: 0, aprox: 0, confirmar: 0, sin: 0 };
  for (const l of lineas) { const r = resolver(dict, l); if (r.estado === 'auto') cob[r.tipo]++; else if (r.estado === 'confirmar_precio') cob.confirmar++; else cob.sin++; }
  const n = lineas.length, t = res.auto_ok + res.auto_mal + res.confirmar + res.sin;
  const p = x => (100 * x / (t || 1)).toFixed(1) + ' %';
  const out = [
    `Líneas totales: ${n}; textos etiquetados: ${et.length}`,
    ``, `== Validación cruzada (cada texto etiquetado se quita y se intenta adivinar con los demás) – ${t} líneas ==`,
    `Resueltas solas y bien:   ${res.auto_ok} (${p(res.auto_ok)})`,
    `Resueltas solas y MAL:    ${res.auto_mal} (${p(res.auto_mal)})   <- la métrica crítica`,
    `Piden confirmar (precio): ${res.confirmar} (${p(res.confirmar)})`,
    `Sin identificar:          ${res.sin} (${p(res.sin)})`,
    ``, `== Cobertura con el diccionario completo sobre las ${n} líneas ==`,
    `Exacta: ${cob.exacta}  Aproximada: ${cob.aprox}  Piden confirmar: ${cob.confirmar}  Sin identificar: ${cob.sin}`,
  ].join('\n');
  const amb = readCsv(process.argv[4] || 'etiquetas.csv').filter(e => num(e.pmin) > 0 && num(e.pmax) / num(e.pmin) > 2);
  const out2 = out + '\n\n== Textos ambiguos por precio (el mismo texto con precios que difieren más de 2x; posible formato distinto) ==\n' +
    (amb.length ? amb.map(e => `${e.chain} | ${e.norm} | ${e.pmin} - ${e.pmax}`).join('\n') : 'ninguno');
  console.log(out2); fs.writeFileSync('informe.txt', out2);
  if (errores.length) writeCsv('errores.csv', ['chain', 'texto', 'precio', 'esperado', 'obtenido', 'tipo'], errores);
}