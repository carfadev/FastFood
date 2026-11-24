-- Datos de ejemplo (opcional). Ejecutar después de schema.sql.

insert into public.branches (name, slug, city, address, phone, whatsapp, hours, open_time, close_time, delivery_fee, min_order, eta_minutes, sort) values
  ('Sede Chapinero', 'chapinero', 'Bogotá', 'Cra 13 # 63-20', '601 555 0101', '573000000001', 'Lun–Dom · 12:00 m – 8:00 p.m.', time '12:00', time '20:00', 4000, 15000, 30, 1),
  ('Sede Cedritos',  'cedritos',  'Bogotá', 'Cl 140 # 11-45', '601 555 0102', '573000000002', 'Lun–Dom · 12:00 m – 8:00 p.m.', time '12:00', time '20:00', 5000, 15000, 35, 2),
  ('Sede Chía',      'chia',      'Chía',   'Av. Pradilla # 5-30', '601 555 0103', '573000000003', 'Mar–Dom · 1:00 p.m. – 8:00 p.m.', time '12:00', time '20:00', 6000, 20000, 40, 3)
on conflict (slug) do nothing;

insert into public.categories (name, slug, emoji, sort) values
  ('Hamburguesas', 'hamburguesas', '🍔', 1),
  ('Salchipapas',  'salchipapas',  '🍟', 2),
  ('Perros',       'perros',       '🌭', 3),
  ('Combos',       'combos',       '🔥', 4),
  ('Bebidas',      'bebidas',      '🥤', 5),
  ('Postres',      'postres',      '🍦', 6)
on conflict (slug) do nothing;

insert into public.products (category_id, name, description, price, is_featured, sort)
select c.id, p.name, p.description, p.price, p.featured, p.sort
from (values
  ('hamburguesas', 'Clásica Fuego',      'Carne 150 g, queso cheddar, lechuga, tomate y salsa de la casa.', 22000, true, 1),
  ('hamburguesas', 'Doble Bacon',        'Doble carne, doble cheddar, tocineta crocante y cebolla caramelizada.', 32000, true, 2),
  ('hamburguesas', 'BBQ Ranchera',       'Carne, aros de cebolla, chorizo, queso mozzarella y BBQ ahumada.', 29000, false, 3),
  ('hamburguesas', 'Pollo Crispy',       'Pechuga apanada, coleslaw, pepinillos y mayo picante.', 26000, false, 4),
  ('salchipapas',  'Salchipapa Clásica', 'Papa a la francesa, salchicha y salsas de la casa.', 16000, false, 1),
  ('salchipapas',  'Salchipapa Montañera','Papa, salchicha, chorizo, chicharrón, huevo y queso gratinado.', 28000, true, 2),
  ('salchipapas',  'Salchipapa Mixta XL','Para compartir: pollo, carne desmechada, tocineta y maíz.', 38000, false, 3),
  ('perros',       'Perro Americano',    'Salchicha americana, cebolla grillé, mostaza y ketchup.', 15000, false, 1),
  ('perros',       'Perro Especial',     'Salchicha, queso, tocineta, papita ripio y salsa piña.', 19000, false, 2),
  ('combos',       'Combo Fuego',        'Clásica Fuego + papas + gaseosa 400 ml.', 30000, true, 1),
  ('combos',       'Combo Pareja',       '2 hamburguesas clásicas + papas grandes + 2 gaseosas.', 56000, false, 2),
  ('bebidas',      'Gaseosa 400 ml',     'Coca-Cola, Sprite o Quatro.', 5000, false, 1),
  ('bebidas',      'Limonada de coco',   'Natural, preparada al momento.', 9000, false, 2),
  ('postres',      'Brownie con helado', 'Brownie tibio con helado de vainilla y fudge.', 12000, false, 1)
) as p(cat, name, description, price, featured, sort)
join public.categories c on c.slug = p.cat
where not exists (select 1 from public.products x where x.name = p.name);

-- ─────────── PRIMER ADMINISTRADOR ───────────
-- 1) Crea el usuario en Supabase → Authentication → Users → "Add user" (email + contraseña).
-- 2) Ejecuta (reemplaza el correo):
-- insert into public.admin_users (user_id, full_name, role)
-- select id, 'Administrador', 'owner' from auth.users where email = 'admin@turestaurante.com';
--
-- Para un administrador de sede:
-- insert into public.admin_users (user_id, full_name, role, branch_id)
-- select u.id, 'Admin Chapinero', 'manager', b.id
-- from auth.users u, public.branches b where u.email = 'chapinero@turestaurante.com' and b.slug = 'chapinero';
