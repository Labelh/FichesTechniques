import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Procedure,
  Phase,
  Tool,
  Material,
  Category,
  Tag,
  UserPreferences,
  ProcedureTemplate,
} from '@/types';

// ==========================================
// COLLECTIONS REFERENCES
// ==========================================

export const collections = {
  procedures: 'procedures',
  phases: 'phases',
  tools: 'tools',
  materials: 'materials',
  categories: 'categories',
  tags: 'tags',
  templates: 'templates',
  preferences: 'preferences',
  history: 'history',
} as const;

// ==========================================
// HELPER FUNCTIONS - GENERIC
// ==========================================

/**
 * Convertit les dates Firestore Timestamp en Date
 */
export function convertTimestamps<T>(doc: any): T {
  const data = { ...doc };

  if (data.createdAt && data.createdAt.toDate) {
    data.createdAt = data.createdAt.toDate();
  }
  if (data.updatedAt && data.updatedAt.toDate) {
    data.updatedAt = data.updatedAt.toDate();
  }
  if (data.startDate && data.startDate.toDate) {
    data.startDate = data.startDate.toDate();
  }
  if (data.endDate && data.endDate.toDate) {
    data.endDate = data.endDate.toDate();
  }
  if (data.lastExportDate && data.lastExportDate.toDate) {
    data.lastExportDate = data.lastExportDate.toDate();
  }
  if (data.lastUsed && data.lastUsed.toDate) {
    data.lastUsed = data.lastUsed.toDate();
  }

  return data as T;
}

/**
 * Prépare les données pour Firestore (convertit les Dates en Timestamps)
 */
export function prepareForFirestore(data: any): any {
  const prepared = { ...data };

  // Supprimer l'id si présent (Firestore le gère)
  delete prepared.id;

  // Supprimer les valeurs undefined (Firestore ne les accepte pas)
  Object.keys(prepared).forEach(key => {
    if (prepared[key] === undefined) {
      delete prepared[key];
    } else if (prepared[key] instanceof Date) {
      // Convertir les dates
      prepared[key] = Timestamp.fromDate(prepared[key]);
    }
  });

  // Ajouter le timestamp de mise à jour
  prepared.updatedAt = serverTimestamp();

  return prepared;
}

// ==========================================
// CRUD OPERATIONS - PROCEDURES
// ==========================================

export async function createProcedure(data: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const procedureData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collections.procedures), procedureData);
  return docRef.id;
}

export async function getProcedure(id: string): Promise<Procedure | null> {
  const docRef = doc(db, collections.procedures, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return convertTimestamps<Procedure>({
    id: docSnap.id,
    ...docSnap.data(),
  });
}

export async function getAllProcedures(): Promise<Procedure[]> {
  const querySnapshot = await getDocs(collection(db, collections.procedures));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Procedure>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function updateProcedure(id: string, data: Partial<Procedure>): Promise<void> {
  const docRef = doc(db, collections.procedures, id);
  const preparedData = prepareForFirestore(data);
  await updateDoc(docRef, preparedData);
}

export async function deleteProcedure(id: string): Promise<void> {
  const batch = writeBatch(db);

  // Supprimer la procédure
  const procedureRef = doc(db, collections.procedures, id);
  batch.delete(procedureRef);

  // Supprimer les phases associées
  const phasesQuery = query(
    collection(db, collections.phases),
    where('procedureId', '==', id)
  );
  const phasesSnapshot = await getDocs(phasesQuery);
  phasesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

// ==========================================
// CRUD OPERATIONS - PHASES
// ==========================================

export async function createPhase(data: Omit<Phase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const phaseData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collections.phases), phaseData);
  return docRef.id;
}

export async function getPhasesByProcedure(procedureId: string): Promise<Phase[]> {
  const q = query(
    collection(db, collections.phases),
    where('procedureId', '==', procedureId),
    orderBy('order', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Phase>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function updatePhase(id: string, data: Partial<Phase>): Promise<void> {
  const docRef = doc(db, collections.phases, id);
  const preparedData = prepareForFirestore(data);
  await updateDoc(docRef, preparedData);
}

export async function deletePhase(id: string): Promise<void> {
  const docRef = doc(db, collections.phases, id);
  await deleteDoc(docRef);
}

// ==========================================
// CRUD OPERATIONS - TOOLS
// ==========================================

export async function createTool(data: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const toolData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collections.tools), toolData);
  return docRef.id;
}

export async function getAllTools(): Promise<Tool[]> {
  const querySnapshot = await getDocs(collection(db, collections.tools));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Tool>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function updateTool(id: string, data: Partial<Tool>): Promise<void> {
  const docRef = doc(db, collections.tools, id);
  const preparedData = prepareForFirestore(data);
  await updateDoc(docRef, preparedData);
}

export async function deleteTool(id: string): Promise<void> {
  const docRef = doc(db, collections.tools, id);
  await deleteDoc(docRef);
}

// ==========================================
// CRUD OPERATIONS - MATERIALS
// ==========================================

export async function createMaterial(data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const materialData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collections.materials), materialData);
  return docRef.id;
}

export async function getAllMaterials(): Promise<Material[]> {
  const querySnapshot = await getDocs(collection(db, collections.materials));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Material>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

// ==========================================
// CRUD OPERATIONS - CATEGORIES
// ==========================================

export async function getAllCategories(): Promise<Category[]> {
  const querySnapshot = await getDocs(collection(db, collections.categories));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Category>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const categoryData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collections.categories), categoryData);
  return docRef.id;
}

// ==========================================
// CRUD OPERATIONS - TAGS
// ==========================================

export async function getAllTags(): Promise<Tag[]> {
  const querySnapshot = await getDocs(collection(db, collections.tags));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<Tag>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

// ==========================================
// CRUD OPERATIONS - TEMPLATES
// ==========================================

export async function getAllTemplates(): Promise<ProcedureTemplate[]> {
  const querySnapshot = await getDocs(collection(db, collections.templates));

  return querySnapshot.docs.map(doc =>
    convertTimestamps<ProcedureTemplate>({
      id: doc.id,
      ...doc.data(),
    })
  );
}

// ==========================================
// CRUD OPERATIONS - PREFERENCES
// ==========================================

export async function getPreferences(): Promise<UserPreferences | null> {
  const querySnapshot = await getDocs(collection(db, collections.preferences));

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return convertTimestamps<UserPreferences>({
    id: doc.id,
    ...doc.data(),
  });
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<void> {
  const querySnapshot = await getDocs(collection(db, collections.preferences));

  if (querySnapshot.empty) {
    // Créer les préférences si elles n'existent pas
    await addDoc(collection(db, collections.preferences), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const docRef = querySnapshot.docs[0].ref;
    const preparedData = prepareForFirestore(data);
    await updateDoc(docRef, preparedData);
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

export async function initializeFirestore(): Promise<void> {
  try {
    // Vérifier si des préférences existent
    const prefs = await getPreferences();

    if (!prefs) {
      // Créer les préférences par défaut
      await addDoc(collection(db, collections.preferences), {
        theme: 'dark',
        accentColor: '#3b82f6',
        fontSize: 'normal',
        density: 'normal',
        defaultView: 'grid',
        autoSave: true,
        autoSaveInterval: 30,
        confirmBeforeDelete: true,
        defaultPDFConfig: {
          pageSize: 'a4',
          orientation: 'portrait',
          columns: 1,
          imageQuality: 'high',
          includeTableOfContents: true,
          includeCoverPage: true,
          includeToolIndex: true,
          includeMaterialList: true,
          includePrivateNotes: false,
          header: { enabled: true },
          footer: {
            enabled: true,
            showPageNumbers: true,
            showDate: true,
            showVersion: true,
          },
          primaryColor: '#1f2937',
          accentColor: '#3b82f6',
          fontFamily: 'Helvetica',
        },
        keyboardShortcuts: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Préférences par défaut créées');
    }

    // Vérifier si des catégories existent
    const categories = await getAllCategories();

    if (categories.length === 0) {
      const batch = writeBatch(db);

      const defaultCategories = [
        {
          name: 'Électricité',
          description: 'Travaux électriques',
          color: '#fbbf24',
          icon: '⚡',
          procedureCount: 0,
        },
        {
          name: 'Plomberie',
          description: 'Travaux de plomberie',
          color: '#3b82f6',
          icon: '🚰',
          procedureCount: 0,
        },
        {
          name: 'Menuiserie',
          description: 'Travaux de menuiserie et bois',
          color: '#92400e',
          icon: '🪚',
          procedureCount: 0,
        },
        {
          name: 'Peinture',
          description: 'Peinture et décoration',
          color: '#ec4899',
          icon: '🎨',
          procedureCount: 0,
        },
        {
          name: 'Maçonnerie',
          description: 'Travaux de maçonnerie',
          color: '#6b7280',
          icon: '🧱',
          procedureCount: 0,
        },
        {
          name: 'Jardinage',
          description: 'Travaux de jardinage et extérieur',
          color: '#10b981',
          icon: '🌱',
          procedureCount: 0,
        },
      ];

      defaultCategories.forEach(cat => {
        const docRef = doc(collection(db, collections.categories));
        batch.set(docRef, {
          ...cat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      console.log('✅ Catégories par défaut créées');
    }

    console.log('✅ Firestore initialisé');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firestore:', error);
    throw error;
  }
}
