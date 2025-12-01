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

  console.log('=== DEBUG: Generating HTML ===');
  console.log('Procedure:', procedure.designation);
  console.log('Number of phases:', phases.length);

  phases.forEach((phase, phaseIdx) => {
    console.log(`Phase ${phaseIdx + 1}: ${phase.title}, steps:`, phase.steps.length);
    phase.steps.forEach((step, stepIdx) => {
      if (step.images) {
        console.log(`  Step ${stepIdx + 1}: ${step.images.length} images`);
        step.images.forEach((img, imgIdx) => {
          console.log(`    Image ${imgIdx + 1}:`, {
            imageId: img.imageId,
            hasAnnotations: img.annotations && img.annotations.length > 0,
            annotationsCount: img.annotations?.length || 0,
            description: img.description
          });
        });
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
            overflow-x: hidden;
        }

        /* Sidebar Navigation */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 280px;
            background: #d3d3d3;
            border-right: 1px solid #b0b0b0;
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
            padding: 32px 40px;
            position: relative;
        }

        .version-badge {
            position: absolute;
            top: 24px;
            right: 40px;
            background: rgb(249, 55, 5);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 1rem;
            font-weight: 600;
        }

        .header-title {
            font-size: 2.5rem;
            color: #666;
            font-weight: 500;
            margin-bottom: 6px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header-designation {
            font-size: 2rem;
            font-weight: 400;
            color: #1a1a1a;
            margin-bottom: 8px;
            text-align: left;
        }

        .header-reference {
            font-size: 2.2rem;
            color: rgb(249, 55, 5);
            font-weight: 400;
            margin-bottom: 16px;
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

        .document-version {
            margin-top: 20px;
            text-align: right;
            font-size: 0.85rem;
            color: #999;
            font-style: italic;
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
            max-width: 100%;
            margin: 0 auto;
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
            background: white;
            padding: 36px;
            margin-bottom: 32px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #e8e8e8;
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
            max-width: 100%;
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
            color: #f93705;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
        }

        .difficulty-badge {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .phase-time-badge {
            background: #f93705;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(249, 55, 5, 0.3);
        }

        .phase-toggle-icon {
            font-size: 1.2rem;
            color: #999;
            transition: transform 0.3s ease;
            user-select: none;
        }

        .phase-toggle-icon.collapsed {
            transform: rotate(0deg);
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
            gap: 8px;
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
            max-width: 100%;
        }

        .step:last-child {
            margin-bottom: 0;
        }

        .step-header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #f93705;
        }

        .step-label {
            font-size: 1.2rem;
            font-weight: 600;
            color: #f93705;
            letter-spacing: -0.02em;
        }

        .step-description {
            color: #555;
            line-height: 1.8;
            font-size: 1.1rem;
        }

        .step-description-box {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px 20px;
            color: #2c3e50;
            line-height: 1.8;
            font-size: 1rem;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            width: 100%;
            box-sizing: border-box;
        }

        .step-description-left {
            flex: 1;
            min-width: 0;
        }

        .step-description-title {
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: #1a1a1a;
        }

        .step-description-content {
        }

        .step-tool-info {
            border-left: 1px solid #e0e0e0;
            padding-left: 20px;
            min-width: 180px;
            flex-shrink: 0;
        }

        @media (max-width: 768px) {
            .step-description-box {
                flex-direction: column;
            }

            .step-tool-info {
                border-left: none;
                border-top: 1px solid #e0e0e0;
                padding-left: 0;
                padding-top: 16px;
                min-width: 100%;
            }
        }

        .step-tool-info-label {
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 8px;
            color: #1a1a1a;
        }

        .step-tool-location-badge {
            display: inline-block;
            background: #e5e7eb;
            color: #4b5563;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 500;
            margin-top: 6px;
        }

        .step-details-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin: 20px 0;
        }

        .step-bottom-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .step-tool {
            background: rgba(16, 185, 129, 0.1);
            padding: 18px 20px;
            border-left: 4px solid #10b981;
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

        .step-tool-ref {
            color: rgb(249, 55, 5);
            font-weight: 600;
            font-size: 0.95rem;
            margin-top: 6px;
        }

        .step-tool-location {
            color: #666;
            font-size: 0.9rem;
            margin-top: 4px;
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

        /* Videos */
        .step-videos {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            margin-top: 24px;
        }

        .step-video-wrapper {
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            background: #000;
            position: relative;
            width: 100%;
            padding-bottom: 56.25%; /* Aspect ratio 16:9 */
        }

        .step-video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: block;
            border: none;
        }

        .step-video-link {
            display: block;
            padding: 16px;
            background: #f8f9fa;
            text-align: center;
            color: rgb(249, 55, 5);
            text-decoration: none;
            font-weight: 600;
            transition: background 0.2s;
        }

        .step-video-link:hover {
            background: #e8e9ea;
        }

        /* Conseils (touches de vert) */
        .tips {
            background: rgba(16, 185, 129, 0.1);
            border-left: 4px solid #10b981;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.1);
        }

        .tips-title {
            font-weight: 700;
            color: #059669;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .tip-item {
            padding: 4px 0;
            color: #555;
            line-height: 1.5;
            font-size: 0.9rem;
        }

        /* Consignes de sécurité (touches de rouge) */
        .safety-notes {
            background: rgba(239, 68, 68, 0.1);
            border-left: 4px solid #ef4444;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.1);
        }

        .safety-note {
            padding: 0;
            margin-bottom: 8px;
        }

        .safety-note:last-child {
            margin-bottom: 0;
        }

        .safety-note.warning,
        .safety-note.danger {
            background: transparent;
            border: none;
            box-shadow: none;
        }

        .safety-note-title {
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .safety-note.warning .safety-note-title,
        .safety-notes .safety-note-title {
            color: #ef4444;
        }

        .safety-note.danger .safety-note-title {
            color: #dc2626;
        }

        .safety-note > div:last-child {
            color: #555;
            line-height: 1.5;
            font-size: 0.9rem;
        }

        /* Version History Table */
        .version-history {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            margin: 20px 0;
        }

        .version-history-title {
            font-size: 1.4rem;
            font-weight: 600;
            color: #1a1a1a;
            padding: 20px 24px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
            margin: 0;
        }

        .version-table {
            width: 100%;
            border-collapse: collapse;
        }

        .version-table th {
            background: #f8f9fa;
            color: #666;
            font-weight: 600;
            text-align: left;
            padding: 12px 16px;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e0e0e0;
        }

        .version-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #f0f0f0;
            color: #2c3e50;
            font-size: 0.9rem;
        }

        .version-table tr:last-child td {
            border-bottom: none;
        }

        .version-table tr:hover {
            background: #f8f9fa;
        }

        .version-badge {
            display: inline-block;
            background: rgb(249, 55, 5);
            color: white;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.85rem;
        }

        .version-type-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .version-type-major {
            background: rgba(249, 55, 5, 0.1);
            color: rgb(249, 55, 5);
        }

        .version-type-minor {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
        }

        .version-date-cell {
            color: #666;
            font-size: 0.85rem;
            white-space: nowrap;
        }

        /* Carrousels */
        .carousel-container {
            position: relative;
            margin-top: 24px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            max-width: 100%;
        }

        .carousel-wrapper {
            position: relative;
            max-width: 100%;
            overflow: hidden;
        }

        .carousel-items {
            display: flex;
            transition: transform 0.4s ease-in-out;
        }

        .carousel-item {
            min-width: 100%;
            display: flex;
            flex-direction: column;
        }

        .carousel-item img {
            width: 100%;
            height: auto;
            max-height: 800px;
            object-fit: contain;
            background: #000;
            cursor: pointer;
            transition: transform 0.3s ease;
        }

        .carousel-item img:hover {
            opacity: 0.95;
        }


        .carousel-button {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
            z-index: 10;
        }

        .carousel-button:hover {
            background: rgba(0, 0, 0, 0.8);
        }

        .carousel-button.prev {
            left: 16px;
        }

        .carousel-button.next {
            right: 16px;
        }

        .carousel-indicators {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: #f8f9fa;
        }

        .carousel-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #d0d0d0;
            cursor: pointer;
            transition: background 0.3s, transform 0.3s;
        }

        .carousel-indicator.active {
            background: #f93705;
            transform: scale(1.2);
        }

        .carousel-counter {
            text-align: center;
            padding: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
        }

        /* Défauthèque - Images carrées */
        .defect-item .carousel-item img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 4px;
        }

        /* Images cliquables pour zoom */
        .carousel-item img,
        .step-image-wrapper img {
            cursor: pointer;
            transition: opacity 0.3s;
        }

        .carousel-item img:hover,
        .step-image-wrapper img:hover {
            opacity: 0.9;
        }

        /* Lightbox / Modal pour agrandir les images */
        .lightbox {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.95);
            justify-content: center;
            align-items: center;
        }

        .lightbox.active {
            display: flex;
        }

        .lightbox-content {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }

        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
        }

        .lightbox-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            color: white;
            font-size: 50px;
            font-weight: bold;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
            user-select: none;
        }

        .lightbox-nav:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-nav.prev {
            left: 20px;
        }

        .lightbox-nav.next {
            right: 20px;
        }

        .lightbox-counter {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 1rem;
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
        ${generateSidebarNav(phases, !!(procedure.defects && procedure.defects.length > 0), !!(procedure.changelog && procedure.changelog.length > 0))}
    </div>

    <!-- Contenu principal -->
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            ${procedure.changelog && procedure.changelog.length > 0 ? `<div class="version-badge">v${escapeHtml(procedure.changelog[0].version)}</div>` : procedure.versionString ? `<div class="version-badge">v${escapeHtml(procedure.versionString)}</div>` : ''}
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

    <!-- Lightbox pour agrandir les images -->
    <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
        <span class="lightbox-close" onclick="closeLightbox(event)">&times;</span>
        <img class="lightbox-content" id="lightbox-img" src="" alt="">
        <div class="lightbox-counter" id="lightbox-caption"></div>
    </div>

    <script>
        // Lightbox JavaScript
        function openLightbox(imageSrc, caption) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxCaption = document.getElementById('lightbox-caption');

            lightbox.classList.add('active');
            lightboxImg.src = imageSrc;
            lightboxCaption.textContent = caption || '';

            // Empêcher le scroll du body
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox(event) {
            if (event.target.id === 'lightbox' || event.target.classList.contains('lightbox-close')) {
                const lightbox = document.getElementById('lightbox');
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }

        // Fermer avec Échap
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const lightbox = document.getElementById('lightbox');
                if (lightbox.classList.contains('active')) {
                    lightbox.classList.remove('active');
                    document.body.style.overflow = 'auto';
                    resetZoom();
                }
            }
        });

        // Zoom pour lightbox et carousel
        let currentZoom = 1;
        const MIN_ZOOM = 1;
        const MAX_ZOOM = 5;

        function resetZoom() {
            currentZoom = 1;
            const lightboxImg = document.getElementById('lightbox-img');
            if (lightboxImg) {
                lightboxImg.style.transform = 'scale(' + currentZoom + ')';
                lightboxImg.style.cursor = 'zoom-in';
            }
        }

        function handleZoom(delta) {
            const lightboxImg = document.getElementById('lightbox-img');
            if (!lightboxImg) return;

            const zoomFactor = delta > 0 ? 1.2 : 0.8;
            currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

            lightboxImg.style.transform = 'scale(' + currentZoom + ')';
            lightboxImg.style.transition = 'transform 0.3s ease';
            lightboxImg.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        }

        // Zoom avec molette
        document.getElementById('lightbox').addEventListener('wheel', function(e) {
            if (this.classList.contains('active')) {
                e.preventDefault();
                handleZoom(-e.deltaY);
            }
        });

        // Zoom au clic
        document.getElementById('lightbox-img').addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentZoom === 1) {
                currentZoom = 2;
            } else if (currentZoom < MAX_ZOOM) {
                currentZoom = Math.min(MAX_ZOOM, currentZoom * 1.5);
            } else {
                currentZoom = 1;
            }
            this.style.transform = 'scale(' + currentZoom + ')';
            this.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        });

        // Toggle Phase
        function togglePhase(phaseId) {
            const content = document.getElementById(phaseId + '-content');
            const toggle = document.getElementById(phaseId + '-toggle');

            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '▼';
                toggle.classList.remove('collapsed');
            } else {
                content.style.display = 'none';
                toggle.textContent = '►';
                toggle.classList.add('collapsed');
            }
        }

        // Carrousel JavaScript
        const carouselStates = new Map();

        function initCarousel(carouselId) {
            if (!carouselStates.has(carouselId)) {
                carouselStates.set(carouselId, { currentIndex: 0 });
            }
        }

        function changeSlide(carouselId, direction) {
            initCarousel(carouselId);
            const state = carouselStates.get(carouselId);
            const itemsContainer = document.getElementById('items-' + carouselId);
            const items = itemsContainer.querySelectorAll('.carousel-item');
            const indicators = document.querySelectorAll('#carousel-' + carouselId + ' .carousel-indicator');
            const counter = document.getElementById('counter-' + carouselId);
            const descElement = document.getElementById('desc-' + carouselId);

            // Cacher l'élément actuel
            items[state.currentIndex].style.display = 'none';
            indicators[state.currentIndex].classList.remove('active');

            // Calculer le nouvel index
            state.currentIndex = (state.currentIndex + direction + items.length) % items.length;

            // Afficher le nouvel élément
            items[state.currentIndex].style.display = 'flex';
            indicators[state.currentIndex].classList.add('active');
            counter.textContent = state.currentIndex + 1;

            // Mettre à jour la description
            if (descElement) {
                const description = items[state.currentIndex].getAttribute('data-description');
                descElement.textContent = description ? ' - ' + description : '';
            }
        }

        function goToSlide(carouselId, index) {
            initCarousel(carouselId);
            const state = carouselStates.get(carouselId);
            const itemsContainer = document.getElementById('items-' + carouselId);
            const items = itemsContainer.querySelectorAll('.carousel-item');
            const indicators = document.querySelectorAll('#carousel-' + carouselId + ' .carousel-indicator');
            const counter = document.getElementById('counter-' + carouselId);
            const descElement = document.getElementById('desc-' + carouselId);

            // Cacher l'élément actuel
            items[state.currentIndex].style.display = 'none';
            indicators[state.currentIndex].classList.remove('active');

            // Aller à l'index demandé
            state.currentIndex = index;

            // Afficher le nouvel élément
            items[state.currentIndex].style.display = 'flex';
            indicators[state.currentIndex].classList.add('active');
            counter.textContent = state.currentIndex + 1;

            // Mettre à jour la description
            if (descElement) {
                const description = items[state.currentIndex].getAttribute('data-description');
                descElement.textContent = description ? ' - ' + description : '';
            }
        }

        // Support du clavier (flèches gauche/droite)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                // Trouver le carrousel visible et le faire défiler
                document.querySelectorAll('.carousel-container').forEach(carousel => {
                    const rect = carousel.getBoundingClientRect();
                    if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
                        const carouselId = carousel.id.replace('carousel-', '');
                        changeSlide(carouselId, direction);
                    }
                });
            }
        });

        // Égaliser les hauteurs des cadres conseil et consigne
        function equalizeStepBottomRowHeights() {
            document.querySelectorAll('.step-bottom-row').forEach(row => {
                const tips = row.querySelector('.tips');
                const safety = row.querySelector('.safety-notes');

                if (tips && safety) {
                    // Reset heights
                    tips.style.minHeight = '';
                    safety.style.minHeight = '';

                    // Get natural heights
                    const tipsHeight = tips.offsetHeight;
                    const safetyHeight = safety.offsetHeight;

                    // Set to max height
                    const maxHeight = Math.max(tipsHeight, safetyHeight);
                    tips.style.minHeight = maxHeight + 'px';
                    safety.style.minHeight = maxHeight + 'px';
                }
            });
        }

        // Appeler au chargement et au redimensionnement
        window.addEventListener('load', equalizeStepBottomRowHeights);
        window.addEventListener('resize', equalizeStepBottomRowHeights);
    </script>
</body>
</html>`;

  // Créer un Blob et télécharger
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Format: FT_Référence_Désignation_Version
  const reference = sanitizeFilename(procedure.reference || 'REF');
  const designation = sanitizeFilename(procedure.designation || procedure.title || 'Procedure');
  const version = procedure.versionString || '1.0';
  link.download = `FT_${reference}_${designation}_v${version}.html`;

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
        <div class="version-history">
            <h2 class="version-history-title">Historique des versions</h2>
            <table class="version-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Version</th>
                        <th style="width: 12%;">Type</th>
                        <th style="width: 18%;">Date</th>
                        <th>Modifications</th>
                    </tr>
                </thead>
                <tbody>
                    ${procedure.changelog.map(log => {
                        let dateStr = '';
                        try {
                            if (log.date && typeof log.date === 'object' && 'toDate' in log.date) {
                                dateStr = (log.date as any).toDate().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            } else if (log.date instanceof Date) {
                                dateStr = log.date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            } else {
                                dateStr = new Date(log.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            }
                        } catch (e) {
                            dateStr = 'Date invalide';
                        }
                        return `
                        <tr>
                            <td><span class="version-badge">v${escapeHtml(log.version)}</span></td>
                            <td><span class="version-type-badge ${log.type === 'major' ? 'version-type-major' : 'version-type-minor'}">${log.type === 'major' ? 'Majeure' : 'Mineure'}</span></td>
                            <td class="version-date-cell">${dateStr}</td>
                            <td>${escapeHtml(log.description)}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </section>
  `;
}

/**
 * Génère la navigation de la sidebar
 */
function generateSidebarNav(phases: Phase[], hasDefects: boolean = false, hasVersionHistory: boolean = false): string {
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

  const versioningNav = hasVersionHistory ? `
    <div class="nav-phase">
        <a href="#versioning" class="nav-phase-title" style="color: #f93705;">
            Historique des versions
        </a>
    </div>
  ` : '';

  return defectsNav + phasesNav + versioningNav;
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
        <h3>Outils</h3>
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
        ${procedure.defects.map((defect, defectIndex) => `
            <div class="defect-item">
                <div class="defect-description">${escapeHtml(defect.description)}</div>

                ${defect.images && defect.images.length > 0 ? `
                ${generateImageCarousel(defect.images, renderedImageUrls, `defect-${defectIndex}`)}
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
  return phases.map((phase, phaseIndex) => {
    const difficultyColor = phase.difficulty === 'trainee' ? '#3b82f6' : phase.difficulty === 'easy' ? '#10b981' : phase.difficulty === 'medium' ? '#eab308' : phase.difficulty === 'hard' ? '#ef4444' : '#999';
    const difficultyLabel = phase.difficulty === 'trainee' ? 'Stagiaire' : phase.difficulty === 'easy' ? 'Facile' : phase.difficulty === 'medium' ? 'Moyen' : phase.difficulty === 'hard' ? 'Difficile' : phase.difficulty;
    return `
    <div class="phase" id="phase-${phaseIndex + 1}">
        <div class="phase-header" onclick="togglePhase('phase-${phaseIndex + 1}')" style="cursor: pointer;">
            <div class="phase-title">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="phase-toggle-icon collapsed" id="phase-${phaseIndex + 1}-toggle">►</span>
                    <span class="difficulty-badge" style="background: ${difficultyColor};" title="${difficultyLabel}"></span>
                    <span>Phase ${phase.phaseNumber || phaseIndex + 1} : ${escapeHtml(phase.title)}</span>
                </div>
                ${phase.estimatedTime ? `
                <span class="phase-time-badge">${phase.estimatedTime} min/pièce</span>
                ` : ''}
            </div>
            <div class="phase-meta" style="display: none;">
                ${phase.numberOfPeople ? `
                <div class="phase-meta-item">
                    <span>Personnes:</span>
                    <span>${phase.numberOfPeople}</span>
                </div>
                ` : ''}
            </div>
            ${phase.requiredSkills && phase.requiredSkills.length > 0 ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #555; display: none;">
                <strong>Compétences requises:</strong> ${phase.requiredSkills.join(', ')}
            </div>
            ` : ''}
        </div>
        <div class="phase-content" id="phase-${phaseIndex + 1}-content"style="display: none;">

        ${phase.steps && phase.steps.length > 0 ? `
        <div class="steps">
            ${phase.steps.map((step, stepIndex) => `
            <div class="step" id="phase-${phaseIndex + 1}-step-${stepIndex + 1}">
                <div class="step-header">
                    <div class="step-label">
                        Phase ${phase.phaseNumber || phaseIndex + 1} - étape ${stepIndex + 1}${step.title ? ` : ${escapeHtml(step.title)}` : ''}
                    </div>
                </div>

                <div class="step-details-grid">
                    ${step.description || (step.toolId && step.toolName) ? `
                    <div class="step-description-box" style="background: ${step.toolColor ? `${step.toolColor}15` : '#f8f9fa'};">
                        <div class="step-description-left">
                            ${step.description ? `
                            <div class="step-description-title">Description</div>
                            <div class="step-description-content">${step.description}</div>
                            ` : ''}
                        </div>
                        ${step.toolId && step.toolName ? `
                        <div class="step-tool-info">
                            <div class="step-tool-info-label">Outil</div>
                            <div>${escapeHtml(step.toolName)}</div>
                            ${step.toolReference ? `<div class="step-tool-ref">${escapeHtml(step.toolReference)}</div>` : ''}
                            ${step.toolLocation ? `<span class="step-tool-location-badge">${escapeHtml(step.toolLocation)}</span>` : ''}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    ${(step.tips && step.tips.length > 0) || (step.safetyNotes && step.safetyNotes.length > 0) ? `
                    <div class="step-bottom-row">
                        ${step.tips && step.tips.length > 0 ? `
                        <div class="tips">
                            <div class="tips-title">Conseils</div>
                            ${step.tips.map(tip => `<div class="tip-item">${escapeHtml(tip)}</div>`).join('')}
                        </div>
                        ` : '<div></div>'}

                        ${step.safetyNotes && step.safetyNotes.length > 0 ? `
                        <div class="safety-notes">
                            ${step.safetyNotes.map(note => `
                            <div class="safety-note ${note.type === 'danger' ? 'danger' : 'warning'}">
                                <div class="safety-note-title">
                                    ${note.type === 'danger' ? 'DANGER' : 'ATTENTION'}
                                </div>
                                <div>${escapeHtml(note.content)}</div>
                            </div>
                            `).join('')}
                        </div>
                        ` : '<div></div>'}
                    </div>
                    ` : ''}
                </div>

                ${step.estimatedTime ? `
                <div class="step-time">⏱️ Temps: ${step.estimatedTime} min</div>
                ` : ''}

                ${step.images && step.images.length > 0 ? `
                ${generateImageCarousel(step.images, renderedImageUrls, `phase-${phaseIndex + 1}-step-${stepIndex + 1}`)}
                ` : ''}

                ${step.videos && step.videos.length > 0 ? `
                ${generateVideoCarousel(step.videos, `phase-${phaseIndex + 1}-step-${stepIndex + 1}`)}
                ` : ''}
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}
        </div>
    </div>
  `}).join('');
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

/**
 * Génère un carrousel d'images
 */
function generateImageCarousel(images: AnnotatedImage[], renderedImageUrls: Map<string, string>, carouselId: string): string {
  if (images.length === 0) return '';

  const carouselItems = images.map((img, index) => {
    const imageUrl = renderedImageUrls.get(img.imageId) || img.image?.url || (img.image?.blob ? URL.createObjectURL(img.image.blob) : '');
    if (!imageUrl) return '';

    return `
      <div class="carousel-item" style="display: ${index === 0 ? 'flex' : 'none'};" data-description="${escapeHtml(img.description || '')}">
        <img src="${imageUrl}" alt="${escapeHtml(img.description || 'Image')}" loading="lazy" onclick="openLightbox('${imageUrl}', '${escapeHtml(img.description || '')}')">
      </div>
    `;
  }).filter(Boolean).join('');

  if (images.length === 1) {
    const desc = images[0]?.description || '';
    return `
      <div class="carousel-container">
        ${carouselItems}
        ${desc ? `<div class="carousel-counter" style="text-align: left; padding-left: 20px;">Image 1/1 - ${escapeHtml(desc)}</div>` : '<div class="carousel-counter">Image 1/1</div>'}
      </div>
    `;
  }

  const indicators = images.map((_, index) =>
    `<span class="carousel-indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide('${carouselId}', ${index})"></span>`
  ).join('');

  return `
    <div class="carousel-container" id="carousel-${carouselId}">
      <div class="carousel-wrapper">
        <button class="carousel-button prev" onclick="changeSlide('${carouselId}', -1)">‹</button>
        <div class="carousel-items" id="items-${carouselId}">
          ${carouselItems}
        </div>
        <button class="carousel-button next" onclick="changeSlide('${carouselId}', 1)">›</button>
      </div>
      <div class="carousel-counter" style="text-align: left; padding-left: 20px;">
        Image <span id="counter-${carouselId}">1</span>/${images.length}<span id="desc-${carouselId}" style="margin-left: 10px;">${images[0]?.description ? ' - ' + escapeHtml(images[0].description) : ''}</span>
      </div>
      <div class="carousel-indicators">
        ${indicators}
      </div>
    </div>
  `;
}

/**
 * Génère un carrousel de vidéos
 */
function generateVideoCarousel(videos: any[], carouselId: string): string {
  if (videos.length === 0) return '';

  const carouselItems = videos.map((video, index) => {
    return `
      <div class="carousel-item" style="display: ${index === 0 ? 'flex' : 'none'};">
        <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; margin: 20px 0;">
          <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="video-button" style="
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 16px 32px;
            background: #f93705;
            color: white;
            font-size: 1.1rem;
            text-decoration: none;
            font-weight: 600;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(249, 55, 5, 0.3);
            transition: all 0.3s ease;
          " onmouseover="this.style.background='#d43004'; this.style.boxShadow='0 6px 16px rgba(249, 55, 5, 0.4)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.background='#f93705'; this.style.boxShadow='0 4px 12px rgba(249, 55, 5, 0.3)'; this.style.transform='translateY(0)';">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>${escapeHtml(video.name || 'Voir la vidéo sur YouTube')}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          ${video.description ? `<p style="margin-top: 16px; color: #666; font-size: 0.95rem;">${escapeHtml(video.description)}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (videos.length === 1) {
    return `<div class="carousel-container">${carouselItems}</div>`;
  }

  const indicators = videos.map((_, index) =>
    `<span class="carousel-indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide('video-${carouselId}', ${index})"></span>`
  ).join('');

  return `
    <div class="carousel-container" id="carousel-video-${carouselId}">
      <div class="carousel-counter">Vidéo <span id="counter-video-${carouselId}">1</span>/${videos.length}</div>
      <div class="carousel-wrapper">
        <button class="carousel-button prev" onclick="changeSlide('video-${carouselId}', -1)">‹</button>
        <div class="carousel-items" id="items-video-${carouselId}">
          ${carouselItems}
        </div>
        <button class="carousel-button next" onclick="changeSlide('video-${carouselId}', 1)">›</button>
      </div>
      <div class="carousel-indicators">
        ${indicators}
      </div>
    </div>
  `;
}
