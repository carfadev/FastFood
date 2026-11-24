// GET /api/orders/:ref        → estado público del pedido (para seguimiento)
// GET /api/orders/:ref?tx=ID  → además verifica la transacción con Wompi
// POST /api/orders/:ref       → genera un nuevo link de pago (reintento)
import { getOrderPublic, verifyTransactionId, checkoutUrlFor } from '../../../lib/orders.js';
import { supabaseService } from '../../../lib/supabase.js';

export const prerender = false;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET({ params, url }) {
  const tx = url.searchParams.get('tx');
  if (tx) await verifyTransactionId(tx).catch(() => null);
  const order = await getOrderPublic(params.ref).catch(() => null);
  return order ? json(order) : json({ error: 'Pedido no encontrado' }, 404);
}

export async function POST({ params }) {
  const db = supabaseService();
  const { data: order } = await db.from('orders')
    .select('id,reference,total,payment_method,payment_status,status,customer_name,customer_phone,customer_email')
    .eq('reference', params.ref).maybeSingle();
  if (!order) return json({ error: 'Pedido no encontrado' }, 404);
  if (order.payment_method !== 'wompi' || order.payment_status === 'approved' || order.status === 'cancelled')
    return json({ error: 'Este pedido no requiere pago.' }, 409);
  return json({ checkoutUrl: checkoutUrlFor(order, Date.now() % 100000) });
}
