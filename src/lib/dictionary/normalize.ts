// Normalización de texto de ticket y similitud de cadenas

const ABREV: Record<string, string> = {
  'S/GAS': 'SIN GAS',
  'C/GAS': 'CON GAS',
  DESN: 'DESNATADO',
  DESNAT: 'DESNATADO',
  SEMI: 'SEMIDESNATADO',  // solo como palabra aislada
  SEMIDESN: 'SEMIDESNATADO',
  UD: '',
  UDS: '',
  OK: '',  // marcador en tickets Froiz
};

/**
 * Normaliza el texto de una línea de ticket para comparación en el diccionario.
 * - Elimina acentos, signos de puntuación, unidades de medida y marcadores de calidad.
 * - Expande abreviaturas comunes.
 * - Normaliza notación de multiplicación entre dígitos (48*60 = 48×60 = 48X×60).
 */
export function norm(t: string): string {
  let s = t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Normaliza multiplicación entre dígitos ANTES de otras sustituciones
  // Cubre: 48*60, 48×60 (U+00D7), 48X60, 48X×60
  s = s.replace(/(\d)\s*[*\u00D7xX]+\s*(\d)/g, '$1 $2');

  // Marcadores de calidad ordinal: 1ª, 2ª, 1º
  s = s.replace(/\b\d+[ªº°]\s*/g, '');

  // Marcadores entre corchetes: [1], [0], [O]
  s = s.replace(/\[[\d0O]+\]/g, ' ');

  // Expansión de abreviaturas (solo como palabras completas)
  for (const [a, b] of Object.entries(ABREV)) {
    s = s.replace(
      new RegExp(`(^|\\s)${a.replace('/', '\\/')}(?=\\s|$)`, 'g'),
      `$1${b}`,
    );
  }

  // Elimina IVA en porcentaje ANTES de limpiar el % (evita dejar el número suelto)
  s = s.replace(/\b\d{1,2}%/g, ' ');

  // Elimina cantidades con unidades de medida
  s = s.replace(/\b\d+([.,]\d+)?\s*(KG|G|GR|ML|L|CL|UD|UDS|X)\b/g, ' ');

  // Elimina cualquier carácter no alfanumérico
  s = s.replace(/[^A-Z0-9 ]/g, ' ');

  return s.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ similitud
export function bigrams(s: string): string[] {
  const b: string[] = [];
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) b.push(t.slice(i, i + 2));
  return b;
}

/** Coeficiente de Dice sobre bigramas (0–1). Case-insensitive. */
export function dice(a: string, b: string): number {
  const A = bigrams(a.toUpperCase());
  const B = bigrams(b.toUpperCase());
  if (!A.length || !B.length) return 0;
  const m = new Map<string, number>();
  A.forEach(x => m.set(x, (m.get(x) ?? 0) + 1));
  let hits = 0;
  B.forEach(x => {
    const c = m.get(x) ?? 0;
    if (c > 0) { hits++; m.set(x, c - 1); }
  });
  return (2 * hits) / (A.length + B.length);
}
