import { useState, useEffect, useCallback } from 'react';
import { PredictionResult, PredictedQuestion } from '../types';
import { getAll, put } from '../utils/db';

const STORE_NAME = 'predictions';

export const usePredictions = (): [
  PredictionResult[],
  (studySetId: string, results: PredictedQuestion[]) => Promise<void>,
] => {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);

  const refreshPredictions = useCallback(async () => {
    try {
        const storedPredictions = await getAll(STORE_NAME);
        const sorted = storedPredictions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setPredictions(sorted);
    } catch (error) {
        console.error("Failed to load predictions from IndexedDB:", error);
        setPredictions([]);
    }
  }, []);

  useEffect(() => {
    refreshPredictions();
  }, [refreshPredictions]);

  const addOrUpdatePrediction = useCallback(async (studySetId: string, results: PredictedQuestion[]) => {
    const allPredictions = await getAll(STORE_NAME);
    const existing = allPredictions.find(p => p.studySetId === studySetId);
    const now = new Date().toISOString();
    
    const prediction: PredictionResult = {
        id: existing?.id || studySetId,
        studySetId: studySetId,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        results: results,
    };
    
    await put(STORE_NAME, prediction);
    await refreshPredictions();
  }, [refreshPredictions]);

  return [predictions, addOrUpdatePrediction];
};
