import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo, Redo, Pencil, ArrowRight, Circle, Square, Minus, Type, Palette, ZoomIn, ZoomOut, Scan, Eraser, Move } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AnnotatedImage, Annotation, Tool } from '@/types';
import { AnnotationType } from '@/types';

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
  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeOpacity, setStrokeOpacity] = useState(1);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

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

    img.onload = () => {
      imageObjRef.current = img;
      originalImageRef.current = img;
      setLoaded(true);
    };

    img.onerror = () => {
      setLoaded(true);
    };

    img.crossOrigin = 'anonymous';
    const imageUrl = annotatedImage.image.url;
    if (imageUrl) {
      img.src = imageUrl;
    } else {
      setLoaded(true);
    }
  }, [annotatedImage.image.url]);

  // Redimensionner le canvas une fois que l'image et le canvas sont prêts
  useEffect(() => {
    if (!loaded || !canvasRef.current || !imageObjRef.current) return;

    const canvas = canvasRef.current;
    const img = imageObjRef.current;

    canvas.width = img.width;
    canvas.height = img.height;

    redrawCanvas();
  }, [loaded]);

  // Calculer le gradient à une position pour le suivi d'arête
  const getEdgeGradient = (imageData: ImageData, x: number, y: number): { dx: number; dy: number; magnitude: number } => {
    const width = imageData.width;
    const data = imageData.data;

    if (x <= 0 || x >= width - 1 || y <= 0 || y >= imageData.height - 1) {
      return { dx: 0, dy: 0, magnitude: 0 };
    }

    // Sobel pour calculer le gradient
    const gx = (
      -data[((y - 1) * width + (x - 1)) * 4] +
      data[((y - 1) * width + (x + 1)) * 4] +
      -2 * data[(y * width + (x - 1)) * 4] +
      2 * data[(y * width + (x + 1)) * 4] +
      -data[((y + 1) * width + (x - 1)) * 4] +
      data[((y + 1) * width + (x + 1)) * 4]
    );

    const gy = (
      -data[((y - 1) * width + (x - 1)) * 4] +
      -2 * data[((y - 1) * width + x) * 4] +
      -data[((y - 1) * width + (x + 1)) * 4] +
      data[((y + 1) * width + (x - 1)) * 4] +
      2 * data[((y + 1) * width + x) * 4] +
      data[((y + 1) * width + (x + 1)) * 4]
    );

    const magnitude = Math.sqrt(gx * gx + gy * gy);
    return { dx: gx, dy: gy, magnitude };
  };

  // Suivre une arête à partir d'un point
  const snapToEdge = (point: Point, imageData: ImageData): Point => {
    const searchRadius = 10;
    let maxMagnitude = 0;
    let bestPoint = point;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const x = Math.round(point.x + dx);
        const y = Math.round(point.y + dy);

        const gradient = getEdgeGradient(imageData, x, y);
        if (gradient.magnitude > maxMagnitude) {
          maxMagnitude = gradient.magnitude;
          bestPoint = { x, y };
        }
      }
    }

    return maxMagnitude > 50 ? bestPoint : point;
  };

  // Supprimer le fond (simple seuillage de couleur)
  const removeBackground = () => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dessiner l'image originale
    ctx.drawImage(img, 0, 0);

    // Obtenir les données d'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Prendre la couleur du coin supérieur gauche comme référence du fond
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];
    const threshold = 40; // Seuil de similarité

    // Rendre transparent les pixels similaires à la couleur de fond
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

      if (diff < threshold) {
        data[i + 3] = 0; // Rendre transparent
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Redessiner le canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner l'image (avec ou sans effets)
    if (backgroundRemoved) {
      removeBackground();
    } else {
      ctx.drawImage(img, 0, 0);
    }

    // Dessiner les annotations
    annotations.forEach(ann => {
      const isSelected = ann.id === selectedAnnotation;
      drawAnnotation(ctx, ann, isSelected);
    });

    // Dessiner l'annotation en cours
    if (drawing.current.active && drawing.current.points.length > 0) {
      const tempAnn: Annotation = {
        id: 'temp',
        type: currentTool,
        points: drawing.current.points,
        color: currentColor,
        strokeWidth,
        createdAt: new Date(),
      } as any;
      (tempAnn as any).opacity = strokeOpacity;
      drawAnnotation(ctx, tempAnn, false);
    }
  };

  // Convertir hex en rgba avec opacité
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Dessiner une annotation
  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation, isSelected: boolean = false) => {
    if (!ann.points || ann.points.length === 0) return;

    const opacity = (ann as any).opacity !== undefined ? (ann as any).opacity : 1;
    const colorWithOpacity = ann.color.startsWith('#') ? hexToRgba(ann.color, opacity) : ann.color;

    ctx.strokeStyle = colorWithOpacity;
    ctx.fillStyle = colorWithOpacity;
    ctx.globalAlpha = 1;
    ctx.lineWidth = ann.strokeWidth || strokeWidth;
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

    // Dessiner une bordure de sélection si sélectionné
    if (isSelected && pts.length > 0) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      const minX = Math.min(...pts.map(p => p.x)) - 10;
      const minY = Math.min(...pts.map(p => p.y)) - 10;
      const maxX = Math.max(...pts.map(p => p.x)) + 10;
      const maxY = Math.max(...pts.map(p => p.y)) + 10;

      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  };

  // Redessiner quand les annotations changent ou les effets
  useEffect(() => {
    if (loaded) redrawCanvas();
  }, [annotations, loaded, backgroundRemoved, selectedAnnotation, strokeWidth, strokeOpacity]);

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

    let dragStart: Point | null = null;
    let initialPoints: Point[] = [];

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const point = getCanvasPoint(e);

      // Mode déplacement
      if (moveMode) {
        // Chercher une annotation sous le curseur
        const clickedAnn = annotations.find(ann => {
          if (!ann.points || ann.points.length === 0) return false;
          const minX = Math.min(...ann.points.map(p => p.x)) - 10;
          const minY = Math.min(...ann.points.map(p => p.y)) - 10;
          const maxX = Math.max(...ann.points.map(p => p.x)) + 10;
          const maxY = Math.max(...ann.points.map(p => p.y)) + 10;
          return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
        });

        if (clickedAnn) {
          setSelectedAnnotation(clickedAnn.id);
          dragStart = point;
          initialPoints = [...clickedAnn.points];
        } else {
          setSelectedAnnotation(null);
        }
        return;
      }

      drawing.current = {
        active: true,
        startPoint: point,
        points: [point],
      };
      redrawCanvas();
    };

    const onMouseMove = (e: MouseEvent) => {
      const point = getCanvasPoint(e);

      // Mode déplacement
      if (moveMode && selectedAnnotation && dragStart && initialPoints.length > 0) {
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;

        const movedPoints = initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
        const updatedAnnotations = annotations.map(a =>
          a.id === selectedAnnotation ? { ...a, points: movedPoints } : a
        );
        setAnnotations(updatedAnnotations);
        return;
      }

      if (!drawing.current.active) return;

      // Suivi d'arête activé
      let finalPoint = point;
      if (edgeDetectionEnabled && currentTool === AnnotationType.TRAJECTORY) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          finalPoint = snapToEdge(point, imageData);
        }
      }

      if (currentTool === AnnotationType.TRAJECTORY) {
        drawing.current.points.push(finalPoint);
      } else {
        drawing.current.points = [drawing.current.startPoint!, finalPoint];
      }

      redrawCanvas();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (moveMode) {
        if (selectedAnnotation && dragStart) {
          // Sauvegarder dans l'historique
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push([...annotations]);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
        dragStart = null;
        initialPoints = [];
        return;
      }

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
        strokeWidth,
        text,
        createdAt: new Date(),
      } as any;
      (newAnn as any).opacity = strokeOpacity;

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
  }, [loaded, currentTool, currentColor, annotations, historyIndex, history, moveMode, selectedAnnotation, edgeDetectionEnabled, strokeWidth]);

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
      <div className="bg-black border-b border-[#2a2a2a] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Annotation</h2>
          <input
            type="text"
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 bg-black border border-[#2a2a2a] rounded text-gray-300 placeholder-gray-500 w-80"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Épaisseur */}
          <div className="flex items-center gap-2 border-r border-[#2a2a2a] pr-3 mr-2">
            <span className="text-xs text-gray-400">Épaisseur</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 h-1"
            />
            <span className="text-xs text-gray-300 w-6">{strokeWidth}</span>
          </div>

          {/* Opacité */}
          <div className="flex items-center gap-2 border-r border-[#2a2a2a] pr-3 mr-2">
            <span className="text-xs text-gray-400">Opacité</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={strokeOpacity}
              onChange={(e) => setStrokeOpacity(Number(e.target.value))}
              className="w-20 h-1"
            />
            <span className="text-xs text-gray-300 w-8">{Math.round(strokeOpacity * 100)}%</span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-r border-[#2a2a2a] pr-3 mr-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 bg-black border border-[#2a2a2a] px-3 py-1 rounded min-w-[60px] text-center">
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
        <div className="bg-black border-r border-[#2a2a2a] p-4 w-20 flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setCurrentTool(AnnotationType.TRAJECTORY)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TRAJECTORY ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.LINE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.LINE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.ARROW)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.ARROW ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.CIRCLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.CIRCLE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <Circle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.RECTANGLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.RECTANGLE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <Square className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.TEXT)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TEXT ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
          >
            <Type className="h-5 w-5" />
          </button>

          <div className="h-px bg-[#2a2a2a] my-2" />

          {/* Outils d'aide */}
          <button
            onClick={() => {
              setMoveMode(!moveMode);
              if (!moveMode) {
                setSelectedAnnotation(null);
              }
            }}
            className={`p-3 rounded transition-colors ${
              moveMode ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
            title="Déplacer les formes"
          >
            <Move className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setEdgeDetectionEnabled(!edgeDetectionEnabled);
              setBackgroundRemoved(false);
            }}
            className={`p-3 rounded transition-colors ${
              edgeDetectionEnabled ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
            title="Suivre les arêtes (pour traits main levée)"
          >
            <Scan className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setBackgroundRemoved(!backgroundRemoved);
              setEdgeDetectionEnabled(false);
            }}
            className={`p-3 rounded transition-colors ${
              backgroundRemoved ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#2a2a2a]'
            }`}
            title="Supprimer le fond"
          >
            <Eraser className="h-5 w-5" />
          </button>

          <div className="h-px bg-[#2a2a2a] my-2" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-3 rounded bg-black hover:bg-[#1a1a1a] border border-[#2a2a2a] transition-colors w-full"
            >
              <Palette className="h-5 w-5" style={{ color: currentColor }} />
            </button>
            {showColorPicker && (
              <div className="absolute left-full ml-2 top-0 bg-black border border-[#2a2a2a] rounded-lg p-2 z-10 grid grid-cols-2 gap-2">
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
              <div className="h-px bg-[#2a2a2a] my-2" />
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
          className="flex-1 overflow-auto bg-black p-4 flex items-center justify-center"
        >
          <div style={{ display: 'inline-block', lineHeight: 0 }}>
            <canvas
              ref={canvasRef}
              className={moveMode ? 'cursor-move' : 'cursor-crosshair'}
              style={{
                display: 'block',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                imageRendering: zoom > 2 ? 'auto' : 'crisp-edges',
                maxWidth: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
