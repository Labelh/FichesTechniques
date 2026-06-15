/**
 * rewrite-image-urls.mjs  (one-shot, Partie B)
 *
 * Réécrit dans Firestore les URLs d'images ImgBB → Référentiel Néode, à partir
 * de la table de correspondance url-map.json fournie par Néode/Cédric.
 *
 * Format url-map.json : [{ oldUrl, newUrl, firestorePath, ref? }], 526 entrées.
 *   firestorePath cible un champ exact, ex :
 *     procedures/{id}.coverImage
 *     procedures/{id}.defects[0].images[0].image.url
 *     phases/{id}.steps[2].images[1].image.url
 *   La notation contient des chemins pointés + index de tableaux.
 *
 * Sécurité / idempotence :
 *   - n'écrit que si la valeur courante === oldUrl
 *   - si la valeur === newUrl  → déjà migré, on saute
 *   - sinon (valeur inattendue) → on signale et on saute (aucune écriture)
 *   - regroupe les mutations par document : 1 seule écriture par doc (champs top-level touchés)
 *
 * Prérequis :
 *   1. serviceAccount.json à la racine du repo (clé Firebase admin)
 *   2. url-map.json à la racine du repo (ou --map <chemin>)
 *   3. cd scripts && npm install
 *
 * Usage :
 *   node rewrite-image-urls.mjs              # DRY-RUN (par défaut, aucune écriture)
 *   node rewrite-image-urls.mjs --apply      # applique réellement
 *   node rewrite-image-urls.mjs --map ../url-map.json --apply
 *   node rewrite-image-urls.mjs --verify     # scan résiduel ibb.co/imgbb uniquement
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Arguments ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERIFY_ONLY = args.includes('--verify');
const mapIdx = args.indexOf('--map');
const MAP_PATH = mapIdx !== -1 ? args[mapIdx + 1] : join(ROOT, 'url-map.json');

// ── Service account ──────────────────────────────────────────────────────────
const SA_PATH = join(ROOT, 'serviceAccount.json');
if (!existsSync(SA_PATH)) {
  console.error('❌ serviceAccount.json introuvable à la racine du repo.');
  console.error('   Console Firebase → Paramètres → Comptes de service → Générer une clé privée.');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Helpers de navigation ──────────────────────────────────────────────────--
const IBB_RE = /i\.ibb\.co|imgbb/i;

/** Découpe "procedures/{id}.field[0].x" → { docPath, fieldPath } (split au 1er point). */
function splitFirestorePath(p) {
  const dot = p.indexOf('.');
  if (dot === -1) throw new Error(`firestorePath sans champ: ${p}`);
  return { docPath: p.slice(0, dot), fieldPath: p.slice(dot + 1) };
}

/** "defects[0].images[1].image.url" → ['defects',0,'images',1,'image','url'] */
function parseFieldPath(fieldPath) {
  const tokens = [];
  for (const seg of fieldPath.split('.')) {
    const m = seg.match(/^([^[]+)((\[\d+\])*)$/);
    if (!m) throw new Error(`Segment de champ invalide: "${seg}"`);
    tokens.push(m[1]);
    const idxs = m[2].match(/\d+/g);
    if (idxs) for (const i of idxs) tokens.push(Number(i));
  }
  return tokens;
}

/** Renvoie { parent, key } pour le dernier token, ou null si le chemin n'existe pas. */
function resolveParent(root, tokens) {
  let cur = root;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (cur == null) return null;
    cur = cur[tokens[i]];
  }
  if (cur == null) return null;
  return { parent: cur, key: tokens[tokens.length - 1] };
}

// ── Scan résiduel ibb.co/imgbb ────────────────────────────────────────────────
async function verifyNoImgbb() {
  console.log('\n🔎 Scan résiduel ibb.co / imgbb dans procedures + phases…');
  let hits = 0;
  for (const col of ['procedures', 'phases']) {
    const snap = await db.collection(col).get();
    for (const doc of snap.docs) {
      const json = JSON.stringify(doc.data());
      if (IBB_RE.test(json)) {
        hits++;
        const matches = json.match(/https?:\/\/[^"' ]*(?:i\.ibb\.co|imgbb)[^"' ]*/gi) || [];
        console.log(`   ⚠️  ${col}/${doc.id} contient encore : ${[...new Set(matches)].slice(0, 5).join(', ')}`);
      }
    }
  }
  if (hits === 0) console.log('   ✅ Aucune URL ImgBB résiduelle.');
  else console.log(`   ❌ ${hits} document(s) contiennent encore des URLs ImgBB.`);
  return hits;
}

// ── Main ───────────────────────────────────────────────────────────────────--
async function main() {
  if (VERIFY_ONLY) {
    await verifyNoImgbb();
    return;
  }

  if (!existsSync(MAP_PATH)) {
    console.error(`❌ url-map.json introuvable : ${MAP_PATH}`);
    process.exit(1);
  }
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  console.log(`📋 ${map.length} entrées chargées depuis ${MAP_PATH}`);
  console.log(APPLY ? '⚙️  Mode: APPLY (écriture réelle)' : '🧪 Mode: DRY-RUN (aucune écriture) — ajoutez --apply pour écrire');

  // Regrouper les entrées par document
  const byDoc = new Map(); // docPath -> [{ tokens, oldUrl, newUrl, firestorePath }]
  for (const e of map) {
    const { docPath, fieldPath } = splitFirestorePath(e.firestorePath);
    if (!byDoc.has(docPath)) byDoc.set(docPath, []);
    byDoc.get(docPath).push({ tokens: parseFieldPath(fieldPath), ...e });
  }

  const stats = { docs: 0, written: 0, set: 0, already: 0, mismatch: 0, missing: 0, errors: 0 };

  for (const [docPath, entries] of byDoc) {
    stats.docs++;
    let snap;
    try {
      snap = await db.doc(docPath).get();
    } catch (err) {
      stats.errors++;
      console.log(`   ❌ lecture ${docPath} : ${err.message}`);
      continue;
    }
    if (!snap.exists) {
      stats.missing += entries.length;
      console.log(`   ⚠️  document absent : ${docPath} (${entries.length} entrées)`);
      continue;
    }

    const data = snap.data();
    const touchedTopKeys = new Set();

    for (const { tokens, oldUrl, newUrl, firestorePath } of entries) {
      const res = resolveParent(data, tokens);
      if (!res) {
        stats.missing++;
        console.log(`   ⚠️  chemin absent : ${firestorePath}`);
        continue;
      }
      const current = res.parent[res.key];
      if (current === newUrl) {
        stats.already++;
        continue;
      }
      if (current !== oldUrl) {
        stats.mismatch++;
        console.log(`   ⚠️  valeur inattendue (non écrit) : ${firestorePath}\n        attendu=${oldUrl}\n        trouvé =${current}`);
        continue;
      }
      res.parent[res.key] = newUrl;
      touchedTopKeys.add(tokens[0]);
      stats.set++;
    }

    if (touchedTopKeys.size > 0) {
      const update = {};
      for (const k of touchedTopKeys) update[k] = data[k];
      if (APPLY) {
        try {
          await db.doc(docPath).update(update);
          stats.written++;
        } catch (err) {
          stats.errors++;
          console.log(`   ❌ écriture ${docPath} : ${err.message}`);
        }
      } else {
        stats.written++; // simulé
      }
    }
  }

  console.log('\n──────── Bilan ────────');
  console.log(`  Documents traités     : ${stats.docs}`);
  console.log(`  Champs réécrits        : ${stats.set}`);
  console.log(`  Documents ${APPLY ? 'écrits ' : 'à écrire'}      : ${stats.written}`);
  console.log(`  Déjà migrés (skip)     : ${stats.already}`);
  console.log(`  Valeurs inattendues    : ${stats.mismatch}`);
  console.log(`  Chemins/docs absents   : ${stats.missing}`);
  console.log(`  Erreurs                : ${stats.errors}`);

  if (APPLY) {
    await verifyNoImgbb();
  } else {
    console.log('\n🧪 DRY-RUN terminé. Relancez avec --apply pour écrire, puis --verify pour contrôler.');
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
