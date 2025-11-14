import jsPDF from 'jspdf';
import { Procedure, Phase } from '../types';

// Design avec touches de couleurs
const COLORS = {
  primary: '#1a1a1a',
  accent: '#ff5722', // Orange
  danger: '#d32f2f', // Rouge
  warning: '#ff9800', // Orange vif
  info: '#2196f3', // Bleu
  text: '#2a2a2a',
  textLight: '#666666',
  border: '#e0e0e0',
  lightBg: '#fff3e0', // Fond orange clair
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

    // Ligne fine en haut
    this.pdf.setDrawColor(COLORS.primary);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, currentYPos, this.pageWidth - this.margin, currentYPos);
    currentYPos += 10;

    // Tags
    if (procedure.tags && procedure.tags.length > 0) {
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.accent);

      const tagsText = procedure.tags.join(' • ');
      this.pdf.text(tagsText, this.margin, currentYPos);
      currentYPos += 8;
    }

    // Titre principal
    this.pdf.setTextColor(COLORS.primary);
    this.pdf.setFontSize(28);
    this.pdf.setFont('helvetica', 'bold');

    const titleLines = this.pdf.splitTextToSize(
      procedure.title,
      this.pageWidth - 2 * this.margin
    );

    titleLines.forEach((line: string) => {
      this.pdf.text(line, this.margin, currentYPos);
      currentYPos += 12;
    });
    currentYPos += 5;

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

    // Compétences requises
    if (procedure.requiredSkills && procedure.requiredSkills.length > 0) {
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setTextColor(COLORS.text);
      this.pdf.text('🎯 Compétences requises:', this.margin, currentYPos);
      currentYPos += 6;

      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.textLight);
      const skillsText = procedure.requiredSkills.join(', ');
      const skillLines = this.pdf.splitTextToSize(skillsText, this.pageWidth - 2 * this.margin);
      skillLines.forEach((line: string) => {
        this.pdf.text(line, this.margin + 5, currentYPos);
        currentYPos += 5;
      });
      currentYPos += 5;
    }

    // Informations en bas
    const infoY = this.pageHeight - 50;
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(COLORS.text);

    let infoCurrentY = infoY;

    if (procedure.reference) {
      this.pdf.text(`Référence: ${procedure.reference}`, this.margin, infoCurrentY);
      infoCurrentY += 5;

      // Désignation juste en dessous de la référence
      this.pdf.text(`Désignation: ${procedure.title}`, this.margin, infoCurrentY);
      infoCurrentY += 7;
    }

    if (procedure.category) {
      this.pdf.text(`Catégorie: ${procedure.category}`, this.margin, infoCurrentY);
      infoCurrentY += 7;
    }

    if (procedure.estimatedTotalTime) {
      this.pdf.text(
        `Durée estimée: ${procedure.estimatedTotalTime} min`,
        this.margin,
        infoCurrentY
      );
      infoCurrentY += 7;
    }

    if (procedure.totalCost) {
      this.pdf.text(
        `Coût estimé: ${procedure.totalCost}€`,
        this.margin,
        infoCurrentY
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
      this.pdf.text('🔧 Outils', this.margin, this.currentY);
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
      this.pdf.text('📦 Matériaux', this.margin, this.currentY);
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
      this.currentY += 10;

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

      // Informations (difficulté, temps, risque, compétences, nombre de personnes)
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

      // Outils nécessaires
      if (phase.tools && phase.tools.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.accent);
        this.pdf.text('🔧 Outils nécessaires', this.margin, this.currentY);
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
        this.pdf.setTextColor(COLORS.accent);
        this.pdf.text('📦 Matériaux', this.margin, this.currentY);
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

      // Images de la phase (hors étapes)
      if (phase.images && phase.images.length > 0) {
        this.checkPageBreak(20);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.text);
        this.pdf.text('Images de référence', this.margin, this.currentY);
        this.currentY += 6;

        const imageWidth = 70;
        const imageHeight = 50;
        const imagesPerRow = 2;

        for (let imgIdx = 0; imgIdx < phase.images.length; imgIdx++) {
          const img = phase.images[imgIdx];

          if (imgIdx > 0 && imgIdx % imagesPerRow === 0) {
            this.currentY += imageHeight + 8;
            this.checkPageBreak(imageHeight + 15);
          }

          const xPos = this.margin + (imgIdx % imagesPerRow) * (imageWidth + 10);

          try {
            let imageData: string | null = null;

            if (img.image && img.image.url) {
              imageData = img.image.url;
            } else if (img.image && img.image.blob) {
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
            console.error('Error adding phase image to PDF:', error);
          }
        }

        this.currentY += imageHeight + 12;
      }

      // Étapes détaillées
      if (phase.steps && phase.steps.length > 0) {
        this.checkPageBreak(15);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(COLORS.accent);
        this.pdf.text('📋 Étapes détaillées', this.margin, this.currentY);
        this.currentY += 8;

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
            this.pdf.text('🔧 Outil:', this.margin + 15, this.currentY);

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
            this.pdf.text(`⏱️ ${step.estimatedTime} min`, this.margin + 12, this.currentY);
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
              this.pdf.text('💡', this.margin + 15, this.currentY);

              this.pdf.setFont('helvetica', 'normal');
              this.pdf.setTextColor(COLORS.text);
              const tipLines = this.pdf.splitTextToSize(tip, this.pageWidth - 2 * this.margin - 20);
              tipLines.forEach((line: string) => {
                this.pdf.text(line, this.margin + 20, this.currentY);
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
              const icon = note.type === 'danger' ? '🚨' : '⚠️';

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
              const noteLines = this.pdf.splitTextToSize(note.content, this.pageWidth - 2 * this.margin - 20);
              noteLines.forEach((line: string) => {
                this.pdf.text(line, this.margin + 20, this.currentY);
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
            `• ${tip}`,
            this.pageWidth - 2 * this.margin - 5
          );
          tipLines.forEach((line: string) => {
            this.pdf.text(line, this.margin + 5, this.currentY);
            this.currentY += 5;
          });
        });
        this.currentY += 5;
      }

      // Erreurs courantes
      if (phase.commonMistakes && phase.commonMistakes.length > 0) {
        this.checkPageBreak(20);

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor('#ff6f00');
        this.pdf.text('⚡ Erreurs courantes à éviter', this.margin, this.currentY);
        this.currentY += 6;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(COLORS.text);

        phase.commonMistakes.forEach((mistake) => {
          this.checkPageBreak(10);
          const mistakeLines = this.pdf.splitTextToSize(
            `• ${mistake}`,
            this.pageWidth - 2 * this.margin - 5
          );
          mistakeLines.forEach((line: string) => {
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
