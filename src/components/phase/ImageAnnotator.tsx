import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo, Redo, Pencil, ArrowRight, Circle, Square, Minus, Type, Palette, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>(AnnotationType.TRAJECTORY);
  const [currentColor, setCurrentColor] = useState<string>('#ff5722');
  const [annotations, setAnnotations] = useState<Annotation[]>(annotatedImage.annotations || []);
  const [history, setHistory] = useState<Annotation[][]>([annotatedImage.annotations || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [description, setDescription] = useState(annotatedImage.description || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoom, setZoom] = useState(1);

  // État de dessin (non React pour performance)
  const drawing = useRef({
    active: false,
    startPoint: null as Point | null,
    points: [] as Point[],
  });

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

  // Charger l'image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageObjRef.current = img;

      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        redrawCanvas();
      }

      setLoaded(true);
      console.log('✅ Image chargée:', img.width, 'x', img.height);
    };

    img.onerror = (e) => {
      console.error('❌ Erreur chargement image:', e);
      toast.error('Impossible de charger l\'image');
      setLoaded(true);
    };

    // Déterminer la source
    const imageUrl = annotatedImage.image.url;
    if (imageUrl) {
      console.log('📥 Chargement depuis URL:', imageUrl);
      img.src = imageUrl;
    } else {
      console.error('❌ Pas d\'URL disponible');
      toast.error('Image non disponible');
      setLoaded(true);
    }
  }, [annotatedImage.image.url]);

  // Redessiner le canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner l'image
    ctx.drawImage(img, 0, 0);

    // Dessiner les annotations
    annotations.forEach(ann => drawAnnotation(ctx, ann));

    // Dessiner l'annotation en cours
    if (drawing.current.active && drawing.current.points.length > 0) {
      const tempAnn: Annotation = {
        id: 'temp',
        type: currentTool,
        points: drawing.current.points,
        color: currentColor,
        createdAt: new Date(),
      };
      drawAnnotation(ctx, tempAnn);
    }
  };

  // Dessiner une annotation
  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
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
  };

  // Redessiner quand les annotations changent
  useEffect(() => {
    if (loaded) redrawCanvas();
  }, [annotations, loaded]);

  // Convertir coordonnées écran → canvas
  const getCanvasPoint = (e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Gérer les événements de dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const point = getCanvasPoint(e);
      drawing.current = {
        active: true,
        startPoint: point,
        points: [point],
      };
      redrawCanvas();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drawing.current.active) return;

      const point = getCanvasPoint(e);

      if (currentTool === AnnotationType.TRAJECTORY) {
        drawing.current.points.push(point);
      } else {
        drawing.current.points = [drawing.current.startPoint!, point];
      }

      redrawCanvas();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!drawing.current.active) return;

      const point = getCanvasPoint(e);
      let finalPoints = drawing.current.points;

      if (currentTool !== AnnotationType.TRAJECTORY) {
        finalPoints = [drawing.current.startPoint!, point];
      }

      // Texte
      let text: string | undefined;
      if (currentTool === AnnotationType.TEXT) {
        text = prompt('Entrez le texte:') || undefined;
        if (!text) {
          drawing.current.active = false;
          redrawCanvas();
          return;
        }
        finalPoints = [drawing.current.startPoint!];
      }

      // Créer l'annotation
      const newAnn: Annotation = {
        id: crypto.randomUUID(),
        type: currentTool,
        points: finalPoints,
        color: currentColor,
        text,
        createdAt: new Date(),
      };

      const newAnnotations = [...annotations, newAnn];
      setAnnotations(newAnnotations);

      // Historique
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      drawing.current.active = false;
      redrawCanvas();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [loaded, currentTool, currentColor, annotations, historyIndex, history]);

  // Bloquer le scroll de la page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Zoom à la molette
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.max(0.25, Math.min(5, prev + delta));
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(5, prev + 0.25));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(prev => Math.max(0.25, prev - 0.25));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setAnnotations([...history[historyIndex - 1]]);
        }
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setAnnotations([...history[historyIndex + 1]]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [historyIndex, history, onCancel]);

  const handleSave = () => {
    onSave(annotations, description);
    toast.success('Annotations enregistrées');
  };

  if (!loaded) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Annotation</h2>
          <input
            type="text"
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 w-80"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-3 mr-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white bg-gray-800 px-3 py-1 rounded min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(5, prev + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
              <span className="text-xs">1:1</span>
            </Button>
          </div>

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (historyIndex > 0) {
                setHistoryIndex(historyIndex - 1);
                setAnnotations([...history[historyIndex - 1]]);
              }
            }}
            disabled={historyIndex === 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (historyIndex < history.length - 1) {
                setHistoryIndex(historyIndex + 1);
                setAnnotations([...history[historyIndex + 1]]);
              }
            }}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
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
              currentTool === AnnotationType.TRAJECTORY ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.LINE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.LINE ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.ARROW)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.ARROW ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.CIRCLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.CIRCLE ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Circle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.RECTANGLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.RECTANGLE ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Square className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.TEXT)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TEXT ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Type className="h-5 w-5" />
          </button>

          <div className="h-px bg-gray-700 my-2" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors w-full"
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
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <canvas
              ref={canvasRef}
              className="block cursor-crosshair"
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
