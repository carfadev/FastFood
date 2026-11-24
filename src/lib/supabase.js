// Clientes de Supabase para SERVIDOR.
import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

export const isSupabaseConfigured = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente anónimo (lecturas públicas del catálogo, respeta RLS). */
let _public;
export function supabasePublic() {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado. Revisa tu archivo .env');
  return (_public ??= createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, noSession));
}

/** Cliente con service role (SOLO servidor: crear pedidos, webhooks). Salta RLS. */
let _service;
export function supabaseService() {
  if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  return (_service ??= createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, noSession));
}

/** Cliente con la sesión del usuario (cookies) para middleware / páginas admin. */
export function supabaseFromContext({ request, cookies }) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({ name, value: value ?? '' })),
      setAll: (list) => list.forEach(({ name, value, options }) => cookies.set(name, value, options)),
    },
  });
}
