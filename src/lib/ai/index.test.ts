import { describe, it, expect } from 'vitest';
import { parsearRespuestaIA } from './index';

describe('parsearRespuestaIA', () => {
  it('JSON limpio → extrae campos correctamente', () => {
    const r = parsearRespuestaIA(
      '{"producto":"Leche entera","marca":"Hacendado","formato":"1 l","categoria":"Lácteos","confianza":0.9,"motivo":"texto claro"}',
    );
    expect(r.producto).toBe('Leche entera');
    expect(r.confianza).toBe(0.9);
    expect(r.categoria).toBe('Lácteos');
  });

  it('texto antes y después del JSON → extrae el JSON', () => {
    const r = parsearRespuestaIA(
      'Aquí tienes el resultado: {"producto":"Pan de molde","marca":"","formato":"","categoria":"Panadería","confianza":0.85,"motivo":"pan de molde"} Espero que ayude.',
    );
    expect(r.producto).toBe('Pan de molde');
  });

  it('bloque de código Markdown → extrae el JSON', () => {
    const r = parsearRespuestaIA(
      '```json\n{"producto":"Aceite oliva","marca":"","formato":"1 l","categoria":"Conservas","confianza":0.8,"motivo":"aceite"}\n```',
    );
    expect(r.producto).toBe('Aceite oliva');
  });

  it('respuesta vacía → NO_SE sin lanzar error', () => {
    const r = parsearRespuestaIA('');
    expect(r.producto).toBe('NO_SE');
    expect(r.motivo).toBe('respuesta no válida');
  });

  it('JSON truncado → NO_SE sin lanzar error', () => {
    const r = parsearRespuestaIA('{"producto":"Leche entera"');
    expect(r.producto).toBe('NO_SE');
  });

  it('NO_PRODUCTO devuelto por la IA → se conserva', () => {
    const r = parsearRespuestaIA(
      '{"producto":"NO_PRODUCTO","marca":"","formato":"","categoria":"","confianza":0.95,"motivo":"es una cabecera"}',
    );
    expect(r.producto).toBe('NO_PRODUCTO');
  });

  it('categoría no válida → se devuelve vacía', () => {
    const r = parsearRespuestaIA(
      '{"producto":"Algo","marca":"","formato":"","categoria":"Fantasía","confianza":0.5,"motivo":"test"}',
    );
    expect(r.categoria).toBe('');
  });
});
