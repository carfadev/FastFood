import { defineMiddleware } from 'astro:middleware';
import { isSupabaseConfigured, supabaseFromContext } from './lib/supabase.js';

// Protege /admin/* : requiere sesión de Supabase Auth + fila en admin_users.
export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) return next();

  if (!isSupabaseConfigured) return ctx.redirect('/admin/login?e=config');

  const supabase = supabaseFromContext(ctx);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ctx.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);

  const { data: admin } = await supabase.from('admin_users').select('role,branch_id,full_name').eq('user_id', user.id).maybeSingle();
  if (!admin) return ctx.redirect('/admin/login?e=forbidden');

  if (admin.role !== 'owner' && pathname.startsWith('/admin/categorias'))
    return ctx.redirect('/admin');

  ctx.locals.admin = { ...admin, id: user.id, email: user.email };
  const res = await next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
});
