import { useState, useRef, useEffect } from 'react';
import { X, Save, Undo, Redo, Pencil, ArrowRight, Circle, Square, Minus, Type, Palette, Scan, ZoomIn, ZoomOut } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const edgeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [currentTool, setCurrentTool] = useState<DrawingTool>(AnnotationType.TRAJECTORY);
  const [currentColor, setCurrentColor] = useState<string>('#ff5722');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(annotatedImage.annotations || []);
  const [history, setHistory] = useState<Annotation[][]>([annotatedImage.annotations || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [description, setDescription] = useState(annotatedImage.description || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState(false);
  const [showEdgeOverlay, setShowEdgeOverlay] = useState(false);
  const [edgeMap, setEdgeMap] = useState<number[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

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
    const url = createImageUrl(annotatedImage.image.blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [annotatedImage.image.blob]);

  // Fonction de détection d'arêtes avec filtre de Sobel
  const detectEdges = (imageData: ImageData): number[][] => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Convertir en niveaux de gris
    const gray: number[][] = [];
    for (let y = 0; y < height; y++) {
      gray[y] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // Conversion en niveaux de gris (luminosité)
        gray[y][x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
    }

    // Opérateurs de Sobel
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    // Calculer les gradients
    const edges: number[][] = [];
    for (let y = 0; y < height; y++) {
      edges[y] = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          edges[y][x] = 0;
          continue;
        }

        let gx = 0;
        let gy = 0;

        // Appliquer les filtres de Sobel
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = gray[y + ky][x + kx];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }

        // Magnitude du gradient
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        // Seuillage (ajustable selon les besoins)
        edges[y][x] = magnitude > 50 ? magnitude : 0;
      }
    }

    return edges;
  };

  // Trouver l'arête la plus proche d'un point
  const findNearestEdge = (point: Point, searchRadius: number = 20): Point | null => {
    if (!edgeDetectionEnabled || edgeMap.length === 0) return null;

    const x = Math.round(point.x);
    const y = Math.round(point.y);

    let maxEdgeStrength = 0;
    let bestPoint: Point | null = null;

    // Rechercher dans un rayon autour du point
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (ny >= 0 && ny < edgeMap.length && nx >= 0 && nx < edgeMap[0].length) {
          const edgeStrength = edgeMap[ny][nx];

          // Trouver l'arête la plus forte dans le rayon
          if (edgeStrength > maxEdgeStrength) {
            maxEdgeStrength = edgeStrength;
            bestPoint = { x: nx, y: ny };
          }
        }
      }
    }

    // Seuil minimum pour considérer qu'il y a une arête
    return maxEdgeStrength > 50 ? bestPoint : null;
  };

  // Dessiner l'overlay des arêtes
  const drawEdgeOverlay = () => {
    if (!edgeCanvasRef.current || edgeMap.length === 0) return;

    const canvas = edgeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < edgeMap.length; y++) {
      for (let x = 0; x < edgeMap[0].length; x++) {
        const i = (y * canvas.width + x) * 4;
        const edgeStrength = edgeMap[y][x];

        if (edgeStrength > 50) {
          // Arêtes en cyan semi-transparent
          data[i] = 0;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = Math.min(edgeStrength, 150);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Dessiner sur le canvas
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Ajuster la taille du canvas à l'image
      canvas.width = img.width;
      canvas.height = img.height;

      // Ajuster la taille du canvas d'arêtes
      if (edgeCanvasRef.current) {
        edgeCanvasRef.current.width = img.width;
        edgeCanvasRef.current.height = img.height;
      }

      // Dessiner l'image
      ctx.drawImage(img, 0, 0);

      // Effectuer la détection d'arêtes si le mode est activé
      if (edgeDetectionEnabled && edgeMap.length === 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const edges = detectEdges(imageData);
        setEdgeMap(edges);
      }

      // Dessiner les annotations
      annotations.forEach(annotation => {
        drawAnnotation(ctx, annotation);
      });
    };
    img.src = imageUrl;
  }, [imageUrl, annotations, edgeDetectionEnabled]);

  // Mettre à jour l'overlay des arêtes
  useEffect(() => {
    if (showEdgeOverlay && edgeMap.length > 0) {
      drawEdgeOverlay();
    } else if (edgeCanvasRef.current) {
      const ctx = edgeCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, edgeCanvasRef.current.width, edgeCanvasRef.current.height);
      }
    }
  }, [showEdgeOverlay, edgeMap]);

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

    // Dessiner le label si présent
    if (annotation.label && points.length > 0) {
      const labelPoint = points[points.length - 1];
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = annotation.color;
      const metrics = ctx.measureText(annotation.label);
      const padding = 4;

      // Fond du label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(
        labelPoint.x - padding,
        labelPoint.y - 20 - padding,
        metrics.width + padding * 2,
        20 + padding * 2
      );

      // Texte du label
      ctx.fillStyle = annotation.color;
      ctx.fillText(annotation.label, labelPoint.x, labelPoint.y - 5);
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const headLength = 15;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Ligne
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Pointe de la flèche
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

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setStartPoint(point);

    if (currentTool === AnnotationType.TRAJECTORY) {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: AnnotationType.TRAJECTORY,
        points: [point],
        color: currentColor,
        createdAt: new Date(),
      };
      setAnnotations([...annotations, newAnnotation]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    let point = getCanvasPoint(e);

    // Appliquer le snapping aux arêtes pour le mode TRAJECTORY
    if (currentTool === AnnotationType.TRAJECTORY && edgeDetectionEnabled) {
      const snappedPoint = findNearestEdge(point, 20);
      if (snappedPoint) {
        point = snappedPoint;
      }
    }

    if (currentTool === AnnotationType.TRAJECTORY) {
      setAnnotations(prev => {
        const updated = [...prev];
        const lastAnnotation = updated[updated.length - 1];
        if (lastAnnotation && lastAnnotation.type === AnnotationType.TRAJECTORY && lastAnnotation.points) {
          lastAnnotation.points.push(point);
        }
        return updated;
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const endPoint = getCanvasPoint(e);

    if (currentTool !== AnnotationType.TRAJECTORY) {
      let text: string | undefined;
      if (currentTool === AnnotationType.TEXT) {
        text = prompt('Entrez le texte:') || undefined;
        if (!text) {
          setIsDrawing(false);
          setStartPoint(null);
          return;
        }
      }

      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: currentTool,
        points: currentTool === AnnotationType.TEXT ? [startPoint] : [startPoint, endPoint],
        color: currentColor,
        text,
        createdAt: new Date(),
      };

      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      addToHistory(updatedAnnotations);
    } else {
      addToHistory(annotations);
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...history[historyIndex - 1]]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...history[historyIndex + 1]]);
    }
  };

  const handleSave = () => {
    onSave(annotations, description);
    toast.success('Annotations enregistrées');
  };

  const toggleEdgeDetection = () => {
    const newState = !edgeDetectionEnabled;
    setEdgeDetectionEnabled(newState);

    if (newState) {
      // Activer la détection d'arêtes
      if (canvasRef.current && edgeMap.length === 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const edges = detectEdges(imageData);
          setEdgeMap(edges);
          toast.success('Détection d\'arêtes activée');
        }
      }
      setShowEdgeOverlay(true);
    } else {
      // Désactiver la détection d'arêtes
      setShowEdgeOverlay(false);
      toast.info('Détection d\'arêtes désactivée');
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">{annotatedImage.image.name}</h2>
          <input
            type="text"
            placeholder="Description de l'image..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.25}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 w-16 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 5}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetZoom} title="Réinitialiser le zoom">
              <span className="text-xs">1:1</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex === 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
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

      <div className="flex-1 flex">
        {/* Toolbar */}
        <div className="bg-gray-900 border-r border-gray-700 p-4 w-20 flex flex-col gap-2">
          <button
            onClick={toggleEdgeDetection}
            className={`p-3 rounded transition-colors ${
              edgeDetectionEnabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="Détection d'arêtes"
          >
            <Scan className="h-5 w-5" />
          </button>

          <div className="h-px bg-gray-700 my-2" />

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

        {/* Canvas */}
        <div
          className="flex-1 overflow-auto flex items-center justify-center p-8 bg-gray-950"
          onWheel={handleWheel}
        >
          <div
            className="relative"
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair"
              style={{
                imageRendering: zoom > 1 ? 'auto' : 'crisp-edges',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
            <canvas
              ref={edgeCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                imageRendering: zoom > 1 ? 'auto' : 'crisp-edges',
                opacity: showEdgeOverlay ? 0.6 : 0,
                transition: 'opacity 0.3s'
              }}
            />
            {edgeDetectionEnabled && (
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <Scan className="h-4 w-4" />
                <span>Détection d'arêtes activée</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
