import type { Consumable } from '@/types';

const GSTOCK_API_URL = import.meta.env.VITE_GSTOCK_API_URL || 'https://gstock.shadow.ajust82.fr';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const resp = await fetch(`${GSTOCK_API_URL}${endpoint}`);
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${resp.statusText}`);
  }
  return resp.json();
}

interface GStockProduct {
  id: string;
  reference: string;
  designation: string;
  category_id: string;
  storage_zone_id: string;
  shelf: number | string;
  position: number | string;
  location: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_id: string;
  unit_price: number;
  photo: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category: string;
  unit: string;
  storage_zone: string;
}

function toConsumable(product: GStockProduct): Consumable {
  let photoUrl: string | undefined;
  if (product.photo) {
    if (product.photo.startsWith('http') || product.photo.startsWith('data:')) {
      photoUrl = product.photo;
    } else {
      photoUrl = `${GSTOCK_API_URL}/uploads/${product.photo}`;
    }
  }

  return {
    id: product.id,
    designation: product.designation,
    description: undefined,
    category: product.category,
    quantity: product.current_stock,
    unit: product.unit,
    price: product.unit_price,
    reference: product.reference,
    photo: photoUrl,
    image_url: photoUrl,
    photo_url: photoUrl,
    created_at: product.created_at,
    updated_at: product.updated_at,
    storage_zone_id: product.storage_zone_id,
    shelf: String(product.shelf || ''),
    position: String(product.position || ''),
  };
}

export async function fetchConsumables(): Promise<Consumable[]> {
  const products = await fetchApi<GStockProduct[]>('/api/products');
  return products
    .filter(p => !p.deleted_at)
    .map(toConsumable)
    .sort((a, b) => (a.designation || '').localeCompare(b.designation || ''));
}

export async function fetchConsumableById(id: string): Promise<Consumable | null> {
  try {
    const all = await fetchConsumables();
    return all.find(c => c.id === id) || null;
  } catch {
    return null;
  }
}

export async function searchConsumables(query: string): Promise<Consumable[]> {
  const all = await fetchConsumables();
  const q = query.toLowerCase();
  return all.filter(c =>
    (c.designation || '').toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q) ||
    (c.reference || '').toLowerCase().includes(q)
  );
}

export async function fetchConsumablesByCategory(category: string): Promise<Consumable[]> {
  const all = await fetchConsumables();
  return all.filter(c => c.category === category);
}

export { GSTOCK_API_URL };
