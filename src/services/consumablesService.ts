import { supabase } from '@/lib/supabase';
import type { Consumable } from '@/types';

/**
 * Service pour récupérer les consommables depuis Supabase
 * Base de données: GestionDesStocks
 */

// Liste des noms de tables possibles à essayer
const possibleTableNames = [
  'consommables',
  'consumables',
  'stocks',
  'products',
  'produits',
  'articles',
];

let cachedTableName: string | null = null;

/**
 * Détermine le nom de la table des consommables
 */
async function findConsumablesTable(): Promise<string> {
  if (cachedTableName) {
    return cachedTableName;
  }

  for (const tableName of possibleTableNames) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        cachedTableName = tableName;
        console.log(`Found consumables table: ${tableName}`);
        return tableName;
      }
    } catch (err) {
      // Continue to next table name
      continue;
    }
  }

  throw new Error('Could not find consumables table in Supabase database');
}

/**
 * Transforme les données base64 en URL utilisable
 */
function processConsumableData(consumable: any): Consumable {
  // Si le champ photo contient des données base64, on l'utilise comme image_url
  if (consumable.photo && consumable.photo.startsWith('data:image')) {
    consumable.image_url = consumable.photo;
    consumable.photo_url = consumable.photo;
  }
  return consumable;
}

/**
 * Récupère tous les consommables depuis Supabase
 */
export async function fetchConsumables(): Promise<Consumable[]> {
  try {
    const tableName = await findConsumablesTable();

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .is('deleted_at', null)
      .order('designation', { ascending: true });

    if (error) {
      console.error('Error fetching consumables:', error);
      throw new Error(`Failed to fetch consumables: ${error.message}`);
    }

    // Traiter les données pour ajouter image_url depuis photo (base64)
    return (data || []).map(processConsumableData);
  } catch (error: any) {
    console.error('Error in fetchConsumables:', error);
    throw error;
  }
}

/**
 * Récupère un consommable par son ID
 */
export async function fetchConsumableById(id: string): Promise<Consumable | null> {
  try {
    const tableName = await findConsumablesTable();

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching consumable:', error);
      return null;
    }

    return data ? processConsumableData(data) : null;
  } catch (error) {
    console.error('Error in fetchConsumableById:', error);
    return null;
  }
}

/**
 * Recherche de consommables par terme
 */
export async function searchConsumables(query: string): Promise<Consumable[]> {
  try {
    const tableName = await findConsumablesTable();

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .is('deleted_at', null)
      .or(`designation.ilike.%${query}%,description.ilike.%${query}%,reference.ilike.%${query}%`)
      .order('designation', { ascending: true });

    if (error) {
      console.error('Error searching consumables:', error);
      throw new Error(`Failed to search consumables: ${error.message}`);
    }

    return (data || []).map(processConsumableData);
  } catch (error: any) {
    console.error('Error in searchConsumables:', error);
    throw error;
  }
}

/**
 * Filtre les consommables par catégorie
 */
export async function fetchConsumablesByCategory(category: string): Promise<Consumable[]> {
  try {
    const tableName = await findConsumablesTable();

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .is('deleted_at', null)
      .eq('category', category)
      .order('designation', { ascending: true });

    if (error) {
      console.error('Error fetching consumables by category:', error);
      throw new Error(`Failed to fetch consumables by category: ${error.message}`);
    }

    return (data || []).map(processConsumableData);
  } catch (error: any) {
    console.error('Error in fetchConsumablesByCategory:', error);
    throw error;
  }
}
