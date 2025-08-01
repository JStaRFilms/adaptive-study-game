import { useState, useEffect, useCallback } from 'react';
import { QuizResult } from '../types';
import { getAll, add, put } from '../utils/db';

const STORE_NAME = 'quizHistory';

export const useQuizHistory = (): [
  QuizResult[],
  (newResult: Omit<QuizResult, 'id'>) => Promise<QuizResult>,
  (result: QuizResult) => Promise<void>
] => {
  const [history, setHistory] = useState<QuizResult[]>([]);

  const refreshHistory = useCallback(async () => {
      try {
        const storedHistory = await getAll(STORE_NAME);
        const sortedHistory = storedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(sortedHistory);
      } catch (error) {
        console.error("Failed to load quiz history from IndexedDB:", error);
        setHistory([]);
      }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const addResult = useCallback(async (newResult: Omit<QuizResult, 'id'>): Promise<QuizResult> => {
    const resultWithId: QuizResult = {
      ...newResult,
      id: new Date().toISOString() + Math.random(),
    };
    await add(STORE_NAME, resultWithId);
    await refreshHistory();
    return resultWithId;
  }, [refreshHistory]);
  
  const updateQuizResult = useCallback(async (result: QuizResult): Promise<void> => {
    await put(STORE_NAME, result);
    await refreshHistory();
  }, [refreshHistory]);

  return [history, addResult, updateQuizResult];
};
