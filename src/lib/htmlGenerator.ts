import { Procedure, Phase, AnnotatedImage, SubStep, StepTool } from '../types';
import { renderAllAnnotatedImagesToBase64 } from './imageAnnotationRenderer';

/**
 * Migre l'ancien format d'outil (toolId, toolName...) vers le nouveau format (tools array)
 */
function migrateStepTools(step: SubStep): StepTool[] {
  // Si le nouveau format existe déjà, l'utiliser
  if (step.tools && step.tools.length > 0) {
    return step.tools;
  }

  // Sinon, migrer l'ancien format
  if (step.toolId && step.toolName) {
    return [{
      id: step.toolId,
      name: step.toolName,
      location: step.toolLocation || null,
      reference: step.toolReference || null,
      color: step.toolColor || null,
      imageUrl: step.toolImageUrl || null,
    }];
  }

  return [];
}

/**
 * Génère un fichier HTML complet et stylisé pour une procédure
 */
export async function generateHTML(
  procedure: Procedure,
  phases: Phase[],
  availableTools?: any[]
): Promise<void> {
  // Réinitialiser l'index vidéo pour ce nouvel export
  resetVideoIndex();

  // Collecter toutes les images annotées
  const allAnnotatedImages: AnnotatedImage[] = [];

  console.log('=== DEBUG: Generating HTML ===');
  console.log('Procedure:', procedure.designation);
  console.log('Number of phases:', phases.length);

  phases.forEach((phase, phaseIdx) => {
    console.log(`Phase ${phaseIdx + 1}: ${phase.title}, steps:`, phase.steps.length);
    phase.steps.forEach((step, stepIdx) => {
      if (step.images) {
        console.log(`  Step ${stepIdx + 1}: ${step.images.length} images`);
        step.images.forEach((img, imgIdx) => {
          console.log(`    Image ${imgIdx + 1}:`, {
            imageId: img.imageId,
            hasAnnotations: img.annotations && img.annotations.length > 0,
            annotationsCount: img.annotations?.length || 0,
            description: img.description
          });
        });
        allAnnotatedImages.push(...step.images);
      }
    });
  });

  if (procedure.defects) {
    procedure.defects.forEach(defect => {
      if (defect.images) {
        allAnnotatedImages.push(...defect.images);
      }
    });
  }

  // Créer une map des outils avec leurs données depuis availableTools ou globalTools
  const toolDataMap = new Map<string, { imageUrl?: string; location?: string }>();
  const toolsSource = availableTools || procedure.globalTools || [];
  console.log('Available tools count:', toolsSource.length);
  console.log('First 3 tools:', toolsSource.slice(0, 3).map((t: any) => ({
    id: t.id,
    name: t.name,
    hasImage: !!t.image,
    hasImageUrl: !!t.image?.url,
    location: t.location,
    imageKeys: t.image ? Object.keys(t.image) : []
  })));

  if (toolsSource && toolsSource.length > 0) {
    toolsSource.forEach((tool: any) => {
      toolDataMap.set(tool.id, {
        imageUrl: tool.image?.url || null,
        location: tool.location || null
      });
    });
  }
  console.log('Tool data map size:', toolDataMap.size);
  console.log('Tools source:', availableTools ? 'availableTools' : 'globalTools');

  // Enrichir les step.tools avec les imageUrl et location depuis globalTools
  phases.forEach(phase => {
    phase.steps.forEach(step => {
      if (step.tools && step.tools.length > 0) {
        step.tools = step.tools.map(tool => {
          const toolData = toolDataMap.get(tool.id);
          return {
            ...tool,
            imageUrl: tool.imageUrl || toolData?.imageUrl || null,
            location: tool.location || toolData?.location || null
          };
        });
      }
    });
  });

  // Rendre toutes les images avec annotations en base64
  console.log('Generating HTML for', allAnnotatedImages.length, 'images');
  const renderedImageUrls = await renderAllAnnotatedImagesToBase64(allAnnotatedImages);
  console.log('Rendered URLs map size:', renderedImageUrls.size);
  renderedImageUrls.forEach((url, imageId) => {
    console.log(`Image ${imageId}:`, url.substring(0, 50) + '...');
  });
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(procedure.designation || procedure.title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            overflow-x: hidden;
            max-width: 100vw;
        }

        /* Variables CSS */
        :root {
            --primary-color: #f93705;
            --primary-dark: #d42f00;
            --text-primary: #1a1a1a;
            --text-secondary: #555;
            --text-muted: #999;
            --border-color: #e0e0e0;
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --spacing-xs: 8px;
            --spacing-sm: 16px;
            --spacing-md: 24px;
            --spacing-lg: 32px;
            --spacing-xl: 48px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: var(--text-primary);
            background: linear-gradient(to bottom, #f5f7fa 0%, #f8f9fa 100%);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            max-width: 100vw;
            font-size: 1rem;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Container principal */
        .container {
            margin: 0 auto;
            background: transparent;
            width: 90%;
            max-width: 1400px;
            overflow-x: hidden;
            padding: var(--spacing-md) 0;
        }

        /* En-tête */
        .header {
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
            color: var(--text-primary);
            padding: var(--spacing-xl) var(--spacing-lg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            border: 1px solid rgba(0, 0, 0, 0.05);
            margin-bottom: var(--spacing-lg);
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }

        .version-badge {
            display: inline-block;
            background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%);
            color: var(--text-secondary);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            border: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            letter-spacing: 0.5px;
        }

        .header-title {
            font-size: 2.2rem;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 2px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-designation {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--spacing-sm);
            text-align: left;
            line-height: 1.2;
        }

        .header-reference {
            font-size: 1.8rem;
            color: var(--primary-color);
            font-weight: 600;
            margin-bottom: var(--spacing-md);
            text-align: left;
            padding: var(--spacing-xs) 0;
            border-left: 4px solid var(--primary-color);
            padding-left: var(--spacing-sm);
        }

        .description {
            font-size: 1rem;
            color: #555;
            margin-bottom: 25px;
        }

        ${procedure.coverImage ? `
        .cover-image {
            width: 100%;
            max-width: 500px;
            height: auto;
            margin: 25px auto 0;
            display: block;
            border-radius: 4px;
        }
        ` : ''}

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 15px;
        }

        .tag {
            background: #d0d0d0;
            color: #2c3e50;
            padding: 4px 12px;
            border-radius: 3px;
            font-size: 0.85rem;
        }

        .meta-info {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        }

        .document-version {
            margin-top: 20px;
            text-align: right;
            font-size: 0.85rem;
            color: #999;
            font-style: italic;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            color: #555;
        }

        .meta-label {
            font-weight: 600;
        }

        /* Contenu */
        .content {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
        }

        /* Ressources globales */
        .resources {
            background: var(--bg-primary);
            margin-bottom: var(--spacing-lg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            width: 100%;
            max-width: 100%;
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-left: 4px solid var(--primary-color);
            overflow: hidden;
            transition: box-shadow 0.2s ease;
            box-sizing: border-box;
        }

        .resources:hover {
            box-shadow: var(--shadow-lg);
        }

        /* Défauthèque */
        .defects-section {
            background: var(--bg-primary);
            margin-bottom: var(--spacing-lg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            border: 1px solid rgba(0, 0, 0, 0.06);
            overflow: hidden;
            width: 100%;
            max-width: 100%;
            transition: box-shadow 0.2s ease;
            box-sizing: border-box;
        }

        .defects-section:hover {
            box-shadow: var(--shadow-lg);
        }

        .defects-header {
            padding: var(--spacing-md) var(--spacing-lg);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-sm);
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .defects-header:hover {
            background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
        }

        .defects-header h2 {
            color: #1a1a1a;
            font-size: 1.8rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin: 0 0 3px 0;
            flex: none;
        }

        .defects-subtitle {
            font-size: 0.82rem;
            font-weight: 400;
            color: #bbb;
            letter-spacing: 0;
        }

        .defects-header-content {
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .defects-count-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #ef4444;
            color: white;
            font-size: 0.8rem;
            font-weight: 700;
            padding: 3px 12px;
            border-radius: 20px;
            letter-spacing: 0.3px;
            flex-shrink: 0;
        }

        .defects-toggle-icon {
            display: none;
        }

        .defects-content {
            padding: var(--spacing-lg);
            overflow: hidden;
            transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out, padding 0.4s ease-in-out;
            max-height: 10000px;
            opacity: 1;
        }

        .defects-content.collapsed {
            max-height: 0;
            opacity: 0;
            padding: 0 var(--spacing-lg);
            transition: max-height 0.4s ease-in-out, opacity 0.2s ease-in-out, padding 0.4s ease-in-out;
        }

        .defects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
            align-items: stretch;
        }

        @media (max-width: 860px) {
            .defects-grid { grid-template-columns: 1fr; }
        }

        /* Carte défaut */
        .defect-item {
            background: #fff;
            border-radius: var(--radius-md);
            border: 1px solid #e8e8e8;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: box-shadow 0.2s ease;
            display: flex;
            flex-direction: column;
        }
        .defect-item:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .defect-item.criteria-non-acceptable {
            background: #fff;
        }
        .defect-item.criteria-a-retoucher {
            background: #fff;
        }
        .defect-item.criteria-acceptable {
            background: #fff;
        }

        .defect-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: rgba(0,0,0,0.025);
            border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .defect-card-number {
            font-size: 0.72rem;
            font-weight: 700;
            color: #bbb;
            text-transform: uppercase;
            letter-spacing: 1.2px;
        }
        .defect-criteria-badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
        .defect-criteria-badge.non-acceptable {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fca5a5;
        }
        .defect-criteria-badge.a-retoucher {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
        }
        .defect-criteria-badge.acceptable {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }

        .defect-card-body {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
        }

        .defect-block {
            padding: 11px 14px;
            border-radius: 8px;
            line-height: 1.65;
        }
        .defect-block-red {
            background: #fff5f5;
            border-left: 3px solid #ef4444;
        }
        .defect-block-green {
            background: #f0fdf7;
            border-left: 3px solid #10b981;
        }
        .defect-block-label {
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 5px;
        }
        .defect-block-red  .defect-block-label { color: #ef4444; }
        .defect-block-green .defect-block-label { color: #10b981; }
        .defect-block-text {
            font-size: 0.92rem;
            color: #333;
        }

        .defect-description {
            color: #555;
            line-height: 1.6;
        }

        @media print {
            .defects-grid { grid-template-columns: repeat(2, 1fr); }
            .defect-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        }

        .resources h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.3rem;
            font-weight: 600;
            padding: var(--spacing-lg) var(--spacing-lg) 0;
        }

        .resources h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            padding: 0 var(--spacing-lg);
        }

        .resources p {
            padding: 0 var(--spacing-lg);
        }

        .resource-list {
            list-style: none;
            padding: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .resource-item {
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .resource-item:last-child {
            border-bottom: none;
        }

        .resource-name {
            font-weight: 600;
            color: #2c3e50;
        }

        .resource-ref {
            color: rgb(249, 55, 5);
            font-weight: 600;
        }

        .resource-desc {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }

        /* Phases */
        .phase {
            margin-bottom: var(--spacing-lg);
            break-inside: avoid;
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-md);
            border: 1px solid rgba(0, 0, 0, 0.06);
            width: 100%;
            max-width: 100%;
            transition: box-shadow 0.2s ease;
            box-sizing: border-box;
        }

        .phase:hover {
            box-shadow: var(--shadow-lg);
        }

        .phase:last-child {
            margin-bottom: 80px;
        }

        .phase-header {
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
            padding: var(--spacing-md) var(--spacing-lg);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-sm);
            cursor: pointer;
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }


        .phase-title {
            font-size: 1.8rem;
            font-weight: 700;
            word-wrap: break-word;
            overflow-wrap: break-word;
            flex: 1;
            letter-spacing: 0.5px;
            color: #444;
        }

        .phase-badges {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .difficulty-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .phase-time-badge {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
            color: var(--text-secondary);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            white-space: nowrap;
            border: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .phase-toggle-icon {
            display: none;
        }

        .phase-content {
            overflow: hidden;
            transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out;
            max-height: 5000px;
            opacity: 1;
        }

        .phase-content.collapsed {
            max-height: 0;
            opacity: 0;
            transition: max-height 0.4s ease-in-out, opacity 0.2s ease-in-out;
        }

        .phase-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 0.9rem;
            color: #555;
        }

        .phase-meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Étapes */
        .steps {
            padding: var(--spacing-lg);
            background: #fafafa;
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
        }

        .step {
            margin-bottom: var(--spacing-md);
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.04);
            border-radius: var(--radius-md);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            width: 100%;
            transition: all 0.2s ease;
        }

        .step:hover {
            border-color: rgba(0, 0, 0, 0.08);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .step:last-child {
            margin-bottom: 0;
        }

        .step-header {
            padding: var(--spacing-md);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
            border-radius: var(--radius-sm) var(--radius-sm) 0 0;
            transition: background 0.3s ease;
            min-height: 60px;
        }


        .step-label {
            font-size: 1.3rem;
            font-weight: 700;
            color: #444;
            letter-spacing: 0.3px;
            flex: 1;
        }

        .step-toggle-icon {
            display: none;
        }

        .step-content {
            overflow: hidden;
            padding: var(--spacing-md);
            transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            max-height: 10000px;
            opacity: 1;
        }

        .step-content.collapsed {
            max-height: 0;
            opacity: 0;
            padding: 0 !important;
            border: none;
            pointer-events: none;
            transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .step-description {
            color: #555;
            line-height: 1.8;
            font-size: 1.1rem;
        }

        .step-description-box {
            color: #2c3e50;
            line-height: 1.8;
            font-size: 1rem;
            margin-bottom: 16px;
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .step-description-title {
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: #1a1a1a;
        }

        .desc-scroll {
            max-height: 280px;
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid #e4e4e4;
            border-radius: 8px;
            padding: 12px;
            scrollbar-width: thin;
            scrollbar-color: #d0d0d0 transparent;
        }
        .desc-scroll::-webkit-scrollbar { width: 4px; }
        .desc-scroll::-webkit-scrollbar-track { background: transparent; }
        .desc-scroll::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 4px; }
        .desc-scroll::-webkit-scrollbar-thumb:hover { background: #b0b0b0; }
        body.dark-mode .desc-scroll { border-color: #333; scrollbar-color: #444 transparent; }
        body.dark-mode .desc-scroll::-webkit-scrollbar-thumb { background: #444; }
        body.dark-mode .desc-scroll::-webkit-scrollbar-thumb:hover { background: #555; }

        .step-description-content {
            color: #555;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .step-description-content ul,
        .step-description-content ol {
            margin-left: 0;
            padding-left: 20px;
        }

        .step-description-content li {
            margin-bottom: 4px;
        }

        .step-tool-box {
            border-radius: 6px;
            padding: 8px 10px;
            background: #fafafa;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .step-tool-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 6px;
            border: 2px solid #d1d5db;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            flex-shrink: 0;
        }

        .step-tool-image:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
            border-color: #9ca3af;
        }

        /* Modal pour agrandir l'image */
        .image-modal {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            justify-content: center;
            align-items: center;
        }

        .image-modal.active {
            display: flex;
        }

        .image-modal img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 8px;
        }

        .image-modal-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
        }

        .image-modal-close:hover {
            color: #ccc;
        }

        .step-tool-info {
            flex: 1;
            min-width: 0;
            overflow: hidden;
        }

        .step-tool-title {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 8px;
            color: #1a1a1a;
        }

        .step-tool-name {
            font-weight: 600;
            font-size: 0.85rem;
            color: #2c3e50;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
        }

        .step-tool-info-label {
            font-weight: 600;
            font-size: 0.85rem;
            margin-bottom: 6px;
            color: #1a1a1a;
        }

        .step-tool-location-badge {
            display: inline-block;
            background: #e5e7eb;
            color: #4b5563;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-top: 4px;
        }

        .step-details-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin: 20px 0;
        }

        .step-bottom-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
        }

        .step-tools-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
        }

        .step-tools-column {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-width: 0;
            overflow: hidden;
        }

        .step-tool {
            background: rgba(16, 185, 129, 0.1);
            padding: 18px 20px;
            border-left: 4px solid #10b981;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.1);
        }

        .step-tool-label {
            font-weight: 700;
            color: #059669;
            display: block;
            margin-bottom: 8px;
            font-size: 1.05rem;
        }

        .step-tool-ref {
            color: rgb(249, 55, 5);
            font-weight: 600;
            font-size: 0.8rem;
            margin-top: 2px;
        }

        .step-tool-location {
            color: #666;
            font-size: 0.75rem;
            margin-top: 2px;
        }

        .step-tool-details {
            font-size: 0.85rem;
            color: #666;
            margin-top: 4px;
        }

        .step-time {
            color: #666;
            font-size: 0.85rem;
            margin-top: 10px;
        }

        /* Images */
        .step-images {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 24px;
            max-width: 100%;
        }

        .step-image-wrapper {
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            max-width: 100%;
        }

        .step-image {
            width: 100%;
            height: auto;
            display: block;
            max-width: 100%;
        }

        .step-image-desc {
            padding: 12px 16px;
            background: #f8f9fa;
            font-size: 0.9rem;
            color: #666;
        }

        /* Videos */
        .step-videos {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            margin-top: 24px;
        }

        .step-video-wrapper {
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            background: #000;
            position: relative;
            width: 100%;
            padding-bottom: 56.25%; /* Aspect ratio 16:9 */
        }

        .step-video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: block;
            border: none;
        }

        .step-video-link {
            display: block;
            padding: 16px;
            background: #f8f9fa;
            text-align: center;
            color: rgb(249, 55, 5);
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
        }

        .step-video-link:hover {
            background: #e8e9ea;
        }

        /* Conseils (touches de vert) */
        .tips {
        }

        .tips-title {
            font-weight: 700;
            color: #059669;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .safety-notes-title {
            font-weight: 700;
            color: #ef4444;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .tip-item {
            padding: 4px 0;
            color: #555;
            line-height: 1.5;
            font-size: 0.9rem;
        }

        /* Consignes de sécurité (touches de rouge) */
        .safety-notes {
        }

        .safety-note {
            padding: 0;
            margin-bottom: 8px;
        }

        .safety-note:last-child {
            margin-bottom: 0;
        }

        .safety-note.warning,
        .safety-note.danger {
            background: transparent;
            border: none;
            box-shadow: none;
        }

        .safety-note-title {
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .safety-note.warning .safety-note-title,
        .safety-notes .safety-note-title {
            color: #ef4444;
        }

        .safety-note.danger .safety-note-title {
            color: #dc2626;
        }

        .safety-note > div:last-child {
            color: #555;
            line-height: 1.5;
            font-size: 0.9rem;
        }


        /* Carrousels */
        .carousel-container {
            position: relative;
            background: transparent;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 100%;
        }

        .carousel-wrapper {
            position: relative;
            max-width: 100%;
            overflow: hidden;
            min-height: 500px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
        }

        .carousel-items {
            display: flex;
            transition: transform 0.4s ease-in-out;
            height: 500px;
        }

        .carousel-item {
            min-width: 100%;
            height: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .carousel-item img {
            width: 100%;
            height: 500px;
            object-fit: contain;
            background: transparent;
            cursor: pointer;
            transition: opacity 0.3s ease;
        }

        .carousel-item img:hover {
            opacity: 0.95;
        }


        .carousel-button {
            background: #e8e8e8;
            color: #666;
            border: none;
            width: 54px;
            height: 54px;
            flex-shrink: 0;
            cursor: pointer;
            font-size: 1.6rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            transition: background 0.2s ease, color 0.2s ease;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        .carousel-button:hover,
        .carousel-button:active {
            background: #d8d8d8;
            color: #333;
        }

        body.dark-mode .carousel-button {
            background: rgba(255,255,255,0.1);
            color: #aaa;
        }

        body.dark-mode .carousel-button:hover,
        body.dark-mode .carousel-button:active {
            background: rgba(255,255,255,0.18);
            color: #e0e0e0;
        }

        .carousel-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 10px 0 6px;
        }

        .carousel-indicators {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: #f8f9fa;
        }

        .carousel-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #d0d0d0;
            cursor: pointer;
            transition: background 0.3s, transform 0.3s;
        }

        .carousel-indicator.active {
            background: #f93705;
            transform: scale(1.2);
        }

        .carousel-counter {
            text-align: center;
            padding: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
        }

        /* Défauthèque - Images format 1:1 */
        .defect-item .carousel-container {
            width: 100%;
            aspect-ratio: 1 / 1;
            display: flex;
            flex-direction: column;
        }

        .defect-item .carousel-wrapper {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            overflow: hidden;
        }

        .defect-item .carousel-items {
            width: 100%;
            height: 100%;
        }

        .defect-item .carousel-item {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .defect-item .carousel-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 4px;
            background: transparent;
        }

        /* Images cliquables pour zoom */
        .carousel-item img,
        .step-image-wrapper img {
            cursor: pointer;
            transition: opacity 0.3s;
        }

        .carousel-item img:hover,
        .step-image-wrapper img:hover {
            opacity: 0.9;
        }

        /* Lightbox / Modal pour agrandir les images */
        .lightbox {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.95);
            justify-content: center;
            align-items: center;
        }

        .lightbox.active {
            display: flex;
        }

        .lightbox-content {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }

        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
        }

        .lightbox-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            font-size: 50px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
            user-select: none;
        }

        .lightbox-nav:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-nav.prev {
            left: 20px;
        }

        .lightbox-nav.next {
            right: 20px;
        }

        .lightbox-counter {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 1rem;
        }

        /* Impression */
        @media print {
            body {
                background: white;
            }

            .phase {
                page-break-inside: avoid;
            }

            .step {
                page-break-inside: avoid;
            }

            .toolbar-capsule {
                display: none;
            }
        }

        /* Mode sombre — couverture complète */
        body.dark-mode {
            --text-primary: #e0e0e0;
            --text-secondary: #aaa;
            --text-muted: #666;
            --border-color: #333;
            --bg-primary: #1e1e1e;
            --bg-secondary: #242424;
            background: linear-gradient(to bottom, #141414 0%, #1a1a1a 100%);
            color: #e0e0e0;
        }
        /* Fonds principaux */
        body.dark-mode .header,
        body.dark-mode .resources,
        body.dark-mode .phase,
        body.dark-mode .step,
        body.dark-mode .carousel-container {
            background: #1e1e1e;
            border-color: #333;
        }
        body.dark-mode .steps {
            background: #181818;
        }
        body.dark-mode .phase-header,
        body.dark-mode .step-header {
            background: linear-gradient(135deg, #252525 0%, #1e1e1e 100%);
            border-color: #333;
        }
        body.dark-mode .phase-header:hover,
        body.dark-mode .step-header:hover {
            background: linear-gradient(135deg, #2c2c2c 0%, #252525 100%);
        }
        /* Défauthèque dark mode */
        body.dark-mode .defects-section {
            background: #1e1e1e;
            border-color: #333;
        }
        body.dark-mode .defects-header {
            background: linear-gradient(135deg, #252525 0%, #1e1e1e 100%);
            border-bottom-color: #2a2a2a;
        }
        body.dark-mode .defects-header:hover {
            background: linear-gradient(135deg, #2c2c2c 0%, #252525 100%);
        }
        body.dark-mode .defect-item {
            background: #1e1e1e;
            border-color: #333;
        }
        body.dark-mode .defect-item.criteria-non-acceptable,
        body.dark-mode .defect-item.criteria-a-retoucher,
        body.dark-mode .defect-item.criteria-acceptable {
            background: #1e1e1e;
        }
        body.dark-mode .defect-card-header {
            background: rgba(255,255,255,0.025);
            border-bottom-color: rgba(255,255,255,0.05);
        }
        body.dark-mode .defect-card-number { color: #555; }
        body.dark-mode .defect-criteria-badge.non-acceptable {
            background: rgba(239,68,68,0.15);
            color: #f87171;
            border-color: rgba(239,68,68,0.35);
        }
        body.dark-mode .defect-criteria-badge.a-retoucher {
            background: rgba(245,158,11,0.15);
            color: #fbbf24;
            border-color: rgba(245,158,11,0.35);
        }
        body.dark-mode .defect-criteria-badge.acceptable {
            background: rgba(34,197,94,0.15);
            color: #4ade80;
            border-color: rgba(34,197,94,0.35);
        }
        body.dark-mode .defect-block-red  { background: rgba(239,68,68,0.08); }
        body.dark-mode .defect-block-green { background: rgba(16,185,129,0.08); }
        body.dark-mode .defect-block-text { color: #ccc; }
        body.dark-mode .step-tool-box,
        body.dark-mode .carousel-indicators {
            background: #242424;
        }
        body.dark-mode .step-image-desc,
        body.dark-mode .step-video-link {
            background: #252525;
            color: #aaa;
        }
        body.dark-mode .step-video-link:hover {
            background: #2e2e2e;
        }
        /* Textes secondaires */
        body.dark-mode .description,
        body.dark-mode .meta-item,
        body.dark-mode .document-version,
        body.dark-mode .defect-description,
        body.dark-mode .resource-desc,
        body.dark-mode .phase-meta,
        body.dark-mode .step-description,
        body.dark-mode .step-description-content,
        body.dark-mode .step-tool-details,
        body.dark-mode .step-tool-location,
        body.dark-mode .step-time,
        body.dark-mode .tip-item,
        body.dark-mode .safety-note > div:last-child {
            color: #aaa;
        }
        body.dark-mode .defects-header h2,
        body.dark-mode .defects-subtitle,
        body.dark-mode .resources h2,
        body.dark-mode .resources h3,
        body.dark-mode .resource-name,
        body.dark-mode .step-description-box,
        body.dark-mode .step-description-title,
        body.dark-mode .step-tool-title,
        body.dark-mode .step-tool-name,
        body.dark-mode .step-tool-info-label {
            color: #d0d0d0;
        }
        /* Badges */
        body.dark-mode .version-badge {
            background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
            color: #aaa;
            border-color: #444;
        }
        body.dark-mode .phase-time-badge {
            background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
            border-color: #444;
            color: #aaa;
        }
        body.dark-mode .tag {
            background: #333;
            color: #ccc;
        }
        body.dark-mode .step-tool-location-badge {
            background: #333;
            color: #aaa;
        }
        /* Bordures */
        body.dark-mode .resource-item {
            border-bottom-color: #333;
        }
        body.dark-mode .step-image-wrapper,
        body.dark-mode .step-video-wrapper {
            border-color: #333;
        }
        /* Carousel */
        body.dark-mode .carousel-indicator {
            background: #444;
        }
        /* Forcer le texte blanc RTE à rester lisible en dark mode */
        body.dark-mode .step-description-content span[style*="color: #ffffff"],
        body.dark-mode .step-description-content span[style*="color: #FFFFFF"],
        body.dark-mode .step-description-content span[style*="color: #fff"],
        body.dark-mode .step-description-content span[style*="color: white"],
        body.dark-mode .step-description-content span[style*="color: rgb(255, 255, 255)"] {
            color: #e0e0e0 !important;
        }
        /* Neutraliser le forçage du texte blanc en mode clair */
        body:not(.dark-mode) .step-description-content span[style*="color: #ffffff"],
        body:not(.dark-mode) .step-description-content span[style*="color: #FFFFFF"],
        body:not(.dark-mode) .step-description-content span[style*="color: #fff"],
        body:not(.dark-mode) .step-description-content span[style*="color: white"],
        body:not(.dark-mode) .step-description-content span[style*="color: rgb(255, 255, 255)"] {
            color: #1a1a1a !important;
        }

        /* Barre flottante */
        /* Capsules flottantes communes */
        .toolbar-capsule {
            position: fixed;
            top: 14px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 28px;
            padding: 6px 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.12);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        body.dark-mode .toolbar-capsule {
            background: rgba(30,30,30,0.95);
            border-color: rgba(255,255,255,0.1);
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        }
        .toolbar-left  { left: 18px; }
        .toolbar-right { right: 18px; }
        .toolbar-clock {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-secondary);
            letter-spacing: 0.5px;
            min-width: 64px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        .toolbar-sep {
            width: 1px;
            height: 20px;
            background: rgba(0,0,0,0.12);
        }
        body.dark-mode .toolbar-sep {
            background: rgba(255,255,255,0.12);
        }
        .toolbar-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 7px;
            border-radius: 14px;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-secondary);
            line-height: 1;
            transition: background 0.18s, color 0.18s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .toolbar-btn:hover {
            background: rgba(0,0,0,0.07);
            color: var(--text-primary);
        }
        body.dark-mode .toolbar-btn:hover {
            background: rgba(255,255,255,0.1);
        }
        .toolbar-btn.theme-btn {
            font-size: 1rem;
            padding: 4px 6px;
        }
        .toolbar-font-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-muted);
            padding: 0 2px;
            user-select: none;
        }
        /* ── Bouton Demande de vérification ── */
        .verif-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            background: #e0e0e0;
            color: #666;
            border: none;
            border-radius: 50%;
            width: 42px;
            height: 42px;
            padding: 0;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
        }
        .verif-fab:hover {
            background: #cfcfcf;
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
            color: #444;
        }
        body.dark-mode .verif-fab {
            background: #2e2e2e;
            color: #888;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        body.dark-mode .verif-fab:hover {
            background: #383838;
            color: #bbb;
        }

        /* ── Modal overlay ── */
        .verif-overlay {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(4px);
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .verif-overlay.open { display: flex; }

        /* ── Modal box ── */
        .verif-modal {
            background: #fff;
            border-radius: 16px;
            width: 100%;
            max-width: 520px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.2);
            overflow: hidden;
            animation: verifSlideIn 0.22s ease;
        }
        @keyframes verifSlideIn {
            from { opacity: 0; transform: translateY(16px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        body.dark-mode .verif-modal {
            background: #1e1e1e;
            border: 1px solid #333;
        }
        .verif-modal-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
        }
        body.dark-mode .verif-modal-header { border-color: #2a2a2a; }
        .verif-modal-header-left { display: flex; align-items: center; gap: 12px; }
        .verif-modal-icon {
            width: 40px; height: 40px;
            background: rgba(249,55,5,0.1);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .verif-modal-title {
            font-size: 1rem;
            font-weight: 700;
            color: #111;
            margin: 0;
        }
        body.dark-mode .verif-modal-title { color: #e0e0e0; }
        .verif-modal-subtitle {
            font-size: 0.75rem;
            color: #888;
            margin: 2px 0 0;
        }
        .verif-close-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #aaa;
            padding: 4px;
            border-radius: 6px;
            font-size: 1.1rem;
            line-height: 1;
            transition: color 0.15s, background 0.15s;
        }
        .verif-close-btn:hover { color: #555; background: #f5f5f5; }
        body.dark-mode .verif-close-btn:hover { color: #ddd; background: #2a2a2a; }

        .verif-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

        .verif-field label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: #555;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        body.dark-mode .verif-field label { color: #999; }
        .verif-field select,
        .verif-field input,
        .verif-field textarea {
            width: 100%;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 0.85rem;
            font-family: inherit;
            color: #222;
            background: #fafafa;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
            box-sizing: border-box;
        }
        body.dark-mode .verif-field select,
        body.dark-mode .verif-field input,
        body.dark-mode .verif-field textarea {
            background: #252525;
            border-color: #333;
            color: #e0e0e0;
        }
        .verif-field select:focus,
        .verif-field input:focus,
        .verif-field textarea:focus {
            border-color: var(--primary-color, #f93705);
            box-shadow: 0 0 0 3px rgba(249,55,5,0.1);
            background: #fff;
        }
        body.dark-mode .verif-field select:focus,
        body.dark-mode .verif-field input:focus,
        body.dark-mode .verif-field textarea:focus { background: #1a1a1a; }
        .verif-field textarea { resize: vertical; min-height: 80px; }

        .verif-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .verif-modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
        }
        body.dark-mode .verif-modal-footer { border-color: #2a2a2a; }
        .verif-btn-cancel {
            background: none;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 9px 18px;
            font-size: 0.82rem;
            font-weight: 600;
            color: #666;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.15s;
        }
        .verif-btn-cancel:hover { background: #f5f5f5; }
        body.dark-mode .verif-btn-cancel { border-color: #333; color: #999; }
        body.dark-mode .verif-btn-cancel:hover { background: #2a2a2a; }
        .verif-btn-submit {
            background: var(--primary-color, #f93705);
            border: none;
            border-radius: 8px;
            padding: 9px 22px;
            font-size: 0.82rem;
            font-weight: 700;
            color: #fff;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            align-items: center;
            gap: 7px;
            transition: opacity 0.15s, transform 0.15s;
        }
        .verif-btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        .verif-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .verif-success {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            text-align: center;
            gap: 12px;
        }
        .verif-success.show { display: flex; }
        .verif-success-icon {
            width: 56px; height: 56px;
            background: rgba(34,197,94,0.12);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.8rem;
        }
        .verif-success p {
            color: #444;
            font-size: 0.85rem;
            max-width: 300px;
            line-height: 1.5;
            margin: 0;
        }
        body.dark-mode .verif-success p { color: #aaa; }
        .verif-success strong { color: #111; }
        body.dark-mode .verif-success strong { color: #ddd; }

        @media print { .verif-fab { display: none !important; } }

        /* Section headings (Description, Outil, Vidéo, Document) */
        .section-heading {
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 20px;
            color: #1a1a1a;
        }
        .video-section-title,
        .document-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #444;
            margin-bottom: 12px;
        }
        /* Dark mode — titres de phase, étape et sections */
        body.dark-mode .phase-title,
        body.dark-mode .step-label {
            color: #d0d0d0 !important;
        }
        body.dark-mode .section-heading,
        body.dark-mode .video-section-title,
        body.dark-mode .document-section-title {
            color: #d0d0d0 !important;
        }
        body.dark-mode .document-button {
            background: linear-gradient(135deg, #2a1a1a 0%, #331a1a 100%) !important;
            border-color: #4a2a2a !important;
            color: #aaa !important;
        }
        body.dark-mode .document-button span,
        body.dark-mode .document-button div {
            color: #ccc !important;
        }
    </style>
</head>
<body>
    <!-- Capsule gauche : police + thème -->
    <div class="toolbar-capsule toolbar-left">
        <button class="toolbar-btn" onclick="changeFontSize(-1)" title="Réduire la police">A−</button>
        <span class="toolbar-font-label" id="font-size-label">16px</span>
        <button class="toolbar-btn" onclick="changeFontSize(1)" title="Agrandir la police">A+</button>
        <div class="toolbar-sep"></div>
        <button class="toolbar-btn theme-btn" id="theme-btn" onclick="toggleTheme()" title="Basculer clair / sombre">☀</button>
    </div>
    <!-- Capsule droite : horloge -->
    <div class="toolbar-capsule toolbar-right">
        <span class="toolbar-clock" id="toolbar-clock">00:00:00</span>
    </div>

    <!-- Contenu principal -->
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="header-title">
                <span>Fiche Technique</span>
                ${procedure.changelog && procedure.changelog.length > 0 ? `<span class="version-badge">v${escapeHtml(procedure.changelog[0].version)}</span>` : procedure.versionString ? `<span class="version-badge">v${escapeHtml(procedure.versionString)}</span>` : ''}
            </div>
            <div class="header-designation">${escapeHtml(procedure.designation || procedure.title)}</div>
            ${procedure.reference ? `<div class="header-reference">${escapeHtml(procedure.reference)}</div>` : ''}

            ${procedure.description ? `<p class="description">${escapeHtml(procedure.description)}</p>` : ''}

            ${procedure.coverImage ? `<img src="${procedure.coverImage}" alt="Cover" class="cover-image">` : ''}

            ${procedure.tags && procedure.tags.length > 0 ? `
            <div class="tags">
                ${procedure.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}

            <div class="meta-info">
                ${procedure.category ? `<div class="meta-item"><span class="meta-label">Catégorie:</span> ${escapeHtml(procedure.category)}</div>` : ''}
                ${procedure.totalCost ? `<div class="meta-item"><span class="meta-label">Coût estimé:</span> ${procedure.totalCost}€</div>` : ''}
            </div>
        </div>

        <!-- Contenu -->
        <div class="content">
            ${generateGlobalResources(procedure)}
            ${generateDefects(procedure, renderedImageUrls)}
            ${generatePhasesHTML(phases, renderedImageUrls)}
        </div>
    </div>

    <!-- Lightbox pour agrandir les images -->
    <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
        <span class="lightbox-close" onclick="closeLightbox(event)">&times;</span>
        <img class="lightbox-content" id="lightbox-img" src="" alt="">
        <div class="lightbox-counter" id="lightbox-caption"></div>
    </div>

    <script>
        // Lightbox JavaScript
        function openLightbox(imageSrc, caption) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxCaption = document.getElementById('lightbox-caption');

            lightbox.classList.add('active');
            lightboxImg.src = imageSrc;
            lightboxCaption.textContent = caption || '';

            // Empêcher le scroll du body
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox(event) {
            if (event.target.id === 'lightbox' || event.target.classList.contains('lightbox-close')) {
                const lightbox = document.getElementById('lightbox');
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }

        // Fermer avec Échap
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const lightbox = document.getElementById('lightbox');
                if (lightbox.classList.contains('active')) {
                    lightbox.classList.remove('active');
                    document.body.style.overflow = 'auto';
                    resetZoom();
                }
            }
        });

        // Zoom pour lightbox et carousel
        let currentZoom = 1;
        const MIN_ZOOM = 1;
        const MAX_ZOOM = 5;

        function resetZoom() {
            currentZoom = 1;
            const lightboxImg = document.getElementById('lightbox-img');
            if (lightboxImg) {
                lightboxImg.style.transform = 'scale(' + currentZoom + ')';
                lightboxImg.style.cursor = 'zoom-in';
            }
        }

        function handleZoom(delta) {
            const lightboxImg = document.getElementById('lightbox-img');
            if (!lightboxImg) return;

            const zoomFactor = delta > 0 ? 1.2 : 0.8;
            currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

            lightboxImg.style.transform = 'scale(' + currentZoom + ')';
            lightboxImg.style.transition = 'transform 0.3s ease';
            lightboxImg.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        }

        // Zoom avec molette
        document.getElementById('lightbox').addEventListener('wheel', function(e) {
            if (this.classList.contains('active')) {
                e.preventDefault();
                handleZoom(-e.deltaY);
            }
        });

        // Zoom au clic
        document.getElementById('lightbox-img').addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentZoom === 1) {
                currentZoom = 2;
            } else if (currentZoom < MAX_ZOOM) {
                currentZoom = Math.min(MAX_ZOOM, currentZoom * 1.5);
            } else {
                currentZoom = 1;
            }
            this.style.transform = 'scale(' + currentZoom + ')';
            this.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        });

        // Toggle Phase avec animation (sans icône)
        function togglePhase(phaseId) {
            const content = document.getElementById(phaseId + '-content');
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
            }
        }

        // Toggle Défauthèque avec animation (sans icône)
        function toggleDefects() {
            const content = document.getElementById('defects-content');
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
            }
        }

        // Toggle Step avec animation (sans icône) - Ferme les autres steps
        function toggleStep(stepId) {
            const content = document.getElementById(stepId + '-content');
            const isCurrentlyCollapsed = content.classList.contains('collapsed');

            // Fermer tous les autres steps de la même phase
            const phaseMatch = stepId.match(/^phase-(\d+)-step-\d+$/);
            if (phaseMatch) {
                const phaseNumber = phaseMatch[1];
                const allStepsInPhase = document.querySelectorAll('[id^="phase-' + phaseNumber + '-step-"][id$="-content"]');
                allStepsInPhase.forEach(stepContent => {
                    if (stepContent.id !== stepId + '-content') {
                        stepContent.classList.add('collapsed');
                    }
                });
            }

            // Toggle le step cliqué
            if (isCurrentlyCollapsed) {
                content.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
            }
        }

        // Carrousel JavaScript
        const carouselStates = new Map();

        function initCarousel(carouselId) {
            if (!carouselStates.has(carouselId)) {
                carouselStates.set(carouselId, { currentIndex: 0 });
            }
        }

        function changeSlide(carouselId, direction) {
            initCarousel(carouselId);
            const state = carouselStates.get(carouselId);
            const itemsContainer = document.getElementById('items-' + carouselId);
            const items = itemsContainer.querySelectorAll('.carousel-item');
            const thumbnailsContainer = document.getElementById('thumbnails-' + carouselId);
            const thumbnails = thumbnailsContainer ? thumbnailsContainer.querySelectorAll('.carousel-thumbnail') : [];
            const counter = document.getElementById('counter-' + carouselId);
            const descElement = document.getElementById('desc-' + carouselId);

            // Cacher l'élément actuel
            items[state.currentIndex].style.display = 'none';
            if (thumbnails[state.currentIndex]) {
                thumbnails[state.currentIndex].classList.remove('active');
                thumbnails[state.currentIndex].style.borderColor = '#e0e0e0';
            }

            // Calculer le nouvel index
            state.currentIndex = (state.currentIndex + direction + items.length) % items.length;

            // Afficher le nouvel élément
            items[state.currentIndex].style.display = 'flex';
            if (thumbnails[state.currentIndex]) {
                thumbnails[state.currentIndex].classList.add('active');
                thumbnails[state.currentIndex].style.borderColor = 'var(--primary-color)';
            }
            if (counter) counter.textContent = state.currentIndex + 1;

            // Mettre à jour la description
            if (descElement) {
                const description = items[state.currentIndex].getAttribute('data-description');
                descElement.textContent = description ? ' - ' + description : '';
            }
        }

        function goToSlide(carouselId, index) {
            initCarousel(carouselId);
            const state = carouselStates.get(carouselId);
            const itemsContainer = document.getElementById('items-' + carouselId);
            const items = itemsContainer.querySelectorAll('.carousel-item');
            const thumbnailsContainer = document.getElementById('thumbnails-' + carouselId);
            const thumbnails = thumbnailsContainer ? thumbnailsContainer.querySelectorAll('.carousel-thumbnail') : [];
            const counter = document.getElementById('counter-' + carouselId);
            const descElement = document.getElementById('desc-' + carouselId);

            // Cacher l'élément actuel
            items[state.currentIndex].style.display = 'none';
            if (thumbnails[state.currentIndex]) {
                thumbnails[state.currentIndex].classList.remove('active');
                thumbnails[state.currentIndex].style.borderColor = '#e0e0e0';
            }

            // Aller à l'index demandé
            state.currentIndex = index;

            // Afficher le nouvel élément
            items[state.currentIndex].style.display = 'flex';
            if (thumbnails[state.currentIndex]) {
                thumbnails[state.currentIndex].classList.add('active');
                thumbnails[state.currentIndex].style.borderColor = 'var(--primary-color)';
            }
            if (counter) counter.textContent = state.currentIndex + 1;

            // Mettre à jour la description
            if (descElement) {
                const description = items[state.currentIndex].getAttribute('data-description');
                descElement.textContent = description ? ' - ' + description : '';
            }
        }

        // Support du clavier (flèches gauche/droite)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                // Trouver le carrousel visible et le faire défiler
                document.querySelectorAll('.carousel-container').forEach(carousel => {
                    const rect = carousel.getBoundingClientRect();
                    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
                        const carouselId = carousel.id.replace('carousel-', '');
                        changeSlide(carouselId, direction);
                    }
                });
            }
        });

        // Égaliser les hauteurs des cadres conseil et consigne
        function equalizeStepBottomRowHeights() {
            document.querySelectorAll('.step-bottom-row').forEach(row => {
                const tips = row.querySelector('.tips');
                const safety = row.querySelector('.safety-notes');

                if (tips && safety) {
                    // Reset heights
                    tips.style.minHeight = '';
                    safety.style.minHeight = '';

                    // Get natural heights
                    const tipsHeight = tips.offsetHeight;
                    const safetyHeight = safety.offsetHeight;

                    // Set to max height
                    const maxHeight = Math.max(tipsHeight, safetyHeight);
                    tips.style.minHeight = maxHeight + 'px';
                    safety.style.minHeight = maxHeight + 'px';
                }
            });
        }

        // Appeler au chargement et au redimensionnement
        window.addEventListener('load', equalizeStepBottomRowHeights);
        window.addEventListener('resize', equalizeStepBottomRowHeights);

        // === Horloge ===
        function updateClock() {
            var now = new Date();
            var h = String(now.getHours()).padStart(2, '0');
            var m = String(now.getMinutes()).padStart(2, '0');
            var s = String(now.getSeconds()).padStart(2, '0');
            var clockEl = document.getElementById('toolbar-clock');
            if (clockEl) clockEl.textContent = h + ':' + m + ':' + s;
        }
        updateClock();
        setInterval(updateClock, 1000);

        // === Taille de police (cible html pour que rem s'adapte) ===
        var BASE_FONT = 16;
        var MIN_FONT = 12;
        var MAX_FONT = 26;
        var currentFontSize = parseInt(localStorage.getItem('ft-font-size') || BASE_FONT, 10);
        function applyFontSize(size) {
            currentFontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, size));
            document.documentElement.style.fontSize = currentFontSize + 'px';
            var label = document.getElementById('font-size-label');
            if (label) label.textContent = currentFontSize + 'px';
            localStorage.setItem('ft-font-size', currentFontSize);
        }
        function changeFontSize(delta) { applyFontSize(currentFontSize + delta); }
        applyFontSize(currentFontSize);

        // === Thème clair / sombre ===
        var isDark = localStorage.getItem('ft-dark-mode') === '1';
        function applyTheme(dark) {
            isDark = dark;
            document.body.classList.toggle('dark-mode', dark);
            var btn = document.getElementById('theme-btn');
            if (btn) btn.textContent = dark ? '☾' : '☀';
            localStorage.setItem('ft-dark-mode', dark ? '1' : '0');
        }
        function toggleTheme() { applyTheme(!isDark); }
        applyTheme(isDark);

        // Fonctions pour la modal d'agrandissement d'image
        function openImageModal(src, alt) {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            modal.classList.add('active');
            modalImg.src = src;
            modalImg.alt = alt;
        }

        function closeImageModal() {
            const modal = document.getElementById('image-modal');
            modal.classList.remove('active');
        }

        // Fermer la modal en cliquant à l'extérieur de l'image
        document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('image-modal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        closeImageModal();
                    }
                });
            }
        });
    </script>

    <!-- Modal pour agrandir les images -->
    <div id="image-modal" class="image-modal">
        <span class="image-modal-close" onclick="closeImageModal()">&times;</span>
        <img id="modal-image" alt="">
    </div>

    ${generateVideoPathsScript()}

    <!-- Modal pour le lecteur vidéo -->
    <div id="video-modal" class="video-modal" onclick="closeVideoPlayer(event)">
        <div class="video-modal-content" onclick="event.stopPropagation()">
            <button class="video-modal-close" onclick="closeVideoPlayer(event)">&times;</button>
            <div class="video-modal-body">
                <video id="video-player" controls style="width: 100%; max-height: 80vh; background: #000;"></video>
                <div id="video-loading" style="display:none; text-align:center; padding:60px; color:#aaa; font-size:1.1rem;">Chargement de la vidéo...</div>
            </div>
        </div>
    </div>

    <style>
        .video-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0; top: 0;
            width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            justify-content: center;
            align-items: center;
        }
        .video-modal.active { display: flex; }
        .video-modal-content {
            background: #000;
            border-radius: 12px;
            width: 90%;
            max-width: 900px;
            max-height: 90%;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
        }
        .video-modal-close {
            position: absolute;
            top: 10px; right: 14px;
            z-index: 10;
            background: rgba(0, 0, 0, 0.6);
            border: none; color: #ccc;
            font-size: 28px; cursor: pointer;
            padding: 2px 10px; line-height: 1;
            border-radius: 50%;
            transition: color 0.2s, background 0.2s;
        }
        .video-modal-close:hover { color: white; background: rgba(0, 0, 0, 0.8); }
        .video-modal-body { padding: 0; background: #000; }
    </style>

    <script>
        var currentBlobUrl = null;

        function openVideoPlayer(index) {
            var videoUrl = (typeof VIDEO_PATHS !== 'undefined') ? VIDEO_PATHS[index] : '';
            if (!videoUrl) return;

            console.log('Lecture vidéo index=' + index + ', URL=' + videoUrl);

            var modal = document.getElementById('video-modal');
            var player = document.getElementById('video-player');
            var loading = document.getElementById('video-loading');

            // Afficher le modal avec le loader
            player.style.display = 'none';
            loading.style.display = 'block';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Libérer le blob précédent
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
                currentBlobUrl = null;
            }

            // Méthode 1 : charger via fetch puis blob URL (contourne la sécurité file://)
            fetch(videoUrl)
                .then(function(response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.blob();
                })
                .then(function(blob) {
                    currentBlobUrl = URL.createObjectURL(blob);
                    player.src = currentBlobUrl;
                    loading.style.display = 'none';
                    player.style.display = 'block';
                    player.load();
                    player.play().catch(function() {});
                })
                .catch(function(err) {
                    console.log('Fetch échoué (' + err.message + '), tentative src direct...');
                    // Méthode 2 : src direct (fonctionne sur Firefox et certains navigateurs)
                    player.src = videoUrl;
                    loading.style.display = 'none';
                    player.style.display = 'block';
                    player.load();
                    player.play().catch(function() {});
                });
        }

        function closeVideoPlayer(event) {
            if (event && event.target.classList.contains('video-modal-close')) {
                // OK
            } else if (event && event.target.id !== 'video-modal') {
                return;
            }
            var modal = document.getElementById('video-modal');
            var player = document.getElementById('video-player');
            player.pause();
            player.src = '';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('video-modal');
                if (modal && modal.classList.contains('active')) {
                    var player = document.getElementById('video-player');
                    player.pause();
                    player.src = '';
                    modal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            }
        });

        // ── Demande de vérification ──
        var VERIF_PHASES = ${JSON.stringify(phases.map((p, i) => ({
          index: i,
          title: p.title ? `Phase ${i + 1} \u00B7 ${p.title}` : `Phase ${i + 1}`,
          steps: (p.steps || []).map((s, j) => ({
            index: j,
            title: s.title ? `\u00C9tape ${j + 1} \u00B7 ${s.title}` : `\u00C9tape ${j + 1}`
          }))
        })))};
        var VERIF_PROCEDURE_ID   = ${JSON.stringify(procedure.id || '')};
        var VERIF_PROCEDURE_REF  = ${JSON.stringify(procedure.reference || '')};
        var VERIF_PROCEDURE_NAME = ${JSON.stringify(procedure.designation || procedure.title || '')};
        var FIREBASE_PROJECT_ID  = 'fichestechniques-cd97c';
        var FIREBASE_API_KEY     = 'AIzaSyDmnjA7AFMiLEyzYYD1m1Tg1UAioh-Xxjg';

        function openVerifModal() {
            document.getElementById('verif-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            document.getElementById('verif-success').classList.remove('show');
            document.getElementById('verif-form-body').style.display = '';
            document.getElementById('verif-footer').style.display = '';
            document.getElementById('verif-submit-btn').disabled = false;
        }
        function closeVerifModal() {
            document.getElementById('verif-overlay').classList.remove('open');
            document.body.style.overflow = '';
        }
        function handleVerifOverlayClick(e) {
            if (e.target === document.getElementById('verif-overlay')) closeVerifModal();
        }
        function verifUpdateSteps() {
            var phaseIdx = document.getElementById('verif-phase').value;
            var stepSel  = document.getElementById('verif-step');
            stepSel.innerHTML = '<option value="">— Toute la phase —</option>';
            if (phaseIdx === '') return;
            var phase = VERIF_PHASES[parseInt(phaseIdx)];
            if (!phase) return;
            phase.steps.forEach(function(s) {
                var opt = document.createElement('option');
                opt.value = s.index;
                opt.textContent = s.title;
                stepSel.appendChild(opt);
            });
        }
        function submitVerifRequest() {
            var phase   = document.getElementById('verif-phase').value;
            var element = document.getElementById('verif-element').value;
            var comment = document.getElementById('verif-comment').value.trim();
            if (!phase)   { alert('Veuillez sélectionner une phase.'); return; }
            if (!element) { alert("Veuillez sélectionner l'élément à modifier."); return; }
            if (!comment) { alert('Veuillez décrire la modification souhaitée.'); return; }
            var phaseObj  = VERIF_PHASES[parseInt(phase)];
            var stepIdx   = document.getElementById('verif-step').value;
            var stepLabel = stepIdx !== '' ? (phaseObj.steps[parseInt(stepIdx)] ? phaseObj.steps[parseInt(stepIdx)].title : '') : '';
            var requester = document.getElementById('verif-requester').value.trim();
            var btn = document.getElementById('verif-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Envoi en cours…';
            var body = { fields: {
                procedureId:   { stringValue: VERIF_PROCEDURE_ID },
                procedureRef:  { stringValue: VERIF_PROCEDURE_REF },
                procedureName: { stringValue: VERIF_PROCEDURE_NAME },
                phase:         { stringValue: phaseObj.title },
                step:          { stringValue: stepLabel || '' },
                phaseIndex:    { integerValue: parseInt(phase) },
                stepIndex:     { integerValue: stepIdx !== '' ? parseInt(stepIdx) : -1 },
                element:       { stringValue: element },
                comment:       { stringValue: comment },
                requester:     { stringValue: requester },
                status:        { stringValue: 'nouveau' },
                createdAt:     { timestampValue: new Date().toISOString() }
            }};
            fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/verification_requests?key=' + FIREBASE_API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                document.getElementById('verif-form-body').style.display = 'none';
                document.getElementById('verif-footer').style.display = 'none';
                document.getElementById('verif-success').classList.add('show');
                setTimeout(closeVerifModal, 3000);
            }).catch(function(err) {
                console.error('Erreur:', err);
                alert("Erreur lors de l'envoi. Veuillez réessayer.");
                btn.disabled = false;
                btn.textContent = 'Envoyer la demande';
            });
        }
    </script>

    <button class="verif-fab" onclick="openVerifModal()" title="Demande de modification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    </button>

    <div class="verif-overlay" id="verif-overlay" onclick="handleVerifOverlayClick(event)">
        <div class="verif-modal" id="verif-modal">

            <!-- Header -->
            <div class="verif-modal-header">
                <div class="verif-modal-header-left">
                    <div class="verif-modal-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f93705" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <div>
                        <p class="verif-modal-title">Demande de modification</p>
                        <p class="verif-modal-subtitle">${escapeHtml(procedure.designation || procedure.title || '')} ${procedure.reference ? '· ' + escapeHtml(procedure.reference) : ''}</p>
                    </div>
                </div>
                <button class="verif-close-btn" onclick="closeVerifModal()">✕</button>
            </div>

            <!-- Form -->
            <div class="verif-modal-body" id="verif-form-body">
                <div class="verif-row">
                    <div class="verif-field">
                        <label>Phase concernée *</label>
                        <select id="verif-phase" onchange="verifUpdateSteps()">
                            <option value="">— Sélectionner —</option>
                            ${phases.map((p, i) => `<option value="${i}">Phase ${i + 1}${p.title ? ' · ' + escapeHtml(p.title) : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="verif-field">
                        <label>Étape concernée</label>
                        <select id="verif-step">
                            <option value="">— Toute la phase —</option>
                        </select>
                    </div>
                </div>
                <div class="verif-field">
                    <label>Élément à modifier *</label>
                    <select id="verif-element">
                        <option value="">— Sélectionner —</option>
                        <option value="Description">Description</option>
                        <option value="Outil">Outil</option>
                        <option value="Consigne de sécurité">Consigne de sécurité</option>
                        <option value="Conseil">Conseil</option>
                        <option value="Titre de phase / étape">Titre de phase / étape</option>
                        <option value="Photo / Vidéo">Photo / Vidéo</option>
                        <option value="Autre">Autre</option>
                    </select>
                </div>
                <div class="verif-field">
                    <label>Description de la modification souhaitée *</label>
                    <textarea id="verif-comment" placeholder="Décrivez précisément ce qui doit être modifié…"></textarea>
                </div>
                <div class="verif-field">
                    <label>Votre nom <span style="font-weight:400;text-transform:none;">(optionnel)</span></label>
                    <input type="text" id="verif-requester" placeholder="Prénom Nom">
                </div>
            </div>

            <!-- Success state -->
            <div class="verif-success" id="verif-success">
                <div class="verif-success-icon">✓</div>
                <strong style="font-size:1rem;">Demande envoyée !</strong>
                <p>Votre demande de modification a bien été transmise à l'équipe FichesTech. Elle sera traitée prochainement.</p>
            </div>

            <!-- Footer -->
            <div class="verif-modal-footer" id="verif-footer">
                <button class="verif-btn-cancel" onclick="closeVerifModal()">Annuler</button>
                <button class="verif-btn-submit" id="verif-submit-btn" onclick="submitVerifRequest()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Envoyer la demande
                </button>
            </div>
        </div>
    </div>

</body>
</html>`;

  // Minification sans perte : supprime commentaires HTML, indentations et lignes vides
  const minified = minifyHtml(html);

  // Créer un Blob et télécharger
  const blob = new Blob([minified], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Format: FT_Référence_Désignation_Version
  const reference = sanitizeFilename(procedure.reference || 'REF');
  const designation = sanitizeFilename(procedure.designation || procedure.title || 'Procedure');
  const version = procedure.versionString || '1.0';
  link.download = `FT_${reference}_${designation}_v${version}.html`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/**
 * Minifie le HTML généré sans perte de qualité.
 * Préserve le contenu des blocs <script> et <style> intacts.
 */
function minifyHtml(html: string): string {
  const blocks: string[] = [];

  // Extraire les blocs <script> et <style> pour les protéger
  const protected_ = html.replace(/<(script|style)([\s\S]*?)<\/\1>/gi, (match) => {
    blocks.push(match);
    return `\x00BLOCK${blocks.length - 1}\x00`;
  });

  const minified = protected_
    .replace(/<!--[\s\S]*?-->/g, '')   // supprime commentaires HTML
    .replace(/[ \t]+/g, ' ')           // réduit espaces/tabs multiples à un seul espace
    .replace(/\s*\n\s*/g, '\n')        // supprime espaces autour des sauts de ligne
    .replace(/\n{2,}/g, '\n')          // supprime lignes vides multiples
    .replace(/>\n</g, '><')            // supprime sauts de ligne entre balises
    .replace(/>\n/g, '>')              // supprime sauts de ligne après balise ouvrante
    .replace(/\n</g, '<')              // supprime sauts de ligne avant balise fermante
    .trim();

  // Réinsérer les blocs protégés
  return minified.replace(/\x00BLOCK(\d+)\x00/g, (_, i) => blocks[parseInt(i)]);
}

/**
 * Génère le HTML pour les ressources globales
 */
function generateGlobalResources(procedure: Procedure): string {
  const hasGlobalTools = procedure.globalTools && procedure.globalTools.length > 0;
  const hasGlobalMaterials = procedure.globalMaterials && procedure.globalMaterials.length > 0;

  if (!hasGlobalTools && !hasGlobalMaterials) {
    return '';
  }

  return `
    <div class="resources">
        <h2>📦 Ressources globales</h2>
        <p style="color: #7f8c8d; margin-bottom: 20px;">Ces ressources sont nécessaires pour l'ensemble de la procédure</p>

        ${hasGlobalTools ? `
        <h3>Outils</h3>
        <ul class="resource-list">
            ${procedure.globalTools!.map(tool => `
            <li class="resource-item">
                <div>
                    ${tool.reference ? `<span class="resource-ref">${escapeHtml(tool.reference)}</span> - ` : ''}
                    <span class="resource-name">${escapeHtml(tool.name)}</span>
                </div>
                ${tool.description ? `<div class="resource-desc">${escapeHtml(tool.description)}</div>` : ''}
            </li>
            `).join('')}
        </ul>
        ` : ''}

        ${hasGlobalMaterials ? `
        <h3>📋 Matériaux</h3>
        <ul class="resource-list">
            ${procedure.globalMaterials!.map(material => `
            <li class="resource-item">
                <span class="resource-name">${escapeHtml(material.name)}</span>
                ${material.quantity ? ` - ${material.quantity} ${material.unit || ''}` : ''}
            </li>
            `).join('')}
        </ul>
        ` : ''}
    </div>
  `;
}

/**
 * Génère le HTML pour la Défauthèque
 */
function generateDefects(procedure: Procedure, renderedImageUrls: Map<string, string>): string {
  if (!procedure.defects || procedure.defects.length === 0) {
    return '';
  }

  const count = procedure.defects.length;

  return `
    <div class="defects-section" id="defautheque">
        <div class="defects-header" onclick="toggleDefects()">
            <div class="defects-header-content">
                <h2>Défauthèque</h2>
                <span class="defects-subtitle">À consulter avant prestation</span>
            </div>
            <span class="defects-count-badge">${count} défaut${count > 1 ? 's' : ''}</span>
        </div>

        <div class="defects-content collapsed" id="defects-content">
            <div class="defects-grid">
            ${procedure.defects.map((defect, defectIndex) => {
              const criteriaClass = defect.criteria === 'non_acceptable'
                ? 'criteria-non-acceptable'
                : defect.criteria === 'a_retoucher'
                ? 'criteria-a-retoucher'
                : defect.criteria === 'acceptable'
                ? 'criteria-acceptable'
                : '';
              const criteriaBadge = defect.criteria
                ? `<span class="defect-criteria-badge ${defect.criteria === 'non_acceptable' ? 'non-acceptable' : defect.criteria === 'a_retoucher' ? 'a-retoucher' : 'acceptable'}">${defect.criteria === 'non_acceptable' ? 'Non-acceptable' : defect.criteria === 'a_retoucher' ? 'À retoucher' : 'Acceptable'}</span>`
                : '';
              return `
                <div class="defect-item ${criteriaClass}">
                    <div class="defect-card-header">
                        <span class="defect-card-number">Défaut #${defectIndex + 1}</span>
                        ${criteriaBadge}
                    </div>

                    <div class="defect-card-body">
                        ${defect.defect ? `
                        <div class="defect-block defect-block-red">
                            <div class="defect-block-label">Défaut</div>
                            <div class="defect-block-text">${escapeHtml(defect.defect)}</div>
                        </div>
                        ` : ''}

                        ${defect.whatToDo ? `
                        <div class="defect-block defect-block-green">
                            <div class="defect-block-label">Intervention</div>
                            <div class="defect-block-text">${escapeHtml(defect.whatToDo)}</div>
                        </div>
                        ` : ''}

                        ${!defect.defect && !defect.whatToDo && defect.description ? `
                        <div class="defect-description">${escapeHtml(defect.description)}</div>
                        ` : ''}

                        ${defect.images && defect.images.length > 0 ? `
                        ${generateImageCarousel(defect.images, renderedImageUrls, `defect-${defectIndex}`)}
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
            </div>
        </div>
    </div>
  `;
}

/**
 * Génère le HTML pour les phases
 */
function generatePhasesHTML(phases: Phase[], renderedImageUrls: Map<string, string>): string {
  const phasesHTML = phases.map((phase, phaseIndex) => {
    const difficultyColor = phase.difficulty === 'trainee' ? '#3b82f6' : phase.difficulty === 'easy' ? '#10b981' : phase.difficulty === 'medium' ? '#eab308' : phase.difficulty === 'hard' ? '#ef4444' : phase.difficulty === 'control' ? '#f97316' : '#999';
    const difficultyLabel = phase.difficulty === 'trainee' ? 'Apprenti' : phase.difficulty === 'easy' ? 'Facile' : phase.difficulty === 'medium' ? 'Moyen' : phase.difficulty === 'hard' ? 'Difficile' : phase.difficulty === 'control' ? 'Contrôle' : phase.difficulty;
    const hoverColor = difficultyColor + '15'; // Couleur de difficulté avec opacité faible (~8%)
    return `
    <div class="phase" id="phase-${phaseIndex + 1}">
        <div class="phase-header" onclick="togglePhase('phase-${phaseIndex + 1}')" style="cursor: pointer;"
             onmouseover="this.style.backgroundColor='${hoverColor}'"
             onmouseout="this.style.backgroundColor='transparent'">
            <div class="phase-title">Phase ${phase.phaseNumber || phaseIndex + 1} : ${escapeHtml(phase.title)}</div>
            <div class="phase-badges">
                <span class="difficulty-badge" style="background: ${difficultyColor};">${difficultyLabel.toUpperCase()}</span>
                ${phase.estimatedTime ? `<span class="phase-time-badge">${phase.estimatedTime} min/pièce</span>` : ''}
            </div>
        </div>
        <div class="phase-content collapsed" id="phase-${phaseIndex + 1}-content">

        ${phase.steps && phase.steps.length > 0 ? `
        <div class="steps">
            ${phase.steps.map((step, stepIndex) => {
              // Migrer les outils vers le nouveau format
              const tools = migrateStepTools(step);
              const hasTools = tools.length > 0;
              const hasConsignes = (step.tips && step.tips.length > 0) || (step.safetyNotes && step.safetyNotes.length > 0);

              return `
            <div class="step" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}">
                <div class="step-header"
                     onclick="toggleStep('phase-${phaseIndex + 1}-step-${stepIndex + 1}')"
                     style="cursor: pointer;"
                     onmouseover="this.style.backgroundColor='${hoverColor}'"
                     onmouseout="this.style.backgroundColor='transparent'">
                    <div class="step-label">
                        Étape ${stepIndex + 1}${step.title ? ` : ${escapeHtml(step.title)}` : ''}
                    </div>
                    <div class="step-toggle-icon" style="display: none;">▼</div>
                </div>

                <div class="step-content collapsed" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}-content">
                <div class="step-details-grid">
                    <div style="display: flex; gap: 20px; align-items: flex-start;">
                        ${step.description || hasConsignes ? `
                        <div style="flex: 1;">
                            <div class="section-heading">Description</div>
                            <div class="desc-scroll" style="min-height: 280px;">
                                <div style="font-size: 1.1rem;">
                                    ${step.description ? `<div class="step-description-content" style="padding-left: 0;">${step.description}</div>` : ''}

                                    ${hasConsignes ? `
                                        ${step.description ? '<div style="margin-top: 16px;"></div>' : ''}

                                        ${step.safetyNotes && step.safetyNotes.length > 0 ? `
                                        <div style="margin-bottom: 16px;">
                                            <div class="safety-notes-title" style="font-size: 1.1rem;">Consignes de sécurité</div>
                                            ${step.safetyNotes.map(note => `
                                            <div class="safety-note">
                                                <div>• ${escapeHtml(note.content)}</div>
                                            </div>
                                            `).join('')}
                                        </div>
                                        ` : ''}

                                        ${step.tips && step.tips.length > 0 ? `
                                        <div>
                                            <div class="tips-title" style="font-size: 1.1rem;">Conseils</div>
                                            ${step.tips.map(tip => `<div class="tip-item">• ${escapeHtml(tip)}</div>`).join('')}
                                        </div>
                                        ` : ''}
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        ${hasTools ? `
                        <div style="width: 300px; flex-shrink: 0;">
                            <div class="section-heading">Outil(s)</div>
                            <div class="desc-scroll" style="border: none; padding: 0;">
                            <div class="step-tools-column">
                                ${tools.map(tool => {
                                    const truncatedName = tool.name.length > 30 ? tool.name.substring(0, 30) + '...' : tool.name;
                                    // Convertir la couleur en RGBA avec opacité 0.25
                                    let bgColor = '';
                                    if (tool.color) {
                                        const match = tool.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                                        if (match) {
                                            bgColor = `background-color: rgba(${match[1]}, ${match[2]}, ${match[3]}, 0.25);`;
                                        } else if (tool.color.startsWith('#')) {
                                            bgColor = `background-color: ${tool.color}40;`;
                                        }
                                    }
                                    const refColor = tool.color ? tool.color : '#555';
                                    return `
                                    <div class="step-tool-box" style="${bgColor}">
                                        ${tool.imageUrl ? `<img src="${tool.imageUrl}" alt="${escapeHtml(tool.name)}" class="step-tool-image" loading="lazy" onclick="event.stopPropagation(); openImageModal('${tool.imageUrl.replace(/'/g, "\\'")}', '${escapeHtml(tool.name)}');">` : ''}
                                        <div class="step-tool-info">
                                            <div class="step-tool-name" title="${escapeHtml(tool.name)}">${escapeHtml(truncatedName)}</div>
                                            ${tool.reference ? `<div class="step-tool-ref" style="color: ${refColor};">${escapeHtml(tool.reference)}</div>` : ''}
                                            ${tool.location ? `<div class="step-tool-location">${escapeHtml(tool.location)}</div>` : ''}
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${step.estimatedTime ? `
                <div class="step-time">⏱️ Temps: ${step.estimatedTime} min</div>
                ` : ''}

                ${(step.images && step.images.length > 0) || (step.videos && step.videos.length > 0) ? `
                <div style="margin-top: 20px; display: flex; gap: 20px; align-items: flex-start;">
                    ${step.images && step.images.length > 0 ? `
                    <div style="flex: 1;">
                        ${generateImageCarousel(step.images, renderedImageUrls, `phase-${phaseIndex + 1}-step-${stepIndex + 1}`)}
                    </div>
                    ` : ''}

                    ${step.videos && step.videos.length > 0 ? `
                    <div style="width: 300px; flex-shrink: 0;">
                        ${generateVideoCarousel(step.videos, `phase-${phaseIndex + 1}-step-${stepIndex + 1}`)}
                        ${step.documents && step.documents.length > 0 ? generateDocumentSection(step.documents) : ''}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${step.documents && step.documents.length > 0 && !(step.videos && step.videos.length > 0) ? `
                <div style="margin-top: 20px;">
                    ${generateDocumentSection(step.documents)}
                </div>
                ` : ''}
                </div>
            </div>
            `;
            }).join('')}
        </div>
        ` : ''}
        </div>
    </div>
  `}).join('');

  return phasesHTML;
}

/**
 * Échappe les caractères HTML pour éviter les injections
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize filename pour éviter les caractères invalides
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * Génère un carrousel d'images avec miniatures à gauche
 */
function generateImageCarousel(images: AnnotatedImage[], renderedImageUrls: Map<string, string>, carouselId: string): string {
  if (images.length === 0) return '';

  // Générer les URLs des images
  const imageUrls = images.map((img) => {
    return renderedImageUrls.get(img.imageId) || img.image?.url || (img.image?.blob ? URL.createObjectURL(img.image.blob) : '');
  }).filter(Boolean);

  const carouselItems = images.map((img, index) => {
    const imageUrl = imageUrls[index];
    if (!imageUrl) return '';

    console.log(`Carousel image ${index}: ${imageUrl.substring(0, 50)}...`);

    return `
      <div class="carousel-item" style="display: ${index === 0 ? 'flex' : 'none'};" data-description="${escapeHtml(img.description || '')}">
        <img src="${imageUrl}" alt="${escapeHtml(img.description || 'Image')}" loading="lazy" onclick="openLightbox('${imageUrl.replace(/'/g, "\\'")}', '${escapeHtml(img.description || '')}')">
      </div>
    `;
  }).filter(Boolean).join('');

  if (images.length === 1) {
    const isDefectSingle = carouselId.startsWith('defect-');
    return `
      <div>
        ${isDefectSingle ? '' : '<div style="font-size: 1.1rem; font-weight: 600; color: #444; margin-bottom: 12px;">Photo</div>'}
        <div class="carousel-container">
          ${carouselItems}
        </div>
      </div>
    `;
  }

  const isDefect = carouselId.startsWith('defect-');

  // Miniatures uniquement hors défauthèque
  const thumbnails = isDefect ? '' : images.map((_img, index) => {
    const imageUrl = imageUrls[index];
    if (!imageUrl) return '';
    return `
      <div class="carousel-thumbnail ${index === 0 ? 'active' : ''}" onclick="goToSlide('${carouselId}', ${index})" style="
        width: 60px;
        height: 60px;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid ${index === 0 ? 'var(--primary-color)' : '#e0e0e0'};
        transition: all 0.2s ease;
        flex-shrink: 0;
      " data-index="${index}">
        <img src="${imageUrl}" alt="Miniature ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
    `;
  }).join('');

  const photoTitle = isDefect ? '' : '<div style="font-size: 1.1rem; font-weight: 600; color: #444; margin-bottom: 12px;">Photo</div>';

  if (isDefect) {
    return `
    <div>
      <div class="carousel-container" id="carousel-${carouselId}">
        <div class="carousel-wrapper">
          <div class="carousel-items" id="items-${carouselId}">
            ${carouselItems}
          </div>
        </div>
        ${images.length > 1 ? `
        <div class="carousel-controls">
          <button class="carousel-button prev" onclick="changeSlide('${carouselId}', -1)">‹</button>
          <button class="carousel-button next" onclick="changeSlide('${carouselId}', 1)">›</button>
        </div>` : ''}
      </div>
    </div>
    `;
  }

  return `
    <div>
      ${photoTitle}
      <div class="carousel-with-thumbnails" style="display: flex; gap: 16px; align-items: flex-start;">
        <div class="carousel-thumbnails" id="thumbnails-${carouselId}" style="display: flex; flex-direction: column; gap: 8px; max-height: 500px; overflow-y: auto;">
          ${thumbnails}
        </div>
        <div style="flex: 1;">
          <div class="carousel-container" id="carousel-${carouselId}">
            <div class="carousel-wrapper">
              <div class="carousel-items" id="items-${carouselId}">
                ${carouselItems}
              </div>
            </div>
            <div class="carousel-controls">
              <button class="carousel-button prev" onclick="changeSlide('${carouselId}', -1)">‹</button>
              <button class="carousel-button next" onclick="changeSlide('${carouselId}', 1)">›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Convertit un chemin Windows/UNC en URL file:/// compatible navigateur
 * N'encode PAS les caractères UTF-8 (accents, etc.) pour que le chemin
 * corresponde exactement au système de fichiers.
 */
function convertToFileUrl(path: string): string {
  if (!path) return path;

  // Si c'est déjà une URL (http, https, file), ne pas modifier
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path;
  }

  // Convertir les backslashes en forward slashes
  const normalized = path.replace(/\\/g, '/');

  // Chemin UNC Windows (\\NAS\folder\file.mp4)
  if (path.startsWith('\\\\')) {
    return 'file:///' + normalized;
  }

  // Chemin Windows absolu (C:\folder\file.mp4)
  if (/^[A-Za-z]:/.test(normalized)) {
    return 'file:///' + normalized;
  }

  // Chemin relatif ou autre, retourner tel quel
  return path;
}

// Compteur global pour indexer les vidéos dans le HTML
let videoGlobalIndex = 0;
const videoGlobalPaths: string[] = [];

/**
 * Réinitialiser l'index vidéo (appelé au début de chaque export)
 */
function resetVideoIndex() {
  videoGlobalIndex = 0;
  videoGlobalPaths.length = 0;
}

/**
 * Génère un carrousel de vidéos
 */
function generateVideoCarousel(videos: any[], _carouselId: string): string {
  if (videos.length === 0) return '';

  const videoButtons = videos.map((video) => {
    const videoTitle = video.name || video.title || 'Vidéo';
    const idx = videoGlobalIndex++;
    // Stocker le chemin file:// pour le tableau JS
    videoGlobalPaths.push(convertToFileUrl(video.url));
    return `
      <button type="button" onclick="openVideoPlayer(${idx})" class="video-button" style="
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        color: #555;
        border: 1px solid #fca5a5;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-right: 12px;
        margin-bottom: 12px;
        font-family: inherit;
      " onmouseover="this.style.borderColor='#ef4444'; this.style.background='#fff'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.borderColor='#fca5a5'; this.style.background='linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'; this.style.boxShadow='none';">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 0.95rem; font-weight: 600;">${escapeHtml(videoTitle)}</div>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="video-section" style="margin-top: 20px;">
      <div class="video-section-title">Vidéo</div>
      <div style="display: flex; flex-wrap: wrap; align-items: flex-start;">
        ${videoButtons}
      </div>
    </div>
  `;
}

/**
 * Génère le script contenant le tableau des chemins vidéo
 * À insérer dans le HTML après la génération de toutes les phases
 */
function generateVideoPathsScript(): string {
  if (videoGlobalPaths.length === 0) return '';
  // JSON.stringify échappe correctement tous les caractères spéciaux (', ", \, etc.)
  return `<script>var VIDEO_PATHS = ${JSON.stringify(videoGlobalPaths)};</script>`;
}

/**
 * Génère la section documents avec boutons pour ouvrir les PDF
 */
function generateDocumentSection(documents: any[]): string {
  if (!documents || documents.length === 0) return '';

  const documentButtons = documents.map((doc) => {
    const docTitle = doc.name || 'Document';
    const docUrl = convertToFileUrl(doc.url);
    return `
      <a href="${escapeHtml(docUrl)}" target="_blank" class="document-button" style="
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        color: #555;
        border: 1px solid #fca5a5;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-right: 12px;
        margin-bottom: 12px;
        font-family: inherit;
        text-decoration: none;
      " onmouseover="this.style.borderColor='#ef4444'; this.style.background='#fff'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.borderColor='#fca5a5'; this.style.background='linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'; this.style.boxShadow='none';">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 0.95rem; font-weight: 600;">${escapeHtml(docTitle)}</div>
        </div>
      </a>
    `;
  }).join('');

  return `
    <div class="document-section" style="margin-top: 20px;">
      <div class="document-section-title">Document</div>
      <div style="display: flex; flex-wrap: wrap; align-items: flex-start;">
        ${documentButtons}
      </div>
    </div>
  `;
}
