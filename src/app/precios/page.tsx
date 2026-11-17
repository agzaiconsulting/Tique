import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { mapGrupo } from '@/lib/grupos';
import { PreciosClient, type PrecioEntry } from './PreciosClient';

export const dynamic = 'force-dynamic';

interface Sugerencia { producto: string; marca: string; categoria: string }

export default async function PreciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: lineas } = await supabase
    .from('ticket_lineas')
    .select('precio, producto_id, alias_id, productos(id, nombre, marca, categoria), alias(sugerencia), tickets(fecha, cadena)')
    .in('estado', ['auto', 'sugerida', 'confirmada'])
    .not('alias_id', 'is', null);

  const map = new Map<string, PrecioEntry>();

  for (const l of lineas ?? []) {
    const key = (l.producto_id as string | null) ?? (l.alias_id as string | null);
    if (!key) continue;

    const ticket = (l.tickets as unknown as { fecha: string | null; cadena: string | null } | null);
    const prod   = (l.productos as unknown as { id: string; nombre: string; marca: string | null; categoria: string } | null);
    const sug    = ((l.alias as unknown as { sugerencia: Sugerencia | null } | null))?.sugerencia;

    const nombre    = prod?.nombre    ?? sug?.producto  ?? '—';
    const marca     = prod?.marca     ?? sug?.marca      ?? null;
    const categoria = prod?.categoria ?? sug?.categoria  ?? 'Otros';

    const existing = map.get(key);
    if (!existing || (ticket?.fecha && ticket.fecha > (existing.fecha ?? ''))) {
      map.set(key, { key, nombre, marca, grupo: mapGrupo(categoria), precio: l.precio ?? 0, fecha: ticket?.fecha ?? null, cadena: ticket?.cadena ?? null });
    }
  }

  const precios: PrecioEntry[] = Array.from(map.values())
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return <PreciosClient precios={precios} />;
}
