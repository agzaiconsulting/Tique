import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Verificar que el ticket pertenece al usuario
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, estado, imagen_path')
    .eq('id', id)
    .single();

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  if (ticket.estado === 'confirmado')
    return NextResponse.json({ error: 'Ya confirmado' }, { status: 400 });

  const service = createServiceClient();

  // Cargar líneas que aún no están confirmadas (auto o sugeridas)
  const { data: lineas } = await service
    .from('ticket_lineas')
    .select('id, estado, alias_id')
    .eq('ticket_id', id)
    .in('estado', ['auto', 'sugerida']);

  if (lineas?.length) {
    // Marcar como confirmadas
    await service
      .from('ticket_lineas')
      .update({ estado: 'confirmada' })
      .eq('ticket_id', id)
      .in('estado', ['auto', 'sugerida']);

    // Incrementar n_confirmaciones en los alias afectados
    const aliasIds = [...new Set(lineas.filter((l) => l.alias_id).map((l) => l.alias_id as string))];
    if (aliasIds.length) {
      const { data: aliases } = await service
        .from('alias')
        .select('id, n_confirmaciones, estado')
        .in('id', aliasIds);

      for (const a of aliases ?? []) {
        const newCount = (a.n_confirmaciones as number) + 1;
        const newEstado =
          newCount >= 3 && a.estado !== 'confirmado' ? 'confirmado' : a.estado;
        await service
          .from('alias')
          .update({ n_confirmaciones: newCount, estado: newEstado })
          .eq('id', a.id);
      }
    }
  }

  // Marcar ticket como confirmado
  await service.from('tickets').update({ estado: 'confirmado' }).eq('id', id);

  // Borrar imagen del Storage (RF-15b)
  const imagenPath = ticket.imagen_path as string;
  if (imagenPath) {
    await supabase.storage.from('tickets').remove([imagenPath]).catch(() => {
      // No es crítico si falla el borrado
    });
  }

  return NextResponse.json({ ok: true });
}
