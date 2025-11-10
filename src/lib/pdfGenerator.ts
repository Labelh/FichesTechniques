import jsPDF from 'jspdf';
import { Procedure, Phase } from '../types';

// Couleurs du thème
const COLORS = {
  primary: '#ff5722', // Orange-rouge
  secondary: '#1a1a1a', // Gris très foncé
  dark: '#0f0f0f', // Noir profond
  light: '#f5f5f5', // Gris clair
  text: '#333333',
  textLight: '#666666',
  accent: '#ff6b3d',
};

interface PDFOptions {
  includeTableOfContents?: boolean;
  includeCoverPage?: boolean;
  includeToolList?: boolean;
  includeMaterialList?: boolean;
}

export class PDFGenerator {
  private pdf: jsPDF;
  private currentY: number = 0;
  private pageHeight: number = 0;
  private pageWidth: number = 0;
  private margin: number = 20;
  private phasePages: Map<number, number> = new Map(); // Map phase index to page number

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.currentY = this.margin;
  }

  /**
   * Génère la page de couverture
   */
  private generateCoverPage(procedure: Procedure) {
    // Fond sombre
    this.pdf.setFillColor(COLORS.secondary);
    this.pdf.rect(0, 0, this.pageWidth, this.pageHeight, 'F');

    // Bande orange en haut
    this.pdf.setFillColor(COLORS.primary);
    this.pdf.rect(0, 0, this.pageWidth, 60, 'F');

    // Triangle décoratif en bas à droite
    this.pdf.setFillColor(COLORS.primary);
    this.pdf.triangle(
      this.pageWidth - 60, this.pageHeight,
      this.pageWidth, this.pageHeight - 60,
      this.pageWidth, this.pageHeight,
      'F'
    );

    // Logo/Titre "FICHE TECHNIQUE"
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FICHE TECHNIQUE', this.margin, 35);

    // Titre de la procédure
    this.pdf.setFontSize(32);
    this.pdf.setFont('helvetica', 'bold');
    const titleLines = this.pdf.splitTextToSize(
      procedure.title.toUpperCase(),
      this.pageWidth - 2 * this.margin
    );
    let titleY = 100;
    titleLines.forEach((line: string) => {
      this.pdf.text(line, this.margin, titleY);
      titleY += 12;
    });

    // Description
    if (procedure.description) {
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(200, 200, 200);
      const descLines = this.pdf.splitTextToSize(
        procedure.description,
        this.pageWidth - 2 * this.margin
      );
      let descY = titleY + 20;
      descLines.slice(0, 3).forEach((line: string) => {
        this.pdf.text(line, this.margin, descY);
        descY += 7;
      });
    }

    // Informations en bas de page
    const infoY = this.pageHeight - 60;
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(255, 255, 255);

    // Catégorie
    if (procedure.category) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('CATÉGORIE', this.margin, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(procedure.category, this.margin, infoY + 6);
    }

    // Version
    if (procedure.version) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('VERSION', this.pageWidth - this.margin - 40, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(String(procedure.version), this.pageWidth - this.margin - 40, infoY + 6);
    }

    // Pied de page - removed auto-generated text
  }

  /**
   * Ajoute un en-tête sur chaque page
   */
  private addPageHeader(procedure: Procedure, pageNumber: number) {
    // Ligne orange en haut
    this.pdf.setDrawColor(COLORS.primary);
    this.pdf.setLineWidth(2);
    this.pdf.line(this.margin, 15, this.pageWidth - this.margin, 15);

    // Titre de la procédure
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.text);
    this.pdf.text(procedure.title, this.margin, 12);

    // Numéro de page
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.text(
      `Page ${pageNumber}`,
      this.pageWidth - this.margin,
      12,
      { align: 'right' }
    );

    this.currentY = 25;
  }

  /**
   * Ajoute un pied de page
   */
  private addPageFooter() {
    const footerY = this.pageHeight - 10;

    // Ligne orange en bas
    this.pdf.setDrawColor(COLORS.primary);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);

    // Date de génération removed
  }

  /**
   * Vérifie si on a assez de place, sinon crée une nouvelle page
   */
  private checkPageBreak(heightNeeded: number, procedure: Procedure, pageNumber: number) {
    if (this.currentY + heightNeeded > this.pageHeight - 20) {
      this.addPageFooter();
      this.pdf.addPage();
      this.addPageHeader(procedure, pageNumber);
      return true;
    }
    return false;
  }


  /**
   * Génère une phase
   */
  private generatePhase(phase: Phase, phaseNumber: number, procedure: Procedure, pageNumber: number) {
    // Vérifier si on a besoin d'une nouvelle page
    this.checkPageBreak(40, procedure, pageNumber);

    // Titre de la phase
    this.pdf.setFillColor(COLORS.primary);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 12, 'F');

    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`PHASE ${phaseNumber} : ${phase.title.toUpperCase()}`, this.margin + 5, this.currentY + 8);
    this.currentY += 17;

    // Description
    if (phase.description) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.text);
      const descLines = this.pdf.splitTextToSize(phase.description, this.pageWidth - 2 * this.margin - 10);
      descLines.forEach((line: string) => {
        this.pdf.text(line, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }

    // Informations de la phase
    this.checkPageBreak(20, procedure, pageNumber);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.textLight);

    const difficultyLabels: Record<string, string> = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile',
    };

    this.pdf.text(`Temps estime : ${phase.estimatedTime} min`, this.margin + 5, this.currentY);
    this.pdf.text(`Difficulte : ${difficultyLabels[phase.difficulty] || phase.difficulty}`, this.margin + 60, this.currentY);
    this.currentY += 10;

    // Outils nécessaires
    if (phase.tools && phase.tools.length > 0) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('OUTILS NECESSAIRES :', this.margin + 5, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.text);
      phase.tools.forEach((tool) => {
        this.checkPageBreak(5, procedure, pageNumber);
        this.pdf.text(`• ${tool.name}`, this.margin + 10, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 3;
    }

    // Matériaux nécessaires
    if (phase.materials && phase.materials.length > 0) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('MATERIAUX NECESSAIRES :', this.margin + 5, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.text);
      phase.materials.forEach((material) => {
        this.checkPageBreak(5, procedure, pageNumber);
        const quantity = material.quantity ? ` (${material.quantity} ${material.unit || ''})` : '';
        this.pdf.text(`• ${material.name}${quantity}`, this.margin + 10, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 3;
    }

    // Étapes
    if (phase.steps && phase.steps.length > 0) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('ETAPES DETAILLEES :', this.margin + 5, this.currentY);
      this.currentY += 8;

      phase.steps.forEach((step, index) => {
        this.checkPageBreak(15, procedure, pageNumber);

        // Numéro de l'étape
        this.pdf.setFillColor(COLORS.primary);
        this.pdf.circle(this.margin + 8, this.currentY - 2, 3, 'F');
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(`${index + 1}`, this.margin + 8, this.currentY + 1, { align: 'center' });

        // Titre de l'étape
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text(step.title, this.margin + 14, this.currentY);
        this.currentY += 5;

        // Description de l'étape
        if (step.description) {
          this.pdf.setFontSize(9);
          this.pdf.setFont('helvetica', 'normal');
          this.pdf.setTextColor(COLORS.textLight);
          const stepDescLines = this.pdf.splitTextToSize(
            step.description,
            this.pageWidth - 2 * this.margin - 20
          );
          stepDescLines.forEach((line: string) => {
            this.checkPageBreak(5, procedure, pageNumber);
            this.pdf.text(line, this.margin + 14, this.currentY);
            this.currentY += 4;
          });
        }

        // Images de l'étape
        if (step.images && step.images.length > 0) {
          this.currentY += 3;
          const imagesPerRow = 2;
          const imageWidth = (this.pageWidth - 2 * this.margin - 25) / imagesPerRow;
          const imageHeight = imageWidth * 0.75; // Ratio 4:3

          step.images.forEach((img, imgIndex) => {
            if (imgIndex % imagesPerRow === 0 && imgIndex > 0) {
              this.currentY += imageHeight + 5;
            }

            this.checkPageBreak(imageHeight + 10, procedure, pageNumber);

            const xPos = this.margin + 14 + (imgIndex % imagesPerRow) * (imageWidth + 5);

            try {
              // Convertir le Blob en base64
              if (img.image && img.image.blob) {
                const reader = new FileReader();
                reader.readAsDataURL(img.image.blob);
                reader.onload = () => {
                  const base64 = reader.result as string;
                  this.pdf.addImage(base64, 'JPEG', xPos, this.currentY, imageWidth, imageHeight);
                };
              }
            } catch (error) {
              console.warn('Erreur lors de l\'ajout d\'une image:', error);
            }

            // Description de l'image
            if (img.description) {
              this.pdf.setFontSize(7);
              this.pdf.setTextColor(COLORS.textLight);
              const imgDesc = this.pdf.splitTextToSize(img.description, imageWidth);
              this.pdf.text(imgDesc[0] || '', xPos, this.currentY + imageHeight + 3);
            }
          });

          if (step.images.length > 0) {
            this.currentY += imageHeight + 8;
          }
        }

        this.currentY += 5;
      });
    }

    // Notes de sécurité
    if (phase.safetyNotes && phase.safetyNotes.length > 0) {
      this.checkPageBreak(25, procedure, pageNumber);

      // Encadré de sécurité
      this.pdf.setFillColor(255, 245, 240);
      this.pdf.setDrawColor(COLORS.primary);
      this.pdf.setLineWidth(0.5);
      const safetyBoxHeight = phase.safetyNotes.length * 6 + 15;
      this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, safetyBoxHeight);

      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('ATTENTION - Consignes de securite', this.margin + 5, this.currentY + 7);
      this.currentY += 12;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.text);
      phase.safetyNotes.forEach((note) => {
        const prefix = note.type === 'danger' ? '[DANGER]' : note.type === 'mandatory' ? '[OBLIGATOIRE]' : note.type === 'forbidden' ? '[INTERDIT]' : '[ATTENTION]';
        this.pdf.text(`${prefix} ${note.content}`, this.margin + 5, this.currentY);
        this.currentY += 6;
      });
      this.currentY += 8;
    }

    // Conseils
    if (phase.tips && phase.tips.length > 0) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('CONSEILS :', this.margin + 5, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setTextColor(COLORS.textLight);
      phase.tips.forEach((tip) => {
        this.checkPageBreak(5, procedure, pageNumber);
        this.pdf.text(`- ${tip}`, this.margin + 10, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }

    this.currentY += 10;
  }

  /**
   * Génère le PDF complet
   */
  async generate(procedure: Procedure, phases: Phase[], options: PDFOptions = {}) {
    const {
      includeCoverPage = true,
      includeTableOfContents = true,
    } = options;

    let pageNumber = 1;

    // Page de couverture
    if (includeCoverPage) {
      this.generateCoverPage(procedure);
      pageNumber++;
    }

    // Générer d'abord les phases pour connaître leurs positions de page
    if (phases.length > 0) {
      this.pdf.addPage();
      const phasesStartPage = pageNumber + (includeTableOfContents ? 1 : 0);
      this.addPageHeader(procedure, phasesStartPage);

      phases.forEach((phase, index) => {
        // Enregistrer le numéro de page de cette phase
        const currentPageNum = (this.pdf as any).internal.getCurrentPageInfo().pageNumber;
        this.phasePages.set(index, currentPageNum);

        this.generatePhase(phase, index + 1, procedure, phasesStartPage);

        // Ajouter une ligne de séparation entre les phases
        if (index < phases.length - 1) {
          this.checkPageBreak(10, procedure, phasesStartPage);
          this.pdf.setDrawColor(COLORS.textLight);
          this.pdf.setLineWidth(0.5);
          this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
          this.currentY += 10;
        }
      });

      this.addPageFooter();
    }

    // Maintenant générer la table des matières avec les liens vers les bonnes pages
    // On va l'insérer en page 2 (après la couverture)
    if (includeTableOfContents && phases.length > 0) {
      // Insérer une nouvelle page pour la TOC
      this.pdf.insertPage(includeCoverPage ? 2 : 1);
      this.pdf.setPage(includeCoverPage ? 2 : 1);

      this.currentY = this.margin;

      // Titre
      this.pdf.setFontSize(24);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('TABLE DES MATIÈRES', this.margin, this.currentY);
      this.currentY += 15;

      // Liste des phases avec liens cliquables
      phases.forEach((phase, index) => {
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.primary);

        const phaseText = `${index + 1}. ${phase.title}`;

        // Récupérer la page de destination (ajustée car on a inséré la TOC)
        let targetPage = this.phasePages.get(index);
        if (targetPage) {
          targetPage += 1; // Ajuster car on a inséré la TOC
        }

        // Ajouter le texte avec lien
        if (targetPage) {
          this.pdf.textWithLink(phaseText, this.margin + 5, this.currentY, {
            pageNumber: targetPage
          });
        } else {
          this.pdf.text(phaseText, this.margin + 5, this.currentY);
        }

        this.currentY += 8;

        // Sous-étapes avec liens
        if (phase.steps && phase.steps.length > 0) {
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'normal');
          this.pdf.setTextColor(COLORS.textLight);

          phase.steps.slice(0, 3).forEach((step) => {
            const stepText = `• ${step.title}`;

            if (targetPage) {
              this.pdf.textWithLink(stepText, this.margin + 10, this.currentY, {
                pageNumber: targetPage
              });
            } else {
              this.pdf.text(stepText, this.margin + 10, this.currentY);
            }

            this.currentY += 6;
          });

          if (phase.steps.length > 3) {
            this.pdf.text(`• ... et ${phase.steps.length - 3} autres étapes`, this.margin + 10, this.currentY);
            this.currentY += 6;
          }
        }

        this.currentY += 5;
      });

      this.addPageFooter();
    }

    // Retourner le PDF
    return this.pdf;
  }

  /**
   * Télécharge le PDF
   */
  async download(procedure: Procedure, phases: Phase[], options?: PDFOptions) {
    const pdf = await this.generate(procedure, phases, options);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `${procedure.title.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`;
    pdf.save(fileName);
  }
}

// Fonction helper pour générer et télécharger le PDF
export async function generatePDF(procedure: Procedure, phases: Phase[], options?: PDFOptions) {
  const generator = new PDFGenerator();
  await generator.download(procedure, phases, options);
}
