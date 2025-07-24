import { useState, useEffect, useCallback } from 'react';
import { StudySet } from '../types';
import { getAll, add, put, deleteItem } from '../utils/db';

const STORE_NAME = 'studySets';

export const useStudySets = (): [
  StudySet[],
  (set: Omit<StudySet, 'id' | 'createdAt'>) => Promise<StudySet>,
  (set: StudySet) => Promise<void>,
  (setId: string) => Promise<void>
] => {
  const [studySets, setStudySets] = useState<StudySet[]>([]);

  const refreshSets = useCallback(async () => {
    try {
      const sets = await getAll(STORE_NAME);
      const sortedSets = sets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStudySets(sortedSets);
    } catch (error) {
      console.error("Failed to refresh study sets from IndexedDB:", error);
    }
  }, []);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

  const addSet = useCallback(async (newSet: Omit<StudySet, 'id' | 'createdAt'>): Promise<StudySet> => {
    const setWithId: StudySet = {
      ...newSet,
      id: new Date().toISOString() + Math.random(),
      createdAt: new Date().toISOString(),
    };
    await add(STORE_NAME, setWithId);
    await refreshSets();
    return setWithId;
  }, [refreshSets]);

  const updateSet = useCallback(async (updatedSet: StudySet) => {
    await put(STORE_NAME, updatedSet);
    await refreshSets();
  }, [refreshSets]);

  const deleteSet = useCallback(async (setId: string) => {
    await deleteItem(STORE_NAME, setId);
    await refreshSets();
  }, [refreshSets]);

  return [studySets, addSet, updateSet, deleteSet];
};
