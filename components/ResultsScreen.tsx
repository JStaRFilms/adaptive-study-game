
import React from 'react';
import { WebSource, AnswerLog, PersonalizedFeedback } from '../types';
import LoadingSpinner from './common/LoadingSpinner';

interface ResultsScreenProps {
  score: number;
  answerLog: AnswerLog[];
  onRestart: () => void;
  onReview: () => void;
  webSources?: WebSource[];
  feedback: PersonalizedFeedback | null;
  isGeneratingFeedback: boolean;
  onStartFocusedQuiz: (weaknessTopics: PersonalizedFeedback['weaknessTopics']) => void;
}

interface PersonalizedFeedbackReportProps {
    feedback: PersonalizedFeedback | null;
    isGeneratingFeedback: boolean;
    onStartFocusedQuiz: (weaknessTopics: PersonalizedFeedback['weaknessTopics']) => void;
}

const PersonalizedFeedbackReport: React.FC<PersonalizedFeedbackReportProps> = ({ feedback, isGeneratingFeedback, onStartFocusedQuiz }) => {
    if (isGeneratingFeedback) {
        return (
            <div className="w-full max-w-md lg:max-w-3xl bg-surface-dark p-6 rounded-2xl shadow-2xl mt-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <LoadingSpinner />
                    <h3 className="text-xl font-bold text-text-primary mt-4">AI Coach Analyzing...</h3>
                    <p className="text-text-secondary mt-1">Generating your personalized study feedback.</p>
                </div>
            </div>
        );
    }
    
    if (!feedback) {
        return null;
    }
    
    const { overallSummary, strengthTopics, weaknessTopics, narrowPasses, recommendation } = feedback;

    const handleCreateQuizClick = () => {
        if (weaknessTopics.length > 0) {
            onStartFocusedQuiz(weaknessTopics);
        }
    };

    return (
        <div className="w-full max-w-md lg:max-w-3xl bg-surface-dark p-6 sm:p-8 rounded-2xl shadow-2xl mt-8 text-left animate-fade-in">
            <h2 className="text-2xl font-bold text-text-primary mb-4 text-center">AI Study Coach Feedback</h2>
            <p className="text-center text-text-secondary italic mb-6">"{overallSummary}"</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
                {strengthTopics.length > 0 && (
                    <div>
                        <h3 className="font-bold text-correct flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Your Strengths
                        </h3>
                        <ul className="space-y-2 pl-4">
                            {strengthTopics.map(({ topic, comment }) => (
                                <li key={topic} className="bg-gray-900/50 p-3 rounded-md">
                                    <p className="font-semibold text-text-primary">{topic}</p>
                                    <p className="text-sm text-text-secondary">{comment}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {weaknessTopics.length > 0 && (
                    <div>
                        <h3 className="font-bold text-yellow-400 flex items-center gap-2 mb-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            Areas to Improve
                        </h3>
                        <ul className="space-y-2 pl-4">
                            {weaknessTopics.map(({ topic, comment, youtubeSearchQuery }) => (
                                <li key={topic} className="bg-gray-900/50 p-3 rounded-md">
                                    <p className="font-semibold text-text-primary">{topic}</p>
                                    <p className="text-sm text-text-secondary">{comment}</p>
                                    <a 
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 mt-2 text-sm text-brand-primary hover:text-brand-secondary font-semibold hover:underline"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                        Watch videos on this topic
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            
            {narrowPasses.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-bold text-orange-400 flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        Close Calls
                    </h3>
                    <ul className="space-y-2 pl-4">
                        {narrowPasses.map(({ topic, questionText, userAnswerText, comment }, index) => (
                            <li key={index} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-semibold text-text-primary">{topic}</p>
                                <p className="text-sm text-text-secondary mt-1 truncate" title={questionText}>Q: {questionText}</p>
                                <p className="text-sm text-text-secondary mt-1">You answered "{userAnswerText}"</p>
                                <p className="text-sm text-orange-300 mt-1 italic">Coach's note: {comment}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
             <div className="border-t border-gray-700 pt-4">
                 <h3 className="font-bold text-brand-primary text-center mb-2">Next Steps</h3>
                 <p className="text-center text-text-primary mb-6">{recommendation}</p>
                 
                 {weaknessTopics.length > 0 && (
                    <div className="text-center mb-4">
                        <button
                            onClick={handleCreateQuizClick}
                            className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all transform hover:scale-105 animate-pulse-glow"
                            style={{ animationIterationCount: 3 }}
                        >
                            Create Focused Practice Quiz
                        </button>
                    </div>
                 )}

                 <p className="text-xs text-text-secondary text-center mt-3">You can also create a new, custom quiz by going back to your study sets.</p>
             </div>
        </div>
    );
};


const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, answerLog, onRestart, onReview, webSources, feedback, isGeneratingFeedback, onStartFocusedQuiz }) => {
  const totalPointsAwarded = answerLog.reduce((sum, log) => sum + log.pointsAwarded, 0);
  const totalMaxPoints = answerLog.reduce((sum, log) => sum + log.maxPoints, 0);
  const accuracy = totalMaxPoints > 0 ? Math.round((totalPointsAwarded / totalMaxPoints) * 100) : 0;
  
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
            Back to Study Sets
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

      {(isGeneratingFeedback || feedback) && (
        <PersonalizedFeedbackReport 
            feedback={feedback} 
            isGeneratingFeedback={isGeneratingFeedback} 
            onStartFocusedQuiz={onStartFocusedQuiz} 
        />
      )}
    </div>
  );
};

export default ResultsScreen;
