import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Procedure, DifficultyLevel } from '@/types';

// Obtenir les couleurs RGB pour le PDF
const getDifficultyRGB = (difficulty: DifficultyLevel): [number, number, number] => {
  switch (difficulty) {
    case 'trainee': return [59, 130, 246]; // blue-500 (Apprenti)
    case 'easy': return [34, 197, 94];     // green-500
    case 'medium': return [234, 179, 8];   // yellow-500
    case 'hard': return [239, 68, 68];     // red-500
    case 'control': return [249, 115, 22]; // orange-500
    default: return [107, 114, 128];       // gray-500
  }
};

// Calculer le temps total par pièce (somme des temps des phases) en centièmes de minutes
const getTotalTime = (procedure: Procedure): string => {
  if (!procedure.phases || procedure.phases.length === 0) {
    return '-';
  }
  const totalMinutes = procedure.phases.reduce((sum, phase) => sum + (phase.estimatedTime || 0), 0);
  if (totalMinutes === 0) return '-';

  return totalMinutes.toFixed(2);
};

/**
 * Exporter la liste des procédures en PDF
 */
export function exportProceduresToPDF(procedures: Procedure[]): void {
  const doc = new jsPDF();

  // Titre
  doc.setFontSize(16);
  doc.text('Liste des Procédures Techniques', 14, 15);

  // Date d'export
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

  // Trier les procédures par référence (ordre alphabétique)
  const sortedProcedures = [...procedures].sort((a, b) => {
    const refA = (a.reference || '').toLowerCase();
    const refB = (b.reference || '').toLowerCase();
    return refA.localeCompare(refB);
  });

  // Préparer les données du tableau
  const tableData = sortedProcedures.map(procedure => {
    return [
      procedure.reference || '-',
      procedure.designation || procedure.title || '-',
      getTotalTime(procedure),
      '', // Colonne vide pour les difficultés (sera dessinée manuellement)
    ];
  });

  // Créer le tableau
  autoTable(doc, {
    startY: 28,
    head: [['Référence', 'Désignation', 'Temps (min)', 'Difficulté']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [249, 55, 5], // Couleur primaire
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Référence
      1: { cellWidth: 80 },  // Désignation
      2: { cellWidth: 25 },  // Temps
      3: { cellWidth: 50 },  // Difficulté
    },
    didDrawCell: (data) => {
      // Dessiner les rectangles de difficulté dans la colonne 3
      if (data.column.index === 3 && data.section === 'body') {
        const procedure = sortedProcedures[data.row.index];
        if (procedure.phases && procedure.phases.length > 0) {
          const cellX = data.cell.x + 2;
          const cellY = data.cell.y + (data.cell.height / 2) - 2.5;
          const rectWidth = 3;
          const rectHeight = 5;
          const spacing = 1;

          procedure.phases.forEach((phase, idx) => {
            const x = cellX + idx * (rectWidth + spacing);
            const rgb = getDifficultyRGB(phase.difficulty);
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.rect(x, cellY, rectWidth, rectHeight, 'F');
          });
        }
      }
    },
  });

  // Télécharger le PDF
  doc.save(`procedures_${new Date().toISOString().split('T')[0]}.pdf`);
}
