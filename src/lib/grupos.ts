export const GRUPOS = {
  Frescos:  { color: '#34D399', order: 0, cats: ['Carne', 'Pescado', 'Fruta y verdura', 'Lácteos', 'Panadería', 'Charcutería'] },
  Despensa: { color: '#60A5FA', order: 1, cats: ['Conservas', 'Dulces y snacks', 'Congelados'] },
  Bebidas:  { color: '#FBBF24', order: 2, cats: ['Bebidas'] },
  Limpieza: { color: '#A78BFA', order: 3, cats: ['Limpieza', 'Droguería'] },
  Higiene:  { color: '#F9A8D4', order: 4, cats: ['Higiene'] },
  Otros:    { color: '#B8C4BF', order: 5, cats: ['Otros'] },
} as const;

export type Grupo = keyof typeof GRUPOS;

export const GRUPOS_ORDER = (Object.keys(GRUPOS) as Grupo[]).sort(
  (a, b) => GRUPOS[a].order - GRUPOS[b].order,
);

export function mapGrupo(cat: string): Grupo {
  for (const [grupo, { cats }] of Object.entries(GRUPOS) as [Grupo, { cats: readonly string[] }][]) {
    if ((cats as readonly string[]).includes(cat)) return grupo;
  }
  return 'Otros';
}
