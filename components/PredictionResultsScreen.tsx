import React from 'react';
import { PredictedQuestion } from '../types';
import { markdownToHtml } from '../utils/textUtils';

interface PredictionResultsScreenProps {
  results: PredictedQuestion[];
  onBack: () => void;
}

const PredictionResultsScreen: React.FC<PredictionResultsScreenProps> = ({ results, onBack }) => {
  return (
    <div className="animate-fade-in w-full max-w-3xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-2">Exam Prediction Results</h1>
      <p className="text-text-secondary text-center mb-8">The AI has analyzed your materials and generated these likely exam questions.</p>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((item, index) => (
            <div key={index} className="bg-surface-dark p-6 rounded-xl border border-gray-700">
              <p className="text-sm font-bold text-brand-primary mb-1">PREDICTED QUESTION {index + 1}</p>
              <h2
                className="text-xl font-semibold text-text-primary mb-3 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(item.questionText) }}
              />

              <div className="border-t border-gray-600 pt-3 space-y-3">
                 <div>
                    <h3 className="text-sm font-bold text-text-secondary">Topic</h3>
                    <p className="text-text-secondary">{item.topic}</p>
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-text-secondary">AI's Reasoning</h3>
                    <p className="text-text-secondary">{item.reasoning}</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-surface-dark rounded-xl">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">No Predictions Generated</h2>
          <p className="text-text-secondary">The AI was unable to generate predictions from the provided materials. Please try again with more detailed content.</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button onClick={onBack} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">
          Back to Study Sets
        </button>
      </div>
    </div>
  );
};

export default PredictionResultsScreen;
