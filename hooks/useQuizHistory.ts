import React, { useState, useEffect, useCallback } from 'react';
import { QuizResult } from '../types';

const HISTORY_STORAGE_KEY = 'adaptive-study-game-history';

export const useQuizHistory = (): [
  (newResult: Omit<QuizResult, 'id'>) => void,
  (studySetId: string) => QuizResult[]
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

  const addResult = useCallback((newResult: Omit<QuizResult, 'id'>) => {
    const allHistory = history || [];
    const resultWithId: QuizResult = {
      ...newResult,
      id: new Date().toISOString() + Math.random(),
    };
    saveHistory([...allHistory, resultWithId]);
  }, [history]);

  const getHistoryForSet = useCallback((studySetId: string): QuizResult[] => {
    return history.filter(result => result.studySetId === studySetId);
  }, [history]);

  return [addResult, getHistoryForSet];
};