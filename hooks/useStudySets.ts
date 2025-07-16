import React, { useState, useEffect, useCallback } from 'react';
import { StudySet } from '../types';

const STORAGE_KEY = 'adaptive-study-game-sets';

export const useStudySets = (): [
  StudySet[],
  (set: Omit<StudySet, 'id' | 'createdAt'>) => void,
  (set: StudySet) => void,
  (setId: string) => void
] => {
  const [studySets, setStudySets] = useState<StudySet[]>([]);

  useEffect(() => {
    try {
      const storedSets = localStorage.getItem(STORAGE_KEY);
      if (storedSets) {
        setStudySets(JSON.parse(storedSets));
      }
    } catch (error) {
      console.error("Failed to load study sets from local storage:", error);
      setStudySets([]);
    }
  }, []);

  const saveSets = (sets: StudySet[]) => {
    try {
      const sortedSets = sets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedSets));
      setStudySets(sortedSets);
    } catch (error) {
      console.error("Failed to save study sets to local storage:", error);
    }
  };

  const addSet = useCallback((newSet: Omit<StudySet, 'id' | 'createdAt'>) => {
    const sets = studySets || [];
    const setWithId: StudySet = {
      ...newSet,
      id: new Date().toISOString() + Math.random(),
      createdAt: new Date().toISOString(),
    };
    saveSets([...sets, setWithId]);
  }, [studySets]);

  const updateSet = useCallback((updatedSet: StudySet) => {
    const updatedSets = studySets.map(s => s.id === updatedSet.id ? updatedSet : s);
    saveSets(updatedSets);
  }, [studySets]);

  const deleteSet = useCallback((setId: string) => {
    const updatedSets = studySets.filter(s => s.id !== setId);
    saveSets(updatedSets);
  }, [studySets]);

  return [studySets, addSet, updateSet, deleteSet];
};
