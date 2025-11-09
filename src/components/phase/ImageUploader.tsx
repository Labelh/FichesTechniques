import { useState, useCallback } from 'react';
import { Upload, X, Pencil } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadImage, getImage, deleteImage, createImageUrl } from '@/services/imageService';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { AnnotatedImage } from '@/types';

interface ImageUploaderProps {
  images: AnnotatedImage[];
  onImagesChange: (images: AnnotatedImage[]) => void;
  onEditImage?: (imageId: string) => void;
}

export default function ImageUploader({ images, onImagesChange, onEditImage }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    try {
      const newImages: AnnotatedImage[] = [];

      for (const file of acceptedFiles) {
        // Upload l'image
        const imageId = await uploadImage(file);
        const image = await getImage(imageId);

        if (image) {
          newImages.push({
            imageId,
            image,
            annotations: [],
            description: '',
          });
        }
      }

      onImagesChange([...images, ...newImages]);
      toast.success(`${acceptedFiles.length} image(s) ajoutée(s)`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Erreur lors de l\'upload des images');
    } finally {
      setUploading(false);
    }
  }, [images, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    },
    multiple: true,
  });

  const handleRemoveImage = async (imageId: string) => {
    try {
      await deleteImage(imageId);
      onImagesChange(images.filter(img => img.imageId !== imageId));
      toast.success('Image supprimée');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        {isDragActive ? (
          <p className="text-primary font-medium">Déposez les images ici...</p>
        ) : (
          <>
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              Glissez-déposez des images ici
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ou cliquez pour sélectionner des fichiers
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              PNG, JPG, JPEG, WEBP, GIF (max 10 MB par image)
            </p>
          </>
        )}
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((annotatedImage) => (
            <ImageThumbnail
              key={annotatedImage.imageId}
              annotatedImage={annotatedImage}
              onRemove={() => handleRemoveImage(annotatedImage.imageId)}
              onEdit={onEditImage ? () => onEditImage(annotatedImage.imageId) : undefined}
            />
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Upload en cours...
        </div>
      )}
    </div>
  );
}

// Composant pour afficher une miniature d'image
function ImageThumbnail({
  annotatedImage,
  onRemove,
  onEdit,
}: {
  annotatedImage: AnnotatedImage;
  onRemove: () => void;
  onEdit?: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>('');

  // Créer l'URL de l'image
  useState(() => {
    const url = createImageUrl(annotatedImage.image.thumbnail || annotatedImage.image.blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  });

  const hasAnnotations = annotatedImage.annotations && annotatedImage.annotations.length > 0;

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      {/* Image */}
      <img
        src={imageUrl}
        alt={annotatedImage.description || 'Image'}
        className="w-full h-full object-cover"
      />

      {/* Overlay avec actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {onEdit && (
          <Button
            size="sm"
            variant="default"
            onClick={onEdit}
            className="flex items-center gap-1"
          >
            <Pencil className="h-4 w-4" />
            {hasAnnotations ? 'Éditer' : 'Annoter'}
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Badge si annotations */}
      {hasAnnotations && (
        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Pencil className="h-3 w-3" />
          {annotatedImage.annotations.length}
        </div>
      )}

      {/* Nom de l'image */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <p className="text-white text-xs truncate">
          {annotatedImage.image.name}
        </p>
      </div>
    </div>
  );
}
