export type Cadena = 'Mercadona' | 'Gadis' | 'Froiz' | 'Eroski' | 'Fruteria' | 'Otro';

export const CADENAS_LISTA: Cadena[] = [
  'Mercadona',
  'Gadis',
  'Froiz',
  'Eroski',
  'Fruteria',
  'Otro',
];

export interface ConfigCadena {
  /** Palabras clave que identifican la cadena en el texto del ticket */
  detectarPor: string[];
  /** Marcas propias confirmadas, enviadas a la IA como pista */
  marcasPropias: string[];
}

export const CADENAS: Record<Cadena, ConfigCadena> = {
  Mercadona: {
    detectarPor: ['MERCADONA'],
    marcasPropias: ['Hacendado', 'Deliplus', 'Bosque Verde', 'Compy'],
  },
  Gadis: {
    detectarPor: ['GADIS'],
    marcasPropias: [
      'Gadis',
      // TODO: confirmar — IFA parece vinculada a Gadis pero no está confirmado
    ],
  },
  Froiz: {
    detectarPor: ['FROIZ'],
    marcasPropias: ['Froiz'],
  },
  Eroski: {
    detectarPor: ['EROSKI', 'E.CENTER'],
    marcasPropias: ['Eroski'],
  },
  Fruteria: {
    detectarPor: ['PRIMOS'],
    marcasPropias: [],
  },
  Otro: {
    detectarPor: [],
    marcasPropias: [],
  },
};

/** Detecta la cadena a partir de las filas del ticket. */
export function detectarCadena(filas: string[]): Cadena {
  const texto = filas.join(' ').toUpperCase();
  for (const [cadena, cfg] of Object.entries(CADENAS) as [Cadena, ConfigCadena][]) {
    if (cadena === 'Otro') continue;
    if (cfg.detectarPor.some((kw) => texto.includes(kw))) return cadena;
  }
  return 'Otro';
}
