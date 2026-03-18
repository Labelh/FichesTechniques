import type { AnnotatedImage, Annotation } from '../types';
import { AnnotationType } from '../types';

/**
 * Convertir hex en rgba avec opacité
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Dessine une annotation sur un contexte canvas
 */
function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  if (!ann.points || ann.points.length === 0) return;

  const opacity = (ann as any).opacity !== undefined ? (ann as any).opacity : 1;
  const colorWithOpacity = ann.color.startsWith('#') ? hexToRgba(ann.color, opacity) : ann.color;

  ctx.strokeStyle = colorWithOpacity;
  ctx.fillStyle = colorWithOpacity;
  ctx.lineWidth = ann.strokeWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pts = ann.points;

  switch (ann.type) {
    case AnnotationType.TRAJECTORY:
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach((p, i) => i > 0 && ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      break;

    case AnnotationType.LINE:
      if (pts.length === 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      }
      break;

    case AnnotationType.ARROW:
      if (pts.length === 2) {
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        const headLen = 15;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pts[1].x, pts[1].y);
        ctx.lineTo(
          pts[1].x - headLen * Math.cos(angle - Math.PI / 6),
          pts[1].y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pts[1].x, pts[1].y);
        ctx.lineTo(
          pts[1].x - headLen * Math.cos(angle + Math.PI / 6),
          pts[1].y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
      break;

    case AnnotationType.CIRCLE:
      if (pts.length === 2) {
        const radius = Math.sqrt(
          Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2)
        );
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;

    case AnnotationType.RECTANGLE:
      if (pts.length === 2) {
        ctx.strokeRect(pts[0].x, pts[0].y, pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }
      break;

    case AnnotationType.TEXT:
      if (pts.length > 0 && ann.text) {
        ctx.font = '20px Arial';
        ctx.fillText(ann.text, pts[0].x, pts[0].y);
      }
      break;
  }
}

/**
 * Rend une image avec ses annotations et retourne une URL blob
 */
export async function renderAnnotatedImage(annotatedImage: AnnotatedImage): Promise<string> {
  // Si pas d'annotations, retourner l'URL originale
  if (!annotatedImage.annotations || annotatedImage.annotations.length === 0) {
    return annotatedImage.image.url || '';
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Créer un canvas aux dimensions de l'image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Dessiner l'image de base
        ctx.drawImage(img, 0, 0);

        // Dessiner toutes les annotations
        annotatedImage.annotations.forEach(ann => drawAnnotation(ctx, ann));

        // Convertir en blob
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error('Could not create blob'));
          }
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.crossOrigin = 'anonymous';
    img.src = annotatedImage.image.url || '';
  });
}

/** Résolution max pour l'export HTML (px sur le grand côté) */
const MAX_EXPORT_PX = 1600;

/** Qualité JPEG pour l'export (0–1) */
const JPEG_QUALITY = 0.82;

/**
 * Rend une image avec ses annotations et retourne une data URL base64 JPEG compressée.
 * L'image est redimensionnée si elle dépasse MAX_EXPORT_PX sur le grand côté.
 */
export async function renderAnnotatedImageToBase64(annotatedImage: AnnotatedImage): Promise<string> {
  const srcUrl = annotatedImage.image.url || '';
  if (!srcUrl) return '';

  // Charger l'image en base64 via fetch pour éviter le canvas taint CORS
  let base64Src: string;
  try {
    base64Src = await imageUrlToBase64(srcUrl);
  } catch {
    base64Src = srcUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calcul des dimensions avec limite de résolution
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > MAX_EXPORT_PX) {
          const ratio = MAX_EXPORT_PX / Math.max(w, h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }

        ctx.drawImage(img, 0, 0, w, h);

        // Dessiner les annotations uniquement si présentes
        if (annotatedImage.annotations && annotatedImage.annotations.length > 0) {
          // Les annotations sont en coordonnées de l'image originale — adapter le scale
          const scaleX = w / img.width;
          const scaleY = h / img.height;
          ctx.save();
          ctx.scale(scaleX, scaleY);
          annotatedImage.annotations.forEach(ann => drawAnnotation(ctx, ann));
          ctx.restore();
        }

        // JPEG compressé au lieu de PNG
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Src;
  });
}

/**
 * Rend toutes les images annotées d'une liste et retourne un Map d'URLs
 */
export async function renderAllAnnotatedImages(
  images: AnnotatedImage[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  for (const img of images) {
    if (img.annotations && img.annotations.length > 0) {
      try {
        const renderedUrl = await renderAnnotatedImage(img);
        urlMap.set(img.imageId, renderedUrl);
      } catch (error) {
        console.error(`Failed to render annotations for image ${img.imageId}:`, error);
        // En cas d'erreur, utiliser l'URL originale
        if (img.image.url) {
          urlMap.set(img.imageId, img.image.url);
        }
      }
    }
  }

  return urlMap;
}

/**
 * Convertit une URL d'image en base64 via fetch (évite les problèmes de canvas taint CORS)
 */
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Rend toutes les images annotées d'une liste et retourne un Map d'URLs.
 * - Images AVEC annotations : rendues en base64 JPEG compressé (annotations dessinées)
 * - Images SANS annotations + URL hébergée : URL directe (pas de base64, fichier plus léger)
 * - Images SANS annotations + blob uniquement : base64 JPEG compressé
 */
export async function renderAllAnnotatedImagesToBase64(
  images: AnnotatedImage[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  for (const img of images) {
    try {
      const hasAnnotations = img.annotations && img.annotations.length > 0;

      if (hasAnnotations) {
        // Image avec annotations : rendu canvas → JPEG compressé
        const renderedUrl = await renderAnnotatedImageToBase64(img);
        urlMap.set(img.imageId, renderedUrl);
      } else if (img.image.url) {
        // Image sans annotations et déjà hébergée : URL directe, pas de base64
        urlMap.set(img.imageId, img.image.url);
      } else if (img.image.blob) {
        // Image sans annotations, blob local uniquement : compresser via canvas
        const blobUrl = URL.createObjectURL(img.image.blob);
        const syntheticImg: AnnotatedImage = { ...img, image: { ...img.image, url: blobUrl }, annotations: [] };
        try {
          const compressed = await renderAnnotatedImageToBase64(syntheticImg);
          urlMap.set(img.imageId, compressed);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch (error) {
      console.error(`Failed to render image ${img.imageId}:`, error);
      if (img.image.url) urlMap.set(img.imageId, img.image.url);
    }
  }

  return urlMap;
}
