'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login/confirmar`,
      },
    });

    if (error) {
      setError('No se pudo enviar el enlace. Comprueba el correo e inténtalo de nuevo.');
    } else {
      setEnviado(true);
    }
    setCargando(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl text-verde mb-1">Tique</h1>
        <p className="text-tinta/60 text-sm mb-8">
          Escanea tus tickets de supermercado.
        </p>

        {enviado ? (
          <div role="status" className="rounded-lg border border-linea bg-white/40 p-6 text-center">
            <p className="text-tinta font-medium mb-1">Revisa tu correo</p>
            <p className="text-tinta/60 text-sm">
              Te hemos enviado un enlace de acceso a{' '}
              <span className="font-mono text-xs">{email}</span>.
              Haz clic en él para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-tinta mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.es"
                className="w-full rounded-md border border-linea bg-white/60 px-3 py-2.5 text-tinta placeholder:text-tinta/30 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde"
              />
            </div>

            {error && (
              <p role="alert" aria-live="assertive" className="mb-4 text-sm text-pimenton">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando || !email}
              className="w-full rounded-md bg-verde px-4 py-2.5 text-sm font-medium text-papel transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cargando ? 'Enviando…' : 'Entrar con enlace mágico'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
