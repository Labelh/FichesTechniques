import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Upload une image vers Firebase Storage
 * @param file - Le fichier image à uploader
 * @param path - Le chemin dans Storage (ex: 'procedures/cover-images/')
 * @returns L'URL de téléchargement de l'image
 */
export async function uploadImage(file: File | Blob, path: string): Promise<string> {
  try {
    // Créer un nom de fichier unique
    const filename = `${Date.now()}-${crypto.randomUUID()}`;
    const storageRef = ref(storage, `${path}${filename}`);

    // Upload le fichier
    console.log(`Uploading image to ${path}${filename}...`);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Image uploaded successfully');

    // Récupérer l'URL de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Supprime une image de Firebase Storage
 * @param imageUrl - L'URL de l'image à supprimer
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extraire le path depuis l'URL Firebase Storage
    const baseUrl = 'https://firebasestorage.googleapis.com';
    if (!imageUrl.startsWith(baseUrl)) {
      console.warn('Not a Firebase Storage URL, skipping deletion');
      return;
    }

    // Créer une référence depuis l'URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
    console.log('Image deleted successfully');
  } catch (error) {
    console.error('Error deleting image:', error);
    // Ne pas lancer d'erreur si l'image n'existe pas
  }
}

/**
 * Upload une image de couverture de procédure
 * @param file - Le fichier image
 * @param procedureId - L'ID de la procédure
 * @returns L'URL de l'image
 */
export async function uploadCoverImage(file: File | Blob, procedureId: string): Promise<string> {
  return uploadImage(file, `procedures/${procedureId}/cover/`);
}

/**
 * Upload une image de phase
 * @param file - Le fichier image
 * @param procedureId - L'ID de la procédure
 * @param phaseId - L'ID de la phase
 * @returns L'URL de l'image
 */
export async function uploadPhaseImage(
  file: File | Blob,
  procedureId: string,
  phaseId: string
): Promise<string> {
  return uploadImage(file, `procedures/${procedureId}/phases/${phaseId}/`);
}

/**
 * Convertit une image base64 en Blob
 * @param base64 - La chaîne base64 de l'image
 * @returns Un Blob
 */
export function base64ToBlob(base64: string): Blob {
  // Extraire le type MIME et les données
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}
