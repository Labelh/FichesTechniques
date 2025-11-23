import { Procedure, Phase, AnnotatedImage } from '../types';
import { renderAllAnnotatedImagesToBase64 } from './imageAnnotationRenderer';

/**
 * Génère un fichier HTML complet et stylisé pour une procédure
 */
export async function generateHTML(
  procedure: Procedure,
  phases: Phase[]
): Promise<void> {
  // Collecter toutes les images annotées
  const allAnnotatedImages: AnnotatedImage[] = [];

  phases.forEach(phase => {
    phase.steps.forEach(step => {
      if (step.images) {
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
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: #f8f9fa;
            margin: 0;
        }

        /* Sidebar Navigation */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 280px;
            background: #e8e8e8;
            border-right: 1px solid #d0d0d0;
            overflow-y: auto;
            padding: 24px;
            z-index: 100;
            box-shadow: 2px 0 8px rgba(0,0,0,0.05);
        }

        .sidebar h2 {
            font-size: 1.2rem;
            color: #1a1a1a;
            margin-bottom: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .nav-phase {
            margin-bottom: 16px;
        }

        .nav-phase-title {
            display: block;
            color: rgb(249, 55, 5);
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 8px;
            text-decoration: none;
            padding: 10px 14px;
            border-radius: 6px;
            transition: all 0.2s ease;
        }

        .nav-phase-title:hover {
            background: rgba(249, 55, 5, 0.08);
            transform: translateX(4px);
        }

        .nav-steps {
            list-style: none;
            padding-left: 12px;
            margin-top: 5px;
        }

        .nav-step {
            margin-bottom: 4px;
        }

        .nav-step a {
            display: block;
            color: #555;
            text-decoration: none;
            font-size: 0.85rem;
            padding: 4px 8px;
            border-radius: 3px;
            transition: background 0.2s;
        }

        .nav-step a:hover {
            background: rgba(249, 55, 5, 0.05);
            color: rgb(249, 55, 5);
        }

        /* Container principal */
        .container {
            margin-left: 280px;
            background: #f8f9fa;
        }

        /* En-tête */
        .header {
            background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
            color: #2c3e50;
            padding: 48px 40px;
            border-bottom: 4px solid rgb(249, 55, 5);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .header-title {
            font-size: 2rem;
            color: #666;
            font-weight: 500;
            margin-bottom: 12px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header-designation {
            font-size: 2.2rem;
            font-weight: 400;
            color: #1a1a1a;
            margin-bottom: 16px;
            text-align: left;
        }

        .header-reference {
            font-size: 2.4rem;
            color: rgb(249, 55, 5);
            font-weight: 400;
            margin-bottom: 28px;
            text-align: left;
            text-shadow: 0 2px 4px rgba(249, 55, 5, 0.1);
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
            padding-top: 20px;
            border-top: 1px solid #d0d0d0;
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
            padding: 48px;
            max-width: 1400px;
        }

        /* Ressources globales */
        .resources {
            background: white;
            padding: 32px;
            margin-bottom: 32px;
            border-left: 4px solid rgb(249, 55, 5);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        /* Défauthèque */
        .defects-section {
            background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
            padding: 36px;
            margin-bottom: 32px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(220, 38, 38, 0.08);
            border: 1px solid #ffe0e0;
        }

        .defects-section h2 {
            color: #dc2626;
            margin-bottom: 28px;
            font-size: 1.5rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .defect-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
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
        }

        .resources h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .resource-list {
            list-style: none;
            padding-left: 0;
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
            margin-bottom: 24px;
            break-inside: avoid;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            border: 1px solid #e8e8e8;
        }

        .phase-header {
            background: white;
            padding: 24px 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .phase-title {
            font-size: 1.6rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: rgb(249, 55, 5);
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
            gap: 5px;
        }

        /* Étapes */
        .steps {
            padding: 28px;
            background: #fafafa;
        }

        .step {
            margin-bottom: 24px;
            padding: 24px;
            background: white;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .step:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .step:last-child {
            margin-bottom: 0;
        }

        .step-number {
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgb(249, 55, 5) 0%, rgb(230, 45, 0) 100%);
            color: white;
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            font-weight: 700;
            font-size: 1.1rem;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(249, 55, 5, 0.3);
        }

        .step-header {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
        }

        .step-content {
            flex: 1;
        }

        .step-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 8px;
        }

        .step-description {
            color: #555;
            line-height: 1.8;
            font-size: 1.1rem;
        }

        .step-tool {
            background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%);
            padding: 18px 20px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
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
        }

        .step-image-wrapper {
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .step-image {
            width: 100%;
            height: auto;
            display: block;
        }

        .step-image-desc {
            padding: 12px 16px;
            background: #f8f9fa;
            font-size: 0.9rem;
            color: #666;
            border-top: 1px solid #e8e8e8;
        }

        /* Conseils (touches de vert) */
        .tips {
            background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%);
            border-left: 4px solid #10b981;
            padding: 18px 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.1);
        }

        .tips-title {
            font-weight: 700;
            color: #059669;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.05rem;
        }

        .tip-item {
            padding: 6px 0;
            color: #555;
            line-height: 1.6;
        }

        /* Consignes de sécurité (touches de rouge) */
        .safety-notes {
            margin: 20px 0;
        }

        .safety-note {
            padding: 18px 20px;
            margin-bottom: 12px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.1);
        }

        .safety-note.warning {
            background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
            border-left: 4px solid #ef4444;
        }

        .safety-note.danger {
            background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
            border-left: 4px solid #dc2626;
        }

        .safety-note-title {
            font-weight: 700;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .safety-note.warning .safety-note-title {
            color: #ef4444;
        }

        .safety-note.danger .safety-note-title {
            color: #dc2626;
        }

        /* Version History */
        .version-history {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .version-log {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
        }

        .version-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .version-number {
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .version-type {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .version-date {
            color: #666;
            font-size: 0.85rem;
            margin-left: auto;
        }

        .version-description {
            color: #2c3e50;
            line-height: 1.6;
            font-size: 0.95rem;
        }

        /* Impression */
        @media print {
            .sidebar {
                display: none;
            }

            .container {
                margin-left: 0;
            }

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
    <!-- Sidebar Navigation -->
    <div class="sidebar">
        <h2>Navigation</h2>
        ${generateSidebarNav(phases, !!(procedure.defects && procedure.defects.length > 0))}
    </div>

    <!-- Contenu principal -->
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="header-title">Fiche Technique</div>
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
            ${generateVersionHistory(procedure)}
        </div>
    </div>
</body>
</html>`;

  // Créer un Blob et télécharger
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(procedure.designation || procedure.reference || procedure.title || 'procedure')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Génère le HTML pour l'historique des versions
 */
function generateVersionHistory(procedure: Procedure): string {
  if (!procedure.changelog || procedure.changelog.length === 0) {
    return '';
  }

  return `
    <section class="section" id="versioning">
        <h2 class="section-title">
            📋 Historique des versions
            ${procedure.versionString ? `<span style="background: #f93705; color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.9rem; margin-left: 12px;">v${procedure.versionString}</span>` : ''}
        </h2>
        <div class="version-history">
            ${procedure.changelog.map(log => `
                <div class="version-log">
                    <div class="version-header">
                        <span class="version-number" style="background: ${log.type === 'major' ? '#f93705' : '#3b82f6'};">
                            v${escapeHtml(log.version)}
                        </span>
                        <span class="version-type" style="background: ${log.type === 'major' ? 'rgba(255, 107, 53, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${log.type === 'major' ? '#ff6b35' : '#10b981'};">
                            ${log.type === 'major' ? 'Majeure' : 'Mineure'}
                        </span>
                        <span class="version-date">
                            ${new Date(log.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                    <div class="version-description">
                        ${escapeHtml(log.description)}
                    </div>
                </div>
            `).join('')}
        </div>
    </section>
  `;
}

/**
 * Génère la navigation de la sidebar
 */
function generateSidebarNav(phases: Phase[], hasDefects: boolean = false): string {
  const defectsNav = hasDefects ? `
    <div class="nav-phase">
        <a href="#defautheque" class="nav-phase-title" style="color: #ff6b35;">
            Défauthèque
        </a>
    </div>
  ` : '';

  const phasesNav = !phases || phases.length === 0
    ? '<p style="color: #999;">Aucune phase</p>'
    : phases.map((phase, phaseIndex) => `
    <div class="nav-phase">
        <a href="#phase-${phaseIndex + 1}" class="nav-phase-title">
            Phase ${phase.phaseNumber || phaseIndex + 1}: ${escapeHtml(phase.title)}
        </a>
        ${phase.steps && phase.steps.length > 0 ? `
        <ul class="nav-steps">
            ${phase.steps.map((step, stepIndex) => `
            <li class="nav-step">
                <a href="#phase-${phaseIndex + 1}-step-${stepIndex + 1}">
                    ${stepIndex + 1}. ${escapeHtml(step.title || step.description.substring(0, 40) + '...')}
                </a>
            </li>
            `).join('')}
        </ul>
        ` : ''}
    </div>
  `).join('');

  return defectsNav + phasesNav;
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
        <h3>🔧 Outils</h3>
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
        <h2>Défauthèque</h2>

        <div class="defects-grid">
        ${procedure.defects.map(defect => `
            <div class="defect-item">
                <div class="defect-description">${escapeHtml(defect.description)}</div>

                ${defect.images && defect.images.length > 0 ? `
                <div class="step-images" style="margin-top: 15px;">
                    ${defect.images.map(img => {
                      const imageUrl = renderedImageUrls.get(img.imageId) || img.image.url;
                      return `
                    <div class="step-image">
                        <img src="${imageUrl}" alt="${escapeHtml(img.description || 'Image du défaut')}">
                        ${img.description ? `<p class="image-caption">${escapeHtml(img.description)}</p>` : ''}
                    </div>
                    `;
                    }).join('')}
                </div>
                ` : ''}
            </div>
        `).join('')}
        </div>
    </div>
  `;
}

/**
 * Génère le HTML pour les phases
 */
function generatePhasesHTML(phases: Phase[], renderedImageUrls: Map<string, string>): string {
  return phases.map((phase, phaseIndex) => `
    <div class="phase" id="phase-${phaseIndex + 1}">
        <div class="phase-header">
            <div class="phase-title">Phase ${phase.phaseNumber || phaseIndex + 1} : ${escapeHtml(phase.title)}</div>
            <div class="phase-meta">
                ${phase.difficulty ? `
                <div class="phase-meta-item">
                    <span>Difficulté:</span>
                    <span>${phase.difficulty === 'easy' ? 'Facile' : phase.difficulty === 'medium' ? 'Moyen' : 'Difficile'}</span>
                </div>
                ` : ''}
                ${phase.estimatedTime ? `
                <div class="phase-meta-item">
                    <span>Temps estimé:</span>
                    <span>${phase.estimatedTime} min</span>
                </div>
                ` : ''}
                ${phase.numberOfPeople ? `
                <div class="phase-meta-item">
                    <span>Personnes:</span>
                    <span>${phase.numberOfPeople}</span>
                </div>
                ` : ''}
            </div>
            ${phase.requiredSkills && phase.requiredSkills.length > 0 ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #555;">
                <strong>Compétences requises:</strong> ${phase.requiredSkills.join(', ')}
            </div>
            ` : ''}
        </div>

        ${phase.steps && phase.steps.length > 0 ? `
        <div class="steps">
            ${phase.steps.map((step, stepIndex) => `
            <div class="step" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}">
                <div class="step-header">
                    <div class="step-number">${stepIndex + 1}</div>
                    <div class="step-content">
                        ${step.title ? `<div class="step-title">${escapeHtml(step.title)}</div>` : ''}
                        <div class="step-description">${escapeHtml(step.description)}</div>
                    </div>
                </div>

                ${step.toolId && step.toolName ? `
                <div class="step-tool">
                    <div class="step-tool-label">Outil</div>
                    <div>• ${escapeHtml(step.toolName)}</div>
                    ${step.toolReference || step.toolLocation ? `
                    <div class="step-tool-details">
                        ${step.toolReference ? `<strong>Référence:</strong> ${escapeHtml(step.toolReference)}` : ''}
                        ${step.toolReference && step.toolLocation ? ' • ' : ''}
                        ${step.toolLocation ? `<strong>Emplacement:</strong> ${escapeHtml(step.toolLocation)}` : ''}
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${step.estimatedTime ? `
                <div class="step-time">Temps: ${step.estimatedTime} min</div>
                ` : ''}

                ${step.tips && step.tips.length > 0 ? `
                <div class="tips">
                    <div class="tips-title">Conseils</div>
                    ${step.tips.map(tip => `<div class="tip-item">• ${escapeHtml(tip)}</div>`).join('')}
                </div>
                ` : ''}

                ${step.safetyNotes && step.safetyNotes.length > 0 ? `
                <div class="safety-notes">
                    ${step.safetyNotes.map(note => `
                    <div class="safety-note ${note.type === 'danger' ? 'danger' : 'warning'}">
                        <div class="safety-note-title">
                            ${note.type === 'danger' ? 'DANGER' : 'ATTENTION'}
                        </div>
                        <div>• ${escapeHtml(note.content)}</div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}

                ${step.images && step.images.length > 0 ? `
                <div class="step-images">
                    ${step.images.map(img => {
                      // Utiliser l'URL rendue avec annotations si disponible, sinon l'URL originale
                      const imageUrl = renderedImageUrls.get(img.imageId) || img.image?.url || (img.image?.blob ? URL.createObjectURL(img.image.blob) : '');
                      return imageUrl ? `
                      <div class="step-image-wrapper">
                          <img src="${imageUrl}" alt="${escapeHtml(img.description || 'Image')}" class="step-image">
                          ${img.description ? `<div class="step-image-desc">${escapeHtml(img.description)}</div>` : ''}
                      </div>
                      ` : '';
                    }).join('')}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
  `).join('');
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
