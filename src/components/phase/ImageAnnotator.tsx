import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Undo, Redo, Pencil, ArrowRight, Circle, Square, Minus, Type, Palette, ZoomIn, ZoomOut, Scan, Move } from 'lucide-react';
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

  // État du déplacement (non React pour performance)
  const dragState = useRef({
    start: null as Point | null,
    initialPoints: [] as Point[],
  });

  // État pour le suivi d'arêtes (pour assurer la continuité)
  const lastEdgePoint = useRef<Point | null>(null);

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

  // Lissage des points du tracé à main levée
  const smoothPoints = (points: Point[]): Point[] => {
    if (points.length < 3) return points;

    // Étape 1: Simplifier les points (réduire les points redondants)
    const simplified: Point[] = [points[0]];
    const minDistance = 5; // Distance minimale entre deux points

    for (let i = 1; i < points.length; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = points[i];
      const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);

      if (dist >= minDistance) {
        simplified.push(curr);
      }
    }

    // Toujours ajouter le dernier point
    if (simplified[simplified.length - 1] !== points[points.length - 1]) {
      simplified.push(points[points.length - 1]);
    }

    // Étape 2: Lissage avec moyenne mobile
    const smoothed: Point[] = [simplified[0]];
    const windowSize = 3;

    for (let i = 1; i < simplified.length - 1; i++) {
      let sumX = 0, sumY = 0, count = 0;

      for (let j = Math.max(0, i - Math.floor(windowSize / 2));
           j <= Math.min(simplified.length - 1, i + Math.floor(windowSize / 2));
           j++) {
        sumX += simplified[j].x;
        sumY += simplified[j].y;
        count++;
      }

      smoothed.push({
        x: sumX / count,
        y: sumY / count
      });
    }

    smoothed.push(simplified[simplified.length - 1]);
    return smoothed;
  };

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

  // Suivre une arête à partir d'un point (version améliorée avec continuité)
  const snapToEdge = (point: Point, imageData: ImageData): Point => {
    const searchRadius = 8;
    const minGradient = 30; // Seuil minimal pour détecter une arête
    let maxScore = -Infinity;
    let bestPoint = point;

    // Si on a un point précédent, on favorise la continuité
    const prevPoint = lastEdgePoint.current || point;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const x = Math.round(point.x + dx);
        const y = Math.round(point.y + dy);

        const gradient = getEdgeGradient(imageData, x, y);

        // Skip si pas assez de gradient
        if (gradient.magnitude < minGradient) continue;

        // Calcul de la distance au point précédent (favorise la continuité)
        const distToPrev = Math.sqrt((x - prevPoint.x) ** 2 + (y - prevPoint.y) ** 2);
        const distToCurrent = Math.sqrt(dx * dx + dy * dy);

        // Score combinant gradient (priorité) et continuité (bonus)
        // Plus le gradient est fort, mieux c'est
        // Plus on est proche du chemin précédent, mieux c'est
        const gradientScore = gradient.magnitude;
        const continuityBonus = distToPrev < 3 ? 50 : (distToPrev < 5 ? 20 : 0);
        const proximityPenalty = distToCurrent * 2; // Pénalité légère pour les points éloignés

        const score = gradientScore + continuityBonus - proximityPenalty;

        if (score > maxScore) {
          maxScore = score;
          bestPoint = { x, y };
        }
      }
    }

    // Lissage du résultat avec le point précédent
    if (lastEdgePoint.current && maxScore > minGradient) {
      const alpha = 0.6; // Coefficient de lissage (0.6 = 60% nouveau, 40% ancien)
      bestPoint = {
        x: alpha * bestPoint.x + (1 - alpha) * lastEdgePoint.current.x,
        y: alpha * bestPoint.y + (1 - alpha) * lastEdgePoint.current.y,
      };
    }

    // Sauvegarder pour le prochain point
    lastEdgePoint.current = bestPoint;

    return maxScore > minGradient ? bestPoint : point;
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

    // Dessiner l'image
    ctx.drawImage(img, 0, 0);

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
  }, [annotations, loaded, selectedAnnotation, strokeWidth, strokeOpacity]);

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
          dragState.current.start = point;
          dragState.current.initialPoints = clickedAnn.points ? [...clickedAnn.points] : [];
        } else {
          setSelectedAnnotation(null);
        }
        return;
      }

      // Réinitialiser le suivi d'arêtes pour un nouveau tracé
      lastEdgePoint.current = null;

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
      if (moveMode && selectedAnnotation && dragState.current.start && dragState.current.initialPoints.length > 0) {
        const dx = point.x - dragState.current.start.x;
        const dy = point.y - dragState.current.start.y;

        const movedPoints = dragState.current.initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
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
        if (selectedAnnotation && dragState.current.start) {
          // Sauvegarder dans l'historique
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push([...annotations]);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
        dragState.current.start = null;
        dragState.current.initialPoints = [];
        return;
      }

      if (!drawing.current.active) return;

      const point = getCanvasPoint(e);
      let finalPoints = drawing.current.points;

      if (currentTool !== AnnotationType.TRAJECTORY) {
        finalPoints = [drawing.current.startPoint!, point];
      } else {
        // Appliquer le lissage pour les trajectoires
        finalPoints = smoothPoints(finalPoints);
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
      <div className="bg-black border-b border-[#323232] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Annotation</h2>
          <input
            type="text"
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 bg-black border border-[#323232] rounded text-gray-300 placeholder-gray-500 w-80"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Épaisseur */}
          <div className="flex items-center gap-2 border-r border-[#323232] pr-3 mr-2">
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
          <div className="flex items-center gap-2 border-r border-[#323232] pr-3 mr-2">
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
          <div className="flex items-center gap-1 border-r border-[#323232] pr-3 mr-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 bg-black border border-[#323232] px-3 py-1 rounded min-w-[60px] text-center">
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
        <div className="bg-black border-r border-[#323232] p-4 w-20 flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setCurrentTool(AnnotationType.TRAJECTORY)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TRAJECTORY ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.LINE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.LINE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.ARROW)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.ARROW ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.CIRCLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.CIRCLE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
          >
            <Circle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.RECTANGLE)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.RECTANGLE ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
          >
            <Square className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentTool(AnnotationType.TEXT)}
            className={`p-3 rounded transition-colors ${
              currentTool === AnnotationType.TEXT ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
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
              moveMode ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
            title="Déplacer les formes"
          >
            <Move className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setEdgeDetectionEnabled(!edgeDetectionEnabled);
            }}
            className={`p-3 rounded transition-colors ${
              edgeDetectionEnabled ? 'bg-primary text-white' : 'bg-black text-gray-400 hover:bg-[#1a1a1a] border border-[#323232]'
            }`}
            title="Suivre les arêtes (pour traits main levée)"
          >
            <Scan className="h-5 w-5" />
          </button>

          <div className="h-px bg-[#2a2a2a] my-2" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-3 rounded bg-black hover:bg-[#1a1a1a] border border-[#323232] transition-colors w-full"
            >
              <Palette className="h-5 w-5" style={{ color: currentColor }} />
            </button>
            {showColorPicker && (
              <div className="absolute left-full ml-2 top-0 bg-black border border-[#323232] rounded-lg p-2 z-10 grid grid-cols-5 gap-2">
                {toolColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setCurrentColor(color.value);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded border-2 border-[#323232] hover:border-primary transition-colors"
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
                  className="w-full h-8 rounded border-2 border-[#323232] hover:border-primary transition-colors"
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
