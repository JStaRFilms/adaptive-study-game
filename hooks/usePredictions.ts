import { useState, useEffect, useCallback } from 'react';
import { PredictionResult, PredictedQuestion } from '../types';

const STORAGE_KEY = 'adaptive-study-game-predictions';

export const usePredictions = (): [
  PredictionResult[],
  (studySetId: string, results: PredictedQuestion[]) => void,
] => {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);

  useEffect(() => {
    try {
      const storedPredictions = localStorage.getItem(STORAGE_KEY);
      if (storedPredictions) {
        setPredictions(JSON.parse(storedPredictions));
      }
    } catch (error) {
      console.error("Failed to load predictions from local storage:", error);
      setPredictions([]);
    }
  }, []);

  const savePredictions = (preds: PredictionResult[]) => {
    try {
      // Sort by updatedAt descending
      const sorted = preds.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      setPredictions(sorted);
    } catch (error) {
      console.error("Failed to save predictions to local storage:", error);
    }
  };

  const addOrUpdatePrediction = useCallback((studySetId: string, results: PredictedQuestion[]) => {
    const existingPredictionIndex = predictions.findIndex(p => p.studySetId === studySetId);
    const now = new Date().toISOString();
    
    let updatedPredictions = [...predictions];

    if (existingPredictionIndex > -1) {
      // Update existing prediction
      const existing = updatedPredictions[existingPredictionIndex];
      existing.results = results;
      existing.updatedAt = now;
    } else {
      // Add new prediction
      const newPrediction: PredictionResult = {
        id: studySetId,
        studySetId: studySetId,
        createdAt: now,
        updatedAt: now,
        results: results,
      };
      updatedPredictions.push(newPrediction);
    }
    
    savePredictions(updatedPredictions);
  }, [predictions]);

  return [predictions, addOrUpdatePrediction];
};
