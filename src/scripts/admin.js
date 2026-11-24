// Utilidades compartidas del panel admin (navegador).
export { sb } from '../lib/supabase-browser.js';

export const admin = () => window.__ADMIN__;
export const isOwner = () => window.__ADMIN__?.role === 'owner';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const timeAgo = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

export function toast(msg, ok = true) {
  const el = document.getElementById('toast');
  el.querySelector('[data-msg]').textContent = msg;
  el.querySelector('[data-icon]').textContent = ok ? '✓' : '⚠';
  el.classList.toggle('!bg-danger', !ok); el.classList.toggle('!text-white', !ok);
  el.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'), 2400);
}

/** Lanza error legible si una respuesta de Supabase falló. */
export function check({ data, error }) {
  if (error) { toast(error.message, false); throw error; }
  return data;
}

/** Lee un <form> respetando tipos: checkbox → boolean, data-num → número, vacío → null. */
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.type === 'file') continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.dataset.num !== undefined) out[el.name] = el.value === '' ? null : Number(el.value);
    else out[el.name] = el.value.trim() === '' ? null : el.value.trim();
  }
  return out;
}

export function fillForm(form, obj = {}) {
  for (const el of form.elements) {
    if (!el.name || el.type === 'file') continue;
    const v = obj[el.name];
    if (el.type === 'checkbox') el.checked = el.dataset.default === 'true' ? v !== false : !!v;
    else el.value = v ?? el.dataset.default ?? '';
  }
}

/** Sonido corto para nuevos pedidos (sin archivos). */
export function ding() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.25);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch {}
}
