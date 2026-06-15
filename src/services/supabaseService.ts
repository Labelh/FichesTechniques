import { gstockGet } from '@/lib/gstock';
import type { Category, StorageZone } from '@/types';

/**
 * Lecture des catégories et zones de stockage depuis le gStock Shadow.
 * (Nom de fichier conservé pour limiter le rayon de changement ;
 *  la source est désormais l'API gStock, plus Supabase.)
 */

let categoriesCache: Map<string, Category> | null = null;
let storageZonesCache: Map<string, StorageZone> | null = null;

/**
 * Récupère toutes les catégories depuis gStock.
 */
export async function getCategories(): Promise<Map<string, Category>> {
  if (categoriesCache) {
    return categoriesCache;
  }

  try {
    const data = await gstockGet<any[]>('/api/categories');
    categoriesCache = new Map((data || []).map((cat) => [cat.id, cat as Category]));
    return categoriesCache;
  } catch (error) {
    // gStock indisponible → map vide sans bloquer l'app
    console.warn('Categories indisponibles (gStock):', error);
    return new Map();
  }
}

/**
 * Récupère une catégorie par son ID.
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.get(id) || null;
}

/**
 * Récupère toutes les zones de stockage depuis gStock.
 */
export async function getStorageZones(): Promise<Map<string, StorageZone>> {
  if (storageZonesCache) {
    return storageZonesCache;
  }

  try {
    const data = await gstockGet<any[]>('/api/storage-zones');
    storageZonesCache = new Map((data || []).map((zone) => [zone.id, zone as StorageZone]));
    return storageZonesCache;
  } catch (error) {
    console.warn('Zones de stockage indisponibles (gStock):', error);
    return new Map();
  }
}

/**
 * Récupère une zone de stockage par son ID.
 */
export async function getStorageZoneById(id: string): Promise<StorageZone | null> {
  const zones = await getStorageZones();
  return zones.get(id) || null;
}

/**
 * Invalide le cache des catégories
 */
export function invalidateCategoriesCache(): void {
  categoriesCache = null;
}

/**
 * Invalide le cache des zones de stockage
 */
export function invalidateStorageZonesCache(): void {
  storageZonesCache = null;
}

/**
 * Invalide tous les caches
 */
export function invalidateAllCaches(): void {
  invalidateCategoriesCache();
  invalidateStorageZonesCache();
}
