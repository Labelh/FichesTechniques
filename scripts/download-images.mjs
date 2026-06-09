/**
 * download-images.mjs
 * Parcourt backup/firestore-export.json, extrait toutes les URLs d'images
 * (ImgBB + Firebase Storage), télécharge les fichiers dans backup/images/
 * et produit backup/images-mapping.json.
 *
 * Prérequis :
 *   - backup/firestore-export.json produit par export-firestore.mjs
 *   - Pour Firebase Storage : serviceAccount.json à la racine du repo
 *   - npm install dans ce dossier :
 *       cd scripts && npm install
 *
 * Usage :
 *   cd scripts
 *   node download-images.mjs
 *
 * Sortie :
 *   backup/images/covers/     ← images de couverture
 *   backup/images/phases/     ← images de phases/étapes
 *   backup/images/defects/    ← images de la défauthèque
 *   backup/images-mapping.json
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKUP_DIR = join(ROOT, 'backup');
const IMAGES_DIR = join(BACKUP_DIR, 'images');

// ── Charger l'export Firestore ───────────────────────────────────────────────
const EXPORT_PATH = join(BACKUP_DIR, 'firestore-export.json');
if (!existsSync(EXPORT_PATH)) {
  console.error('❌ backup/firestore-export.json introuvable.');
  console.error('   Lancez d\'abord : node export-firestore.mjs');
  process.exit(1);
}
const exportData = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'));

// ── Charger Firebase Admin pour Firebase Storage ─────────────────────────────
const SA_PATH = join(ROOT, 'serviceAccount.json');
let storageBucket = null;
if (existsSync(SA_PATH)) {
  const { default: admin } = await import('firebase-admin');
  const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  // Récupérer le storageBucket depuis l'export
  const projectId = exportData._meta?.project_id;
  if (projectId) {
    storageBucket = admin.storage().bucket(`${projectId}.firebasestorage.app`);
    console.log(`✅ Firebase Storage initialisé : ${projectId}.firebasestorage.app`);
  }
} else {
  console.warn('⚠️  serviceAccount.json absent — les images Firebase Storage seront ignorées.');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isImgBBUrl(url) {
  return typeof url === 'string' && (url.includes('i.ibb.co') || url.includes('ibb.co'));
}

function isFirebaseStorageUrl(url) {
  return typeof url === 'string' && url.includes('firebasestorage.googleapis.com');
}

function isImageUrl(url) {
  return isImgBBUrl(url) || isFirebaseStorageUrl(url);
}

/** Génère un nom de fichier local sûr à partir d'une URL */
function safeFilename(url, prefix = '') {
  try {
    const u = new URL(url);
    // Prendre le dernier segment du chemin
    const segments = u.pathname.split('/').filter(Boolean);
    let name = segments[segments.length - 1] || 'image';
    // Décoder les %xx
    name = decodeURIComponent(name);
    // Retirer les query strings déjà dans le nom
    name = name.split('?')[0];
    // Assainir
    name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Ajouter un préfixe unique si fourni
    if (prefix) name = `${prefix}_${name}`;
    // S'assurer d'une extension
    if (!extname(name)) name += '.jpg';
    return name;
  } catch {
    return `${prefix || 'img'}_${Date.now()}.jpg`;
  }
}

/** Télécharge une URL HTTP/HTTPS vers un fichier local (avec redirects) */
function downloadUrl(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, (res) => {
      // Gérer les redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        const location = res.headers.location;
        if (location) {
          return downloadUrl(location, destPath).then(resolve).catch(reject);
        }
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
        return;
      }
      const file = createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout pour ${url}`));
    });
  });
}

/** Télécharge depuis Firebase Storage via Admin SDK */
async function downloadFirebaseStorage(url, destPath) {
  if (!storageBucket) throw new Error('Firebase Storage non initialisé');
  // Extraire le path depuis l'URL signée ou publique
  // Format : https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&...
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) throw new Error(`URL Firebase Storage non reconnue : ${url}`);
  const filePath = decodeURIComponent(match[1]);
  const file = storageBucket.file(filePath);
  await file.download({ destination: destPath });
}

// ── Extraction des URLs depuis l'export ─────────────────────────────────────

const imageEntries = []; // { url, category, firestorePath }

function addEntry(url, category, firestorePath) {
  if (isImageUrl(url)) {
    imageEntries.push({ url, category, firestorePath });
  }
}

/** Parcourt récursivement un objet sérialisé et extrait les URLs d'images */
function walkObject(obj, path, category) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walkObject(item, `${path}[${i}]`, category));
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    const newPath = path ? `${path}.${key}` : key;

    if (typeof val === 'string' && isImageUrl(val)) {
      addEntry(val, category, newPath);
    } else if (val && typeof val === 'object') {
      walkObject(val, newPath, category);
    }
  }
}

console.log('🔍 Analyse de firestore-export.json...\n');

// Procédures : coverImage
for (const proc of (exportData.procedures || [])) {
  if (proc.coverImage && isImageUrl(proc.coverImage)) {
    addEntry(proc.coverImage, 'covers', `procedures/${proc._id}.coverImage`);
  }
  // Défauts
  if (Array.isArray(proc.defects)) {
    proc.defects.forEach((defect, di) => {
      if (Array.isArray(defect.images)) {
        defect.images.forEach((img, ii) => {
          const url = img?.image?.url;
          if (url) addEntry(url, 'defects', `procedures/${proc._id}.defects[${di}].images[${ii}].image.url`);
        });
      }
    });
  }
  // globalTools images
  if (Array.isArray(proc.globalTools)) {
    proc.globalTools.forEach((tool, ti) => {
      const url = tool?.image?.url;
      if (url) addEntry(url, 'tools', `procedures/${proc._id}.globalTools[${ti}].image.url`);
    });
  }
}

// Phases : steps[*].images[*].image.url
for (const phase of (exportData.phases || [])) {
  if (Array.isArray(phase.steps)) {
    phase.steps.forEach((step, si) => {
      if (Array.isArray(step.images)) {
        step.images.forEach((img, ii) => {
          const url = img?.image?.url;
          if (url) addEntry(url, 'phases', `phases/${phase._id}.steps[${si}].images[${ii}].image.url`);
        });
      }
    });
  }
}

// Outils
for (const tool of (exportData.tools || [])) {
  const url = tool?.image?.url;
  if (url) addEntry(url, 'tools', `tools/${tool._id}.image.url`);
}

// Déduplication par URL
const seen = new Set();
const unique = imageEntries.filter(e => {
  if (seen.has(e.url)) return false;
  seen.add(e.url);
  return true;
});

const imgbbCount = unique.filter(e => isImgBBUrl(e.url)).length;
const fbCount = unique.filter(e => isFirebaseStorageUrl(e.url)).length;

console.log(`📸 URLs extraites : ${unique.length} uniques (${imgbbCount} ImgBB + ${fbCount} Firebase Storage)\n`);

if (unique.length === 0) {
  console.log('ℹ️  Aucune image à télécharger.');
  process.exit(0);
}

// ── Téléchargement ───────────────────────────────────────────────────────────

mkdirSync(join(IMAGES_DIR, 'covers'), { recursive: true });
mkdirSync(join(IMAGES_DIR, 'phases'), { recursive: true });
mkdirSync(join(IMAGES_DIR, 'defects'), { recursive: true });
mkdirSync(join(IMAGES_DIR, 'tools'), { recursive: true });

const mapping = [];
let downloaded = 0;
let failed = 0;
let totalBytes = 0;

for (let i = 0; i < unique.length; i++) {
  const { url, category, firestorePath } = unique[i];
  const filename = safeFilename(url, String(i).padStart(4, '0'));
  const localPath = join(category, filename);
  const destPath = join(IMAGES_DIR, localPath);

  process.stdout.write(`  [${i + 1}/${unique.length}] ${category}/${filename} ... `);

  // Skip si déjà téléchargé
  if (existsSync(destPath)) {
    const { statSync } = await import('fs');
    const size = statSync(destPath).size;
    totalBytes += size;
    console.log(`(déjà présent, ${(size / 1024).toFixed(0)} Ko)`);
    mapping.push({ oldUrl: url, localPath, firestorePath, status: 'already_exists' });
    downloaded++;
    continue;
  }

  try {
    if (isFirebaseStorageUrl(url)) {
      await downloadFirebaseStorage(url, destPath);
    } else {
      await downloadUrl(url, destPath);
    }

    const { statSync } = await import('fs');
    const size = statSync(destPath).size;
    totalBytes += size;
    console.log(`✅ (${(size / 1024).toFixed(0)} Ko)`);
    mapping.push({ oldUrl: url, localPath, firestorePath, status: 'ok' });
    downloaded++;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    mapping.push({ oldUrl: url, localPath, firestorePath, status: 'error', error: err.message });
    failed++;
  }

  // Petite pause pour ne pas surcharger ImgBB
  await new Promise(r => setTimeout(r, 150));
}

// ── Écrire le mapping ────────────────────────────────────────────────────────
const mappingPath = join(BACKUP_DIR, 'images-mapping.json');
writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');

const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

console.log('\n✅ Téléchargement terminé !');
console.log(`   Téléchargées : ${downloaded}/${unique.length}`);
console.log(`   Échecs       : ${failed}`);
console.log(`   Volume total : ${totalMB} Mo`);
console.log(`   Mapping      : ${mappingPath}`);

if (failed > 0) {
  console.warn('\n⚠️  Images en erreur :');
  mapping.filter(m => m.status === 'error').forEach(m => {
    console.warn(`     ${m.oldUrl} → ${m.error}`);
  });
}
