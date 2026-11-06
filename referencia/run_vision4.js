const fs = require("fs");
const path = require("path");

// Uso:
//   node run_vision4.js <carpeta_imagenes> <carpeta_salida>   (llama a Google y guarda el JSON)
//   node run_vision4.js --json <carpeta_salida>               (reprocesa los JSON ya guardados, sin llamar a Google)

const num = s => parseFloat(s.replace(",", "."));
const isPrice = t => /^-?\d+[.,]\d{2}$/.test(t);
const SPACE_BREAKS = ["SPACE", "SURE_SPACE", "EOL_SURE_SPACE", "LINE_BREAK"];

function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

// Lee las palabras de la respuesta de Google y las "endereza": calcula el giro del texto
// (foto inclinada o girada 90/180 grados) y gira las coordenadas para que las filas queden horizontales.
function extractWords(resp) {
  const raw = [];
  const pages = (resp.fullTextAnnotation && resp.fullTextAnnotation.pages) || [];
  for (const pg of pages) for (const b of pg.blocks || []) for (const p of b.paragraphs || []) for (const w of p.words || []) {
    const v = w.boundingBox.vertices.map(a => ({ x: a.x || 0, y: a.y || 0 }));
    const lastSym = w.symbols[w.symbols.length - 1];
    const brk = lastSym.property && lastSym.property.detectedBreak && lastSym.property.detectedBreak.type;
    raw.push({
      text: w.symbols.map(s => s.text).join(""),
      cx: (v[0].x + v[1].x + v[2].x + v[3].x) / 4, cy: (v[0].y + v[1].y + v[2].y + v[3].y) / 4,
      w: Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y), h: Math.hypot(v[3].x - v[0].x, v[3].y - v[0].y),
      ang: Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x),
      space: SPACE_BREAKS.includes(brk),
    });
  }
  if (!raw.length) return { words: [], angle: 0 };
  const angle = median(raw.map(r => r.ang));
  const c = Math.cos(angle), s = Math.sin(angle);
  const words = raw.map(r => {
    const x = r.cx * c + r.cy * s, y = -r.cx * s + r.cy * c;
    return { text: r.text, x: x - r.w / 2, xr: x + r.w / 2, y, h: r.h, space: r.space };
  });
  return { words, angle: angle * 180 / Math.PI };
}

function buildRows(words) {
  if (!words.length) return [];
  const medH = median(words.map(w => w.h));
  const tol = 0.6 * medH;
  const sorted = [...words].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const w of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(w.y - last.meanY) <= tol) {
      last.words.push(w);
      last.meanY = last.words.reduce((s, a) => s + a.y, 0) / last.words.length;
    } else rows.push({ words: [w], meanY: w.y });
  }
  return rows.map(r => {
    const ws = r.words.sort((a, b) => a.x - b.x);
    let s = "";
    ws.forEach((w, i) => {
      s += w.text;
      const next = ws[i + 1];
      if (next && (w.space || next.x - w.xr > 0.5 * medH)) s += " ";
    });
    return s;
  });
}

function check(rows) {
  let start = rows.findIndex(r => /Descripci|Producto/i.test(r));
  if (start < 0) start = rows.findIndex(r => /\d{2}[\/. -]\d{2}[\/. -]\d{4}/.test(r));
  if (start < 0) console.log("  (sin cabecera ni fecha: foto recortada, la suma sera parcial)");
  let sum = 0, first = null;
  const avisos = [];
  const fin = (ok, s, total) => {
    console.log(`  Suma de lineas: ${s.toFixed(2)}  Total ticket: ${total.toFixed(2)}  -> ${ok ? "CUADRA" : "NO CUADRA"}`);
    avisos.forEach(a => console.log("  AVISO: " + a));
  };
  for (const r of rows.slice(start + 1)) {
    // "T?" porque en algunas fotos se corta la primera letra de TOTAL(ES)
    if (/^\*?T?OTAL/i.test(r)) {
      const m = r.match(/-?\d+[.,]\d{2}/);
      if (m) {
        const s = Math.round(sum * 100) / 100, total = num(m[0]);
        if (!first) first = { s, total };
        if (s === total) return fin(true, s, total);
      }
      continue;
    }
    if (/P\. ?Unit|Importe|IMPORTE|P\.V\.P|CANT\./.test(r)) continue;
    // ignora palabras sueltas del fondo que queden a la derecha del precio (sin ningun digito)
    const t = r.split(" ");
    while (t.length && !/\d/.test(t[t.length - 1]) && !/^(€|Eur\.?)$/i.test(t[t.length - 1])) t.pop();
    if (t.length >= 3 && t.every(isPrice)) continue;          // filas de la tabla de IVA
    const last = t[t.length - 1];
    if (!last || !isPrice(last)) continue;
    const amount = num(last);
    sum += amount;
    if (first) continue;                                       // despues del primer TOTAL ya no avisamos
    const row = t.join(" ");
    const m = row.match(/(\d+[.,]\d{3}) ?kg (\d+[.,]\d{2}) ?(?:€|Eu)\/kg (-?\d+[.,]\d{2})$/i);
    if (m) {
      if (Math.abs(num(m[1]) * num(m[2]) - num(m[3])) > 0.011) avisos.push("peso x precio/kg no cuadra: " + row);
      continue;
    }
    if (t.length >= 3 && isPrice(t[t.length - 2])) {
      const qi = /^\d{5,6}\D?$/.test(t[0]) ? 1 : 0;           // los tickets de Froiz empiezan por un codigo de producto
      if (qi === 1 && t.length === 3) continue;                // falta la cantidad en esa fila: no se puede comprobar
      if (/^\d+([.,]\d+)?$/.test(t[qi] || "") && Math.abs(num(t[qi]) * num(t[t.length - 2]) - amount) > 0.011)
        avisos.push("cantidad x unitario no cuadra: " + row);
    }
  }
  if (first) fin(false, first.s, first.total);
  else console.log("  (no encuentro la fila del TOTAL: ticket para revisar)");
}

function report(name, resp, out) {
  const { words, angle } = extractWords(resp);
  const rows = buildRows(words);
  fs.writeFileSync(path.join(out, name + ".filas.txt"), rows.join("\n"), "utf8");
  console.log(name + ": " + rows.length + " filas" + (Math.abs(angle) > 3 ? ` (foto girada ${angle.toFixed(0)} grados, corregido)` : ""));
  check(rows);
}

(async () => {
  const jsonMode = process.argv[2] === "--json";
  const out = jsonMode ? process.argv[3] : (process.argv[3] || "salida");
  fs.mkdirSync(out, { recursive: true });
  if (jsonMode) {
    for (const f of fs.readdirSync(out).filter(f => f.endsWith(".json")))
      report(path.parse(f).name, JSON.parse(fs.readFileSync(path.join(out, f), "utf8")), out);
    return;
  }
  const key = process.env.GVISION_KEY;
  if (!key) { console.error("Falta la variable GVISION_KEY"); process.exit(1); }
  const src = process.argv[2] || ".";
  const url = "https://vision.googleapis.com/v1/images:annotate?key=" + key;
  for (const f of fs.readdirSync(src).filter(f => /\.(png|jpe?g)$/i.test(f)).sort()) {
    const name = path.parse(f).name;
    const body = { requests: [{
      image: { content: fs.readFileSync(path.join(src, f)).toString("base64") },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      imageContext: { languageHints: ["es"] },
    }]};
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      const r = (json.responses && json.responses[0]) || json;
      if (r.error) { console.log(name, "API error:", r.error.message); continue; }
      fs.writeFileSync(path.join(out, name + ".json"), JSON.stringify(r), "utf8");
      report(name, r, out);
    } catch (e) { console.log(name, "ERR", e.message); }
  }
})();
