
import React from 'react';
import { WebSource, AnswerLog } from '../types';

interface ResultsScreenProps {
  score: number;
  answerLog: AnswerLog[];
  onRestart: () => void;
  onReview: () => void;
  webSources?: WebSource[];
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, answerLog, onRestart, onReview, webSources }) => {
  const totalQuestions = answerLog.length;
  const correctAnswers = answerLog.filter(log => log.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  
  let feedbackMessage = "";
  let feedbackEmoji = "";
  if (accuracy >= 90) {
    feedbackMessage = "Excellent work! You've mastered this material.";
    feedbackEmoji = "🚀";
  } else if (accuracy >= 70) {
    feedbackMessage = "Great job! You have a solid understanding of the topic.";
    feedbackEmoji = "👍";
  } else if (accuracy >= 50) {
    feedbackMessage = "Good effort! A little more review could really help.";
    feedbackEmoji = "💪";
  } else {
    feedbackMessage = "You've made a start! Keep reviewing and you'll improve.";
    feedbackEmoji = "🌱";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center animate-fade-in py-8">
      <div className="bg-surface-dark p-8 sm:p-12 rounded-2xl shadow-2xl w-full max-w-md mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">Session Complete!</h1>
        <p className="text-lg text-text-secondary mb-8">Here's how you did:</p>
        
        <div className="mb-6">
            <div className="flex justify-around items-baseline gap-4">
                <div>
                    <p className="text-xl text-text-secondary">Your Score</p>
                    <p className="text-6xl sm:text-7xl font-bold text-brand-primary my-2">{score}</p>
                </div>
                <div>
                    <p className="text-xl text-text-secondary">Accuracy</p>
                    <p className="text-6xl sm:text-7xl font-bold text-brand-primary my-2">{accuracy}%</p>
                </div>
            </div>
        </div>
        
        <p className="text-xl text-text-primary mb-10">{feedbackMessage} {feedbackEmoji}</p>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={onReview}
            className="w-full px-8 py-4 bg-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-primary transition-all duration-300 transform hover:scale-105"
          >
            Review Answers
          </button>
          <button
            onClick={onRestart}
            className="w-full px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105"
          >
            Create New Quiz
          </button>
        </div>
      </div>
      
      {webSources && webSources.length > 0 && (
        <div className="w-full max-w-md bg-surface-dark p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold text-text-primary mb-4">Sources from the Web</h3>
            <ul className="space-y-2 text-left">
                {webSources.map((source, index) => (
                    <li key={index} className="truncate">
                        <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-primary hover:underline"
                            title={source.title}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                            {source.title || source.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default ResultsScreen;
