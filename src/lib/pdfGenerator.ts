import jsPDF from 'jspdf';
import { Procedure, Phase } from '../types';

// Design sobre et minimaliste
const COLORS = {
  primary: '#1a1a1a',
  accent: '#4a4a4a',
  text: '#2a2a2a',
  textLight: '#666666',
  border: '#e0e0e0',
  background: '#ffffff',
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
  private margin: number = 25;
  private phasePages: Map<number, number> = new Map();
  private pageNumber: number = 1;
  private hasTableOfContents: boolean = false;

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
   * Ajoute les liens de navigation en haut de page (sauf première page)
   */
  private addNavigationLinks() {
    if (this.pageNumber <= 1) return;

    const navY = 12;
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.setFont('helvetica', 'normal');

    // Lien vers sommaire si existe
    if (this.hasTableOfContents) {
      this.pdf.textWithLink('← Sommaire', this.margin, navY, { pageNumber: 2 });
    }

    // Numéro de page à droite
    this.pdf.text(
      `Page ${this.pageNumber}`,
      this.pageWidth - this.margin - 15,
      navY
    );
  }

  /**
   * Génère la page de couverture minimaliste
   */
  private generateCoverPage(procedure: Procedure) {
    // Ligne fine en haut
    this.pdf.setDrawColor(COLORS.primary);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, 40, this.pageWidth - this.margin, 40);

    // Titre principal
    this.pdf.setTextColor(COLORS.primary);
    this.pdf.setFontSize(28);
    this.pdf.setFont('helvetica', 'bold');

    const titleLines = this.pdf.splitTextToSize(
      procedure.title,
      this.pageWidth - 2 * this.margin
    );

    let titleY = 60;
    titleLines.forEach((line: string) => {
      this.pdf.text(line, this.margin, titleY);
      titleY += 12;
    });

    // Description
    if (procedure.description) {
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.textLight);

      const descLines = this.pdf.splitTextToSize(
        procedure.description,
        this.pageWidth - 2 * this.margin
      );

      let descY = titleY + 15;
      descLines.forEach((line: string) => {
        this.pdf.text(line, this.margin, descY);
        descY += 6;
      });
    }

    // Informations en bas
    const infoY = this.pageHeight - 50;
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(COLORS.text);

    if (procedure.reference) {
      this.pdf.text(`Référence: ${procedure.reference}`, this.margin, infoY);
    }

    if (procedure.category) {
      this.pdf.text(`Catégorie: ${procedure.category}`, this.margin, infoY + 7);
    }

    if (procedure.estimatedTotalTime) {
      this.pdf.text(
        `Durée estimée: ${procedure.estimatedTotalTime} min`,
        this.margin,
        infoY + 14
      );
    }

    // Date de génération
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.setFontSize(8);
    this.pdf.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      this.margin,
      this.pageHeight - 15
    );

    // Ligne fine en bas
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(
      this.margin,
      this.pageHeight - 25,
      this.pageWidth - this.margin,
      this.pageHeight - 25
    );
  }

  /**
   * Génère la table des matières
   */
  private generateTableOfContents(phases: Phase[]) {
    this.pdf.addPage();
    this.pageNumber++;
    this.currentY = this.margin + 10;

    // Titre
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.primary);
    this.pdf.text('Table des matières', this.margin, this.currentY);

    // Note cliquable
    this.currentY += 5;
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Cliquez sur les éléments pour naviguer dans le document', this.margin, this.currentY);

    this.currentY += 12;

    // Liste des phases
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(COLORS.text);

    phases.forEach((phase, index) => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.pageNumber++;
        this.addNavigationLinks();
        this.currentY = this.margin + 10;
      }

      const pageNum = this.phasePages.get(index) || 0;
      const phaseTitle = `${index + 1}. ${phase.title}`;

      // Titre de la phase (cliquable)
      this.pdf.textWithLink(
        phaseTitle,
        this.margin + 5,
        this.currentY,
        { pageNumber: pageNum }
      );

      // Numéro de page aligné à droite
      this.pdf.setTextColor(COLORS.textLight);
      this.pdf.text(
        pageNum.toString(),
        this.pageWidth - this.margin - 10,
        this.currentY
      );
      this.pdf.setTextColor(COLORS.text);

      this.currentY += 7;
    });
  }

  /**
   * Génère une nouvelle page avec en-tête
   */
  private addNewPage() {
    this.pdf.addPage();
    this.pageNumber++;
    this.currentY = this.margin + 5;
    this.addNavigationLinks();
    this.currentY = this.margin + 10;
  }

  /**
   * Vérifie si on doit ajouter une nouvelle page
   */
  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addNewPage();
    }
  }

  /**
   * Génère les phases
   */
  private async generatePhases(phases: Phase[]) {
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];

      this.checkPageBreak(30);

      // Enregistrer la page de cette phase pour le sommaire
      this.phasePages.set(i, this.pageNumber);

      // Titre de la phase
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text(
        `${i + 1}. ${phase.title}`,
        this.margin,
        this.currentY
      );
      this.currentY += 8;

      // Ligne de séparation
      this.pdf.setDrawColor(COLORS.border);
      this.pdf.setLineWidth(0.3);
      this.pdf.line(
        this.margin,
        this.currentY,
        this.pageWidth - this.margin,
        this.currentY
      );
      this.currentY += 8;

      // Description
      if (phase.description) {
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.text);

        const descLines = this.pdf.splitTextToSize(
          phase.description,
          this.pageWidth - 2 * this.margin
        );

        descLines.forEach((line: string) => {
          this.checkPageBreak(10);
          this.pdf.text(line, this.margin, this.currentY);
          this.currentY += 5;
        });
        this.currentY += 3;
      }

      // Informations (difficulté, temps)
      if (phase.difficulty || phase.estimatedTime) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(9);
        this.pdf.setTextColor(COLORS.textLight);

        let infoText = '';
        if (phase.difficulty) {
          const diffMap: any = {
            easy: 'Facile',
            medium: 'Moyen',
            hard: 'Difficile'
          };
          infoText += `Difficulté: ${diffMap[phase.difficulty] || phase.difficulty}`;
        }
        if (phase.estimatedTime) {
          if (infoText) infoText += '  •  ';
          infoText += `Temps estimé: ${phase.estimatedTime} min`;
        }

        this.pdf.text(infoText, this.margin, this.currentY);
        this.currentY += 8;
      }

      // Outils nécessaires
      if (phase.tools && phase.tools.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text('Outils nécessaires', this.margin, this.currentY);
        this.currentY += 6;

        this.pdf.setFontSize(9);

        phase.tools.forEach((tool) => {
          this.checkPageBreak(12);

          // Référence + Désignation en gras
          this.pdf.setFont('helvetica', 'bold');
          const toolTitle = tool.reference
            ? `• ${tool.reference} - ${tool.name}`
            : `• ${tool.name}`;
          this.pdf.text(toolTitle, this.margin + 5, this.currentY);
          this.currentY += 5;

          // Description si présente
          if (tool.description) {
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(COLORS.textLight);
            const descLines = this.pdf.splitTextToSize(
              tool.description,
              this.pageWidth - 2 * this.margin - 12
            );
            descLines.forEach((line: string) => {
              this.checkPageBreak(6);
              this.pdf.text(line, this.margin + 10, this.currentY);
              this.currentY += 4;
            });
            this.pdf.setTextColor(COLORS.text);
            this.currentY += 1;
          }
        });
        this.currentY += 3;
      }

      // Matériaux
      if (phase.materials && phase.materials.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text('Matériaux', this.margin, this.currentY);
        this.currentY += 6;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');

        phase.materials.forEach((material) => {
          this.checkPageBreak(8);
          const matText = material.quantity
            ? `• ${material.name} (${material.quantity})`
            : `• ${material.name}`;
          this.pdf.text(matText, this.margin + 5, this.currentY);
          this.currentY += 5;
        });
        this.currentY += 3;
      }

      // Étapes
      if (phase.steps && phase.steps.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text('Étapes', this.margin, this.currentY);
        this.currentY += 6;

        for (const step of phase.steps) {
          this.checkPageBreak(12);

          // Numéro et description de l'étape
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.setTextColor(COLORS.text);
          this.pdf.text(`${step.order + 1}.`, this.margin + 5, this.currentY);

          this.pdf.setFont('helvetica', 'normal');
          const stepLines = this.pdf.splitTextToSize(
            step.description,
            this.pageWidth - 2 * this.margin - 10
          );

          stepLines.forEach((line: string, idx: number) => {
            if (idx > 0) this.checkPageBreak(6);
            this.pdf.text(line, this.margin + 14, this.currentY);
            this.currentY += 5;
          });

          this.currentY += 2;

          // Images de l'étape
          if (step.images && step.images.length > 0) {
            this.checkPageBreak(60);

            const imageWidth = 70;
            const imageHeight = 50;
            const imagesPerRow = 2;

            for (let imgIdx = 0; imgIdx < step.images.length; imgIdx++) {
              const img = step.images[imgIdx];

              if (imgIdx > 0 && imgIdx % imagesPerRow === 0) {
                this.currentY += imageHeight + 8;
                this.checkPageBreak(imageHeight + 15);
              }

              const xPos = this.margin + 14 + (imgIdx % imagesPerRow) * (imageWidth + 10);

              try {
                let imageData: string | null = null;

                // Si l'image a une URL hébergée (ImgBB), l'utiliser directement
                if (img.image && img.image.url) {
                  imageData = img.image.url;
                }
                // Sinon, utiliser le blob local (ancienne méthode)
                else if (img.image && img.image.blob) {
                  const reader = new FileReader();
                  const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(img.image.blob);
                  });
                  imageData = await base64Promise;
                }

                if (imageData) {
                  this.pdf.addImage(
                    imageData,
                    'JPEG',
                    xPos,
                    this.currentY,
                    imageWidth,
                    imageHeight
                  );

                  // Description de l'image
                  if (img.description) {
                    this.pdf.setFontSize(7);
                    this.pdf.setTextColor(COLORS.textLight);
                    const imgDescLines = this.pdf.splitTextToSize(
                      img.description,
                      imageWidth
                    );
                    this.pdf.text(
                      imgDescLines[0] || '',
                      xPos,
                      this.currentY + imageHeight + 4
                    );
                    this.pdf.setTextColor(COLORS.text);
                  }
                }
              } catch (error) {
                console.error('Error adding image to PDF:', error);
              }
            }

            this.currentY += imageHeight + 12;
          }
        }

        this.currentY += 5;
      }

      // Notes de sécurité
      if (phase.safetyNotes && phase.safetyNotes.length > 0) {
        this.checkPageBreak(20);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor('#d32f2f');
        this.pdf.text('⚠ Consignes de sécurité', this.margin, this.currentY);
        this.currentY += 6;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.text);

        phase.safetyNotes.forEach((note) => {
          this.checkPageBreak(10);
          const noteLines = this.pdf.splitTextToSize(
            `• ${note.content}`,
            this.pageWidth - 2 * this.margin - 5
          );
          noteLines.forEach((line: string) => {
            this.pdf.text(line, this.margin + 5, this.currentY);
            this.currentY += 5;
          });
        });
        this.currentY += 5;
      }

      // Conseils et astuces
      if (phase.tips && phase.tips.length > 0) {
        this.checkPageBreak(20);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor('#1976d2');
        this.pdf.text('💡 Conseils et astuces', this.margin, this.currentY);
        this.currentY += 6;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.text);

        phase.tips.forEach((tip) => {
          this.checkPageBreak(10);
          const tipLines = this.pdf.splitTextToSize(
            `• ${tip.content}`,
            this.pageWidth - 2 * this.margin - 5
          );
          tipLines.forEach((line: string) => {
            this.pdf.text(line, this.margin + 5, this.currentY);
            this.currentY += 5;
          });
        });
        this.currentY += 5;
      }

      // Espace avant phase suivante
      this.currentY += 10;
    }
  }

  /**
   * Génère le PDF complet
   */
  async generate(
    procedure: Procedure,
    phases: Phase[],
    options: PDFOptions = {}
  ): Promise<void> {
    const {
      includeCoverPage = true,
      includeTableOfContents = true,
    } = options;

    try {
      // Page de couverture
      if (includeCoverPage) {
        this.generateCoverPage(procedure);
      }

      // Générer les phases pour calculer les numéros de page
      this.pdf.addPage();
      this.pageNumber++;
      this.currentY = this.margin + 10;

      // Première passe : calculer les positions
      await this.generatePhases(phases);

      // Supprimer toutes les pages sauf la couverture
      const totalPagesAfterFirstPass = this.pdf.getNumberOfPages();
      for (let i = totalPagesAfterFirstPass; i > (includeCoverPage ? 1 : 0); i--) {
        this.pdf.deletePage(i);
      }

      // Réinitialiser
      this.pageNumber = includeCoverPage ? 1 : 0;
      this.currentY = this.margin + 10;

      // Table des matières
      this.hasTableOfContents = includeTableOfContents;
      if (includeTableOfContents) {
        this.generateTableOfContents(phases);
      }

      // Deuxième passe : générer le contenu final
      this.pdf.addPage();
      this.pageNumber++;
      this.addNavigationLinks();
      this.currentY = this.margin + 10;
      await this.generatePhases(phases);

      // Sauvegarder
      this.pdf.save(`${procedure.title || 'procedure'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

/**
 * Fonction helper pour générer un PDF
 */
export async function generatePDF(
  procedure: Procedure,
  phases: Phase[],
  options?: PDFOptions
): Promise<void> {
  const generator = new PDFGenerator();
  await generator.generate(procedure, phases, options);
}
