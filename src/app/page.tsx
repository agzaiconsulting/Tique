import { redirect } from 'next/navigation';

// El middleware redirige a /login si no hay sesión.
// Si hay sesión, el usuario va directamente a /subir.
export default function HomePage() {
  redirect('/subir');
}
