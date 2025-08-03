import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StudySet, QuizResult, PredictionResult, SRSItem } from '../types';

export type StoreName = 'studySets' | 'quizHistory' | 'predictions' | 'srsItems';
export const STORE_NAMES: StoreName[] = ['studySets', 'quizHistory', 'predictions', 'srsItems'];

interface AppDB extends DBSchema {
  studySets: {
    key: string;
    value: StudySet;
    indexes: { createdAt: string };
  };
  quizHistory: {
    key: string;
    value: QuizResult;
    indexes: { date: string; studySetId: string };
  };
  predictions: {
    key: string;
    value: PredictionResult;
    indexes: { studySetId: string; updatedAt: string };
  };
  srsItems: {
    key: string;
    value: SRSItem;
    indexes: { nextReviewDate: string };
  };
}

const DB_NAME = 'adaptive-study-game-db';
const DB_VERSION = 2; // Incremented version to trigger the upgrade and migration

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<AppDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // This block handles initial schema creation for new users
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('studySets')) {
            const store = db.createObjectStore('studySets', { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt');
          }
          if (!db.objectStoreNames.contains('quizHistory')) {
            const store = db.createObjectStore('quizHistory', { keyPath: 'id' });
            store.createIndex('date', 'date');
            store.createIndex('studySetId', 'studySetId');
          }
          if (!db.objectStoreNames.contains('predictions')) {
            const store = db.createObjectStore('predictions', { keyPath: 'id' });
            store.createIndex('studySetId', 'studySetId');
            store.createIndex('updatedAt', 'updatedAt');
          }
          if (!db.objectStoreNames.contains('srsItems')) {
            const store = db.createObjectStore('srsItems', { keyPath: 'id' });
            store.createIndex('nextReviewDate', 'nextReviewDate');
          }
        }

        // This block handles the migration from localStorage to IndexedDB
        if (oldVersion < 2) {
            console.log("Starting migration from localStorage to IndexedDB...");
            // Use an async IIFE to perform the migration within the transaction
            (async () => {
                try {
                    const storeMap: { [key: string]: StoreName } = {
                        'adaptive-study-game-sets': 'studySets',
                        'adaptive-study-game-history': 'quizHistory',
                        'adaptive-study-game-predictions': 'predictions',
                        'adaptive-study-game-srs': 'srsItems',
                    };

                    for (const [localStorageKey, storeName] of Object.entries(storeMap)) {
                        const dataStr = localStorage.getItem(localStorageKey);
                        if (dataStr) {
                            console.log(`Found data in localStorage for key: ${localStorageKey}`);
                            const data = JSON.parse(dataStr);
                            if (Array.isArray(data) && data.length > 0) {
                                const store = transaction.objectStore(storeName);
                                console.log(`Migrating ${data.length} items to '${storeName}'...`);
                                await Promise.all(data.map(item => store.put(item)));
                                localStorage.removeItem(localStorageKey);
                                console.log(`Migration for '${storeName}' complete. Removed from localStorage.`);
                            }
                        }
                    }
                    console.log("Migration finished successfully.");
                } catch (error) {
                    console.error("Migration failed, transaction will abort.", error);
                    transaction.abort(); // Explicitly abort transaction on failure
                }
            })();
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Ensures the database is initialized, running any pending upgrade operations.
 * This should be awaited to ensure migrations are complete before proceeding.
 */
export const initializeDb = async (): Promise<void> => {
    await getDb();
};

export const getAll = async <T extends StoreName>(storeName: T): Promise<AppDB[T]['value'][]> => {
  const db = await getDb();
  return db.getAll(storeName);
};

export const add = async <T extends StoreName>(storeName: T, value: AppDB[T]['value']): Promise<IDBValidKey> => {
  const db = await getDb();
  return db.add(storeName, value);
};

export const put = async <T extends StoreName>(storeName: T, value: AppDB[T]['value']): Promise<IDBValidKey> => {
  const db = await getDb();
  return db.put(storeName, value);
};

export const deleteItem = async <T extends StoreName>(storeName: T, key: string): Promise<void> => {
  const db = await getDb();
  return db.delete(storeName, key);
};