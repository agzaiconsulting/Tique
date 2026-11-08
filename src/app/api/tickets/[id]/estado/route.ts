import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data, error } = await supabase
    .from('tickets')
    .select('id,estado,cadena,fecha,total,cuadra,avisos,error')
    .eq('id', id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

  return NextResponse.json(data);
}
