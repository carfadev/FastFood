// Lógica de pedidos (solo servidor).
import { randomBytes } from 'node:crypto';
import { supabaseService } from './supabase.js';
import { buildCheckoutUrl, fetchTransaction, mapWompiStatus } from './wompi.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newReference() {
  const rnd = [...randomBytes(6)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `PED-${Date.now().toString(36).toUpperCase().slice(-5)}-${rnd}`;
}

/** Las referencias de reintento de pago llevan sufijo "_N". */
export const baseReference = (ref) => String(ref).replace(/_\d+$/, '');

const PUBLIC_FIELDS =
  'reference,status,payment_status,payment_method,fulfillment,customer_name,address,subtotal,delivery_fee,total,created_at,' +
  'branch:branches(name,slug,phone,whatsapp,address,eta_minutes),items:order_items(name,quantity,unit_price,line_total,notes)';

export async function getOrderPublic(reference) {
  const { data } = await supabaseService().from('orders').select(PUBLIC_FIELDS).eq('reference', baseReference(reference)).maybeSingle();
  return data;
}

/** Aplica el resultado de una transacción Wompi al pedido (idempotente). */
export async function applyTransaction(tx) {
  if (!tx?.reference) return null;
  const db = supabaseService();
  const reference = baseReference(tx.reference);
  const { data: order } = await db.from('orders').select('id,total,payment_status').eq('reference', reference).maybeSingle();
  if (!order) return null;
  if (order.payment_status === 'approved') return order; // nunca degradar un pago aprobado

  const status = mapWompiStatus(tx.status);
  // Seguridad: el monto pagado debe coincidir con el total del pedido
  if (status === 'approved' && Number(tx.amount_in_cents) !== order.total * 100) {
    await db.from('orders').update({ payment_status: 'error', wompi_transaction_id: tx.id }).eq('id', order.id);
    return null;
  }
  const patch = { payment_status: status, wompi_transaction_id: tx.id };
  if (status === 'approved') { patch.paid_at = new Date().toISOString(); patch.status = 'confirmed'; }
  await db.from('orders').update(patch).eq('id', order.id).neq('payment_status', 'approved');
  return { ...order, ...patch };
}

export async function verifyTransactionId(id) {
  const tx = await fetchTransaction(id);
  return tx ? applyTransaction(tx) : null;
}

export function checkoutUrlFor(order, attempt = 0) {
  const reference = attempt ? `${order.reference}_${attempt}` : order.reference;
  return buildCheckoutUrl({
    reference,
    amount: order.total,
    customer: { name: order.customer_name, phone: order.customer_phone, email: order.customer_email },
    redirectPath: `/pedido/${order.reference}`,
  });
}
