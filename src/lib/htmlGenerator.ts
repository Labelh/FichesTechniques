import { Procedure, Phase } from '../types';

/**
 * Génère un fichier HTML complet et stylisé pour une procédure
 */
export async function generateHTML(
  procedure: Procedure,
  phases: Phase[]
): Promise<void> {
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
            background: #fafafa;
            margin: 0;
        }

        /* Sidebar Navigation */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 280px;
            background: white;
            border-right: 1px solid #e0e0e0;
            overflow-y: auto;
            padding: 20px;
            z-index: 100;
        }

        .sidebar h2 {
            font-size: 1.1rem;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
        }

        .nav-phase {
            margin-bottom: 20px;
        }

        .nav-phase-title {
            display: block;
            color: rgb(249, 55, 5);
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 8px;
            text-decoration: none;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .nav-phase-title:hover {
            background: #f8f9fa;
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
            background: #f8f9fa;
            color: rgb(249, 55, 5);
        }

        /* Container principal */
        .container {
            margin-left: 280px;
            background: white;
        }

        /* En-tête */
        .header {
            background: #2c3e50;
            color: white;
            padding: 40px;
            border-bottom: 3px solid rgb(249, 55, 5);
        }

        .header-reference {
            font-size: 0.9rem;
            color: rgb(249, 55, 5);
            font-weight: 600;
            margin-bottom: 8px;
        }

        h1 {
            font-size: 2.2rem;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .description {
            font-size: 1rem;
            opacity: 0.9;
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
            background: rgba(255,255,255,0.15);
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
            border-top: 1px solid rgba(255,255,255,0.15);
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
        }

        .meta-label {
            font-weight: 600;
            opacity: 0.8;
        }

        /* Contenu */
        .content {
            padding: 40px;
        }

        /* Ressources globales */
        .resources {
            background: #f8f9fa;
            padding: 30px;
            margin-bottom: 30px;
            border-left: 3px solid rgb(249, 55, 5);
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
            margin-bottom: 40px;
            break-inside: avoid;
        }

        .phase-header {
            background: rgb(249, 55, 5);
            color: white;
            padding: 20px 25px;
            margin-bottom: 20px;
        }

        .phase-title {
            font-size: 1.6rem;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .phase-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 0.9rem;
            opacity: 0.95;
        }

        .phase-meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* Étapes */
        .steps {
            padding-left: 0;
        }

        .step {
            margin-bottom: 25px;
            padding: 20px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
        }

        .step-number {
            display: inline-block;
            background: rgb(249, 55, 5);
            color: white;
            padding: 4px 12px;
            font-weight: 600;
            font-size: 0.9rem;
            margin-right: 10px;
            border-radius: 3px;
        }

        .step-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            display: inline-block;
        }

        .step-description {
            color: #555;
            margin-bottom: 15px;
            line-height: 1.7;
        }

        .step-tool {
            background: #fff8f0;
            padding: 12px;
            border-left: 3px solid rgb(249, 55, 5);
            margin: 15px 0;
        }

        .step-tool-label {
            font-weight: 600;
            color: rgb(249, 55, 5);
            margin-right: 8px;
        }

        .step-time {
            color: #666;
            font-size: 0.85rem;
            margin-top: 10px;
        }

        /* Images */
        .step-images {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .step-image-wrapper {
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        .step-image {
            width: 100%;
            height: auto;
            display: block;
        }

        .step-image-desc {
            padding: 10px;
            background: #f8f9fa;
            font-size: 0.85rem;
            color: #666;
        }

        /* Conseils (touches de vert) */
        .tips {
            background: #f0f9f4;
            border-left: 3px solid #10b981;
            padding: 15px;
            margin: 15px 0;
        }

        .tips-title {
            font-weight: 600;
            color: #059669;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tip-item {
            padding: 5px 0;
            color: #555;
        }

        /* Consignes de sécurité (touches de rouge) */
        .safety-notes {
            margin: 15px 0;
        }

        .safety-note {
            padding: 15px;
            margin-bottom: 10px;
        }

        .safety-note.warning {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
        }

        .safety-note.danger {
            background: #fef2f2;
            border-left: 3px solid #dc2626;
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
        ${generateSidebarNav(phases)}
    </div>

    <!-- Contenu principal -->
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            ${procedure.reference ? `<div class="header-reference">Référence: ${escapeHtml(procedure.reference)}</div>` : ''}
            <h1>${escapeHtml(procedure.designation || procedure.title)}</h1>
            ${procedure.description ? `<p class="description">${escapeHtml(procedure.description)}</p>` : ''}

            ${procedure.tags && procedure.tags.length > 0 ? `
            <div class="tags">
                ${procedure.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}

            ${procedure.coverImage ? `<img src="${procedure.coverImage}" alt="Cover" class="cover-image">` : ''}

            <div class="meta-info">
                ${procedure.category ? `<div class="meta-item"><span class="meta-label">Catégorie:</span> ${escapeHtml(procedure.category)}</div>` : ''}
                ${procedure.totalCost ? `<div class="meta-item"><span class="meta-label">Coût estimé:</span> ${procedure.totalCost}€</div>` : ''}
            </div>
        </div>

        <!-- Contenu -->
        <div class="content">
            ${generateGlobalResources(procedure)}
            ${generatePhasesHTML(phases)}
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
 * Génère la navigation de la sidebar
 */
function generateSidebarNav(phases: Phase[]): string {
  if (!phases || phases.length === 0) {
    return '<p style="color: #999;">Aucune phase</p>';
  }

  return phases.map((phase, phaseIndex) => `
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
 * Génère le HTML pour les phases
 */
function generatePhasesHTML(phases: Phase[]): string {
  return phases.map((phase, phaseIndex) => `
    <div class="phase" id="phase-${phaseIndex + 1}">
        <div class="phase-header">
            <div class="phase-title">Phase ${phase.phaseNumber || phaseIndex + 1} : ${escapeHtml(phase.title)}</div>
            <div class="phase-meta">
                ${phase.difficulty ? `
                <div class="phase-meta-item">
                    <span>📊 Difficulté:</span>
                    <span>${phase.difficulty === 'easy' ? 'Facile' : phase.difficulty === 'medium' ? 'Moyen' : 'Difficile'}</span>
                </div>
                ` : ''}
                ${phase.estimatedTime ? `
                <div class="phase-meta-item">
                    <span>⏱️ Temps estimé:</span>
                    <span>${phase.estimatedTime} min</span>
                </div>
                ` : ''}
                ${phase.numberOfPeople ? `
                <div class="phase-meta-item">
                    <span>👥 Personnes:</span>
                    <span>${phase.numberOfPeople}</span>
                </div>
                ` : ''}
            </div>
            ${phase.requiredSkills && phase.requiredSkills.length > 0 ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.15);">
                <strong>Compétences requises:</strong> ${phase.requiredSkills.join(', ')}
            </div>
            ` : ''}
        </div>

        ${phase.steps && phase.steps.length > 0 ? `
        <div class="steps">
            ${phase.steps.map((step, stepIndex) => `
            <div class="step" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}">
                <div>
                    <span class="step-number">${stepIndex + 1}</span>
                    ${step.title ? `<span class="step-title">${escapeHtml(step.title)}</span>` : ''}
                </div>
                <div class="step-description">${escapeHtml(step.description)}</div>

                ${step.toolId && step.tool ? `
                <div class="step-tool">
                    <span class="step-tool-label">🔧 Outil:</span>
                    ${step.tool.reference ? `<strong>${escapeHtml(step.tool.reference)}</strong> - ` : ''}
                    ${escapeHtml(step.tool.name)}
                </div>
                ` : ''}

                ${step.estimatedTime ? `
                <div class="step-time">⏱️ Temps: ${step.estimatedTime} min</div>
                ` : ''}

                ${step.images && step.images.length > 0 ? `
                <div class="step-images">
                    ${step.images.map(img => {
                      const imageUrl = img.image?.url || (img.image?.blob ? URL.createObjectURL(img.image.blob) : '');
                      return imageUrl ? `
                      <div class="step-image-wrapper">
                          <img src="${imageUrl}" alt="${escapeHtml(img.description || 'Image')}" class="step-image">
                          ${img.description ? `<div class="step-image-desc">${escapeHtml(img.description)}</div>` : ''}
                      </div>
                      ` : '';
                    }).join('')}
                </div>
                ` : ''}

                ${step.tips && step.tips.length > 0 ? `
                <div class="tips">
                    <div class="tips-title">💡 Conseils</div>
                    ${step.tips.map(tip => `<div class="tip-item">• ${escapeHtml(tip)}</div>`).join('')}
                </div>
                ` : ''}

                ${step.safetyNotes && step.safetyNotes.length > 0 ? `
                <div class="safety-notes">
                    ${step.safetyNotes.map(note => `
                    <div class="safety-note ${note.type === 'danger' ? 'danger' : 'warning'}">
                        <div class="safety-note-title">
                            ${note.type === 'danger' ? '⚠️ DANGER' : '⚠️ ATTENTION'}
                        </div>
                        <div>${escapeHtml(note.content)}</div>
                    </div>
                    `).join('')}
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
