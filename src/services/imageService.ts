import { db } from '@/db/database';
import type { Image, AnnotatedImage, Annotation } from '@/types';

/**
 * Crée une miniature d'une image
 */
async function createThumbnail(blob: Blob, maxSize: number = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculer les nouvelles dimensions
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
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

      canvas.toBlob(
        (thumbnailBlob) => {
          URL.revokeObjectURL(url);
          if (thumbnailBlob) {
            resolve(thumbnailBlob);
          } else {
            reject(new Error('Could not create thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

/**
 * Uploade une image et la stocke dans la base de données
 */
export async function uploadImage(file: File): Promise<string> {
  const now = new Date();

  // Créer une miniature
  const thumbnail = await createThumbnail(file);

  // Récupérer les dimensions
  const dimensions = await getImageDimensions(file);

  const image: Image = {
    id: crypto.randomUUID(),
    name: file.name,
    blob: file,
    size: file.size,
    mimeType: file.type,
    width: dimensions.width,
    height: dimensions.height,
    thumbnail,
    createdAt: now,
    updatedAt: now,
  };

  await db.images.add(image);
  return image.id;
}

/**
 * Récupère les dimensions d'une image
 */
function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };

    img.src = url;
  });
}

/**
 * Récupère une image par son ID
 */
export async function getImage(imageId: string): Promise<Image | undefined> {
  return await db.images.get(imageId);
}

/**
 * Crée une URL pour afficher une image
 */
export function createImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Supprime une image
 */
export async function deleteImage(imageId: string): Promise<void> {
  await db.images.delete(imageId);
}

/**
 * Ajoute une annotation à une image
 */
export async function addAnnotationToImage(
  _imageId: string,
  annotation: Omit<Annotation, 'id' | 'createdAt'>
): Promise<Annotation> {
  const newAnnotation: Annotation = {
    ...annotation,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  return newAnnotation;
}

/**
 * Sauvegarde les annotations d'une image annotée
 */
export function createAnnotatedImage(
  _imageId: string,
  image: Image,
  annotationsData: Annotation[],
  description?: string
): AnnotatedImage {
  return {
    imageId: _imageId,
    image,
    annotations: annotationsData,
    description,
  };
}

/**
 * Exporte une image annotée en tant que blob
 */
export async function exportAnnotatedImage(
  image: Image,
  _annotations: Annotation[],
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not export image'));
        }
      },
      image.mimeType,
      0.95
    );
  });
}
