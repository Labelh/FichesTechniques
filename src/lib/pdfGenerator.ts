import jsPDF from 'jspdf';
import { Procedure, Phase } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

    // Difficulté
    const difficultyLabels: Record<string, string> = {
      very_easy: 'Très facile',
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile',
      very_hard: 'Très difficile',
      expert: 'Expert',
    };

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DIFFICULTÉ', this.margin, infoY + 16);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(
      difficultyLabels[procedure.difficulty] || procedure.difficulty,
      this.margin,
      infoY + 22
    );

    // Date de création
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATE', this.pageWidth - this.margin - 40, infoY);
    this.pdf.setFont('helvetica', 'normal');
    const dateText = format(new Date(procedure.createdAt), 'dd MMMM yyyy', { locale: fr });
    this.pdf.text(
      dateText,
      this.pageWidth - this.margin - 40,
      infoY + 6
    );

    // Version
    if (procedure.version) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('VERSION', this.pageWidth - this.margin - 40, infoY + 16);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(String(procedure.version), this.pageWidth - this.margin - 40, infoY + 22);
    }

    // Pied de page
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(
      'Généré automatiquement par Fiches Techniques',
      this.pageWidth / 2,
      this.pageHeight - 15,
      { align: 'center' }
    );
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

    // Date de génération
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );
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
   * Génère la table des matières
   */
  private generateTableOfContents(phases: Phase[]) {
    this.pdf.addPage();
    this.currentY = this.margin;

    // Titre
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.primary);
    this.pdf.text('TABLE DES MATIÈRES', this.margin, this.currentY);
    this.currentY += 15;

    // Liste des phases
    phases.forEach((phase, index) => {
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.text);

      const phaseText = `${index + 1}. ${phase.title}`;
      this.pdf.text(phaseText, this.margin + 5, this.currentY);
      this.currentY += 8;

      // Sous-étapes
      if (phase.steps && phase.steps.length > 0) {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.textLight);

        phase.steps.slice(0, 3).forEach((step) => {
          this.pdf.text(`• ${step.title}`, this.margin + 10, this.currentY);
          this.currentY += 6;
        });

        if (phase.steps.length > 3) {
          this.pdf.text(`• ... et ${phase.steps.length - 3} autres étapes`, this.margin + 10, this.currentY);
          this.currentY += 6;
        }
      }

      this.currentY += 5;
    });
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
      very_easy: 'Très facile',
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile',
      very_hard: 'Très difficile',
      expert: 'Expert',
    };

    this.pdf.text(`⏱ Temps estimé : ${phase.estimatedTime} min`, this.margin + 5, this.currentY);
    this.pdf.text(`📊 Difficulté : ${difficultyLabels[phase.difficulty] || phase.difficulty}`, this.margin + 60, this.currentY);
    this.currentY += 10;

    // Outils nécessaires
    if (phase.tools && phase.tools.length > 0) {
      this.checkPageBreak(20, procedure, pageNumber);
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text('🛠 Outils nécessaires :', this.margin + 5, this.currentY);
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
      this.pdf.text('📦 Matériaux nécessaires :', this.margin + 5, this.currentY);
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
      this.pdf.text('📋 Étapes détaillées :', this.margin + 5, this.currentY);
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
      this.pdf.text('⚠️ ATTENTION - Consignes de sécurité', this.margin + 5, this.currentY + 7);
      this.currentY += 12;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.text);
      phase.safetyNotes.forEach((note) => {
        const icon = note.type === 'danger' ? '🚨' : note.type === 'mandatory' ? '✓' : note.type === 'forbidden' ? '⛔' : '⚠';
        this.pdf.text(`${icon} ${note.content}`, this.margin + 5, this.currentY);
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
      this.pdf.text('💡 Conseils :', this.margin + 5, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setTextColor(COLORS.textLight);
      phase.tips.forEach((tip) => {
        this.checkPageBreak(5, procedure, pageNumber);
        this.pdf.text(`💡 ${tip}`, this.margin + 10, this.currentY);
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

    // Table des matières
    if (includeTableOfContents && phases.length > 0) {
      this.generateTableOfContents(phases);
      this.addPageFooter();
      pageNumber++;
    }

    // Phases
    if (phases.length > 0) {
      this.pdf.addPage();
      this.addPageHeader(procedure, pageNumber);

      phases.forEach((phase, index) => {
        this.generatePhase(phase, index + 1, procedure, pageNumber);

        // Ajouter une ligne de séparation entre les phases
        if (index < phases.length - 1) {
          this.checkPageBreak(10, procedure, pageNumber);
          this.pdf.setDrawColor(COLORS.textLight);
          this.pdf.setLineWidth(0.5);
          this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
          this.currentY += 10;
        }
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
    const fileName = `${procedure.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    pdf.save(fileName);
  }
}

// Fonction helper pour générer et télécharger le PDF
export async function generatePDF(procedure: Procedure, phases: Phase[], options?: PDFOptions) {
  const generator = new PDFGenerator();
  await generator.download(procedure, phases, options);
}
