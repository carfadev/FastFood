// Lecturas del catálogo por sede (servidor).
import { supabasePublic } from './supabase.js';

export async function getBranches() {
  const { data, error } = await supabasePublic()
    .from('branches').select('*').eq('is_active', true).order('sort').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getBranchBySlug(slug) {
  const { data, error } = await supabasePublic()
    .from('branches').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data;
}

/** Menú de una sede: productos activos, con precio/disponibilidad propios de la sede. */
export async function getBranchMenu(branchId) {
  const db = supabasePublic();
  const [cats, prods, overrides] = await Promise.all([
    db.from('categories').select('id,name,slug,emoji,sort').eq('is_active', true).order('sort'),
    db.from('products').select('id,category_id,name,description,price,image_url,is_featured,sort').eq('is_active', true).order('sort'),
    db.from('product_branches').select('product_id,is_available,price_override').eq('branch_id', branchId),
  ]);
  for (const r of [cats, prods, overrides]) if (r.error) throw r.error;

  const ov = new Map(overrides.data.map((o) => [o.product_id, o]));
  const products = prods.data
    .map((p) => {
      const o = ov.get(p.id);
      return { ...p, price: o?.price_override ?? p.price, available: o ? o.is_available : true };
    })
    .filter((p) => p.available);

  const categories = cats.data
    .map((c) => ({ ...c, products: products.filter((p) => p.category_id === c.id) }))
    .filter((c) => c.products.length);

  return { categories, featured: products.filter((p) => p.is_featured) };
}
