// POST /api/orders — crea un pedido como invitado. Los precios SIEMPRE se calculan en el servidor.
import { supabaseService } from '../../lib/supabase.js';
import { isWompiConfigured } from '../../lib/wompi.js';
import { newReference, checkoutUrlFor } from '../../lib/orders.js';
import { isBranchWithinSchedule } from '../../lib/schedule.js';

export const prerender = false;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;

export async function POST({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida' }, 400); }

  const { branch_id, items = [], customer = {}, fulfillment, payment_method } = body;
  const name = clean(customer.name, 80);
  const phone = clean(customer.phone, 20);
  const email = clean(customer.email, 120);
  const address = clean(body.address, 200);

  if (!branch_id || !Array.isArray(items) || !items.length) return json({ error: 'El carrito está vacío.' }, 400);
  if (items.length > 40) return json({ error: 'Demasiados productos.' }, 400);
  if (!name || !phone || (phone.replace(/\D/g, '').length < 7)) return json({ error: 'Nombre y celular son obligatorios.' }, 400);
  if (!['delivery', 'pickup'].includes(fulfillment)) return json({ error: 'Tipo de entrega inválido.' }, 400);
  if (fulfillment === 'delivery' && !address) return json({ error: 'La dirección es obligatoria.' }, 400);
  if (!['wompi', 'cash'].includes(payment_method)) return json({ error: 'Método de pago inválido.' }, 400);
  if (payment_method === 'wompi' && !isWompiConfigured) return json({ error: 'El pago en línea no está disponible.' }, 400);

  let db;
  try { db = supabaseService(); } catch (e) { return json({ error: 'Servidor sin configurar.' }, 500); }

  // Sede
  const { data: branch } = await db.from('branches').select('*').eq('id', branch_id).eq('is_active', true).maybeSingle();
  if (!branch) return json({ error: 'Sede no encontrada.' }, 404);
  if (!branch.is_open || !isBranchWithinSchedule(branch)) return json({ error: 'La sede está fuera de horario en este momento.' }, 409);
  if (fulfillment === 'delivery' && !branch.delivery_enabled) return json({ error: 'Esta sede no tiene domicilio.' }, 409);
  if (fulfillment === 'pickup' && !branch.pickup_enabled) return json({ error: 'Esta sede no permite recoger.' }, 409);
  if (payment_method === 'cash' && !branch.cash_enabled) return json({ error: 'Esta sede no acepta contraentrega.' }, 409);

  // Productos + precios por sede
  const ids = [...new Set(items.map((i) => String(i.id)))];
  const [{ data: products }, { data: overrides }] = await Promise.all([
    db.from('products').select('id,name,price,is_active').in('id', ids),
    db.from('product_branches').select('product_id,is_available,price_override').eq('branch_id', branch.id).in('product_id', ids),
  ]);
  const ov = new Map((overrides ?? []).map((o) => [o.product_id, o]));
  const lines = [];
  for (const it of items) {
    const p = products?.find((x) => x.id === it.id);
    const o = ov.get(it.id);
    const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 0));
    if (!p || !p.is_active || (o && !o.is_available)) return json({ error: `"${p?.name ?? 'Un producto'}" ya no está disponible.` }, 409);
    const unit = o?.price_override ?? p.price;
    lines.push({ product_id: p.id, name: p.name, unit_price: unit, quantity: qty, line_total: unit * qty, notes: clean(it.notes, 140) });
  }

  const subtotal = lines.reduce((a, l) => a + l.line_total, 0);
  if (subtotal < (branch.min_order || 0)) return json({ error: `El pedido mínimo es de $${branch.min_order.toLocaleString('es-CO')}.` }, 409);
  const delivery_fee = fulfillment === 'delivery' ? branch.delivery_fee || 0 : 0;
  const total = subtotal + delivery_fee;

  const order = {
    reference: newReference(),
    branch_id: branch.id,
    customer_name: name, customer_phone: phone, customer_email: email,
    fulfillment, address: fulfillment === 'delivery' ? address : null,
    address_notes: fulfillment === 'delivery' ? clean(body.address_notes, 200) : null,
    notes: clean(body.notes, 300),
    payment_method, subtotal, delivery_fee, total,
  };

  const { data: created, error } = await db.from('orders').insert(order).select('id,reference').single();
  if (error) { console.error(error); return json({ error: 'No pudimos registrar el pedido.' }, 500); }

  const { error: itemsErr } = await db.from('order_items').insert(lines.map((l) => ({ ...l, order_id: created.id })));
  if (itemsErr) {
    console.error(itemsErr);
    await db.from('orders').delete().eq('id', created.id);
    return json({ error: 'No pudimos registrar el pedido.' }, 500);
  }

  return json({
    reference: created.reference,
    checkoutUrl: payment_method === 'wompi' ? checkoutUrlFor(order) : null,
  }, 201);
}
