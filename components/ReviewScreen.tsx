
import React, { useState } from 'react';
import { AnswerLog, QuestionType, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, OpenEndedAnswer, WebSource, PersonalizedFeedback } from '../types';
import Markdown from './common/Markdown';
import { extractAnswerForQuestion } from '../utils/textUtils';
import LoadingSpinner from './common/LoadingSpinner';
// import { generateVisualAid } from '../services/geminiService'; // This is no longer called directly.
import ImageModal from './common/ImageModal';


interface ReviewCardProps {
  log: AnswerLog;
  index: number;
  parsedAnswerText?: string | null;
  isExamReview?: boolean;
  webSources?: WebSource[];
  onVisualize: (concept: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ log, index, parsedAnswerText, isExamReview, webSources, onVisualize }) => {
  const { question, userAnswer, isCorrect, pointsAwarded, maxPoints, aiFeedback, examFeedback } = log;
  
  const getStatus = () => {
    if (pointsAwarded === maxPoints) return 'correct';
    if (pointsAwarded > 0) return 'partial';
    return 'incorrect';
  };
  const status = getStatus();

  const StatusIcon = () => {
      switch (status) {
          case 'correct':
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-correct" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
          case 'partial':
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 13a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
          case 'incorrect':
          default:
              return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-incorrect" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      }
  };

  const getStatusColor = () => {
      switch(status) {
        case 'correct': return 'text-correct';
        case 'partial': return 'text-yellow-400';
        default: return 'text-incorrect';
      }
  }

  const renderUserAnswer = () => {
    if (userAnswer === null) return <span className="text-incorrect font-bold">Not answered</span>;

    const answerStyle = `font-bold ${getStatusColor()}`;

    switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            const mc = question as MultipleChoiceQuestion;
            const mcAnswer = typeof userAnswer === 'number' ? mc.options[userAnswer] : 'Invalid Answer';
            return <span className={answerStyle}>{mcAnswer}</span>;
        case QuestionType.TRUE_FALSE:
            return <span className={answerStyle}>{userAnswer ? 'True' : 'False'}</span>;
        case QuestionType.FILL_IN_THE_BLANK:
            const answers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            const answerText = answers.map(a => `"${a as string}"`).join(', ');
            return <span className={answerStyle}>{answerText}</span>;
        case QuestionType.OPEN_ENDED:
            if (parsedAnswerText) {
                return <div className="bg-gray-900 p-3 rounded-md whitespace-pre-wrap">{parsedAnswerText}</div>;
            }
            if (isExamReview) {
                return <p className="text-gray-500 italic">See full submission above.</p>;
            }
            return <p className="bg-gray-900 p-3 rounded-md whitespace-pre-wrap">{(userAnswer as OpenEndedAnswer).text}</p>;
        default:
            return <span className="font-bold">N/A</span>;
    }
  };

  const renderCorrectAnswer = () => {
    if (isCorrect) return null;
    let correctAnswerText = '';
    switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            correctAnswerText = (question as MultipleChoiceQuestion).options[(question as MultipleChoiceQuestion).correctAnswerIndex];
            break;
        case QuestionType.TRUE_FALSE:
            correctAnswerText = (question as TrueFalseQuestion).correctAnswer ? 'True' : 'False';
            break;
        case QuestionType.FILL_IN_THE_BLANK:
            correctAnswerText = (question as FillInTheBlankQuestion).correctAnswers.map(a => `"${a}"`).join(', ');
            break;
        default:
            return null;
    }
    return <p>Correct Answer: <span className="font-bold text-correct">{correctAnswerText}</span></p>;
  };

  return (
    <div className="bg-surface-dark p-6 rounded-xl border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <p className="text-text-secondary font-semibold">Question {index + 1}</p>
        <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${getStatusColor()}`}>
                {pointsAwarded}/{maxPoints} pts
            </span>
            <StatusIcon />
        </div>
      </div>
      <Markdown content={question.questionText} className="prose prose-invert max-w-none text-text-primary mb-4" />
      
      <div className="space-y-3 text-text-secondary">
        <div className="border-t border-gray-700 pt-3">
            <p className="font-bold text-sm text-gray-400 mb-1">YOUR ANSWER</p>
            {renderUserAnswer()}
        </div>
        
        {renderCorrectAnswer()}

        {(examFeedback || aiFeedback) && (
             <div className="border-t border-gray-700 pt-3">
                <p className="font-bold text-sm text-gray-400 mb-1">AI FEEDBACK</p>
                <Markdown content={examFeedback || aiFeedback || ''} webSources={webSources} className="prose prose-invert max-w-none text-text-secondary italic" />
            </div>
        )}
        
        <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-sm text-gray-400">
                    {question.questionType === QuestionType.OPEN_ENDED ? "GRADING RUBRIC" : "EXPLANATION"}
                </p>
                <button
                    onClick={() => onVisualize(question.explanation)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-brand-primary bg-brand-primary/10 rounded-md border border-brand-primary/30 hover:bg-brand-primary/20 transition-colors"
                    aria-label="Visualize concept"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Visualize
                </button>
            </div>
            <Markdown content={question.explanation} webSources={webSources} className="prose prose-invert max-w-none text-text-secondary" />
        </div>
      </div>
    </div>
  );
};

// This component is copied from ResultsScreen to be used here without creating a new file.
interface PersonalizedFeedbackReportProps {
    feedback: PersonalizedFeedback | null;
    isGeneratingFeedback: boolean;
    onStartFocusedQuiz: (weaknessTopics: PersonalizedFeedback['weaknessTopics']) => void;
}

const PersonalizedFeedbackReport: React.FC<PersonalizedFeedbackReportProps> = ({ feedback, isGeneratingFeedback, onStartFocusedQuiz }) => {
    if (isGeneratingFeedback) {
        return (
            <div className="w-full max-w-md lg:max-w-3xl bg-surface-dark p-6 rounded-2xl shadow-2xl">
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
        <div className="w-full max-w-md lg:max-w-3xl bg-surface-dark p-6 sm:p-8 rounded-2xl shadow-2xl text-left animate-fade-in">
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
                        {narrowPasses.map(({ questionText, userAnswerText, comment }, index) => (
                            <li key={index} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-semibold text-text-primary truncate" title={questionText}>Q: {questionText}</p>
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


interface ReviewScreenProps {
  answerLog: AnswerLog[];
  webSources?: WebSource[];
  onRetakeSameQuiz: () => void;
  onStartNewQuiz: () => void;
  feedback: PersonalizedFeedback | null;
  isGeneratingFeedback: boolean;
  onStartFocusedQuiz: (weaknessTopics: PersonalizedFeedback['weaknessTopics']) => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({ answerLog, webSources, onRetakeSameQuiz, onStartNewQuiz, feedback, isGeneratingFeedback, onStartFocusedQuiz }) => {
  const isExamReview = answerLog.some(log => log.question.questionType === QuestionType.OPEN_ENDED);
  
  let parsedAnswers: (string | null)[] | null = null;
  let fullAnswerText: string | null = null;
  let submittedImages: OpenEndedAnswer['images'] = [];

  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visError, setVisError] = useState<string | null>(null);
  const [visModalData, setVisModalData] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    imagePrompt: string | null;
    conceptText: string | null;
    mode: 'visualize' | 'coming_soon';
  }>({ isOpen: false, imageUrl: null, imagePrompt: null, conceptText: null, mode: 'visualize' });

  const handleVisualize = (concept: string) => {
    setVisModalData({
      isOpen: true,
      imageUrl: null,
      imagePrompt: null,
      conceptText: concept,
      mode: 'coming_soon',
    });
    setIsVisualizing(false);
    setVisError(null);
  };
  
  const handleCloseVisModal = () => {
    setVisModalData({ isOpen: false, imageUrl: null, imagePrompt: null, conceptText: null, mode: 'visualize' });
    setIsVisualizing(false);
    setVisError(null);
  };


  if (isExamReview && answerLog.length > 0) {
      const firstOpenEndedLog = answerLog.find(log => log.question.questionType === QuestionType.OPEN_ENDED);
      if (firstOpenEndedLog) {
          const openEndedAnswer = firstOpenEndedLog.userAnswer as OpenEndedAnswer;
          fullAnswerText = openEndedAnswer.text;
          submittedImages = openEndedAnswer.images;
          
          const tempParsed = answerLog.map((log, index) => {
              if (log.question.questionType === QuestionType.OPEN_ENDED && fullAnswerText) {
                  return extractAnswerForQuestion(fullAnswerText, index + 1, answerLog.length);
              }
              return null; // Not an open-ended question we need to parse
          });
          
          if (!tempParsed.every(p => p === null)) {
              parsedAnswers = tempParsed;
          }
      }
  }

  return (
    <div className="animate-fade-in pb-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-8">Quiz Review</h1>
      
      {isExamReview && (
          <div className="mb-8">
              <h2 className="text-2xl font-bold text-text-primary text-center mb-4">Your Submitted Answers</h2>
              {parsedAnswers === null && fullAnswerText && (
                 <div className="bg-surface-dark p-6 rounded-xl border border-gray-700">
                     <p className="font-bold text-sm text-gray-400 mb-2">FULL SUBMISSION (COULD NOT PARSE INDIVIDUAL ANSWERS)</p>
                     <div className="prose prose-invert max-w-none text-text-primary whitespace-pre-wrap">{fullAnswerText}</div>
                 </div>
              )}
              {submittedImages && submittedImages.length > 0 && (
                  <div className="bg-surface-dark p-6 rounded-xl border border-gray-700 mt-4">
                     <p className="font-bold text-sm text-gray-400 mb-4">SUBMITTED IMAGES</p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {submittedImages.map((img, i) => (
                            <a href={`data:${img.mimeType};base64,${img.data}`} target="_blank" rel="noopener noreferrer" key={i}>
                                <img src={`data:${img.mimeType};base64,${img.data}`} alt={`Submitted image ${i+1}`} className="rounded-md object-cover w-full h-full aspect-square hover:opacity-80 transition-opacity" />
                            </a>
                        ))}
                     </div>
                  </div>
              )}
          </div>
      )}

      <div className="space-y-4 mb-8">
        {answerLog.map((log, index) => (
          <ReviewCard 
            key={index} 
            log={log} 
            index={index}
            parsedAnswerText={parsedAnswers ? parsedAnswers[index] : null}
            isExamReview={isExamReview}
            webSources={webSources}
            onVisualize={handleVisualize}
          />
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center justify-center gap-8 py-8">
        {(isGeneratingFeedback || feedback) && (
            <PersonalizedFeedbackReport 
                feedback={feedback} 
                isGeneratingFeedback={isGeneratingFeedback} 
                onStartFocusedQuiz={onStartFocusedQuiz} 
            />
        )}
        
        <div className="w-full max-w-md border-t border-gray-700 pt-8">
            <h3 className="text-xl font-bold text-center text-text-primary mb-4">More Options</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={onRetakeSameQuiz} className="w-full sm:w-auto px-8 py-4 bg-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-primary transition-all">Retake This Quiz</button>
                <button onClick={onStartNewQuiz} className="w-full sm:w-auto px-8 py-4 bg-gray-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-gray-500 transition-all">Back to Study Sets</button>
            </div>
             <p className="text-xs text-text-secondary text-center mt-4">"Retake" uses the same questions. "Back to Study Sets" takes you to the main menu.</p>
        </div>
      </div>
      <ImageModal 
        isOpen={visModalData.isOpen}
        onClose={handleCloseVisModal}
        isLoading={isVisualizing}
        error={visError}
        imageUrl={visModalData.imageUrl}
        imagePrompt={visModalData.imagePrompt}
        conceptText={visModalData.conceptText}
        mode={visModalData.mode}
      />
    </div>
  );
};

export default ReviewScreen;
