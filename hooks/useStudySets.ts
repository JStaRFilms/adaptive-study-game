import { useState, useEffect, useCallback } from 'react';
import { StudySet, ChatMessage } from '../types';
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
      
      // Hydrate old chat history format to new format
      const hydratedSets: StudySet[] = sets.map(set => {
        if (set.readingChatHistory && set.readingChatHistory.length > 0) {
            const firstMessage = set.readingChatHistory[0] as any; // Cast to check for old format
            if (typeof firstMessage.text === 'string' && !firstMessage.parts) {
                const newChatHistory: ChatMessage[] = set.readingChatHistory.map((oldMsg: any) => ({
                    id: oldMsg.id || `${Date.now()}-${Math.random()}`,
                    role: oldMsg.role,
                    parts: [{ type: 'text', text: oldMsg.text }],
                    action: oldMsg.action
                }));
                return { ...set, readingChatHistory: newChatHistory };
            }
        }
        return set;
      });

      const sortedSets = hydratedSets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      persistedFiles: newSet.persistedFiles || [],
      topics: newSet.topics || [],
      youtubeUrls: newSet.youtubeUrls || [],
      readingLayout: newSet.readingLayout || null,
      subConceptCache: {}, // Initialize the cache
      readingChatHistory: [],
    };
    await add(STORE_NAME, setWithId);
    await refreshSets();
    return setWithId;
  }, [refreshSets]);

  const updateSet = useCallback(async (updatedSet: StudySet) => {
    const setToSave: StudySet = {
      ...updatedSet,
      persistedFiles: updatedSet.persistedFiles || [],
      topics: updatedSet.topics || [],
      youtubeUrls: updatedSet.youtubeUrls || [],
      readingLayout: updatedSet.readingLayout || null,
      subConceptCache: updatedSet.subConceptCache || {}, // Ensure cache is saved
      readingChatHistory: updatedSet.readingChatHistory || [],
    };
    await put(STORE_NAME, setToSave);
    await refreshSets();
  }, [refreshSets]);

  const deleteSet = useCallback(async (setId: string) => {
    await deleteItem(STORE_NAME, setId);
    await refreshSets();
  }, [refreshSets]);

  return [studySets, addSet, updateSet, deleteSet];
};
