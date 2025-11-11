import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

/**
 * Test complet de connexion Firestore
 * Exécute plusieurs tests pour identifier le problème
 */
export async function testFirestoreConnection() {
  console.log('🔍 ========================================');
  console.log('🔍 DIAGNOSTIC FIRESTORE - DÉBUT');
  console.log('🔍 ========================================');

  const results = {
    config: false,
    read: false,
    write: false,
    writeWithId: false,
  };

  // Test 0 : Configuration
  try {
    console.log('\n📋 Test 0 : Configuration Firebase');
    console.log('   Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    console.log('   Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    console.log('   API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Présente' : '❌ Manquante');

    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      console.error('   ❌ Variables d\'environnement non chargées !');
      console.error('   💡 Solution : Redémarrez le serveur après avoir créé le .env');
      return results;
    }

    results.config = true;
    console.log('   ✅ Configuration OK');
  } catch (error) {
    console.error('   ❌ Erreur de configuration:', error);
    return results;
  }

  // Test 1 : Lecture
  try {
    console.log('\n📖 Test 1 : Lecture des collections');
    const testCollection = collection(db, 'test_diagnostic');
    const snapshot = await getDocs(testCollection);
    console.log('   ✅ Lecture OK. Documents trouvés:', snapshot.size);
    results.read = true;
  } catch (error: any) {
    console.error('   ❌ Lecture échouée:', error.message);
    console.error('   Code erreur:', error.code);

    if (error.code === 'permission-denied') {
      console.error('   🔒 PROBLÈME DE PERMISSIONS DÉTECTÉ');
      console.error('   💡 Les règles Firestore bloquent la lecture');
    }
  }

  // Test 2 : Écriture avec addDoc (ID auto)
  try {
    console.log('\n✍️ Test 2 : Écriture avec ID automatique');
    const testDoc = {
      timestamp: new Date().toISOString(),
      message: 'Test diagnostic',
      version: 1,
      random: Math.random()
    };

    console.log('   Document à écrire:', testDoc);
    console.log('   Taille (approx):', JSON.stringify(testDoc).length, 'bytes');

    const docRef = await addDoc(collection(db, 'test_diagnostic'), testDoc);
    console.log('   ✅ Écriture OK. ID:', docRef.id);
    results.write = true;
  } catch (error: any) {
    console.error('   ❌ Écriture échouée:', error.message);
    console.error('   Code erreur:', error.code);

    if (error.code === 'permission-denied') {
      console.error('   🔒 PROBLÈME DE PERMISSIONS DÉTECTÉ');
      console.error('   💡 Les règles Firestore bloquent l\'écriture');
      console.error('   💡 Solution : Vérifiez que les règles sont bien :');
      console.error('      match /{document=**} {');
      console.error('        allow read, write: if true;');
      console.error('      }');
    } else if (error.code === 'failed-precondition') {
      console.error('   ⚠️ Problème de précondition (index manquant ?)');
    } else if (error.code === 'unavailable') {
      console.error('   🌐 Firestore non disponible (problème réseau ?)');
    }
  }

  // Test 3 : Écriture avec setDoc (ID manuel)
  try {
    console.log('\n✍️ Test 3 : Écriture avec ID manuel');
    const testId = `test_${Date.now()}`;
    const testDoc = {
      timestamp: new Date().toISOString(),
      message: 'Test avec setDoc',
      version: 2
    };

    const docRef = doc(db, 'test_diagnostic', testId);
    await setDoc(docRef, testDoc);
    console.log('   ✅ Écriture OK. ID:', testId);
    results.writeWithId = true;
  } catch (error: any) {
    console.error('   ❌ Écriture avec ID échouée:', error.message);
    console.error('   Code erreur:', error.code);
  }

  // Test 4 : Simulation d'une procédure (DÉSACTIVÉ - créait des procédures inutiles)
  // try {
  //   console.log('\n🧪 Test 4 : Simulation création procédure');
  //   const procedureData = {
  //     title: 'Test Procédure',
  //     description: 'Test de création',
  //     category: '',
  //     tags: [],
  //     status: 'en_cours',
  //     priority: 'normal',
  //     estimatedTotalTime: 0,
  //     totalCost: 0,
  //     requiredSkills: [],
  //     riskLevel: 'low',
  //     phases: [],
  //     globalTools: [],
  //     globalToolIds: [],
  //     globalMaterials: [],
  //     viewCount: 0,
  //     exportCount: 0,
  //     version: 1,
  //     validationScore: 0,
  //     completionPercentage: 0,
  //   };

  //   console.log('   Taille document:', JSON.stringify(procedureData).length, 'bytes');
  //   const docRef = await addDoc(collection(db, 'procedures'), procedureData);
  //   console.log('   ✅ Création procédure OK. ID:', docRef.id);
  // } catch (error: any) {
  //   console.error('   ❌ Création procédure échouée:', error.message);
  //   console.error('   Code erreur:', error.code);

  //   if (error.code === 'permission-denied') {
  //     console.error('   🔒 C\'EST ICI LE PROBLÈME !');
  //     console.error('   💡 Les règles bloquent l\'écriture dans "procedures"');
  //   }
  // }

  // Résumé
  console.log('\n📊 ========================================');
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('📊 ========================================');
  console.log('   Configuration :', results.config ? '✅' : '❌');
  console.log('   Lecture       :', results.read ? '✅' : '❌');
  console.log('   Écriture (auto):', results.write ? '✅' : '❌');
  console.log('   Écriture (ID)  :', results.writeWithId ? '✅' : '❌');

  if (results.config && results.read && results.write) {
    console.log('\n✅ TOUT FONCTIONNE ! Le problème est ailleurs.');
  } else if (results.config && !results.read && !results.write) {
    console.log('\n❌ PROBLÈME DE PERMISSIONS CONFIRMÉ');
    console.log('💡 Action requise :');
    console.log('   1. Allez sur Firebase Console');
    console.log('   2. Firestore Database → Règles');
    console.log('   3. Vérifiez que les règles sont :');
    console.log('      rules_version = \'2\';');
    console.log('      service cloud.firestore {');
    console.log('        match /databases/{database}/documents {');
    console.log('          match /{document=**} {');
    console.log('            allow read, write: if true;');
    console.log('          }');
    console.log('        }');
    console.log('      }');
    console.log('   4. Cliquez sur PUBLIER');
    console.log('   5. Attendez 5 minutes');
    console.log('   6. Hard refresh (Ctrl+Shift+R)');
  } else if (!results.config) {
    console.log('\n❌ PROBLÈME DE CONFIGURATION');
    console.log('💡 Le fichier .env n\'est pas chargé correctement');
    console.log('   1. Vérifiez que .env existe à la racine du projet');
    console.log('   2. Vérifiez que toutes les variables commencent par VITE_');
    console.log('   3. Redémarrez le serveur (Ctrl+C puis npm run dev)');
  }

  console.log('🔍 ========================================');
  console.log('🔍 DIAGNOSTIC TERMINÉ');
  console.log('🔍 ========================================\n');

  return results;
}
