// Cliente de Supabase para el NAVEGADOR (panel admin). Comparte sesión vía cookies con el servidor.
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from 'astro:env/client';

let client;
export function sb() {
  return (client ??= createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY));
}
