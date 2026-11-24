// Carrito en el navegador (localStorage). Sin cuentas, sin fricción.
const KEY = 'ff_cart_v1';
const CUSTOMER_KEY = 'ff_customer_v1';
const EVT = 'cart:change';

const empty = () => ({ branch: null, items: [] });

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? empty(); } catch { return empty(); }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: state }));
  return state;
}

export const getCart = read;

export function totals(state = read()) {
  const count = state.items.reduce((a, i) => a + i.qty, 0);
  const subtotal = state.items.reduce((a, i) => a + i.qty * i.price, 0);
  return { count, subtotal };
}

/** Fija la sede activa. Si cambia de sede, el carrito se vacía (precios/disponibilidad difieren). */
export function setBranch(branch) {
  const s = read();
  const changed = s.branch && s.branch.id !== branch.id;
  return write({ branch, items: changed ? [] : s.items });
}

export function addItem(product, qty = 1) {
  const s = read();
  const found = s.items.find((i) => i.id === product.id);
  if (found) found.qty = Math.min(found.qty + qty, 50);
  else s.items.push({ id: product.id, name: product.name, price: product.price, image_url: product.image_url ?? null, emoji: product.emoji ?? '🍔', qty, notes: '' });
  return write(s);
}

export function setQty(id, qty) {
  const s = read();
  s.items = s.items.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 50) } : i)).filter((i) => i.qty > 0);
  return write(s);
}

export function setNotes(id, notes) {
  const s = read();
  const it = s.items.find((i) => i.id === id);
  if (it) it.notes = String(notes).slice(0, 140);
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

export function clearItems() {
  const s = read();
  return write({ ...s, items: [] });
}

export function onCartChange(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVT, h);
  // sincroniza entre pestañas
  window.addEventListener('storage', (e) => e.key === KEY && fn(read()));
  fn(read());
  return () => window.removeEventListener(EVT, h);
}

// Datos del cliente recordados para comprar en 1 clic la próxima vez.
export const getCustomer = () => { try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) ?? {}; } catch { return {}; } };
export const saveCustomer = (c) => { try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)); } catch {} };

export const money = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);

export function toast(msg, icon = '✓') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.querySelector('[data-msg]').textContent = msg;
  el.querySelector('[data-icon]').textContent = icon;
  el.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'), 1800);
}
