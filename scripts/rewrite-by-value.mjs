/**
 * rewrite-by-value.mjs  (complément de rewrite-image-urls.mjs)
 *
 * Réécrit les URLs ImgBB → Référentiel par **correspondance sur la valeur**
 * (et non par firestorePath/index). Nécessaire car une même image (défauthèque
 * partagée) est référencée par plusieurs procédures alors que la map ne contient
 * qu'un firestorePath par image → l'approche indexée laisse des copies sur ImgBB.
 *
 * Pour chaque doc de `procedures` + `phases`, on parcourt récursivement toutes
 * les chaînes ; toute valeur égale à un `oldUrl` de la map est remplacée par son
 * `newUrl`. Sûr (URLs ImgBB uniques) et idempotent (les newUrl ne sont pas des clés).
 *
 * Usage :
 *   node rewrite-by-value.mjs --map <chemin>            # DRY-RUN
 *   node rewrite-by-value.mjs --map <chemin> --apply    # écrit
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const mapIdx = args.indexOf('--map');
const MAP_PATH = mapIdx !== -1 ? args[mapIdx + 1] : join(ROOT, 'url-map.json');

const sa = JSON.parse(readFileSync(join(ROOT, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

if (!existsSync(MAP_PATH)) { console.error('map introuvable:', MAP_PATH); process.exit(1); }
const MAP = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const old2new = new Map(MAP.map((e) => [e.oldUrl, e.newUrl]));

/** Remplace récursivement dans une valeur ; renvoie [valeur, nbRemplacements]. */
function rewrite(val) {
  let count = 0;
  if (typeof val === 'string') {
    if (old2new.has(val)) return [old2new.get(val), 1];
    return [val, 0];
  }
  if (Array.isArray(val)) {
    const out = val.map((v) => { const [nv, c] = rewrite(v); count += c; return nv; });
    return [out, count];
  }
  if (val && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) { const [nv, c] = rewrite(val[k]); out[k] = nv; count += c; }
    return [out, count];
  }
  return [val, 0];
}

async function main() {
  console.log(`📋 ${MAP.size || MAP.length} entrées map · ${APPLY ? '⚙️ APPLY' : '🧪 DRY-RUN'}`);
  const stats = { docs: 0, changedDocs: 0, fields: 0, written: 0, errors: 0 };
  for (const col of ['procedures', 'phases']) {
    const snap = await db.collection(col).get();
    for (const doc of snap.docs) {
      stats.docs++;
      const data = doc.data();
      const touched = new Set();
      let total = 0;
      for (const k of Object.keys(data)) {
        const [nv, c] = rewrite(data[k]);
        if (c > 0) { data[k] = nv; touched.add(k); total += c; }
      }
      if (touched.size > 0) {
        stats.changedDocs++; stats.fields += total;
        const update = {}; for (const k of touched) update[k] = data[k];
        if (APPLY) {
          try { await db.doc(`${col}/${doc.id}`).update(update); stats.written++; }
          catch (e) { stats.errors++; console.log(`   ❌ ${col}/${doc.id}: ${e.message}`); }
        }
      }
    }
  }
  console.log('\n──────── Bilan (par valeur) ────────');
  console.log(`  Documents scannés   : ${stats.docs}`);
  console.log(`  Docs avec ImgBB     : ${stats.changedDocs}`);
  console.log(`  Champs à réécrire    : ${stats.fields}`);
  console.log(`  Docs ${APPLY ? 'écrits ' : 'à écrire'}     : ${stats.written || stats.changedDocs}`);
  console.log(`  Erreurs             : ${stats.errors}`);
  if (!APPLY) console.log('\n🧪 DRY-RUN — ajoutez --apply pour écrire.');
}
main().then(() => process.exit(0)).catch((e) => { console.error('💥', e); process.exit(1); });
