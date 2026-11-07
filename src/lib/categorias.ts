export const CATEGORIAS = [
  'Lácteos', 'Carne', 'Pescado', 'Fruta y verdura', 'Panadería',
  'Charcutería', 'Conservas', 'Bebidas', 'Limpieza', 'Higiene',
  'Congelados', 'Dulces y snacks', 'Droguería', 'Otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
