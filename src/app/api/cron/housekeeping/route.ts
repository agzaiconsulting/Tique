import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Vercel Cron invoca esta ruta con el header Authorization: Bearer <CRON_SECRET>
// En desarrollo se puede llamar directamente con ?secret=<CRON_SECRET>
function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secret configurado, bloqueado

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const qs = request.nextUrl.searchParams.get('secret');
  return qs === secret;
}

export async function GET(request: NextRequest) {
  if (!autorizado(request))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const service = createServiceClient();
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // ---- 1. Tickets confirmados con imagen sin borrar ----
  const { data: confirmados } = await service
    .from('tickets')
    .select('id, imagen_path, user_id')
    .eq('estado', 'confirmado')
    .not('imagen_path', 'is', null);

  // ---- 2. Tickets atascados (>24h en procesando o error) ----
  const { data: atascados } = await service
    .from('tickets')
    .select('id, imagen_path, user_id')
    .in('estado', ['procesando', 'error'])
    .lt('created_at', hace24h)
    .not('imagen_path', 'is', null);

  const aLimpiar = [...(confirmados ?? []), ...(atascados ?? [])];

  let borradas = 0;
  let errores = 0;

  for (const ticket of aLimpiar) {
    const path = ticket.imagen_path as string;
    const { error } = await service.storage.from('tickets').remove([path]);
    if (error) {
      // El archivo puede que ya no exista — no es crítico
      errores++;
    } else {
      borradas++;
    }
    // Marcar imagen como borrada independientemente del resultado de Storage
    await service
      .from('tickets')
      .update({ imagen_path: null })
      .eq('id', ticket.id as string);
  }

  // ---- 3. Marcar procesando>24h como error ----
  const { data: marcadosData } = await service
    .from('tickets')
    .update({ estado: 'error', error: 'Tiempo de procesado agotado' })
    .eq('estado', 'procesando')
    .lt('created_at', hace24h)
    .select('id');

  return NextResponse.json({
    ok: true,
    imagenesBorradas: borradas,
    erroresStorage: errores,
    ticketsMarcadosError: marcadosData?.length ?? 0,
    ejecutadoEn: ahora.toISOString(),
  });
}
