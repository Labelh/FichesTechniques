/**
 * Client du gStock Shadow (API REST hébergée sur le VPS).
 * Remplace l'ancien gStock Supabase pour la lecture des consommables,
 * catégories et zones de stockage. Lectures publiques (aucun token requis).
 *
 *   GET {API}/api/products        → consommables (deleted_at IS NULL côté serveur)
 *   GET {API}/api/categories      → catégories
 *   GET {API}/api/storage-zones   → zones de stockage
 *   {API}/uploads/{chemin}        → photos produit
 */

const GSTOCK_API = (import.meta.env.VITE_GSTOCK_API || 'https://gstock.shadow.ajust82.fr').replace(/\/$/, '');

export function gstockOrigin(): string {
  return GSTOCK_API;
}

/** GET JSON sur l'API gStock. Lève une erreur si la réponse n'est pas 2xx. */
export async function gstockGet<T>(path: string): Promise<T> {
  const res = await fetch(`${GSTOCK_API}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`gStock ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Construit l'URL absolue d'une photo produit.
 * - chemin de stockage (ex. "products/abc") → {API}/uploads/products/abc
 * - base64 (data:) ou URL complète → renvoyé tel quel
 */
export function gstockUploadUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) return pathOrUrl;
  const clean = pathOrUrl.replace(/^\//, '');
  return `${GSTOCK_API}/uploads/${clean}`;
}
