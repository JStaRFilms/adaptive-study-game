import { useState, useEffect, useCallback } from 'react';
import { QuizResult } from '../types';

const HISTORY_STORAGE_KEY = 'adaptive-study-game-history';

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

  const saveHistory = (newHistory: QuizResult[]) => {
    try {
      const sortedHistory = newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sortedHistory));
      setHistory(sortedHistory);
    } catch (error) {
      console.error("Failed to save quiz history to local storage:", error);
    }
  };

  const addResult = useCallback((newResult: Omit<QuizResult, 'id'>, id?: string): QuizResult => {
    const allHistory = history || [];
    const resultWithId: QuizResult = {
      ...newResult,
      id: id || new Date().toISOString() + Math.random(),
    };
    saveHistory([...allHistory, resultWithId]);
    return resultWithId;
  }, [history]);

  const updateResult = useCallback((updatedResult: QuizResult) => {
    const allHistory = history || [];
    const index = allHistory.findIndex(r => r.id === updatedResult.id);
    if (index > -1) {
        const newHistory = [...allHistory];
        newHistory[index] = updatedResult;
        saveHistory(newHistory);
    }
  }, [history]);

  return [history, addResult, updateResult];
};
