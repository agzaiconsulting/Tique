// Tipos compartidos entre los módulos de OCR, diccionario e IA

export interface Palabra {
  text: string;
  x: number;     // borde izquierdo (tras corrección de giro)
  xr: number;    // borde derecho
  y: number;     // centro vertical
  h: number;     // altura
  space: boolean; // hay espacio/salto tras la palabra
}

export interface CheckResult {
  cuadra: boolean;
  suma: number;
  total: number | null;
  avisos: string[];
}

export interface LimpiarResult {
  norm: string;
  fmt?: string;
  cant?: number;
  kg?: number;
  eurkg?: number;
  descartado: boolean;
  motivoDescarte?: string;
}

export interface Linea {
  textoOriginal: string;
  norm: string;
  cadena: string;
  precio: number;
  precioRef?: number;
  cant?: number;
  kg?: number;
  eurkg?: number;
  fmt?: string;
  descartado: boolean;
  motivoDescarte?: string;
}

export interface DictEntry {
  id?: string;
  cadena: string;
  norm: string;
  productoId?: string;
  productoNombre?: string;
  estado: 'pendiente' | 'sugerido_ia' | 'confirmado' | 'ignorado';
  confianza?: number;
  fmt?: string;
  precioMin?: number;
  precioMax?: number;
  nConfirmaciones: number;
}

export interface ResolverResult {
  estado: 'auto' | 'sugerida' | 'sin_identificar';
  productoId?: string;
  productoNombre?: string;
  tipo?: 'exacta' | 'aprox';
  aliasId?: string;
}

export interface Sugerencia {
  producto: string;
  marca: string;
  formato: string;
  categoria: string;
  confianza: number;
  motivo: string;
}

export interface TicketLeido {
  filas: string[];
  cadena: string;
  fecha?: string;
  total?: number;
  checkResult: CheckResult;
  lineas: Linea[];
}
