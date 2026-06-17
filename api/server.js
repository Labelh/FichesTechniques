// API lecture des fiches techniques Ajust'82.
// Servi derrière Traefik en PathPrefix(/ft-api) sur Host(shadow.ajust82.fr) :
// même origine que l'Atelier (shadow.ajust82.fr/apps/atelier) → pas de CORS, le token SSO passe.
//
//   GET  /ft-api/health
//   GET  /ft-api/operation?ref=<refArticle>&phase=<10>   -> contenu d'UNE opération si fiche "completed"
//   GET  /ft-api/articles                                -> debug : refs indexées (auth)
//   POST /ft-api/refresh   (X-Refresh-Token)             -> force un rebuild du cache
//
// ⚠️ Quota Firestore Spark : le cache snapshot est persisté sur disque et JAMAIS écrasé
// par un rebuild qui échoue (RESOURCE_EXHAUSTED) -> on sert toujours le dernier état connu.
// Le rebuild est paresseux (TTL long) + déclenchable à la main quand Réda termine une fiche.

import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import admin from 'firebase-admin'

const PORT = Number(process.env.PORT || 3000)
const BASE = '/ft-api'
const CACHE_FILE = process.env.CACHE_FILE || '/data/ft_cache.json'
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/app/serviceAccount.json'
const SSO_SECRET = process.env.SSO_TOKEN_SECRET || ''
const SSO_AUDIENCE = process.env.SSO_AUDIENCE || 'atelier'
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH ?? 'true') !== 'false'
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || ''
// TTL long par défaut (6 h) : on minimise les lectures Firestore (quota Spark partagé avec l'app FT).
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 6 * 3600 * 1000)

// ── Firestore (admin = ignore les security rules, lecture serveur) ───────────
const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ── Normalisation de réf (alignée sur app-referentiel-shadow) ───────────────
// On compare en ignorant la ponctuation (espaces/tirets/underscores) ET les zéros
// de fin que Notion/TimeTonic ajoutent (ex. Notion D5452081620000 = FT D54520816200).
const stripPunct = (r) => String(r || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const normRef = (r) => stripPunct(r).replace(/0+$/, '')

const parsePhase = (v) => {
  if (v === null || v === undefined) return null
  const m = String(v).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

// ── Cache ────────────────────────────────────────────────────────────────────
// { builtAt, count, byExact:{[ref]:entry}, byNorm:{[norm]:entry} }
// entry = { reference, title, designation, version, phases:[{phaseNumber,order,...}] }
let cache = { builtAt: 0, count: 0, byExact: {}, byNorm: {} }
let building = null // single-flight

async function loadDiskCache() {
  try {
    const raw = await fsp.readFile(CACHE_FILE, 'utf8')
    cache = JSON.parse(raw)
    console.log(`[ft-api] cache disque chargé: ${cache.count} fiches, bâti le ${new Date(cache.builtAt).toISOString()}`)
  } catch {
    console.log('[ft-api] pas de cache disque — rebuild au 1er accès')
  }
}

async function saveDiskCache() {
  try {
    await fsp.mkdir(path.dirname(CACHE_FILE), { recursive: true })
    await fsp.writeFile(CACHE_FILE, JSON.stringify(cache))
  } catch (e) {
    console.warn('[ft-api] échec écriture cache disque:', e?.message || e)
  }
}

// Mappe une phase Firestore -> objet lecture-seule allégé pour l'Atelier.
// `toolImg` : Map(toolId -> { url, location }) construite depuis la collection `tools`,
// pour résoudre l'image/emplacement de l'outil quand le StepTool ne les porte pas
// (l'éditeur de Réda n'enrichit l'imageUrl qu'en mémoire, pas toujours persisté).
function mapPhase(ph, toolImg = new Map()) {
  const steps = (ph.steps || []).map((s) => ({
    order: s.order ?? 0,
    title: s.title || '',
    description: s.description || '',
    tips: Array.isArray(s.tips) ? s.tips : [],
    images: (s.images || []).map((ai) => ({
      url: ai?.image?.url || ai?.url || null,
      description: ai?.description || '',
      // annotations Fabric conservées pour la V2 (rendu fidèle) ; MVP = image simple.
      annotations: Array.isArray(ai?.annotations) ? ai.annotations : [],
    })).filter((im) => im.url),
    tools: (s.tools || []).map((t) => {
      const ref = toolImg.get(t?.id) || {}
      return {
        name: t?.name || t?.toolName || null,
        reference: t?.reference || t?.toolReference || null,
        location: t?.location || t?.toolLocation || ref.location || null,
        imageUrl: t?.imageUrl || t?.toolImageUrl || ref.url || null,
      }
    }).filter((t) => t.name || t.reference),
    safetyNotes: Array.isArray(s.safetyNotes) ? s.safetyNotes : [],
  }))
  return {
    phaseNumber: parsePhase(ph.phaseNumber),
    order: ph.order ?? 0,
    title: ph.title || '',
    estimatedTime: ph.estimatedTime ?? null,
    difficulty: ph.difficulty ?? null,
    riskLevel: ph.riskLevel ?? null,
    notes: ph.notes || '',
    steps,
  }
}

async function buildCache() {
  if (building) return building
  building = (async () => {
    console.log('[ft-api] rebuild du cache…')
    // 1 lecture groupée : procédures "completed" + toutes les phases + outils (groupés en mémoire).
    const procSnap = await db.collection('procedures').where('status', '==', 'completed').get()
    const phaseSnap = await db.collection('phases').get()
    const toolSnap = await db.collection('tools').get()

    // Map outil -> image/emplacement, pour enrichir les StepTool (cf. mapPhase).
    const toolImg = new Map()
    toolSnap.forEach((d) => {
      const t = d.data()
      const url = t?.image?.url || t?.imageUrl || null
      if (url || t?.location) toolImg.set(d.id, { url, location: t?.location || null })
    })

    const phasesByProc = new Map()
    phaseSnap.forEach((d) => {
      const ph = d.data()
      const arr = phasesByProc.get(ph.procedureId) || []
      arr.push(ph)
      phasesByProc.set(ph.procedureId, arr)
    })

    const byExact = {}
    const byNorm = {}
    let count = 0
    procSnap.forEach((d) => {
      const p = d.data()
      if (!p.reference) return
      const phases = (phasesByProc.get(d.id) || [])
        .map((ph) => mapPhase(ph, toolImg))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      const entry = {
        id: d.id,
        reference: p.reference,
        title: p.title || '',
        designation: p.designation || '',
        version: p.versionString || (p.version != null ? String(p.version) : null),
        phases,
      }
      const ex = stripPunct(p.reference)
      const nm = normRef(p.reference)
      if (ex) byExact[ex] = entry
      if (nm && !byNorm[nm]) byNorm[nm] = entry // 1re gagne ; collisions rares (cf. référentiel)
      count++
    })

    cache = { builtAt: Date.now(), count, byExact, byNorm }
    await saveDiskCache()
    console.log(`[ft-api] cache rebâti: ${count} fiches completed`)
    return cache
  })()
  try {
    return await building
  } catch (e) {
    // Quota épuisé ou autre : on garde le cache précédent (résilience Spark).
    console.warn('[ft-api] rebuild échoué, on conserve le cache existant:', e?.code || '', e?.message || e)
    throw e
  } finally {
    building = null
  }
}

// Rebuild paresseux non bloquant : si le cache est périmé/absent, on lance un rebuild
// en arrière-plan mais on répond immédiatement avec ce qu'on a (jamais d'attente Firestore
// sur le chemin opérateur).
function maybeRefresh() {
  const stale = Date.now() - cache.builtAt > CACHE_TTL_MS
  if ((stale || cache.count === 0) && !building) {
    buildCache().catch(() => {})
  }
}

function lookup(ref) {
  return cache.byExact[stripPunct(ref)] || cache.byNorm[normRef(ref)] || null
}

// ── Auth SSO (HS256 inline, même secret que les lecteurs Atelier n8n) ────────
function verifySso(req) {
  if (!REQUIRE_AUTH) return true
  const h = req.get('authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (!m || !SSO_SECRET) return false
  const parts = m[1].split('.')
  if (parts.length !== 3) return false
  const [h64, p64, s64] = parts
  const expected = crypto.createHmac('sha256', SSO_SECRET).update(`${h64}.${p64}`).digest('base64url')
  const a = Buffer.from(s64), b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  let payload
  try { payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8')) } catch { return false }
  if (payload.exp && Date.now() / 1000 > payload.exp) return false
  if (SSO_AUDIENCE) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!aud.includes(SSO_AUDIENCE)) return false
  }
  return true
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Authorization,X-Refresh-Token,Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get(`${BASE}/health`, (_req, res) =>
  res.json({ ok: true, cache: { count: cache.count, builtAt: cache.builtAt, ageMs: Date.now() - cache.builtAt } }))

app.get(`${BASE}/operation`, (req, res) => {
  if (!verifySso(req)) return res.sendStatus(401)
  maybeRefresh()
  const ref = String(req.query.ref || '')
  const phaseNum = parsePhase(req.query.phase)
  if (!ref) return res.status(400).json({ error: 'ref required' })

  const entry = lookup(ref)
  // "no_procedure" couvre aussi "pas encore completed" (on n'indexe que les completed) :
  // les 2 cas déclenchent le fallback PDF côté Atelier, conforme à la spec.
  if (!entry) return res.json({ found: false, reason: 'no_procedure', cacheAge: Date.now() - cache.builtAt })

  let phase = null
  if (phaseNum != null) {
    phase = entry.phases.find((p) => p.phaseNumber === phaseNum)
      || entry.phases.find((p) => p.order === phaseNum) // fallback si FT numérote 1/2/3 en "order"
  }
  if (!phase) {
    return res.json({
      found: false,
      reason: 'no_phase',
      procedure: { reference: entry.reference, title: entry.title, designation: entry.designation, version: entry.version },
      available: entry.phases.map((p) => p.phaseNumber ?? p.order),
      cacheAge: Date.now() - cache.builtAt,
    })
  }
  res.json({
    found: true,
    procedure: { reference: entry.reference, title: entry.title, designation: entry.designation, version: entry.version },
    phase,
    cacheAge: Date.now() - cache.builtAt,
  })
})

app.get(`${BASE}/articles`, (req, res) => {
  if (!verifySso(req)) return res.sendStatus(401)
  const rows = Object.values(cache.byExact).map((e) => ({
    reference: e.reference, title: e.title, phases: e.phases.map((p) => p.phaseNumber ?? p.order),
  }))
  res.json({ count: rows.length, builtAt: cache.builtAt, rows })
})

app.post(`${BASE}/refresh`, async (req, res) => {
  if (!REFRESH_TOKEN || req.get('X-Refresh-Token') !== REFRESH_TOKEN) return res.sendStatus(401)
  try {
    await buildCache()
    res.json({ ok: true, count: cache.count, builtAt: cache.builtAt })
  } catch (e) {
    res.status(503).json({ ok: false, error: e?.code || String(e?.message || e), servedCount: cache.count })
  }
})

await loadDiskCache()
// Rebuild d'amorçage en arrière-plan (n'empêche pas le démarrage si quota épuisé).
buildCache().catch(() => {})
app.listen(PORT, () => console.log(`[ft-api] up on :${PORT} (cache=${CACHE_FILE}, ttl=${CACHE_TTL_MS}ms, auth=${REQUIRE_AUTH})`))
