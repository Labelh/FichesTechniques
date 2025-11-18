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

/**
 * Rend une image avec ses annotations et retourne une data URL base64
 */
export async function renderAnnotatedImageToBase64(annotatedImage: AnnotatedImage): Promise<string> {
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

        // Convertir en data URL base64
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
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
 * Convertit une URL d'image en base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Rend toutes les images annotées d'une liste et retourne un Map de data URLs base64
 */
export async function renderAllAnnotatedImagesToBase64(
  images: AnnotatedImage[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  console.log('renderAllAnnotatedImagesToBase64: Processing', images.length, 'images');

  for (const img of images) {
    try {
      if (img.annotations && img.annotations.length > 0) {
        // Image avec annotations - rendre avec les annotations
        console.log(`Rendering image ${img.imageId} with ${img.annotations.length} annotations`);
        const renderedUrl = await renderAnnotatedImageToBase64(img);
        urlMap.set(img.imageId, renderedUrl);
        console.log(`Image ${img.imageId} rendered successfully`);
      } else if (img.image.url) {
        // Image sans annotations - convertir en base64 quand même pour l'export HTML
        console.log(`Converting image ${img.imageId} without annotations to base64`);
        try {
          const base64Url = await imageUrlToBase64(img.image.url);
          urlMap.set(img.imageId, base64Url);
          console.log(`Image ${img.imageId} converted successfully`);
        } catch (error) {
          console.error(`Failed to convert image ${img.imageId} to base64:`, error);
          // Fallback à l'URL originale
          urlMap.set(img.imageId, img.image.url);
        }
      }
    } catch (error) {
      console.error(`Failed to render image ${img.imageId}:`, error);
      // En cas d'erreur, utiliser l'URL originale
      if (img.image.url) {
        urlMap.set(img.imageId, img.image.url);
      }
    }
  }

  console.log('renderAllAnnotatedImagesToBase64: Completed. URL map size:', urlMap.size);
  return urlMap;
}
