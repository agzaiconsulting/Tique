import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = (await request.json()) as { accion?: string };
  if (body.accion !== 'confirmar' && body.accion !== 'rechazar')
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  // Verificar que la línea pertenece a un ticket del usuario (RLS en ticket_lineas)
  const { data: linea } = await supabase
    .from('ticket_lineas')
    .select('id, estado, alias_id')
    .eq('id', id)
    .single();

  if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 });

  const service = createServiceClient();
  const nuevoEstado = body.accion === 'confirmar' ? 'confirmada' : 'sin_identificar';

  await service.from('ticket_lineas').update({ estado: nuevoEstado }).eq('id', id);

  // Al confirmar individualmente: incrementar n_confirmaciones del alias
  if (body.accion === 'confirmar' && linea.alias_id) {
    const { data: alias } = await service
      .from('alias')
      .select('n_confirmaciones, estado')
      .eq('id', linea.alias_id)
      .single();

    if (alias) {
      const newCount = (alias.n_confirmaciones as number) + 1;
      const newEstado =
        newCount >= 3 && alias.estado !== 'confirmado' ? 'confirmado' : alias.estado;
      await service
        .from('alias')
        .update({ n_confirmaciones: newCount, estado: newEstado })
        .eq('id', linea.alias_id);
    }
  }

  return NextResponse.json({ ok: true });
}
