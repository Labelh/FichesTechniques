/**
 * Service d'hébergement d'images via le Référentiel Shadow (store du VPS).
 *
 * Remplace ImgBB. Le store est adressé par référence article.
 *   - Upload : POST {ORIGIN}/referentiel/upload
 *       en-tête  : X-Upload-Token: <token>
 *       corps    : multipart/form-data → file (binaire), ref (réf article),
 *                  kind=cover (uniquement pour la couverture), name (optionnel)
 *       réponse  : { ok, ref, name, url } — url RELATIVE (/referentiel/articles/{ref}/{nom})
 *   - Lecture : GET {ORIGIN}/referentiel/articles/{ref}/{fichier}?w=NNN (CORS ouvert)
 *
 * L'URL absolue à stocker = ORIGIN + url.
 */

const REFERENTIEL_ORIGIN = (import.meta.env.VITE_REFERENTIEL_ORIGIN || 'https://shadow.ajust82.fr').replace(/\/$/, '');
const UPLOAD_TOKEN = import.meta.env.VITE_REFERENTIEL_UPLOAD_TOKEN || '';

/**
 * Assainit une référence article de la même façon que le serveur
 * ([^A-Za-z0-9._-] → _). À appliquer si on reconstruit une URL de lecture
 * côté front à partir d'une référence.
 */
export function sanitizeRef(ref: string): string {
  return (ref || '').replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Construit une URL de lecture absolue vers le référentiel.
 * @param width largeur de redimensionnement optionnelle (param `w`)
 */
export function referentielImageUrl(ref: string, filename: string, width?: number): string {
  const base = `${REFERENTIEL_ORIGIN}/referentiel/articles/${sanitizeRef(ref)}/${filename}`;
  return width ? `${base}?w=${width}` : base;
}

/**
 * Compresse une image avant l'upload de manière progressive
 * Réduit automatiquement la qualité jusqu'à atteindre la taille cible
 */
async function compressImage(file: File, maxSizeMB: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Limiter la dimension maximale à 1920px
      const maxDimension = 1920;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Compression progressive pour atteindre la taille cible
      const targetSize = maxSizeMB * 1024 * 1024;
      let blob: Blob | null = null;

      const tryCompress = (q: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob(
            (b) => res(b),
            'image/jpeg',
            q
          );
        });
      };

      // Essayer différentes qualités jusqu'à atteindre la taille cible
      for (let q = 0.9; q >= 0.5; q -= 0.1) {
        blob = await tryCompress(q);
        if (blob && blob.size <= targetSize) {
          break;
        }
      }

      URL.revokeObjectURL(url);

      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not compress image'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

interface ReferentielUploadResponse {
  ok: boolean;
  ref: string;
  name: string;
  url: string; // relative : /referentiel/articles/{ref}/{nom}
}

/**
 * Upload une image dans le Référentiel Shadow et retourne l'URL absolue à stocker.
 *
 * @param file  fichier image
 * @param ref   référence de l'article (champ `reference` de la procédure)
 * @param kind  'cover' pour la couverture (range en cover.{ext}) ; sinon laisser vide
 */
export async function uploadImageToHost(file: File, ref: string, kind?: 'cover'): Promise<string> {
  if (!ref || !ref.trim()) {
    throw new Error("Référence article manquante : renseigne la référence avant d'ajouter des images.");
  }

  // Vérifier la taille (max 15 MB)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image trop volumineuse (max 15 MB)');
  }

  // Compresser au-delà de 1 MB
  let imageToUpload: File | Blob = file;
  if (file.size > 1 * 1024 * 1024) {
    imageToUpload = await compressImage(file, 1.5);
  }

  const formData = new FormData();
  formData.append('file', imageToUpload, file.name);
  formData.append('ref', ref.trim());
  formData.append('name', file.name);
  if (kind === 'cover') {
    formData.append('kind', 'cover');
  }

  const headers: Record<string, string> = {};
  if (UPLOAD_TOKEN) {
    headers['X-Upload-Token'] = UPLOAD_TOKEN;
  }

  const response = await fetch(`${REFERENTIEL_ORIGIN}/referentiel/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Upload échoué: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`);
  }

  const data: ReferentielUploadResponse = await response.json();
  if (!data || !data.ok || !data.url) {
    throw new Error('Upload échoué: réponse invalide du référentiel');
  }

  // url renvoyée relative → préfixer par l'origine
  return data.url.startsWith('http') ? data.url : `${REFERENTIEL_ORIGIN}${data.url}`;
}

/**
 * Vérifie si une URL est valide
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
