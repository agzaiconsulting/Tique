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

  const body = (await request.json()) as {
    accion?: string;
    nombre?: string;
    marca?: string;
    categoria?: string;
    fmt?: string;
  };

  if (!['confirmar', 'ignorar', 'restaurar'].includes(body.accion ?? ''))
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  const service = createServiceClient();

  if (body.accion === 'ignorar') {
    await service.from('alias').update({ estado: 'ignorado' }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  if (body.accion === 'restaurar') {
    await service.from('alias').update({ estado: 'pendiente' }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // confirmar
  const nombre = body.nombre?.trim();
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  // Buscar producto existente por nombre (para no duplicar)
  let productoId: string;
  let productoNombre: string;

  const { data: existing } = await service
    .from('productos')
    .select('id, nombre')
    .ilike('nombre', nombre)
    .limit(1)
    .single();

  if (existing) {
    productoId = existing.id as string;
    productoNombre = existing.nombre as string;
  } else {
    const { data: nuevo } = await service
      .from('productos')
      .insert({
        nombre,
        marca: body.marca?.trim() || null,
        categoria: body.categoria || null,
        creado_por: user.id,
      })
      .select('id, nombre')
      .single();

    if (!nuevo) return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
    productoId = nuevo.id as string;
    productoNombre = nuevo.nombre as string;
  }

  // Actualizar alias
  const { data: aliasActual } = await service
    .from('alias')
    .select('n_confirmaciones')
    .eq('id', id)
    .single();

  const newCount = ((aliasActual?.n_confirmaciones as number) ?? 0) + 1;

  await service.from('alias').update({
    producto_id: productoId,
    estado: 'confirmado',
    n_confirmaciones: newCount,
    fmt: body.fmt?.trim() || null,
  }).eq('id', id);

  // Actualizar ticket_lineas que apunten a este alias con el producto_id
  await service
    .from('ticket_lineas')
    .update({ producto_id: productoId, estado: 'confirmada' })
    .eq('alias_id', id)
    .in('estado', ['sugerida', 'auto', 'sin_identificar']);

  return NextResponse.json({ ok: true, productoNombre });
}
