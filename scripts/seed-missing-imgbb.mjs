/**
 * seed-missing-imgbb.mjs  (one-shot, complément Partie B)
 *
 * Traite les images ImgBB **résiduelles absentes de la map** (jamais sauvegardées
 * sur le VPS) : pour chaque doc procedures/phases contenant encore une URL ImgBB,
 *   1. résout la référence article (champ `reference` du doc, sinon id),
 *   2. télécharge l'image depuis ImgBB,
 *   3. l'upload dans le Référentiel Shadow (POST /referentiel/upload, ref + token),
 *   4. réécrit la valeur dans Firestore (par valeur, idempotent).
 *
 * Token : variable d'env REFERENTIEL_UPLOAD_TOKEN (jamais en dur).
 * Origine : REFERENTIEL_ORIGIN (défaut https://shadow.ajust82.fr).
 *
 * Usage :
 *   REFERENTIEL_UPLOAD_TOKEN=xxx node seed-missing-imgbb.mjs            # DRY-RUN
 *   REFERENTIEL_UPLOAD_TOKEN=xxx node seed-missing-imgbb.mjs --apply
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const ORIGIN = (process.env.REFERENTIEL_ORIGIN || 'https://shadow.ajust82.fr').replace(/\/$/, '');
const TOKEN = process.env.REFERENTIEL_UPLOAD_TOKEN || '';
if (!TOKEN) { console.error('❌ REFERENTIEL_UPLOAD_TOKEN manquant (variable d\'env)'); process.exit(1); }

const sa = JSON.parse(readFileSync(join(ROOT, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const IBB = /https?:\/\/[^"' \\]*(?:i\.ibb\.co|imgbb)[^"' \\]*/gi;

function sanitizeRef(ref) { return (ref || '').replace(/[^A-Za-z0-9._-]/g, '_'); }
function fileNameFromUrl(u) { return decodeURIComponent(u.split('/').pop().split('?')[0]) || 'image.jpg'; }

async function uploadToReferentiel(buf, ref, name) {
  const fd = new FormData();
  fd.append('file', new Blob([buf]), name);
  fd.append('ref', ref);
  fd.append('name', name);
  const res = await fetch(`${ORIGIN}/referentiel/upload`, { method: 'POST', headers: { 'X-Upload-Token': TOKEN }, body: fd });
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text().catch(() => '')}`);
  const data = await res.json();
  if (!data.ok || !data.url) throw new Error('réponse upload invalide');
  return data.url.startsWith('http') ? data.url : `${ORIGIN}${data.url}`;
}

function rewriteVal(val, old2new) {
  let c = 0;
  if (typeof val === 'string') return old2new.has(val) ? [old2new.get(val), 1] : [val, 0];
  if (Array.isArray(val)) { const o = val.map((v) => { const [nv, k] = rewriteVal(v, old2new); c += k; return nv; }); return [o, c]; }
  if (val && typeof val === 'object') { const o = {}; for (const k of Object.keys(val)) { const [nv, k2] = rewriteVal(val[k], old2new); o[k] = nv; c += k2; } return [o, c]; }
  return [val, 0];
}

async function main() {
  console.log(APPLY ? '⚙️  APPLY' : '🧪 DRY-RUN');
  const stats = { urls: 0, uploaded: 0, docsWritten: 0, errors: 0 };
  // Cache id procédure → reference (les phases portent procedureId, pas la réf article)
  const procRef = new Map();
  const procs = await db.collection('procedures').get();
  procs.docs.forEach((p) => procRef.set(p.id, p.data().reference));
  for (const col of ['procedures', 'phases']) {
    const snap = await db.collection(col).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const json = JSON.stringify(data);
      const urls = [...new Set(json.match(IBB) || [])];
      if (!urls.length) continue;
      const articleRef = col === 'phases' ? procRef.get(data.procedureId) : data.reference;
      const ref = sanitizeRef(articleRef || data.reference || doc.id);
      const old2new = new Map();
      for (const url of urls) {
        stats.urls++;
        try {
          const r = await fetch(url);
          if (!r.ok) { console.log(`   ⚠️  ImgBB ${r.status} ${url}`); stats.errors++; continue; }
          const buf = Buffer.from(await r.arrayBuffer());
          const name = fileNameFromUrl(url);
          if (APPLY) {
            const newUrl = await uploadToReferentiel(buf, ref, name);
            old2new.set(url, newUrl);
            console.log(`   ✅ ${col}/${doc.id} [${ref}] ${name} → ${newUrl}`);
          } else {
            console.log(`   • ${col}/${doc.id} [${ref}] ${name} (${buf.length}o) → upload prévu`);
          }
          stats.uploaded++;
        } catch (e) { console.log(`   ❌ ${url} : ${e.message}`); stats.errors++; }
      }
      if (APPLY && old2new.size) {
        const touched = new Set(); let total = 0;
        for (const k of Object.keys(data)) { const [nv, c] = rewriteVal(data[k], old2new); if (c > 0) { data[k] = nv; touched.add(k); total += c; } }
        if (touched.size) {
          const update = {}; for (const k of touched) update[k] = data[k];
          try { await db.doc(`${col}/${doc.id}`).update(update); stats.docsWritten++; }
          catch (e) { stats.errors++; console.log(`   ❌ write ${col}/${doc.id}: ${e.message}`); }
        }
      }
    }
  }
  console.log('\n──────── Bilan seeding ────────');
  console.log(`  URLs ImgBB résiduelles : ${stats.urls}`);
  console.log(`  Uploadées au référentiel: ${stats.uploaded}`);
  console.log(`  Docs réécrits           : ${stats.docsWritten}`);
  console.log(`  Erreurs                 : ${stats.errors}`);
  if (!APPLY) console.log('\n🧪 DRY-RUN — ajoutez --apply pour seeder + réécrire.');
}
main().then(() => process.exit(0)).catch((e) => { console.error('💥', e); process.exit(1); });
