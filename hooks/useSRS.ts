import { useState, useEffect, useCallback } from 'react';
import { SRSItem, Question } from '../types';
import { getAll, put } from '../utils/db';

const STORE_NAME = 'srsItems';
// SRS stages in days. Stage 0 is "learning" (review within the day), then 1 day, 3 days, etc.
const srsIntervalsDays = [0, 1, 3, 7, 14, 30, 60, 120];

const createId = (question: Question): string => {
    // Simple ID for now. A hash would be more robust.
    if (!question.studySetId) return '';
    return `${question.studySetId}:${question.questionText}`;
};

export const useSRS = (): [
  SRSItem[],
  (question: Question, isCorrect: boolean) => Promise<void>,
  () => SRSItem[],
] => {
  const [srsItems, setSrsItems] = useState<SRSItem[]>([]);

  const refreshSrsItems = useCallback(async () => {
    try {
        const storedSrs = await getAll(STORE_NAME);
        setSrsItems(storedSrs);
    } catch (error) {
        console.error("Failed to load SRS items from IndexedDB:", error);
        setSrsItems([]);
    }
  }, []);

  useEffect(() => {
    refreshSrsItems();
  }, [refreshSrsItems]);

  const updateSRSItem = useCallback(async (question: Question, isCorrect: boolean) => {
    if (!question.studySetId) {
        // Can't track items without a study set ID.
        return;
    }

    const itemId = createId(question);
    if (!itemId) return;

    const allItems = await getAll(STORE_NAME);
    const currentItem = allItems.find(item => item.id === itemId);
    const now = new Date();
    let newItemData: SRSItem;
    
    if (isCorrect) {
        const stage = currentItem ? currentItem.srsStage + 1 : 1;
        const newStage = Math.min(stage, srsIntervalsDays.length - 1);
        now.setDate(now.getDate() + srsIntervalsDays[newStage]);
        newItemData = {
            ...(currentItem || { id: itemId, studySetId: question.studySetId, question, srsStage: 0, lastReviewedDate: '' }),
            srsStage: newStage,
            nextReviewDate: now.toISOString(),
            lastReviewedDate: new Date().toISOString(),
        };
    } else { // Incorrect
        const stage = currentItem ? currentItem.srsStage - 2 : 0;
        const newStage = Math.max(0, stage);
        now.setDate(now.getDate() + srsIntervalsDays[newStage]);
        newItemData = {
             ...(currentItem || { id: itemId, studySetId: question.studySetId, question, srsStage: 0, lastReviewedDate: '' }),
            srsStage: newStage,
            nextReviewDate: now.toISOString(),
            lastReviewedDate: new Date().toISOString(),
        };
    }

    await put(STORE_NAME, newItemData);
    await refreshSrsItems();
  }, [refreshSrsItems]);

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
