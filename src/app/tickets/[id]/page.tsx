import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ReviewClient from './ReviewClient';
import type { TicketRow, LineaConSugerencia } from './ReviewClient';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Ticket básico
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, cadena, fecha, total, cuadra, avisos, estado, imagen_path')
    .eq('id', id)
    .single<TicketRow>();

  if (ticketError || !ticket) notFound();

  // Líneas
  const { data: lineas } = await supabase
    .from('ticket_lineas')
    .select(
      'id, orden, texto_original, norm, precio, precio_ref, cant, kg, eurkg, fmt, estado, motivo_descarte, alias_id, producto_id',
    )
    .eq('ticket_id', id)
    .order('orden');

  // Alias (sugerencias IA o dict)
  const aliasIds = [
    ...new Set((lineas ?? []).filter((l) => l.alias_id).map((l) => l.alias_id as string)),
  ];
  const aliasMap = new Map<string, { sugerencia: unknown }>();
  if (aliasIds.length) {
    const { data: aliases } = await supabase
      .from('alias')
      .select('id, sugerencia')
      .in('id', aliasIds);
    for (const a of aliases ?? []) aliasMap.set(a.id as string, { sugerencia: a.sugerencia });
  }

  // Productos
  const productoIds = [
    ...new Set((lineas ?? []).filter((l) => l.producto_id).map((l) => l.producto_id as string)),
  ];
  const productoMap = new Map<string, string>();
  if (productoIds.length) {
    const { data: productos } = await supabase
      .from('productos')
      .select('id, nombre')
      .in('id', productoIds);
    for (const p of productos ?? []) productoMap.set(p.id as string, p.nombre as string);
  }

  // Enriquecer líneas con sus datos relacionados
  const lineasEnriquecidas: LineaConSugerencia[] = (lineas ?? []).map((l) => ({
    id: l.id as string,
    orden: l.orden as number,
    texto_original: l.texto_original as string,
    norm: (l.norm as string | null) ?? '',
    precio: l.precio as number,
    precio_ref: (l.precio_ref as number | null) ?? null,
    cant: (l.cant as number | null) ?? null,
    kg: (l.kg as number | null) ?? null,
    eurkg: (l.eurkg as number | null) ?? null,
    fmt: (l.fmt as string | null) ?? null,
    estado: l.estado as LineaConSugerencia['estado'],
    motivo_descarte: (l.motivo_descarte as string | null) ?? null,
    alias_id: (l.alias_id as string | null) ?? null,
    producto_id: (l.producto_id as string | null) ?? null,
    sugerencia: l.alias_id
      ? (aliasMap.get(l.alias_id as string)?.sugerencia as LineaConSugerencia['sugerencia'])
      : null,
    productoNombre: l.producto_id ? productoMap.get(l.producto_id as string) ?? null : null,
  }));

  return <ReviewClient ticket={ticket} lineas={lineasEnriquecidas} />;
}
