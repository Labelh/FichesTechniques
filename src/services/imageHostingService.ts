/**
 * Service d'hébergement d'images via ImgBB API
 * ImgBB offre un hébergement gratuit permanent pour les images
 * API Key gratuite: https://api.imgbb.com/
 */

// Clé API ImgBB (gratuite, sans authentification requise)
// Pour obtenir votre propre clé: https://api.imgbb.com/
// Voir IMGBB_SETUP.md pour les instructions
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '';

interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium?: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

/**
 * Compresse une image avant l'upload
 */
async function compressImage(file: File, maxSizeMB: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
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

      // Ajuster la qualité selon la taille cible
      let quality = 0.8;
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            // Si toujours trop gros, réduire la qualité
            if (blob.size > maxSizeMB * 1024 * 1024) {
              quality = 0.6;
              canvas.toBlob(
                (compressedBlob) => {
                  if (compressedBlob) {
                    resolve(compressedBlob);
                  } else {
                    resolve(blob);
                  }
                },
                'image/jpeg',
                quality
              );
            } else {
              resolve(blob);
            }
          } else {
            reject(new Error('Could not compress image'));
          }
        },
        'image/jpeg',
        quality
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
 * Convertit un File ou Blob en base64
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Retirer le préfixe "data:image/...;base64,"
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Could not read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload une image vers ImgBB et retourne l'URL
 */
export async function uploadImageToHost(file: File): Promise<string> {
  try {
    // Vérifier que la clé API est configurée
    if (!IMGBB_API_KEY || IMGBB_API_KEY === 'your_api_key_here') {
      throw new Error('ImgBB API key not configured. See IMGBB_SETUP.md');
    }

    // Vérifier la taille (max 32 MB pour ImgBB, mais on limite à 15 MB)
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Image trop volumineuse (max 15 MB)');
    }

    // Compresser l'image si nécessaire
    let imageToUpload: File | Blob = file;
    if (file.size > 2 * 1024 * 1024) {
      console.log('Compressing image...');
      imageToUpload = await compressImage(file, 2);
    }

    // Convertir en base64
    const base64Image = await fileToBase64(imageToUpload);

    // Créer le FormData pour l'API
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Image);
    formData.append('name', file.name);

    // Upload vers ImgBB
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ImgBB API error:', errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data: ImgBBResponse = await response.json();

    if (!data.success) {
      throw new Error('Upload failed: ImgBB returned error');
    }

    // Retourner l'URL de l'image (display_url est optimisé pour l'affichage)
    return data.data.display_url;
  } catch (error) {
    console.error('Error uploading image to ImgBB:', error);
    throw error;
  }
}

/**
 * Upload une image depuis une URL base64
 */
export async function uploadBase64ToHost(base64Data: string, filename: string = 'image.jpg'): Promise<string> {
  try {
    // Retirer le préfixe si présent
    const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Clean);
    formData.append('name', filename);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data: ImgBBResponse = await response.json();

    if (!data.success) {
      throw new Error('Upload failed: ImgBB returned error');
    }

    return data.data.display_url;
  } catch (error) {
    console.error('Error uploading base64 to ImgBB:', error);
    throw error;
  }
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
