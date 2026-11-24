-- ════════════════════════════════════════════════════════════════════
--  TIENDA COMIDAS RÁPIDAS · ESQUEMA MULTISUCURSAL
--  Ejecutar en Supabase → SQL Editor (una sola vez, en orden).
--  Montos en pesos colombianos (enteros, sin decimales).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────── SEDES ───────────────
create table if not exists public.branches (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  city             text,
  address          text,
  phone            text,
  whatsapp         text,                       -- formato 57300XXXXXXX
  hours            text,                       -- "Lun–Dom 12:00 m – 11:00 p.m."
  open_time        time,
  close_time       time,
  delivery_fee     integer not null default 0,
  min_order        integer not null default 0,
  eta_minutes      integer not null default 35,
  delivery_enabled boolean not null default true,
  pickup_enabled   boolean not null default true,
  cash_enabled     boolean not null default true,  -- pago contraentrega
  is_open          boolean not null default true,  -- interruptor rápido abierto/cerrado
  is_active        boolean not null default true,  -- visible en el sitio
  sort             integer not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.branches add column if not exists open_time time;
alter table public.branches add column if not exists close_time time;
update public.branches
set open_time = coalesce(open_time, time '12:00'),
    close_time = coalesce(close_time, time '20:00');

-- ─────────────── CATEGORÍAS ───────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  emoji      text default '🍔',
  sort       integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────── PRODUCTOS (catálogo global) ───────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  description text,
  price       integer not null check (price >= 0),
  image_url   text,
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);

-- ─────────────── DISPONIBILIDAD / PRECIO POR SEDE ───────────────
-- Si no hay fila para (producto, sede) => disponible con precio base.
create table if not exists public.product_branches (
  product_id     uuid not null references public.products(id) on delete cascade,
  branch_id      uuid not null references public.branches(id) on delete cascade,
  is_available   boolean not null default true,
  price_override integer check (price_override is null or price_override >= 0),
  primary key (product_id, branch_id)
);

-- ─────────────── PEDIDOS ───────────────
create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  branch_id            uuid not null references public.branches(id),
  customer_name        text not null,
  customer_phone       text not null,
  customer_email       text,
  fulfillment          text not null check (fulfillment in ('delivery','pickup')),
  address              text,
  address_notes        text,
  notes                text,
  payment_method       text not null check (payment_method in ('wompi','cash')),
  payment_status       text not null default 'pending'
                       check (payment_status in ('pending','approved','declined','voided','error')),
  status               text not null default 'new'
                       check (status in ('new','confirmed','preparing','ready','on_the_way','delivered','cancelled')),
  subtotal             integer not null,
  delivery_fee         integer not null default 0,
  total                integer not null,
  wompi_transaction_id text,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists orders_branch_created_idx on public.orders(branch_id, created_at desc);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  unit_price integer not null,
  quantity   integer not null check (quantity > 0),
  line_total integer not null,
  notes      text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ─────────────── ADMINISTRADORES ───────────────
-- owner   = acceso total (todas las sedes, catálogo, sedes)
-- manager = solo pedidos y disponibilidad de SU sede
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'manager' check (role in ('owner','manager')),
  branch_id  uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────── updated_at automático ───────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ─────────────── Helpers de rol (security definer evita recursión RLS) ───────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.admin_branch() returns uuid
language sql stable security definer set search_path = public as $$
  select branch_id from public.admin_users where user_id = auth.uid();
$$;

create or replace function public.can_manage_branch(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner() or (public.is_admin() and public.admin_branch() = b);
$$;

-- ════════════════════════════ RLS ════════════════════════════
alter table public.branches         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_branches enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.admin_users      enable row level security;

-- Permisos básicos de tablas: RLS sigue controlando qué filas puede ver o modificar cada rol.
grant usage on schema public to anon, authenticated;

grant select on public.branches to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_branches to anon, authenticated;

grant select, insert, update, delete on public.branches to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_branches to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;

-- Lectura pública del catálogo
drop policy if exists "branches_public_read" on public.branches;
create policy "branches_public_read" on public.branches for select using (is_active or public.is_admin());
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (is_active or public.is_admin());
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (is_active or public.is_admin());
drop policy if exists "pb_public_read" on public.product_branches;
create policy "pb_public_read" on public.product_branches for select using (true);

-- Escritura de catálogo: owner
drop policy if exists "branches_owner_write" on public.branches;
create policy "branches_owner_write" on public.branches for all using (public.is_owner()) with check (public.is_owner());
-- Manager puede abrir/cerrar su propia sede
drop policy if exists "branches_manager_update" on public.branches;
create policy "branches_manager_update" on public.branches for update
  using (public.can_manage_branch(id)) with check (public.can_manage_branch(id));
drop policy if exists "categories_owner_write" on public.categories;
create policy "categories_owner_write" on public.categories for all using (public.is_owner()) with check (public.is_owner());
drop policy if exists "products_owner_write" on public.products;
create policy "products_owner_write" on public.products for all using (public.is_owner()) with check (public.is_owner());
drop policy if exists "pb_admin_write" on public.product_branches;
create policy "pb_admin_write" on public.product_branches for all
  using (public.can_manage_branch(branch_id)) with check (public.can_manage_branch(branch_id));

-- Pedidos: se CREAN solo desde el servidor (service role). Admins leen/actualizan su sede.
drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read" on public.orders for select using (public.can_manage_branch(branch_id));
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update
  using (public.can_manage_branch(branch_id)) with check (public.can_manage_branch(branch_id));
drop policy if exists "order_items_admin_read" on public.order_items;
create policy "order_items_admin_read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and public.can_manage_branch(o.branch_id)));

-- Admin users
drop policy if exists "admin_self_read" on public.admin_users;
create policy "admin_self_read" on public.admin_users for select using (user_id = auth.uid() or public.is_owner());
drop policy if exists "admin_owner_write" on public.admin_users;
create policy "admin_owner_write" on public.admin_users for all using (public.is_owner()) with check (public.is_owner());

-- ════════════════════════════ REALTIME ════════════════════════════
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

-- ════════════════════════════ STORAGE ════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 3145728, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

drop policy if exists "products_img_public_read" on storage.objects;
create policy "products_img_public_read" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "products_img_owner_insert" on storage.objects;
create policy "products_img_owner_insert" on storage.objects for insert with check (bucket_id = 'products' and public.is_owner());
drop policy if exists "products_img_owner_update" on storage.objects;
create policy "products_img_owner_update" on storage.objects for update using (bucket_id = 'products' and public.is_owner());
drop policy if exists "products_img_owner_delete" on storage.objects;
create policy "products_img_owner_delete" on storage.objects for delete using (bucket_id = 'products' and public.is_owner());
