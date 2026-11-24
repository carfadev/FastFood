const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const money = (n) => cop.format(Number(n) || 0);

export const ORDER_STATUS = {
  new:        { label: 'Recibido',       tone: 'accent',  icon: '🧾' },
  confirmed:  { label: 'Confirmado',     tone: 'primary', icon: '✅' },
  preparing:  { label: 'En preparación', tone: 'primary', icon: '👨‍🍳' },
  ready:      { label: 'Listo',          tone: 'success', icon: '🛎️' },
  on_the_way: { label: 'En camino',      tone: 'success', icon: '🛵' },
  delivered:  { label: 'Entregado',      tone: 'success', icon: '🎉' },
  cancelled:  { label: 'Cancelado',      tone: 'danger',  icon: '✖️' },
};

export const PAYMENT_STATUS = {
  pending:  { label: 'Pago pendiente', tone: 'warning' },
  approved: { label: 'Pagado',         tone: 'success' },
  declined: { label: 'Rechazado',      tone: 'danger' },
  voided:   { label: 'Anulado',        tone: 'danger' },
  error:    { label: 'Error en pago',  tone: 'danger' },
};

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Clases completas (Tailwind necesita verlas literalmente)
export const TONE = {
  primary: 'bg-primary/15 text-primary',
  accent:  'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger:  'bg-danger/15 text-danger',
};
