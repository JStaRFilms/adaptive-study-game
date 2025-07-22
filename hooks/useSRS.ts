import { useState, useEffect, useCallback } from 'react';
import { SRSItem, Question } from '../types';

const STORAGE_KEY = 'adaptive-study-game-srs';
// SRS stages in days. Stage 0 is "learning" (review within the day), then 1 day, 3 days, etc.
const srsIntervalsDays = [0, 1, 3, 7, 14, 30, 60, 120];

const createId = (question: Question): string => {
    // Simple ID for now. A hash would be more robust.
    if (!question.studySetId) return '';
    return `${question.studySetId}:${question.questionText}`;
};

export const useSRS = (): [
  SRSItem[],
  (question: Question, isCorrect: boolean) => void,
  () => SRSItem[],
] => {
  const [srsItems, setSrsItems] = useState<SRSItem[]>([]);

  useEffect(() => {
    try {
      const storedSrs = localStorage.getItem(STORAGE_KEY);
      if (storedSrs) {
        setSrsItems(JSON.parse(storedSrs));
      }
    } catch (error) {
      console.error("Failed to load SRS items from local storage:", error);
      setSrsItems([]);
    }
  }, []);

  const saveSrsItems = (items: SRSItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setSrsItems(items);
    } catch (error) {
      console.error("Failed to save SRS items to local storage:", error);
    }
  };

  const updateSRSItem = useCallback((question: Question, isCorrect: boolean) => {
    if (!question.studySetId) {
        // Can't track items without a study set ID.
        return;
    }

    const itemId = createId(question);
    if (!itemId) return;

    const now = new Date();
    const itemsCopy = [...srsItems];
    const itemIndex = itemsCopy.findIndex(item => item.id === itemId);

    let currentItem = itemIndex > -1 ? itemsCopy[itemIndex] : null;

    if (isCorrect) {
        if (currentItem) {
            // Item exists, advance its stage
            const newStage = Math.min(currentItem.srsStage + 1, srsIntervalsDays.length - 1);
            currentItem.srsStage = newStage;
            const interval = srsIntervalsDays[newStage];
            now.setDate(now.getDate() + interval);
            currentItem.nextReviewDate = now.toISOString();
            currentItem.lastReviewedDate = new Date().toISOString();
        } else {
            // New item, answered correctly on first try. Schedule for tomorrow.
            const newStage = 1;
            now.setDate(now.getDate() + srsIntervalsDays[newStage]);
            const newItem: SRSItem = {
                id: itemId,
                studySetId: question.studySetId,
                question,
                srsStage: newStage,
                nextReviewDate: now.toISOString(),
                lastReviewedDate: new Date().toISOString(),
            };
            itemsCopy.push(newItem);
        }
    } else { // Incorrect
        if (currentItem) {
            // Item exists, demote its stage
            const newStage = Math.max(0, currentItem.srsStage - 2);
            currentItem.srsStage = newStage;
            const interval = srsIntervalsDays[newStage];
            now.setDate(now.getDate() + interval);
            currentItem.nextReviewDate = now.toISOString();
            currentItem.lastReviewedDate = new Date().toISOString();
        } else {
            // New item, answered incorrectly. Add to learning stage.
            const newStage = 0;
            const interval = srsIntervalsDays[newStage];
            now.setDate(now.getDate() + interval);
            const newItem: SRSItem = {
                id: itemId,
                studySetId: question.studySetId,
                question,
                srsStage: newStage,
                nextReviewDate: now.toISOString(),
                lastReviewedDate: new Date().toISOString(),
            };
            itemsCopy.push(newItem);
        }
    }

    saveSrsItems(itemsCopy);
  }, [srsItems]);

  const getReviewPool = useCallback((): SRSItem[] => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Consider all of today
    return srsItems.filter(item => {
        try {
            const reviewDate = new Date(item.nextReviewDate);
            return reviewDate <= today;
        } catch(e) {
            return false;
        }
    });
  }, [srsItems]);

  return [srsItems, updateSRSItem, getReviewPool];
};
