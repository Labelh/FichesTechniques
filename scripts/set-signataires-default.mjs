/**
 * set-signataires-default.mjs
 *
 * Met à jour toutes les procédures existantes pour remplir
 * signataires.verificateur.nom et signataires.approbateur.nom
 * avec "CHARRAT Jean-Pierre" (si pas déjà renseigné).
 *
 * Usage :
 *   node set-signataires-default.mjs            # DRY-RUN
 *   node set-signataires-default.mjs --apply     # écrit
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const sa = JSON.parse(readFileSync(join(ROOT, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DEFAULT_NOM = 'CHARRAT Jean-Pierre';

async function main() {
  console.log(APPLY ? '⚙️  MODE APPLY' : '🧪 DRY-RUN (ajouter --apply pour écrire)');

  const snap = await db.collection('procedures').get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const signataires = data.signataires || {};
    const verif = signataires.verificateur || {};
    const appro = signataires.approbateur || {};

    const newSignataires = { ...signataires };
    let changed = false;

    if (!verif.nom) {
      newSignataires.verificateur = { ...verif, nom: DEFAULT_NOM };
      changed = true;
    }
    if (!appro.nom) {
      newSignataires.approbateur = { ...appro, nom: DEFAULT_NOM };
      changed = true;
    }

    if (changed) {
      const ref = data.reference || doc.id;
      console.log(`  ✏️  ${ref} — verificateur: "${newSignataires.verificateur?.nom}", approbateur: "${newSignataires.approbateur?.nom}"`);
      if (APPLY) {
        await doc.ref.update({ signataires: newSignataires });
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nTotal: ${snap.size} procédures — ${updated} mises à jour, ${skipped} déjà renseignées.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
