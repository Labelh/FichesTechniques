import { gstockGet } from '@/lib/gstock';
import type { Consumable } from '@/types';

/**
 * Service de lecture des consommables depuis le gStock Shadow (API REST).
 * Remplace l'ancien gStock Supabase. Endpoint : GET /api/products
 * (le serveur filtre déjà deleted_at IS NULL).
 */

/** Mappe un produit gStock vers le type Consumable de l'app FT. */
function mapProduct(p: any): Consumable {
  return {
    id: p.id,
    designation: p.designation,
    description: p.description ?? undefined,
    category: p.category ?? undefined, // nom de catégorie (joint côté API)
    unit: p.unit ?? undefined,
    reference: p.reference ?? undefined,
    photo: p.photo ?? undefined, // chemin "products/..." ou base64 — résolu à l'affichage
    storage_zone_id: p.storage_zone_id ?? undefined,
    shelf: p.shelf ?? undefined,
    position: p.position ?? undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

function byDesignation(a: Consumable, b: Consumable): number {
  return (a.designation || '').localeCompare(b.designation || '', 'fr', { sensitivity: 'base' });
}

/**
 * Récupère tous les consommables.
 */
export async function fetchConsumables(): Promise<Consumable[]> {
  const data = await gstockGet<any[]>('/api/products');
  return (data || []).map(mapProduct).sort(byDesignation);
}

/**
 * Récupère un consommable par son ID.
 */
export async function fetchConsumableById(id: string): Promise<Consumable | null> {
  try {
    const data = await gstockGet<any>(`/api/products/${id}`);
    return data ? mapProduct(data) : null;
  } catch (error) {
    console.error('Error in fetchConsumableById:', error);
    return null;
  }
}

/**
 * Recherche de consommables par terme (désignation, description, référence).
 * L'API gStock n'expose pas de recherche → filtrage côté client.
 */
export async function searchConsumables(query: string): Promise<Consumable[]> {
  const q = query.trim().toLowerCase();
  const all = await fetchConsumables();
  if (!q) return all;
  return all.filter((c) =>
    (c.designation || '').toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q) ||
    (c.reference || '').toLowerCase().includes(q)
  );
}

/**
 * Filtre les consommables par catégorie (nom).
 */
export async function fetchConsumablesByCategory(category: string): Promise<Consumable[]> {
  const all = await fetchConsumables();
  return all.filter((c) => c.category === category);
}
