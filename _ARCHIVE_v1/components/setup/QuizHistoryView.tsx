

import React from 'react';
import { StudySet, QuizResult } from '../../types';

interface QuizHistoryViewProps {
    activeSet: StudySet;
    history: QuizResult[];
    onBack: () => void;
    onReviewHistory: (result: QuizResult) => void;
}

const QuizHistoryView: React.FC<QuizHistoryViewProps> = ({ activeSet, history, onBack, onReviewHistory }) => {
    return (
        <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Quiz History</h1>
            <p className="text-text-secondary mb-8 text-center">For "{activeSet.name}"</p>

            <div className="flex-grow">
                {history.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-surface-dark rounded-xl h-full flex flex-col justify-center">
                        <h2 className="text-2xl font-semibold text-text-primary mb-2">No History Yet</h2>
                        <p className="text-text-secondary mb-6">Complete a quiz for this set to see your history here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((result) => (
                            <div key={result.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div><p className="font-bold text-text-primary">{new Date(result.date).toLocaleString()}</p><p className="text-sm text-text-secondary">Mode: {result.mode}</p></div>
                                <div className="flex items-center gap-6">
                                    <div><p className="text-xs text-text-secondary">Score</p><p className="font-bold text-xl text-brand-primary">{result.score}</p></div>
                                    <div><p className="text-xs text-text-secondary">Accuracy</p><p className="font-bold text-xl text-brand-primary">{result.accuracy}%</p></div>
                                    <button onClick={() => onReviewHistory(result)} className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-all">Review</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-8 flex justify-center flex-shrink-0">
                <button onClick={onBack} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">Back to Study Sets</button>
            </div>
        </div>
    );
};

export default QuizHistoryView;
