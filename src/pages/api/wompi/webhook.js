// POST /api/wompi/webhook — Configura esta URL en Wompi → Desarrolladores → "URL de Eventos":
//   https://TU-DOMINIO/api/wompi/webhook
import { verifyEvent } from '../../../lib/wompi.js';
import { applyTransaction } from '../../../lib/orders.js';

export const prerender = false;

export async function POST({ request }) {
  let event;
  try { event = await request.json(); } catch { return new Response('bad request', { status: 400 }); }

  if (!verifyEvent(event)) return new Response('invalid signature', { status: 401 });

  if (event.event === 'transaction.updated' && event.data?.transaction) {
    try { await applyTransaction(event.data.transaction); }
    catch (e) { console.error('[wompi webhook]', e); return new Response('error', { status: 500 }); }
  }
  return new Response('ok', { status: 200 });
}
