import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo, Redo, Pencil, ArrowRight, Circle, Square, Minus, Type, Palette, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createImageUrl } from '@/services/imageService';
import type { AnnotatedImage, Annotation, Tool } from '@/types';
import { AnnotationType } from '@/types';
import { toast } from 'sonner';

interface ImageAnnotatorProps {
  annotatedImage: AnnotatedImage;
  tools?: Tool[];
  onSave: (annotations: Annotation[], description: string) => void;
  onCancel: () => void;
}

type DrawingTool = AnnotationType.TRAJECTORY | AnnotationType.LINE | AnnotationType.ARROW | AnnotationType.CIRCLE | AnnotationType.RECTANGLE | AnnotationType.TEXT;

interface Point {
  x: number;
  y: number;
}

export default function ImageAnnotator({ annotatedImage, tools = [], onSave, onCancel }: ImageAnnotatorProps) {
  // Canvas refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>(AnnotationType.TRAJECTORY);
  const [currentColor, setCurrentColor] = useState<string>('#ff5722');
  const [annotations, setAnnotations] = useState<Annotation[]>(annotatedImage.annotations || []);
  const [history, setHistory] = useState<Annotation[][]>([annotatedImage.annotations || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [description, setDescription] = useState(annotatedImage.description || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Drawing state (not in React state to avoid re-renders)
  const drawingState = useRef({
    isDrawing: false,
    startPoint: null as Point | null,
    currentPoints: [] as Point[],
  });

  const imageRef = useRef<HTMLImageElement | null>(null);

  const toolColors = [
    { name: 'Orange-rouge', value: '#ff5722' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Jaune', value: '#eab308' },
    { name: 'Vert', value: '#22c55e' },
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Violet', value: '#a855f7' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blanc', value: '#ffffff' },
  ];

  // Charger l'image une seule fois
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageRef.current = img;

      // Configurer les canvas
      if (baseCanvasRef.current && drawCanvasRef.current) {
        baseCanvasRef.current.width = img.width;
        baseCanvasRef.current.height = img.height;
        drawCanvasRef.current.width = img.width;
        drawCanvasRef.current.height = img.height;

        setImageLoaded(true);
      }
    };

    img.onerror = () => {
      console.error('Erreur de chargement de l\'image');
      toast.error('Erreur de chargement de l\'image');
    };

    // Déterminer l'URL de l'image
    if (annotatedImage.image.url) {
      img.src = annotatedImage.image.url;
    } else if (annotatedImage.image.blob) {
      const url = createImageUrl(annotatedImage.image.blob);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [annotatedImage.image.url, annotatedImage.image.blob]);

  // Redessiner le canvas de base quand les annotations changent
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !baseCanvasRef.current) return;

    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer et redessiner
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);

    // Dessiner toutes les annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation);
    });
  }, [imageLoaded, annotations]);

  // Bloquer le scroll et gérer le zoom à la molette
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();

    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Gestion du zoom à la molette sur le container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.max(0.25, Math.min(5, prev + delta));
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if ((e.key === '+' || e.key === '=') && !e.ctrlKey) {
        e.preventDefault();
        setZoom(prev => Math.min(5, prev + 0.25));
      } else if (e.key === '-' && !e.ctrlKey) {
        e.preventDefault();
        setZoom(prev => Math.max(0.25, prev - 0.25));
      } else if (e.key === '0' && !e.ctrlKey) {
        e.preventDefault();
        setZoom(1);
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = annotation.points || [];

    switch (annotation.type) {
      case AnnotationType.TRAJECTORY:
        if (points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
        break;

      case AnnotationType.LINE:
        if (points.length === 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        }
        break;

      case AnnotationType.ARROW:
        if (points.length === 2) {
          drawArrow(ctx, points[0], points[1]);
        }
        break;

      case AnnotationType.CIRCLE:
        if (points.length === 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case AnnotationType.RECTANGLE:
        if (points.length === 2) {
          const width = points[1].x - points[0].x;
          const height = points[1].y - points[0].y;
          ctx.strokeRect(points[0].x, points[0].y, width, height);
        }
        break;

      case AnnotationType.TEXT:
        if (points.length > 0 && annotation.text) {
          ctx.font = '20px Arial';
          ctx.fillText(annotation.text, points[0].x, points[0].y);
        }
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const headLength = 15;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const getCanvasPoint = (e: MouseEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const redrawTempCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { isDrawing, startPoint, currentPoints } = drawingState.current;
    if (!isDrawing || !startPoint) return;

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (currentTool) {
      case AnnotationType.TRAJECTORY:
        if (currentPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
          }
          ctx.stroke();
        }
        break;

      case AnnotationType.LINE:
        if (currentPoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
          ctx.stroke();
        }
        break;

      case AnnotationType.ARROW:
        if (currentPoints.length === 2) {
          drawArrow(ctx, currentPoints[0], currentPoints[1]);
        }
        break;

      case AnnotationType.CIRCLE:
        if (currentPoints.length === 2) {
          const radius = Math.sqrt(
            Math.pow(currentPoints[1].x - currentPoints[0].x, 2) +
            Math.pow(currentPoints[1].y - currentPoints[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(currentPoints[0].x, currentPoints[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case AnnotationType.RECTANGLE:
        if (currentPoints.length === 2) {
          const width = currentPoints[1].x - currentPoints[0].x;
          const height = currentPoints[1].y - currentPoints[0].y;
          ctx.strokeRect(currentPoints[0].x, currentPoints[0].y, width, height);
        }
        break;
    }
  };

  // Event handlers avec event listeners natifs
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !imageLoaded) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Seulement clic gauche

      const point = getCanvasPoint(e, canvas);
      drawingState.current = {
        isDrawing: true,
        startPoint: point,
        currentPoints: [point],
      };

      redrawTempCanvas();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawingState.current.isDrawing) return;

      const point = getCanvasPoint(e, canvas);

      if (currentTool === AnnotationType.TRAJECTORY) {
        // Ajouter le point à la trajectoire
        drawingState.current.currentPoints.push(point);
      } else {
        // Pour les autres outils, juste mettre à jour le point final
        drawingState.current.currentPoints = [drawingState.current.startPoint!, point];
      }

      redrawTempCanvas();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!drawingState.current.isDrawing) return;

      const point = getCanvasPoint(e, canvas);

      // Finaliser l'annotation
      let finalPoints = drawingState.current.currentPoints;

      if (currentTool !== AnnotationType.TRAJECTORY) {
        finalPoints = [drawingState.current.startPoint!, point];
      }

      // Pour le texte, demander le texte
      let text: string | undefined;
      if (currentTool === AnnotationType.TEXT) {
        text = prompt('Entrez le texte:') || undefined;
        if (!text) {
          drawingState.current = { isDrawing: false, startPoint: null, currentPoints: [] };
          redrawTempCanvas();
          return;
        }
        finalPoints = [drawingState.current.startPoint!];
      }

      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: currentTool,
        points: finalPoints,
        color: currentColor,
        text,
        createdAt: new Date(),
      };

      // Ajouter l'annotation
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);

      // Réinitialiser l'état de dessin
      drawingState.current = { isDrawing: false, startPoint: null, currentPoints: [] };
      redrawTempCanvas();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [imageLoaded, currentTool, currentColor, annotations]);

  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations([...history[newIndex]]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations([...history[newIndex]]);
    }
  };

  const handleSave = () => {
    onSave(annotations, description);
    toast.success('Annotations enregistrées');
  };

  if (!imageLoaded) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement de l'image...</div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Annotation : {annotatedImage.image.name}</h2>
          <input
            type="text"
            placeholder="Description de l'image..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 w-96"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-3 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
              disabled={zoom <= 0.25}
              title="Zoom arrière (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-white bg-gray-800 px-3 py-1 rounded min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.min(5, prev + 0.25))}
              disabled={zoom >= 5}
              title="Zoom avant (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1)}
              title="Réinitialiser (0)"
            >
              <span className="text-xs font-medium">1:1</span>
            </Button>
          </div>

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex === 0}
            title="Annuler (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rétablir (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>

          {/* Save/Cancel */}
          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} title="Fermer (Echap)">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-900 border-r border-gray-700 p-4 w-20 flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setCurrentTool(AnnotationType.TRAJECTORY)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TRAJECTORY
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Trajectoire"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.LINE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.LINE
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Ligne"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.ARROW)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.ARROW
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Flèche"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.CIRCLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.CIRCLE
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Cercle"
          >
            <Circle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.RECTANGLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.RECTANGLE
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Rectangle"
          >
            <Square className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.TEXT)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TEXT
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Texte"
          >
            <Type className="h-5 w-5" />
          </button>

          <div className="h-px bg-gray-700 my-2" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors w-full"
              title="Couleur"
            >
              <Palette className="h-5 w-5" style={{ color: currentColor }} />
            </button>
            {showColorPicker && (
              <div className="absolute left-full ml-2 top-0 bg-gray-800 border border-gray-700 rounded-lg p-2 z-10 grid grid-cols-2 gap-2">
                {toolColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setCurrentColor(color.value);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white transition-colors"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tool colors */}
          {tools.length > 0 && (
            <>
              <div className="h-px bg-gray-700 my-2" />
              <div className="text-xs text-gray-400 text-center mb-1">Outils</div>
              {tools.slice(0, 5).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setCurrentColor(tool.color || '#ff5722')}
                  className="w-full h-8 rounded border-2 border-gray-600 hover:border-white transition-colors"
                  style={{ backgroundColor: tool.color || '#ff5722' }}
                  title={tool.name}
                />
              ))}
            </>
          )}
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center bg-black p-8"
        >
          <div
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <canvas
              ref={baseCanvasRef}
              className="block"
              style={{
                imageRendering: zoom > 2 ? 'auto' : 'crisp-edges',
              }}
            />
            <canvas
              ref={drawCanvasRef}
              className="absolute top-0 left-0 cursor-crosshair"
              style={{
                imageRendering: zoom > 2 ? 'auto' : 'crisp-edges',
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
