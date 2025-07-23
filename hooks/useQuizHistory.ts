
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
  (newResult: Omit<QuizResult, 'id'>) => QuizResult
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

  const addResult = useCallback((newResult: Omit<QuizResult, 'id'>): QuizResult => {
    const resultWithId: QuizResult = {
      ...newResult,
      id: new Date().toISOString() + Math.random(),
    };
    setHistory(currentHistory => {
        const newHistory = [...(currentHistory || []), resultWithId];
        return saveHistoryToLocalStorage(newHistory);
    });
    return resultWithId;
  }, []);

  return [history, addResult];
};
