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
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: var(--text-primary);
            background: linear-gradient(to bottom, #f5f7fa 0%, #f8f9fa 100%);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            max-width: 100vw;
            font-size: 16px;
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
            gap: var(--spacing-sm);
            background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .defects-header:hover {
            background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
        }

        .defects-header h2 {
            color: var(--text-primary);
            font-size: 1.4rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
            flex: 1;
        }

        .defects-toggle-icon {
            display: none;
        }

        .defects-content {
            padding: var(--spacing-lg);
            overflow: hidden;
            transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out, padding 0.4s ease-in-out;
            max-height: 5000px;
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
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }

        .defect-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            border: 1px solid #f0f0f0;
        }

        @media print {
            .defects-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .defect-description {
            color: #555;
            line-height: 1.6;
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
            color: var(--text-primary);
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
            background: white;
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
            background: #000;
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
            background: #000;
            cursor: pointer;
            transition: opacity 0.3s ease;
        }

        .carousel-item img:hover {
            opacity: 0.95;
        }


        .carousel-button {
            background: #6b7280;
            color: white;
            border: none;
            flex: 1;
            min-height: 56px;
            cursor: pointer;
            font-size: 1.8rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }

        .carousel-button:hover,
        .carousel-button:active {
            background: #4b5563;
            transform: scale(0.98);
        }

        .carousel-button.prev {
            border-radius: 0 0 0 var(--radius-lg);
        }

        .carousel-button.next {
            border-radius: 0 0 var(--radius-lg) 0;
        }

        .carousel-controls {
            display: flex;
            gap: 0;
            width: 100%;
            margin-top: 0;
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

        /* Défauthèque - Images complètes (non coupées) */
        .defect-item .carousel-container {
            height: 600px;
            display: flex;
            flex-direction: column;
        }

        .defect-item .carousel-wrapper {
            height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        }

        .defect-item .carousel-items {
            height: 600px;
        }

        .defect-item .carousel-item {
            height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .defect-item .carousel-item img {
            width: 100%;
            height: 600px;
            object-fit: contain;
            border-radius: 4px;
            background: #000;
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
        }
    </style>
</head>
<body>
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

    <!-- Modal pour le lecteur vidéo -->
    <div id="video-modal" class="video-modal" onclick="closeVideoPlayer(event)">
        <div class="video-modal-content" onclick="event.stopPropagation()">
            <div class="video-modal-header">
                <span id="video-modal-title" class="video-modal-title"></span>
                <button class="video-modal-close" onclick="closeVideoPlayer(event)">&times;</button>
            </div>
            <div class="video-modal-body">
                <video id="video-player" controls style="width: 100%; max-height: 75vh; background: #000;">
                    Votre navigateur ne supporte pas la lecture vidéo.
                </video>
                <div id="video-error" style="display: none;"></div>
            </div>
            <div id="video-path-container" class="video-path-container">
                <span id="video-path-text" class="video-path-text"></span>
                <button onclick="copyVideoPath()" class="video-copy-btn" title="Copier le chemin">📋</button>
            </div>
        </div>
    </div>

    <style>
        .video-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            justify-content: center;
            align-items: center;
        }
        .video-modal.active {
            display: flex;
        }
        .video-modal-content {
            background: #1a1a1a;
            border-radius: 12px;
            width: 90%;
            max-width: 900px;
            max-height: 90%;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .video-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #252525;
            border-bottom: 1px solid #333;
        }
        .video-modal-title {
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .video-modal-close {
            background: transparent;
            border: none;
            color: #999;
            font-size: 28px;
            cursor: pointer;
            padding: 0 8px;
            line-height: 1;
            transition: color 0.2s;
        }
        .video-modal-close:hover {
            color: white;
        }
        .video-modal-body {
            padding: 0;
            background: #000;
        }
        .video-path-container {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: #252525;
            border-top: 1px solid #333;
        }
        .video-path-text {
            flex: 1;
            font-size: 0.8rem;
            color: #888;
            word-break: break-all;
            font-family: monospace;
        }
        .video-copy-btn {
            background: #333;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .video-copy-btn:hover {
            background: #444;
        }
    </style>

    <script>
        var currentVideoPath = '';

        function openVideoPlayer(videoPath, videoTitle) {
            var modal = document.getElementById('video-modal');
            var player = document.getElementById('video-player');
            var title = document.getElementById('video-modal-title');
            var errorDiv = document.getElementById('video-error');
            var pathText = document.getElementById('video-path-text');

            currentVideoPath = videoPath;

            // Reset
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.innerHTML = '';
            }
            player.style.display = 'block';

            title.textContent = videoTitle || 'Vidéo';
            pathText.textContent = videoPath;
            player.src = videoPath;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Tenter la lecture
            player.load();
            player.play().catch(function(e) {
                console.log('Lecture automatique bloquée:', e);
            });
        }

        function closeVideoPlayer(event) {
            if (event && event.target.classList.contains('video-modal-close')) {
                // Clic sur le bouton fermer
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

        function copyVideoPath() {
            navigator.clipboard.writeText(currentVideoPath).then(function() {
                var btn = document.querySelector('.video-copy-btn');
                var original = btn.textContent;
                btn.textContent = '✓';
                setTimeout(function() { btn.textContent = original; }, 1500);
            });
        }

        // Gestion des erreurs vidéo
        document.addEventListener('DOMContentLoaded', function() {
            var player = document.getElementById('video-player');
            if (player) {
                player.addEventListener('error', function(e) {
                    var errorDiv = document.getElementById('video-error');
                    if (errorDiv && currentVideoPath) {
                        player.style.display = 'none';
                        errorDiv.innerHTML =
                            '<div style="text-align: center; padding: 40px; color: #fff;">' +
                            '<div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>' +
                            '<div style="font-size: 1.1rem; margin-bottom: 12px;">Impossible de lire la vidéo</div>' +
                            '<div style="font-size: 0.9rem; color: #aaa; margin-bottom: 20px;">Le navigateur ne peut pas accéder au fichier.</div>' +
                            '<div style="font-size: 0.85rem; color: #888; margin-bottom: 20px;">💡 Copiez le chemin ci-dessous et collez-le dans l\\'explorateur Windows pour ouvrir la vidéo.</div>' +
                            '</div>';
                        errorDiv.style.display = 'block';
                    }
                });
            }
        });

        // Fermer avec Échap
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
    </script>
</body>
</html>`;

  // Créer un Blob et télécharger
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
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

  return `
    <div class="defects-section" id="defautheque">
        <div class="defects-header" onclick="toggleDefects()" style="cursor: pointer;">
            <h2>Défauthèque</h2>
        </div>

        <div class="defects-content collapsed" id="defects-content">
            <div class="defects-grid">
            ${procedure.defects.map((defect, defectIndex) => `
                <div class="defect-item">
                    ${defect.defect ? `
                    <div class="defect-field" style="margin-bottom: 12px; line-height: 1.6;">
                        <span style="color: #ef4444; font-weight: 600;">Défaut : </span>
                        <span style="color: #555;">${escapeHtml(defect.defect)}</span>
                    </div>
                    ` : ''}

                    ${defect.whatToDo ? `
                    <div class="defect-field" style="margin-bottom: 12px; line-height: 1.6;">
                        <span style="color: #10b981; font-weight: 600;">Intervention : </span>
                        <span style="color: #555;">${escapeHtml(defect.whatToDo)}</span>
                    </div>
                    ` : ''}

                    ${!defect.defect && !defect.whatToDo && defect.description ? `
                    <div class="defect-description">${escapeHtml(defect.description)}</div>
                    ` : ''}

                    ${defect.images && defect.images.length > 0 ? `
                    ${generateImageCarousel(defect.images, renderedImageUrls, `defect-${defectIndex}`)}
                    ` : ''}
                </div>
            `).join('')}
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
            <div class="phase-title" style="color: #444;">Phase ${phase.phaseNumber || phaseIndex + 1} : ${escapeHtml(phase.title)}</div>
            <div class="phase-badges">
                <span class="difficulty-badge" style="background: ${difficultyColor};">${difficultyLabel.toUpperCase()}</span>
                ${phase.estimatedTime ? `<span class="phase-time-badge">${phase.estimatedTime} min/pièce</span>` : ''}
            </div>
        </div>
        <div class="phase-content" id="phase-${phaseIndex + 1}-content">

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
                    <div class="step-label" style="color: #444;">
                        Étape ${stepIndex + 1}${step.title ? ` : ${escapeHtml(step.title)}` : ''}
                    </div>
                    <div class="step-toggle-icon" style="display: none;">▼</div>
                </div>

                <div class="step-content collapsed" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}-content">
                <div class="step-details-grid">
                    <div style="display: flex; gap: 20px; align-items: flex-start;">
                        ${step.description || hasConsignes ? `
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 20px; color: #1a1a1a;">Description</div>
                            <div style="border-radius: 8px; font-size: 1.1rem;">
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
                        ` : ''}

                        ${hasTools ? `
                        <div style="width: 300px; flex-shrink: 0;">
                            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 20px; color: #1a1a1a;">Outil(s)</div>
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
                                            ${tool.location ? `<div class="step-tool-location" style="color: #666; font-size: 0.8rem; margin-top: 2px;">${escapeHtml(tool.location)}</div>` : ''}
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
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

  // Générer les miniatures
  const thumbnails = images.map((_img, index) => {
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

  // Ne pas afficher le titre "Photo" pour la défauthèque
  const isDefect = carouselId.startsWith('defect-');
  const photoTitle = isDefect ? '' : '<div style="font-size: 1.1rem; font-weight: 600; color: #444; margin-bottom: 12px;">Photo</div>';

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
 */
function convertToFileUrl(path: string): string {
  if (!path) return path;

  // Si c'est déjà une URL (http, https, file), ne pas modifier
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
    return path;
  }

  // Chemin UNC Windows (\\NAS\folder\file.mp4)
  if (path.startsWith('\\\\')) {
    // Convertir \\NAS\folder\file.mp4 en file://///NAS/folder/file.mp4
    const converted = 'file:///' + path.replace(/\\/g, '/');
    return converted;
  }

  // Chemin Windows absolu (C:\folder\file.mp4)
  if (/^[A-Za-z]:/.test(path)) {
    // Convertir C:\folder\file.mp4 en file:///C:/folder/file.mp4
    const converted = 'file:///' + path.replace(/\\/g, '/');
    return converted;
  }

  // Chemin relatif ou autre, retourner tel quel
  return path;
}

/**
 * Génère un carrousel de vidéos - ouvre directement avec le lecteur système
 */
function generateVideoCarousel(videos: any[], _carouselId: string): string {
  if (videos.length === 0) return '';

  const videoButtons = videos.map((video) => {
    const videoTitle = video.name || video.title || 'Vidéo';
    const videoUrl = convertToFileUrl(video.url);
    return `
      <button type="button" onclick="openVideoPlayer('${escapeHtml(videoUrl).replace(/'/g, "\\'")}', '${escapeHtml(videoTitle).replace(/'/g, "\\'")}')" class="video-button" style="
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #555;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-right: 12px;
        margin-bottom: 12px;
        font-family: inherit;
      " onmouseover="this.style.borderColor='var(--primary-color)'; this.style.background='#fff'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.borderColor='#d0d0d0'; this.style.background='linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'; this.style.boxShadow='none';">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 0.95rem; font-weight: 600; color: #333;">${escapeHtml(videoTitle)}</div>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="video-section" style="margin-top: 20px;">
      <div class="video-section-title" style="font-size: 1.1rem; font-weight: 600; color: #444; margin-bottom: 12px;">Vidéo</div>
      <div style="display: flex; flex-wrap: wrap; align-items: flex-start;">
        ${videoButtons}
      </div>
    </div>
  `;
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
          <div style="font-size: 0.95rem; font-weight: 600; color: #333;">${escapeHtml(docTitle)}</div>
        </div>
      </a>
    `;
  }).join('');

  return `
    <div class="document-section" style="margin-top: 20px;">
      <div class="document-section-title" style="font-size: 1.1rem; font-weight: 600; color: #444; margin-bottom: 12px;">Document</div>
      <div style="display: flex; flex-wrap: wrap; align-items: flex-start;">
        ${documentButtons}
      </div>
    </div>
  `;
}
