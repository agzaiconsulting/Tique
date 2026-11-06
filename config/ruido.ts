// Palabras y expresiones que se eliminan o descartan del texto de los tickets.
// Añadir aquí nuevos casos sin modificar la lógica de limpiar.

/** Prefijos de país/región al inicio del nombre del producto (ej. "SPAIN YOGUR…") */
export const RUIDO_PREFIJOS: string[] = ['SPAIN', 'ESP.', 'ES.'];

/**
 * Expresiones que indican que la línea COMPLETA es ruido (no es un producto).
 * Si cualquiera de estas coincide con el texto, la línea se descarta.
 */
export const RUIDO_LINEAS: RegExp[] = [
  /^CLIENTE\s+\S+/i,                // identificador de cliente
  /:::/,                             // líneas decorativas
  /^\d{1,2}\s*%\s*[;:]/,            // tabla de IVA (ej. "4%: Base: €")
  /CANARY\s+ISLANDS/i,              // nota fiscal Canarias
];
