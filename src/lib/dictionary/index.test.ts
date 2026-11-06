import { describe, it, expect } from 'vitest';
import { norm, dice } from './normalize';
import { limpiar } from './limpiar';
import { resolver, agruparVariantes } from './resolver';
import type { DictEntry, Linea } from '@/lib/types';

// ================================================================ norm / limpiar
describe('limpiar', () => {
  it('Froiz — elimina el 4% de IVA del final', () => {
    const r = limpiar('Leche Froiz sin lactosa semidesnatada 4%', 'Froiz');
    expect(r.descartado).toBe(false);
    expect(r.norm).not.toMatch(/\b4\b/);
  });

  it('Froiz — convierte "2 1" en fmt "2 l"', () => {
    const r = limpiar('Lejía Froiz con detergente 2 1 21%', 'Froiz');
    expect(r.fmt).toBe('2 l');
    expect(r.norm).not.toMatch(/\b1\b/); // "1" (el "l") debe haberse ido
  });

  it('extrae fmt "250 g" y deja norm "ARANDANOS"', () => {
    const r = limpiar('ARANDANOS 1ª 250 G');
    expect(r.norm).toBe('ARANDANOS');
    expect(r.fmt).toBe('250 g');
  });

  it('normaliza multiplicaciones: *, ×, X× → mismo norm', () => {
    const a = limpiar('BOLSA GADIS 48*60').norm;
    const b = limpiar('BOLSA GADIS 48\u00D760').norm;   // ×
    const c = limpiar('BOLSA GADIS 48X\u00D760').norm;  // X×
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('frutería — detecta kg y eurkg', () => {
    const r = limpiar('0,915 TOM. ROSADO', 'Fruteria', 2.74, 2.99);
    expect(r.kg).toBeCloseTo(0.915);
    expect(r.eurkg).toBeCloseTo(2.99);
    expect(r.descartado).toBe(false);
  });

  it('elimina prefijo SPAIN', () => {
    const r = limpiar('SPAIN YOG.LARSA C/F.BOS.');
    expect(r.norm).not.toContain('SPAIN');
  });

  // Descartes
  it('descarta CLIENTE GADIS (identificador)', () => {
    expect(limpiar('CLIENTE GADIS 488057', 'Gadis').descartado).toBe(true);
  });

  it('descarta líneas decorativas con :::', () => {
    expect(limpiar('::: PROMOCIONES GADIS + :::').descartado).toBe(true);
  });

  it('descarta fila de tabla IVA', () => {
    expect(limpiar('4%: Base: € Cuota: €').descartado).toBe(true);
  });

  it('descarta nota CANARY ISLANDS', () => {
    expect(limpiar('X CANARY ISLANDS').descartado).toBe(true);
  });

  it('descarta descuento (precio negativo)', () => {
    expect(limpiar('LONGANIZA BLANCA F', undefined, -0.46).descartado).toBe(true);
  });
});

// ================================================================ agrupación
describe('agruparVariantes', () => {
  function linea(textoOriginal: string, cadena = 'Gadis'): Linea {
    return {
      textoOriginal,
      norm: norm(textoOriginal),
      cadena,
      precio: 1.99,
      descartado: false,
    };
  }

  it('ESP.CID/CI0/CIO terminan con el mismo norm (Dice ≥ 0.88)', () => {
    const ls = [
      linea('ESP.CID.6/12 FCO.'),
      linea('ESP.CI0.6/12 FCO.'),
      linea('ESP.CIO.6/12 FCO.'),
    ];
    const ag = agruparVariantes(ls);
    expect(ag[0]!.norm).toBe(ag[1]!.norm);
    expect(ag[1]!.norm).toBe(ag[2]!.norm);
  });

  it('XANCEDA GRIE MA VA y XANCEDA GRIE F BOS NO se unen (Dice < 0.88)', () => {
    const ls = [
      linea('XANCEDA GRIE MA VA', 'Mercadona'),
      linea('XANCEDA GRIE F BOS', 'Mercadona'),
    ];
    const ag = agruparVariantes(ls);
    expect(ag[0]!.norm).not.toBe(ag[1]!.norm);

    // Verificar explícitamente el Dice
    expect(dice(ag[0]!.norm, ag[1]!.norm)).toBeLessThan(0.88);
  });
});

// ================================================================ resolver
describe('resolver', () => {
  const dict: DictEntry[] = [
    {
      cadena: 'Mercadona',
      norm: 'AGUA SIN GAS',
      productoId: 'prod-1',
      productoNombre: 'Agua sin gas Hacendado 1,5 l',
      estado: 'confirmado',
      precioMin: 0.20,
      precioMax: 0.25,
      nConfirmaciones: 5,
    },
  ];

  it('precio dentro del rango → auto', () => {
    const linea: Linea = {
      textoOriginal: 'AGUA S/GAS', norm: 'AGUA SIN GAS',
      cadena: 'Mercadona', precio: 0.22, descartado: false,
    };
    expect(resolver(dict, linea).estado).toBe('auto');
  });

  it('precio fuera del rango (RF-12e) → sugerida', () => {
    const linea: Linea = {
      textoOriginal: 'AGUA S/GAS', norm: 'AGUA SIN GAS',
      cadena: 'Mercadona', precio: 1.50, descartado: false,
    };
    const r = resolver(dict, linea);
    expect(r.estado).toBe('sugerida');
  });

  it('sin coincidencia → sin_identificar', () => {
    const linea: Linea = {
      textoOriginal: 'JAMON IBERICO', norm: 'JAMON IBERICO',
      cadena: 'Mercadona', precio: 5.99, descartado: false,
    };
    expect(resolver(dict, linea).estado).toBe('sin_identificar');
  });
});
