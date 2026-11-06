import { describe, it, expect } from 'vitest';
import { check } from './index';

// Ticket Mercadona mínimo que cuadra
const MERCADONA_OK = [
  'MERCADONA S.A.',
  '30/10/2026',
  'Descripcion Importe',
  'LECHE SEMIDESNAT 0,68',
  'PAN MOLDE 1,29',
  '*TOTAL 1,97',
];

// Mismo ticket con una línea alterada (no cuadra)
const MERCADONA_MAL = [
  'MERCADONA S.A.',
  '30/10/2026',
  'Descripcion Importe',
  'LECHE SEMIDESNAT 0,70',
  'PAN MOLDE 1,29',
  '*TOTAL 1,97',
];

// Ticket sin línea de TOTAL
const SIN_TOTAL = [
  'MERCADONA S.A.',
  '30/10/2026',
  'Descripcion Importe',
  'LECHE SEMIDESNAT 0,68',
  'PAN MOLDE 1,29',
];

describe('check', () => {
  it('cuadra cuando suma = total', () => {
    const r = check(MERCADONA_OK);
    expect(r.cuadra).toBe(true);
    expect(r.total).toBe(1.97);
  });

  it('no cuadra cuando una línea está alterada', () => {
    const r = check(MERCADONA_MAL);
    expect(r.cuadra).toBe(false);
    expect(r.avisos.some(a => a.includes('no coincide'))).toBe(true);
  });

  it('devuelve aviso cuando no hay fila de TOTAL', () => {
    const r = check(SIN_TOTAL);
    expect(r.cuadra).toBe(false);
    expect(r.total).toBeNull();
    expect(r.avisos.some(a => a.includes('TOTAL'))).toBe(true);
  });
});
