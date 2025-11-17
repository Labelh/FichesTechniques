import type { AnnotatedImage, Annotation } from '../types';
import { AnnotationType } from '../types';

/**
 * Dessine une annotation sur un contexte canvas
 */
function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  if (!ann.points || ann.points.length === 0) return;

  ctx.strokeStyle = ann.color;
  ctx.fillStyle = ann.color;
  ctx.lineWidth = 3;
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

    img.src = annotatedImage.image.url || '';
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
