import jsPDF from 'jspdf';
import { Procedure, Phase } from '../types';

// Design professionnel avec touches de couleurs
const COLORS = {
  primary: '#2c3e50',      // Bleu foncé
  accent: '#e74c3c',       // Rouge/Orange
  accentLight: '#ff7961',  // Rouge clair
  success: '#27ae60',      // Vert
  info: '#3498db',         // Bleu
  warning: '#f39c12',      // Orange
  danger: '#c0392b',       // Rouge foncé
  text: '#2c3e50',
  textLight: '#7f8c8d',
  textMuted: '#95a5a6',
  border: '#bdc3c7',
  borderLight: '#ecf0f1',
  background: '#ffffff',
  backgroundGrey: '#f8f9fa',
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
  private async generateCoverPage(procedure: Procedure) {
    let currentYPos = 40;

    // Image de couverture si présente (dimensions originales, centrée)
    if (procedure.coverImage) {
      try {
        const img = new Image();
        img.src = procedure.coverImage;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const imgWidth = img.width;
        const imgHeight = img.height;

        // Calculer la largeur max (80% de la page)
        const maxWidth = (this.pageWidth - 2 * this.margin) * 0.8;
        const ratio = imgHeight / imgWidth;

        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (finalWidth > maxWidth) {
          finalWidth = maxWidth;
          finalHeight = finalWidth * ratio;
        }

        // Centrer horizontalement
        const xPos = (this.pageWidth - finalWidth) / 2;

        this.pdf.addImage(
          procedure.coverImage,
          'JPEG',
          xPos,
          currentYPos,
          finalWidth,
          finalHeight
        );
        currentYPos += finalHeight + 10;
      } catch (error) {
        console.error('Error adding cover image to PDF:', error);
        // Continue sans l'image si erreur
      }
    }

    // Bande colorée en haut
    this.pdf.setFillColor(231, 76, 60); // Rouge/Orange
    this.pdf.rect(0, currentYPos, this.pageWidth, 3, 'F');
    currentYPos += 15;

    // Titre principal avec design moderne
    this.pdf.setTextColor(44, 62, 80); // Bleu foncé
    this.pdf.setFontSize(32);
    this.pdf.setFont('helvetica', 'bold');

    const titleLines = this.pdf.splitTextToSize(
      procedure.title.toUpperCase(),
      this.pageWidth - 2 * this.margin
    );

    titleLines.forEach((line: string) => {
      this.pdf.text(line, this.margin, currentYPos);
      currentYPos += 14;
    });

    // Ligne sous le titre
    currentYPos += 3;
    this.pdf.setDrawColor(231, 76, 60);
    this.pdf.setLineWidth(1);
    this.pdf.line(this.margin, currentYPos, this.margin + 60, currentYPos);
    currentYPos += 15;

    // Tags avec badges
    if (procedure.tags && procedure.tags.length > 0) {
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'bold');

      let xPos = this.margin;
      procedure.tags.slice(0, 3).forEach((tag) => {
        const tagWidth = this.pdf.getTextWidth(tag) + 8;

        // Badge fond
        this.pdf.setFillColor(236, 240, 241);
        this.pdf.roundedRect(xPos, currentYPos - 5, tagWidth, 7, 2, 2, 'F');

        // Texte du tag
        this.pdf.setTextColor(127, 140, 141);
        this.pdf.text(tag, xPos + 4, currentYPos);

        xPos += tagWidth + 5;
      });
      currentYPos += 10;
    }

    // Description
    if (procedure.description) {
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.textLight);

      const descLines = this.pdf.splitTextToSize(
        procedure.description,
        this.pageWidth - 2 * this.margin
      );

      descLines.forEach((line: string) => {
        this.pdf.text(line, this.margin, currentYPos);
        currentYPos += 6;
      });
      currentYPos += 5;
    }

    // Compétences requises avec encadré
    if (procedure.requiredSkills && procedure.requiredSkills.length > 0) {
      this.pdf.setFillColor(236, 240, 241); // Gris clair
      this.pdf.roundedRect(
        this.margin,
        currentYPos - 3,
        this.pageWidth - 2 * this.margin,
        20,
        2,
        2,
        'F'
      );

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(44, 62, 80);
      this.pdf.text('COMPETENCES REQUISES', this.margin + 5, currentYPos + 2);

      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(127, 140, 141);
      const skillsText = procedure.requiredSkills.join(' • ');
      const skillLines = this.pdf.splitTextToSize(skillsText, this.pageWidth - 2 * this.margin - 10);
      skillLines.forEach((line: string) => {
        this.pdf.text(line, this.margin + 5, currentYPos + 9);
        currentYPos += 5;
      });
      currentYPos += 8;
    }

    // Informations en bas dans un encadré
    const infoY = this.pageHeight - 55;

    // Fond gris pour les infos
    this.pdf.setFillColor(248, 249, 250);
    this.pdf.rect(0, infoY - 5, this.pageWidth, 40, 'F');
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(44, 62, 80);

    let infoCurrentY = infoY;

    // Référence et catégorie sur la même ligne
    if (procedure.reference) {
      this.pdf.text(`REF: ${procedure.reference}`, this.margin, infoCurrentY);

      if (procedure.category) {
        const refWidth = this.pdf.getTextWidth(`REF: ${procedure.reference}`);
        this.pdf.setTextColor(127, 140, 141);
        this.pdf.text(` | ${procedure.category}`, this.margin + refWidth + 3, infoCurrentY);
      }
      infoCurrentY += 7;
    }

    // Coût si présent
    if (procedure.totalCost) {
      this.pdf.setTextColor(39, 174, 96); // Vert
      this.pdf.text(`Coût estimé: ${procedure.totalCost}€`, this.margin, infoCurrentY);
      infoCurrentY += 7;
    }

    // Date de génération à droite
    this.pdf.setTextColor(149, 165, 166);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setFontSize(7);
    const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR')}`;
    const dateWidth = this.pdf.getTextWidth(dateText);
    this.pdf.text(
      dateText,
      this.pageWidth - this.margin - dateWidth,
      this.pageHeight - 10
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
   * Génère la liste des outils et matériaux globaux
   */
  private async generateGlobalResources(procedure: Procedure) {
    const hasGlobalTools = procedure.globalTools && procedure.globalTools.length > 0;
    const hasGlobalMaterials = procedure.globalMaterials && procedure.globalMaterials.length > 0;

    if (!hasGlobalTools && !hasGlobalMaterials) {
      return;
    }

    this.checkPageBreak(30);

    // Titre de la section
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.primary);
    this.pdf.text('Ressources globales', this.margin, this.currentY);
    this.currentY += 8;

    // Description
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setTextColor(COLORS.textLight);
    this.pdf.text('Ces ressources sont nécessaires pour l\'ensemble de la procédure', this.margin, this.currentY);
    this.currentY += 10;

    // Outils globaux
    if (hasGlobalTools) {
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.text);
      this.pdf.text('OUTILS', this.margin, this.currentY);
      this.currentY += 7;

      this.pdf.setFontSize(9);
      procedure.globalTools.forEach((tool) => {
        this.checkPageBreak(12);

        this.pdf.setFont('helvetica', 'bold');
        const toolTitle = tool.reference
          ? `• ${tool.reference} - ${tool.name}`
          : `• ${tool.name}`;
        this.pdf.text(toolTitle, this.margin + 5, this.currentY);
        this.currentY += 5;

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
      this.currentY += 5;
    }

    // Matériaux globaux
    if (hasGlobalMaterials) {
      this.checkPageBreak(15);

      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.text);
      this.pdf.text('MATERIAUX', this.margin, this.currentY);
      this.currentY += 7;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');

      procedure.globalMaterials.forEach((material) => {
        this.checkPageBreak(8);
        const matText = material.quantity
          ? `• ${material.name} (${material.quantity} ${material.unit})`
          : `• ${material.name}`;
        this.pdf.text(matText, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 8;
    }

    // Ligne de séparation
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );
    this.currentY += 10;
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

      // Bandeau coloré pour le titre de la phase
      this.pdf.setFillColor(255, 87, 34); // Orange
      this.pdf.roundedRect(
        this.margin,
        this.currentY - 5,
        this.pageWidth - 2 * this.margin,
        12,
        2,
        2,
        'F'
      );

      // Titre de la phase
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(255, 255, 255); // Blanc
      this.pdf.text(
        `Phase ${i + 1} : ${phase.title}`,
        this.margin + 3,
        this.currentY + 2
      );
      this.currentY += 12;

      // Informations (difficulté, temps, nombre de personnes)
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
      if (phase.numberOfPeople) {
        if (infoText) infoText += '  •  ';
        infoText += `Personnes: ${phase.numberOfPeople}`;
      }

      if (infoText) {
        this.pdf.text(infoText, this.margin, this.currentY);
        this.currentY += 6;
      }

      // Compétences requises pour cette phase
      if (phase.requiredSkills && phase.requiredSkills.length > 0) {
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text('Compétences requises:', this.margin, this.currentY);
        this.currentY += 5;

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.textLight);
        const skillsText = phase.requiredSkills.join(', ');
        const skillLines = this.pdf.splitTextToSize(skillsText, this.pageWidth - 2 * this.margin - 5);
        skillLines.forEach((line: string) => {
          this.pdf.text(line, this.margin + 5, this.currentY);
          this.currentY += 5;
        });
        this.currentY += 3;
      }

      this.currentY += 2;

      // Étapes détaillées
      if (phase.steps && phase.steps.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.accent);
        this.pdf.text('ETAPES DETAILLEES', this.margin, this.currentY);
        this.currentY += 10;

        for (let stepIdx = 0; stepIdx < phase.steps.length; stepIdx++) {
          const step = phase.steps[stepIdx];
          this.checkPageBreak(15);

          // Numéro de l'étape avec fond coloré
          const stepNumber = `${stepIdx + 1}`;

          // Dessiner le badge numéroté
          this.pdf.setFillColor(255, 87, 34); // Orange
          this.pdf.circle(this.margin + 5, this.currentY - 2, 4, 'F');

          this.pdf.setFontSize(9);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.setTextColor(255, 255, 255);
          this.pdf.text(stepNumber, this.margin + 5 - (stepNumber.length * 1.2), this.currentY);

          // Titre de l'étape
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.setTextColor(COLORS.primary);

          if (step.title) {
            this.pdf.text(step.title, this.margin + 12, this.currentY);
            this.currentY += 6;
          } else {
            this.currentY += 5;
          }

          // Description de l'étape
          this.pdf.setFont('helvetica', 'normal');
          this.pdf.setTextColor(COLORS.text);
          this.pdf.setFontSize(9);

          const stepLines = this.pdf.splitTextToSize(
            step.description,
            this.pageWidth - 2 * this.margin - 12
          );

          stepLines.forEach((line: string, idx: number) => {
            if (idx > 0) this.checkPageBreak(6);
            this.pdf.text(line, this.margin + 12, this.currentY);
            this.currentY += 5;
          });

          this.currentY += 3;

          // Outil spécifique à cette sous-étape
          if (step.toolId && step.tool) {
            this.checkPageBreak(12);

            // Encadré avec fond coloré
            const toolBoxY = this.currentY;
            this.pdf.setFillColor(255, 243, 224); // Fond orange clair
            this.pdf.roundedRect(this.margin + 12, toolBoxY - 3, this.pageWidth - 2 * this.margin - 12, 12, 2, 2, 'F');

            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(COLORS.accent);
            this.pdf.text('Outil:', this.margin + 15, this.currentY);

            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(COLORS.text);
            const toolText = step.tool.reference
              ? `${step.tool.reference} - ${step.tool.name}`
              : step.tool.name;
            this.pdf.text(toolText, this.margin + 30, this.currentY);

            this.currentY += 10;
          }

          // Temps estimé
          if (step.estimatedTime) {
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'italic');
            this.pdf.setTextColor(COLORS.textLight);
            this.pdf.text(`Temps: ${step.estimatedTime} min`, this.margin + 12, this.currentY);
            this.currentY += 6;
          }

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

          // Conseils de la sous-étape
          if (step.tips && step.tips.length > 0) {
            this.checkPageBreak(15);

            step.tips.forEach((tip) => {
              this.checkPageBreak(10);

              // Encadré bleu clair pour les conseils
              const tipBoxHeight = Math.ceil(tip.length / 80) * 5 + 6;
              this.pdf.setFillColor(227, 242, 253); // Bleu clair
              this.pdf.roundedRect(
                this.margin + 12,
                this.currentY - 3,
                this.pageWidth - 2 * this.margin - 12,
                tipBoxHeight,
                2,
                2,
                'F'
              );

              this.pdf.setFontSize(8);
              this.pdf.setFont('helvetica', 'bold');
              this.pdf.setTextColor(COLORS.info);
              this.pdf.text('Conseil:', this.margin + 15, this.currentY);

              this.pdf.setFont('helvetica', 'normal');
              this.pdf.setTextColor(COLORS.text);
              const tipLines = this.pdf.splitTextToSize(tip, this.pageWidth - 2 * this.margin - 35);
              tipLines.forEach((line: string) => {
                this.pdf.text(line, this.margin + 35, this.currentY);
                this.currentY += 5;
              });

              this.currentY += 3;
            });
          }

          // Consignes de sécurité de la sous-étape
          if (step.safetyNotes && step.safetyNotes.length > 0) {
            this.checkPageBreak(15);

            step.safetyNotes.forEach((note) => {
              this.checkPageBreak(10);

              // Encadré rouge/orange selon le type
              const noteColor = note.type === 'danger' ? [255, 235, 238] : [255, 243, 224];
              const iconColor = note.type === 'danger' ? COLORS.danger : COLORS.warning;
              const icon = note.type === 'danger' ? 'DANGER' : 'ATTENTION';

              const noteBoxHeight = Math.ceil(note.content.length / 80) * 5 + 6;
              this.pdf.setFillColor(noteColor[0], noteColor[1], noteColor[2]);
              this.pdf.roundedRect(
                this.margin + 12,
                this.currentY - 3,
                this.pageWidth - 2 * this.margin - 12,
                noteBoxHeight,
                2,
                2,
                'F'
              );

              this.pdf.setFontSize(8);
              this.pdf.setFont('helvetica', 'bold');
              this.pdf.setTextColor(iconColor);
              this.pdf.text(icon, this.margin + 15, this.currentY);

              this.pdf.setFont('helvetica', 'normal');
              this.pdf.setTextColor(COLORS.text);
              const noteLines = this.pdf.splitTextToSize(note.content, this.pageWidth - 2 * this.margin - 40);
              noteLines.forEach((line: string) => {
                this.pdf.text(line, this.margin + 40, this.currentY);
                this.currentY += 5;
              });

              this.currentY += 3;
            });
          }

          // Séparateur entre sous-étapes
          if (stepIdx < phase.steps.length - 1) {
            this.currentY += 5;
            this.pdf.setDrawColor(COLORS.border);
            this.pdf.setLineWidth(0.2);
            this.pdf.line(
              this.margin + 12,
              this.currentY,
              this.pageWidth - this.margin,
              this.currentY
            );
            this.currentY += 5;
          }
        }

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
        await this.generateCoverPage(procedure);
      }

      // Générer les phases pour calculer les numéros de page
      this.pdf.addPage();
      this.pageNumber++;
      this.currentY = this.margin + 10;

      // Ressources globales (avant les phases)
      await this.generateGlobalResources(procedure);

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

      // Ressources globales (deuxième passe)
      await this.generateGlobalResources(procedure);

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
