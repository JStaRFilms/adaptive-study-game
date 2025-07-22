import { useState, useEffect, useCallback } from 'react';
import { QuizResult } from '../types';

const HISTORY_STORAGE_KEY = 'adaptive-study-game-history';

// A helper that only interacts with localStorage and returns the new, sorted array.
const saveHistoryToLocalStorage = (newHistory: QuizResult[]): QuizResult[] => {
  try {
    const sortedHistory = newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sortedHistory));
    return sortedHistory;
  } catch (error) {
    console.error("Failed to save quiz history to local storage:", error);
    return newHistory; // Return unsorted on error to prevent data loss in React state
  }
};

export const useQuizHistory = (): [
  QuizResult[],
  (newResult: Omit<QuizResult, 'id'>, id?: string) => QuizResult,
  (updatedResult: QuizResult) => void
] => {
  const [history, setHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load quiz history from local storage:", error);
      setHistory([]);
    }
  }, []);

  const addResult = useCallback((newResult: Omit<QuizResult, 'id'>, id?: string): QuizResult => {
    const resultWithId: QuizResult = {
      ...newResult,
      id: id || new Date().toISOString() + Math.random(),
    };
    setHistory(currentHistory => {
        const newHistory = [...(currentHistory || []), resultWithId];
        return saveHistoryToLocalStorage(newHistory);
    });
    return resultWithId;
  }, []);

  const updateResult = useCallback((updatedResult: QuizResult) => {
    setHistory(currentHistory => {
        const allHistory = currentHistory || [];
        const index = allHistory.findIndex(r => r.id === updatedResult.id);
        if (index > -1) {
            const newHistory = [...allHistory];
            newHistory[index] = updatedResult;
            return saveHistoryToLocalStorage(newHistory);
        }
        return allHistory; // Return original if not found
    });
  }, []);

  return [history, addResult, updateResult];
};