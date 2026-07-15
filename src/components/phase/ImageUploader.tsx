import { useState, useCallback, useEffect } from 'react';
import { Upload, X, Pencil } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadImageToHost } from '@/services/imageHostingService';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { AnnotatedImage } from '@/types';
import { renderAnnotatedImage } from '@/lib/imageAnnotationRenderer';

interface ImageUploaderProps {
  images: AnnotatedImage[];
  onImagesChange: (images: AnnotatedImage[]) => void;
  onEditImage?: (imageId: string) => void;
  reference: string;
}

export default function ImageUploader({ images, onImagesChange, onEditImage, reference }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    try {
      const newImages: AnnotatedImage[] = [];

      for (const file of acceptedFiles) {
        // Vérifier la taille (15 MB max)
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 15 MB)`);
          continue;
        }

        try {
          // Upload l'image dans le Référentiel Shadow
          const imageUrl = await uploadImageToHost(file, reference);

          // Créer l'objet Image avec l'URL
          newImages.push({
            imageId: crypto.randomUUID(),
            image: {
              id: crypto.randomUUID(),
              name: file.name,
              blob: file, // Garder le blob pour la miniature locale
              size: file.size,
              mimeType: file.type,
              width: 0, // Sera calculé à l'affichage
              height: 0,
              thumbnail: file, // Utiliser le fichier original comme miniature
              createdAt: new Date(),
              updatedAt: new Date(),
              url: imageUrl, // URL hébergée sur le Référentiel Shadow
            },
            annotations: [],
            description: '',
          });
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Erreur pour ${file.name}: ${error.message}`);
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`${newImages.length} image(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Erreur lors de l\'upload des images');
    } finally {
      setUploading(false);
    }
  }, [images, onImagesChange, reference]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    },
    multiple: true,
    maxSize: 15 * 1024 * 1024, // 15 MB
  });

  const handleRemoveImage = async (imageId: string) => {
    try {
      // Simplement retirer de la liste (pas de suppression côté ImgBB)
      onImagesChange(images.filter(img => img.imageId !== imageId));
      toast.success('Image supprimée');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-3">
      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-[#323232] hover:border-primary/50 hover:bg-[#1a1a1a]'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Upload en cours…</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="h-7 w-7 mx-auto text-primary" />
            <p className="text-sm text-primary font-medium">Relâchez pour ajouter</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="h-7 w-7 mx-auto text-gray-500" />
            <p className="text-sm text-gray-300 font-medium">Glissez des images ici</p>
            <p className="text-xs text-gray-500">ou cliquez pour parcourir · PNG, JPG, WEBP, GIF · max 15 MB</p>
          </div>
        )}
      </div>
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
  const hasAnnotations = annotatedImage.annotations && annotatedImage.annotations.length > 0;

  // Charger l'image avec annotations si présentes
  useEffect(() => {
    let mounted = true;
    let urlToRevoke: string | null = null;

    const loadImage = async () => {
      try {
        if (hasAnnotations) {
          // Rendre l'image avec annotations
          const renderedUrl = await renderAnnotatedImage(annotatedImage);
          if (mounted) {
            urlToRevoke = renderedUrl;
            setImageUrl(renderedUrl);
          }
        } else {
          // Utiliser l'URL originale ou créer un blob
          if (annotatedImage.image.url) {
            setImageUrl(annotatedImage.image.url);
          } else {
            const url = URL.createObjectURL(annotatedImage.image.thumbnail || annotatedImage.image.blob);
            urlToRevoke = url;
            if (mounted) {
              setImageUrl(url);
            }
          }
        }
      } catch (error) {
        console.error('Error rendering annotated image:', error);
        // Fallback vers l'URL originale
        if (mounted && annotatedImage.image.url) {
          setImageUrl(annotatedImage.image.url);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [annotatedImage, hasAnnotations]);

  return (
    <div className="relative group aspect-video rounded-lg overflow-hidden border border-[#323232] bg-background-elevated hover:border-[#555] transition-colors">
      {/* Image */}
      <img
        src={imageUrl}
        alt={annotatedImage.description || 'Image'}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />

      {/* Overlay avec actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {onEdit && (
          <Button
            size="sm"
            variant="default"
            onClick={onEdit}
            className="flex items-center gap-1 text-xs h-7 px-2"
          >
            <Pencil className="h-3 w-3" />
            {hasAnnotations ? 'Éditer' : 'Annoter'}
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={onRemove}
          className="h-7 w-7 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Badge annotations */}
      {hasAnnotations && (
        <div className="absolute top-1.5 right-1.5 bg-primary/90 text-white text-[10px] font-medium rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          Annoté
        </div>
      )}

      {/* Nom de l'image */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
        <p className="text-white text-[11px] truncate leading-tight">
          {annotatedImage.image.name}
        </p>
      </div>
    </div>
  );
}
