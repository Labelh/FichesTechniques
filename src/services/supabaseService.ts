import { supabase } from '@/lib/supabase';

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface StorageZone {
  id: string;
  name: string;
  description?: string;
  location?: string;
  created_at?: string;
}

/**
 * Cache pour les catégories et zones de stockage
 */
let categoriesCache: Map<string, Category> | null = null;
let storageZonesCache: Map<string, StorageZone> | null = null;

/**
 * Récupère toutes les catégories depuis Supabase
 */
export async function getCategories(): Promise<Map<string, Category>> {
  if (categoriesCache) {
    return categoriesCache;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.error('Error fetching categories from Supabase:', error);
      return new Map();
    }

    categoriesCache = new Map(
      (data || []).map(cat => [cat.id, cat])
    );

    return categoriesCache;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Map();
  }
}

/**
 * Récupère une catégorie par son ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.get(id) || null;
}

/**
 * Récupère toutes les zones de stockage depuis Supabase
 */
export async function getStorageZones(): Promise<Map<string, StorageZone>> {
  if (storageZonesCache) {
    return storageZonesCache;
  }

  try {
    const { data, error } = await supabase
      .from('storage_zones')
      .select('*');

    if (error) {
      // La table storage_zones n'existe peut-être pas encore
      console.warn('Storage zones table not found or error:', error);
      return new Map();
    }

    storageZonesCache = new Map(
      (data || []).map(zone => [zone.id, zone])
    );

    return storageZonesCache;
  } catch (error) {
    console.warn('Error fetching storage zones:', error);
    return new Map();
  }
}

/**
 * Récupère une zone de stockage par son ID
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
