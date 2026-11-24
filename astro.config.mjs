// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// Adaptador Node (standalone). Para Vercel/Netlify cambia el adapter:
//   npm i @astrojs/vercel  ->  import vercel from '@astrojs/vercel'; adapter: vercel()
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  vite: { plugins: [tailwindcss()] },
  env: {
    schema: {
      // Públicas (se exponen al navegador)
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_WOMPI_PUBLIC_KEY: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true, default: 'http://localhost:4321' }),
      PUBLIC_BRAND_NAME: envField.string({ context: 'client', access: 'public', optional: true, default: 'Fuego Burger' }),
      // Secretas (solo servidor)
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      WOMPI_INTEGRITY_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      WOMPI_EVENTS_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, default: '' }),
      WOMPI_ENV: envField.enum({ context: 'server', access: 'secret', values: ['sandbox', 'production'], optional: true, default: 'sandbox' }),
    },
  },
});
