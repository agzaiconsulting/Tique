/**
 * Crea el bucket de Storage de Tique si no existe.
 * Ejecutar una sola vez:  npx tsx scripts/setup-storage.ts
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const existe = buckets?.some((b) => b.id === 'tickets');

  if (existe) {
    console.log('✓ El bucket "tickets" ya existe.');
    return;
  }

  const { error } = await supabase.storage.createBucket('tickets', {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
  });

  if (error) {
    console.error('✗ Error al crear el bucket:', error.message);
    process.exit(1);
  }

  console.log('✓ Bucket "tickets" creado correctamente.');
  console.log('');
  console.log('Recuerda aplicar también las políticas de Storage del fichero:');
  console.log('  supabase/migrations/20261106000000_initial.sql');
  console.log('(sección "Storage — bucket privado" al final del fichero)');
}

main();
