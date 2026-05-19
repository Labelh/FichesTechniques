import type { Category, StorageZone } from '@/types';
import { GSTOCK_API_URL } from './consumablesService';

let categoriesCache: Map<string, Category> | null = null;
let storageZonesCache: Map<string, StorageZone> | null = null;

async function fetchApi<T>(endpoint: string): Promise<T> {
  const resp = await fetch(`${GSTOCK_API_URL}${endpoint}`);
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getCategories(): Promise<Map<string, Category>> {
  if (categoriesCache) return categoriesCache;

  try {
    const data = await fetchApi<Array<{ id: string; name: string; description?: string; created_at?: string }>>('/api/categories');
    const now = new Date();
    categoriesCache = new Map(data.map(cat => [cat.id, {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      createdAt: cat.created_at ? new Date(cat.created_at) : now,
      updatedAt: now,
    } as Category]));
    return categoriesCache;
  } catch {
    return new Map();
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.get(id) || null;
}

export async function getStorageZones(): Promise<Map<string, StorageZone>> {
  if (storageZonesCache) return storageZonesCache;

  try {
    const data = await fetchApi<Array<{ id: string; name: string; description?: string }>>('/api/storage-zones');
    storageZonesCache = new Map(data.map(zone => [zone.id, { id: zone.id, name: zone.name, description: zone.description } as StorageZone]));
    return storageZonesCache;
  } catch {
    return new Map();
  }
}

export async function getStorageZoneById(id: string): Promise<StorageZone | null> {
  const zones = await getStorageZones();
  return zones.get(id) || null;
}

export function invalidateCategoriesCache(): void {
  categoriesCache = null;
}

export function invalidateStorageZonesCache(): void {
  storageZonesCache = null;
}

export function invalidateAllCaches(): void {
  invalidateCategoriesCache();
  invalidateStorageZonesCache();
}
