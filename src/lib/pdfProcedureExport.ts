import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Procedure, Phase } from '../types';

/**
 * Exporter la procédure complète en PDF
 */
export async function exportProcedureToPDF(
  procedure: Procedure,
  phases: Phase[]
): Promise<void> {
  try {
    // Créer un conteneur temporaire pour le HTML
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '800px'; // Largeur fixe pour le rendu
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '40px';
    document.body.appendChild(tempContainer);

    // Générer le contenu HTML
    const htmlContent = `
      <div style="font-family: 'Montserrat', Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f93705; padding-bottom: 20px;">
          <h1 style="color: #f93705; margin: 0;">${procedure.designation || procedure.title}</h1>
          ${procedure.reference ? `<p style="margin: 10px 0;">Référence: ${procedure.reference}</p>` : ''}
          ${procedure.description ? `<p style="margin: 10px 0; color: #666;">${procedure.description}</p>` : ''}
        </div>
        ${phases.map((phase, idx) => `
          <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; page-break-inside: avoid;">
            <h2 style="color: #333; border-bottom: 2px solid #f93705; padding-bottom: 10px;">
              Phase ${idx + 1}: ${phase.title}
            </h2>
            <p style="color: #666; margin: 10px 0;">
              <strong>Difficulté:</strong> ${phase.difficulty} |
              <strong>Temps estimé:</strong> ${phase.estimatedTime} min
            </p>
            ${phase.steps.map((step, stepIdx) => `
              <div style="margin: 20px 0; padding-left: 20px; border-left: 3px solid #f93705;">
                <h3 style="color: #555; margin: 0 0 10px 0;">
                  Étape ${stepIdx + 1}: ${step.title}
                </h3>
                ${step.description ? `<div style="margin: 10px 0; line-height: 1.6;">${step.description.replace(/\n/g, '<br>')}</div>` : ''}
                ${step.tools && step.tools.length > 0 ? `
                  <div style="margin: 15px 0;">
                    <strong>Outils:</strong> ${step.tools.map(t => t.name).join(', ')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;

    tempContainer.innerHTML = htmlContent;

    // Attendre un peu pour que le DOM soit rendu
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convertir en canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Nettoyer le conteneur temporaire
    document.body.removeChild(tempContainer);

    // Créer le PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // Largeur A4 en mm
    const pageHeight = 297; // Hauteur A4 en mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Ajouter la première page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Ajouter des pages supplémentaires si nécessaire
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Télécharger le PDF
    const fileName = `${procedure.reference || 'procedure'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error exporting procedure to PDF:', error);
    throw error;
  }
}
