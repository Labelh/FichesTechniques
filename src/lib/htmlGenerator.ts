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
            background: #f8f9fa;
            padding: 20px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }

        /* En-tête */
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            position: relative;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgb(249, 55, 5);
        }

        ${procedure.coverImage ? `
        .cover-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            margin: 20px auto;
            display: block;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }
        ` : ''}

        h1 {
            font-size: 2.5rem;
            margin-bottom: 15px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .description {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 20px;
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }

        .tag {
            background: rgba(255,255,255,0.2);
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            backdrop-filter: blur(10px);
        }

        .meta-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
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
            margin-bottom: 40px;
            border-radius: 8px;
            border-left: 4px solid rgb(249, 55, 5);
        }

        .resources h2 {
            color: rgb(249, 55, 5);
            margin-bottom: 20px;
            font-size: 1.5rem;
        }

        .resources h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.2rem;
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
            color: #7f8c8d;
            font-size: 0.95rem;
            margin-top: 5px;
        }

        /* Phases */
        .phase {
            margin-bottom: 50px;
            break-inside: avoid;
        }

        .phase-header {
            background: linear-gradient(135deg, rgb(249, 55, 5) 0%, #ff6b35 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .phase-title {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .phase-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 0.95rem;
            opacity: 0.9;
        }

        .phase-meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* Étapes */
        .steps {
            padding-left: 20px;
        }

        .step {
            margin-bottom: 30px;
            padding: 20px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            position: relative;
        }

        .step-number {
            position: absolute;
            top: -15px;
            left: 20px;
            background: rgb(249, 55, 5);
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .step-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
            padding-top: 10px;
        }

        .step-description {
            color: #555;
            margin-bottom: 15px;
            line-height: 1.8;
        }

        .step-tool {
            background: #fff3e0;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid rgb(249, 55, 5);
            margin: 15px 0;
        }

        .step-tool-label {
            font-weight: 600;
            color: rgb(249, 55, 5);
            margin-right: 8px;
        }

        .step-time {
            color: #7f8c8d;
            font-size: 0.9rem;
            font-style: italic;
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
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
            text-align: center;
        }

        /* Conseils */
        .tips {
            background: #e3f2fd;
            border-left: 3px solid #2196f3;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
        }

        .tips-title {
            font-weight: 600;
            color: #1976d2;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tip-item {
            padding: 5px 0;
            color: #555;
        }

        /* Consignes de sécurité */
        .safety-notes {
            margin: 15px 0;
        }

        .safety-note {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 10px;
        }

        .safety-note.warning {
            background: #fff3e0;
            border-left: 3px solid #ff9800;
        }

        .safety-note.danger {
            background: #ffebee;
            border-left: 3px solid #f44336;
        }

        .safety-note-title {
            font-weight: 700;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .safety-note.warning .safety-note-title {
            color: #f57c00;
        }

        .safety-note.danger .safety-note-title {
            color: #d32f2f;
        }

        /* Impression */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            .container {
                box-shadow: none;
                max-width: 100%;
            }

            .phase {
                page-break-inside: avoid;
            }

            .step {
                page-break-inside: avoid;
            }

            .no-print {
                display: none;
            }
        }

        /* Boutons d'action */
        .actions {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }

        .btn {
            background: rgb(249, 55, 5);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(249, 55, 5, 0.3);
            transition: all 0.2s;
        }

        .btn:hover {
            background: #e03d00;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(249, 55, 5, 0.4);
        }

        @media (max-width: 768px) {
            .actions {
                position: static;
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="actions no-print">
        <button class="btn" onclick="window.print()">🖨️ Imprimer</button>
    </div>

    <div class="container">
        <!-- En-tête -->
        <div class="header">
            ${procedure.coverImage ? `<img src="${procedure.coverImage}" alt="Cover" class="cover-image">` : ''}
            <h1>${escapeHtml(procedure.designation || procedure.title)}</h1>
            ${procedure.description ? `<p class="description">${escapeHtml(procedure.description)}</p>` : ''}

            ${procedure.tags && procedure.tags.length > 0 ? `
            <div class="tags">
                ${procedure.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}

            <div class="meta-info">
                ${procedure.reference ? `<div class="meta-item"><span class="meta-label">Référence:</span> ${escapeHtml(procedure.reference)}</div>` : ''}
                ${procedure.category ? `<div class="meta-item"><span class="meta-label">Catégorie:</span> ${escapeHtml(procedure.category)}</div>` : ''}
                ${procedure.totalCost ? `<div class="meta-item"><span class="meta-label">Coût estimé:</span> ${procedure.totalCost}€</div>` : ''}
                <div class="meta-item"><span class="meta-label">Généré le:</span> ${new Date().toLocaleDateString('fr-FR')}</div>
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
  return phases.map((phase, index) => `
    <div class="phase">
        <div class="phase-header">
            <div class="phase-title">Phase ${phase.phaseNumber || index + 1} : ${escapeHtml(phase.title)}</div>
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
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <strong>Compétences requises:</strong> ${phase.requiredSkills.join(', ')}
            </div>
            ` : ''}
        </div>

        ${phase.steps && phase.steps.length > 0 ? `
        <div class="steps">
            ${phase.steps.map((step, stepIndex) => `
            <div class="step">
                <div class="step-number">${stepIndex + 1}</div>
                ${step.title ? `<div class="step-title">${escapeHtml(step.title)}</div>` : ''}
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
