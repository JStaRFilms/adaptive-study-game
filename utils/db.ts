import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StudySet, QuizResult, PredictionResult, SRSItem } from '../types';
import { getActiveAccountId } from './activeAccount';

export type StoreName = 'studySets' | 'quizHistory' | 'predictions' | 'srsItems';
export const STORE_NAMES: StoreName[] = ['studySets', 'quizHistory', 'predictions', 'srsItems'];
const LEGACY_KEYS: Record<StoreName, string> = {
  studySets: 'adaptive-study-game-sets',
  quizHistory: 'adaptive-study-game-history',
  predictions: 'adaptive-study-game-predictions',
  srsItems: 'adaptive-study-game-srs',
};

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

const DB_VERSION = 3;
// The anonymous database retains its original name. Never copy it on sign-in.
const accountDbName = () => `adaptive-study-game-db-account-${encodeURIComponent(getActiveAccountId())}`;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<AppDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(accountDbName(), DB_VERSION, {
      upgrade: (db, oldVersion) => {
        if (oldVersion < 3) {
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
      },
    });
  }
  return dbPromise;
};

// Read-only preview for a deliberate JSON export and manual import. Never assign
// anonymous records to whichever account happens to sign in first.
export async function getAnonymousData(): Promise<Partial<Record<StoreName, unknown[]>>> {
  const backup: Partial<Record<StoreName, unknown[]>> = {};
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    if (databases.some(database => database.name === 'adaptive-study-game-db')) {
      const anonymous = await openDB<AppDB>('adaptive-study-game-db');
      try {
        for (const store of STORE_NAMES) {
          if (anonymous.objectStoreNames.contains(store)) backup[store] = await anonymous.getAll(store);
        }
      } finally {
        anonymous.close();
      }
    }
  }
  for (const store of STORE_NAMES) {
    const stored = localStorage.getItem(LEGACY_KEYS[store]);
    if (!stored) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(stored); }
    catch { continue; }
    if (!Array.isArray(parsed)) continue;
    const existing = backup[store] ?? [];
    const hasId = (value: unknown): value is { id: string } =>
      typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
    const ids = new Set(existing.filter(hasId).map(item => item.id));
    backup[store] = [...existing, ...parsed.filter(hasId).filter(item => !ids.has(item.id))];
  }
  return backup;
}

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
