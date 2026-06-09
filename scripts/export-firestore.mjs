/**
 * export-firestore.mjs
 * Export complet de Firestore vers backup/firestore-export.json
 *
 * Prérequis :
 *   1. Télécharger la clé service account depuis la console Firebase :
 *      Paramètres projet → Comptes de service → Générer une nouvelle clé privée
 *      → sauvegarder sous  <racine-repo>/serviceAccount.json
 *   2. npm install dans ce dossier :
 *      cd scripts && npm install
 *
 * Usage :
 *   cd scripts
 *   node export-firestore.mjs
 *
 * Sortie :
 *   ../backup/firestore-export.json
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Charger la clé service account ──────────────────────────────────────────
const SA_PATH = join(ROOT, 'serviceAccount.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
} catch {
  console.error('❌ serviceAccount.json introuvable à la racine du repo.');
  console.error('   Téléchargez-la depuis : Firebase console → Paramètres projet → Comptes de service');
  process.exit(1);
}

// ── Import Firebase Admin (installé localement dans scripts/) ───────────────
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Collections à exporter ───────────────────────────────────────────────────
// On exporte toutes les collections connues + on détecte le reste dynamiquement.
const KNOWN_COLLECTIONS = [
  'procedures',
  'phases',
  'tools',
  'materials',
  'categories',
  'tags',
  'templates',
  'substepTemplates',
  'preferences',
  'verification_requests',
  'history',
];

/**
 * Sérialise un document Firestore en objet JSON pur.
 * Les Timestamps sont convertis en ISO 8601.
 */
function serializeDoc(docSnap) {
  const data = docSnap.data();
  return {
    _id: docSnap.id,
    ...serializeValue(data),
  };
}

function serializeValue(val) {
  if (val === null || val === undefined) return val;

  // Timestamp Firestore
  if (val && typeof val.toDate === 'function') {
    return { _type: 'Timestamp', _value: val.toDate().toISOString() };
  }

  // Array
  if (Array.isArray(val)) {
    return val.map(serializeValue);
  }

  // Object (plain)
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = serializeValue(v);
    }
    return out;
  }

  return val;
}

async function exportCollection(name) {
  const snapshot = await db.collection(name).get();
  const docs = snapshot.docs.map(serializeDoc);
  console.log(`  📦 ${name.padEnd(25)} → ${docs.length} documents`);
  return docs;
}

async function main() {
  console.log('🚀 Démarrage export Firestore...');
  console.log(`   Projet : ${serviceAccount.project_id}\n`);

  const output = {
    _meta: {
      project_id: serviceAccount.project_id,
      exported_at: new Date().toISOString(),
      collections: {},
    },
  };

  let totalDocs = 0;

  // Exporter les collections connues
  for (const col of KNOWN_COLLECTIONS) {
    try {
      const docs = await exportCollection(col);
      output[col] = docs;
      output._meta.collections[col] = docs.length;
      totalDocs += docs.length;
    } catch (err) {
      console.warn(`  ⚠️  ${col} : ${err.message}`);
      output[col] = [];
      output._meta.collections[col] = 0;
    }
  }

  // Détecter les collections inconnues (listCollections au niveau racine)
  try {
    const rootCols = await db.listCollections();
    for (const colRef of rootCols) {
      if (!KNOWN_COLLECTIONS.includes(colRef.id)) {
        console.log(`  🔍 Collection inconnue détectée : ${colRef.id}`);
        const docs = await exportCollection(colRef.id);
        output[colRef.id] = docs;
        output._meta.collections[colRef.id] = docs.length;
        totalDocs += docs.length;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️  Impossible de lister les collections : ${err.message}`);
  }

  // Écrire le fichier
  mkdirSync(join(ROOT, 'backup'), { recursive: true });
  const outPath = join(ROOT, 'backup', 'firestore-export.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  const fileSizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(2);

  console.log('\n✅ Export terminé !');
  console.log(`   Total documents : ${totalDocs}`);
  console.log(`   Taille fichier  : ${fileSizeMB} Mo`);
  console.log(`   Chemin          : ${outPath}`);
  console.log('\n   Volumétrie par collection :');
  for (const [col, count] of Object.entries(output._meta.collections)) {
    if (count > 0) console.log(`     ${col.padEnd(25)} : ${count}`);
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});
