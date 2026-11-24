# 🔥 Tienda de comidas rápidas · Multisede

Astro 7 (SSR) · Tailwind CSS 4 · JavaScript · Supabase (DB + Auth + Storage + Realtime) · Wompi.

## Puesta en marcha (5 pasos)

```bash
npm install
cp .env.example .env        # coloca tus llaves
npm run dev                 # http://localhost:4321
```

1. **Supabase → SQL Editor:** ejecuta `supabase/schema.sql` y luego (opcional) `supabase/seed.sql`.
2. **Primer administrador:** Authentication → Users → *Add user*, y luego ejecuta en SQL:
   ```sql
   insert into public.admin_users (user_id, full_name, role)
   select id, 'Administrador', 'owner' from auth.users where email = 'tu@correo.com';
   ```
3. **Wompi → Desarrolladores:** copia la llave pública, el secreto de *integridad* y el de *eventos* al `.env`.
   En **URL de eventos** coloca `https://TU-DOMINIO/api/wompi/webhook`.
4. Ajusta `PUBLIC_SITE_URL` con tu dominio real (Wompi redirige allí después del pago).
5. `npm run build && npm start` (Node) — o cambia el adapter en `astro.config.mjs` para Vercel/Netlify.

> Las variables `PUBLIC_*` se incrustan al compilar: si las cambias, vuelve a ejecutar `npm run build`.

## Flujo del cliente (sin cuenta)

Inicio → elige sede → toca **+ Agregar** → **Ir a pagar** → nombre, celular, dirección → Wompi o contraentrega → página de seguimiento en vivo.
Los datos del cliente se recuerdan en el navegador para que el siguiente pedido sea de un clic.

## Panel `/admin`

| Rol | Puede |
|---|---|
| `owner` | Todo: todas las sedes, productos, categorías, imágenes, sedes |
| `manager` (con `branch_id`) | Pedidos de su sede, abrir/cerrar sede, disponibilidad y precio por sede |

- **Pedidos:** tablero tipo cocina (Nuevos → En cocina → Listos/En camino → Cerrados), en tiempo real con sonido.
- **Productos:** catálogo global + interruptor de disponibilidad y precio especial **por sede**. Imágenes al bucket `products`.

## Arquitectura multisede

```
branches ─┬─< product_branches >─ products >─ categories
          └─< orders ─< order_items
admin_users (owner | manager→branch)
```
- Si un producto no tiene fila en `product_branches`, está disponible con el precio base.
- Los pedidos solo se crean en el servidor (`/api/orders`) con *service role*: **los precios siempre se recalculan en el servidor**.
- RLS: el público solo lee catálogo; los managers solo ven pedidos de su sede.

## Wompi

- `src/lib/wompi.js`: firma de integridad `SHA256(referencia + centavos + COP + secreto)`, URL del Web Checkout, validación del checksum de eventos.
- Confirmación doble: **webhook** (`/api/wompi/webhook`) + verificación al volver del checkout (`/pedido/REF?id=TX`).
- Se valida que el monto pagado coincida con el total del pedido. Un pago aprobado nunca se degrada.
- Reintento de pago desde la página del pedido (usa referencia `REF_N`).

## Cambiar colores / marca

Todo en `src/styles/global.css` → bloque `:root` (hay 3 paletas alternativas comentadas). Nombre de la marca: `PUBLIC_BRAND_NAME`.

## Estructura

```
src/
  lib/          supabase.js · supabase-browser.js · catalog.js · orders.js · wompi.js · format.js
  scripts/      cart.js (carrito localStorage) · admin.js
  components/   Header · CartDrawer · ProductCard · Footer
  layouts/      Layout · AdminLayout
  middleware.js protección de /admin
  pages/
    index.astro · sede/[slug].astro · checkout.astro · pedido/[ref].astro
    api/orders.js · api/orders/[ref].js · api/wompi/webhook.js
    admin/ login · index (pedidos) · productos · categorias · sedes
supabase/ schema.sql · seed.sql
```

## Siguientes mejoras sugeridas
Adiciones/modificadores por producto, cupones, zonas de domicilio con tarifa por barrio, notificación por WhatsApp/correo al confirmar, llaves Wompi por sede (si cada sede tiene su cuenta).
