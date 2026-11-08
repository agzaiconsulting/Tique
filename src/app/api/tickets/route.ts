import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { callVision, extractWords, buildRows, check, detectarFecha, detectarTotal } from '@/lib/ocr';
import { parseFilas, resolver, agruparVariantes } from '@/lib/dictionary';
import { sugerirBatch } from '@/lib/ai';
import { detectarCadena } from '@/../config/cadenas';
import type { DictEntry, ResolverResult } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

type LineaResuelta = ReturnType<typeof agruparVariantes>[0] & {
  resolved: { estado: 'descartada' } | ResolverResult;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  if (file.size > 50 * 1024 * 1024)
    return NextResponse.json({ error: 'El archivo supera los 50 MB' }, { status: 400 });

  const ticketId = crypto.randomUUID();
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const imagenPath = `${user.id}/${ticketId}.${ext}`;
  const fileBuffer = await file.arrayBuffer();
  const service = createServiceClient();

  // Subir imagen al bucket (con autocreación si no existe aún)
  let { error: uploadError } = await supabase.storage
    .from('tickets')
    .upload(imagenPath, fileBuffer, { contentType: file.type });

  if (uploadError?.message?.toLowerCase().includes('bucket')) {
    // El bucket no existe: intentar crearlo con la clave de servicio
    await service.storage.createBucket('tickets', {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
    });
    ({ error: uploadError } = await supabase.storage
      .from('tickets')
      .upload(imagenPath, fileBuffer, { contentType: file.type }));
  }

  if (uploadError)
    return NextResponse.json(
      { error: `Error al subir imagen: ${uploadError.message}` },
      { status: 500 },
    );

  // Crear fila ticket en estado procesando
  const { error: insertError } = await service.from('tickets').insert({
    id: ticketId,
    user_id: user.id,
    estado: 'procesando',
    imagen_path: imagenPath,
  });
  if (insertError) {
    await supabase.storage.from('tickets').remove([imagenPath]);
    return NextResponse.json({ error: `Error BD: ${insertError.message}` }, { status: 500 });
  }

  try {
    // --- OCR ---
    const imageBase64 = Buffer.from(fileBuffer).toString('base64');
    const visionResp = await callVision(imageBase64, 'default');
    const { words } = extractWords(visionResp);
    const filas = buildRows(words);
    const checkResult = check(filas);
    const cadena = detectarCadena(filas);
    const fecha = detectarFecha(filas);
    const total = detectarTotal(filas);
    const lineas = parseFilas(filas);

    // --- Diccionario ---
    const { data: aliasRows } = await service
      .from('alias')
      .select('id,cadena,norm,producto_id,estado,confianza,fmt,precio_min,precio_max,n_confirmaciones')
      .eq('cadena', cadena);

    const dict: DictEntry[] = (aliasRows ?? []).map((a) => ({
      id: a.id as string,
      cadena: a.cadena as string,
      norm: a.norm as string,
      productoId: (a.producto_id as string | null) ?? undefined,
      estado: a.estado as DictEntry['estado'],
      confianza: (a.confianza as number | null) ?? undefined,
      fmt: (a.fmt as string | null) ?? undefined,
      precioMin: (a.precio_min as number | null) ?? undefined,
      precioMax: (a.precio_max as number | null) ?? undefined,
      nConfirmaciones: a.n_confirmaciones as number,
    }));

    const lineasAgrupadas = agruparVariantes(lineas);
    const lineasResueltas: LineaResuelta[] = lineasAgrupadas.map((l) => ({
      ...l,
      resolved: l.descartado ? { estado: 'descartada' as const } : resolver(dict, l),
    }));

    // --- IA para líneas sin identificar ---
    const sinIdentificar = lineasResueltas.filter(
      (l) => !l.descartado && l.resolved.estado === 'sin_identificar',
    );
    const uniqueMap = new Map<string, LineaResuelta>();
    for (const l of sinIdentificar) {
      const key = `${l.cadena}|${l.norm}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, l);
    }

    const aiResults = await sugerirBatch(
      Array.from(uniqueMap.values()).map((l) => ({
        norm: l.norm,
        cadena: l.cadena,
        precioMin: l.precio,
        precioMax: l.precio,
      })),
    );

    // Insertar alias nuevos sugeridos por IA (sin sobreescribir existentes)
    type AliasInsert = {
      cadena: string;
      norm: string;
      estado: string;
      fuente: string;
      confianza: number;
      sugerencia: unknown;
      ejemplo: string;
    };
    const candidatos: AliasInsert[] = Array.from(uniqueMap.values()).flatMap((l) => {
      const sug = aiResults.get(`${l.cadena}|${l.norm}`);
      if (!sug || sug.producto === 'NO_SE' || sug.producto === 'NO_PRODUCTO') return [];
      return [
        {
          cadena: l.cadena,
          norm: l.norm,
          estado: 'sugerido_ia',
          fuente: 'ia',
          confianza: sug.confianza,
          sugerencia: sug,
          ejemplo: l.textoOriginal,
        },
      ];
    });

    // Mapa norm → alias_id para líneas con sugerencia IA
    const aliasIdByNorm = new Map<string, string>();
    if (candidatos.length > 0) {
      const norms = candidatos.map((c) => c.norm);
      const { data: existentes } = await service
        .from('alias')
        .select('id,norm')
        .eq('cadena', cadena)
        .in('norm', norms);

      const normsExistentes = new Set((existentes ?? []).map((a) => a.norm as string));
      for (const a of existentes ?? []) aliasIdByNorm.set(a.norm as string, a.id as string);

      const nuevos = candidatos.filter((c) => !normsExistentes.has(c.norm));
      if (nuevos.length > 0) {
        const { data: insertados } = await service
          .from('alias')
          .insert(nuevos)
          .select('id,norm');
        for (const a of insertados ?? []) aliasIdByNorm.set(a.norm as string, a.id as string);
      }
    }

    // --- Insertar ticket_lineas ---
    const lineasRows = lineasResueltas.map((l, i) => {
      const aiKey = `${l.cadena}|${l.norm}`;
      const resolved = l.resolved as ResolverResult;

      let estado: 'auto' | 'sugerida' | 'sin_identificar' | 'descartada';
      if (l.descartado) {
        estado = 'descartada';
      } else if (resolved.estado === 'auto') {
        estado = 'auto';
      } else if (resolved.estado === 'sugerida') {
        estado = 'sugerida';
      } else {
        const sug = aiResults.get(aiKey);
        estado =
          sug && sug.producto !== 'NO_SE' && sug.producto !== 'NO_PRODUCTO'
            ? 'sugerida'
            : 'sin_identificar';
      }

      const aliasId =
        resolved.aliasId ?? aliasIdByNorm.get(l.norm) ?? null;

      return {
        ticket_id: ticketId,
        orden: i,
        texto_original: l.textoOriginal,
        norm: l.norm,
        alias_id: aliasId,
        producto_id: resolved.productoId ?? null,
        precio: l.precio,
        precio_ref: l.precioRef ?? null,
        cant: l.cant ?? null,
        kg: l.kg ?? null,
        eurkg: l.eurkg ?? null,
        fmt: l.fmt ?? null,
        estado,
        motivo_descarte: l.motivoDescarte ?? null,
      };
    });

    if (lineasRows.length > 0) {
      await service.from('ticket_lineas').insert(lineasRows);
    }

    // --- Actualizar ticket ---
    await service
      .from('tickets')
      .update({
        cadena,
        fecha: fecha ?? null,
        total: total ?? null,
        cuadra: checkResult.cuadra,
        avisos: checkResult.avisos,
        estado: 'revision',
        ocr_json: visionResp,
      })
      .eq('id', ticketId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    await service.from('tickets').update({ estado: 'error', error: msg }).eq('id', ticketId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ id: ticketId });
}
