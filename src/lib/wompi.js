// Integración Wompi (Colombia) — Web Checkout + verificación de eventos.
// Docs: https://docs.wompi.co
import { createHash } from 'node:crypto';
import { PUBLIC_WOMPI_PUBLIC_KEY, PUBLIC_SITE_URL } from 'astro:env/client';
import { WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET, WOMPI_ENV } from 'astro:env/server';

export const isWompiConfigured = Boolean(PUBLIC_WOMPI_PUBLIC_KEY && WOMPI_INTEGRITY_SECRET);

const API = WOMPI_ENV === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** Firma de integridad: SHA256(referencia + montoEnCentavos + moneda + secretoIntegridad) */
export function integritySignature(reference, amountInCents, currency = 'COP') {
  return sha256(`${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`);
}

/** URL del Web Checkout de Wompi (redirección). */
export function buildCheckoutUrl({ reference, amount, customer = {}, redirectPath }) {
  const amountInCents = Math.round(amount * 100);
  const params = new URLSearchParams({
    'public-key': PUBLIC_WOMPI_PUBLIC_KEY,
    currency: 'COP',
    'amount-in-cents': String(amountInCents),
    reference,
    'signature:integrity': integritySignature(reference, amountInCents),
    'redirect-url': new URL(redirectPath, PUBLIC_SITE_URL).toString(),
  });
  if (customer.email) params.set('customer-data:email', customer.email);
  if (customer.name) params.set('customer-data:full-name', customer.name);
  if (customer.phone) {
    params.set('customer-data:phone-number', customer.phone.replace(/\D/g, '').slice(-10));
    params.set('customer-data:phone-number-prefix', '+57');
  }
  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

/** Valida checksum de un evento webhook de Wompi. */
export function verifyEvent(event) {
  if (!WOMPI_EVENTS_SECRET || !event?.signature) return false;
  const { properties = [], checksum } = event.signature;
  const values = properties.map((path) => path.split('.').reduce((o, k) => o?.[k], event.data)).join('');
  const expected = sha256(`${values}${event.timestamp}${WOMPI_EVENTS_SECRET}`);
  return expected.toLowerCase() === String(checksum).toLowerCase();
}

/** Consulta una transacción (endpoint público de Wompi). */
export async function fetchTransaction(id) {
  const res = await fetch(`${API}/transactions/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

/** Mapea estado Wompi -> payment_status interno. */
export function mapWompiStatus(s) {
  return { APPROVED: 'approved', DECLINED: 'declined', VOIDED: 'voided', ERROR: 'error', PENDING: 'pending' }[s] ?? 'pending';
}
