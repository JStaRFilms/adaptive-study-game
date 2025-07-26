

import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, Question, QuestionType, StudyMode, FillInTheBlankQuestion, AnswerLog, UserAnswer, QuizConfig } from '../types';
import ProgressBar from './common/ProgressBar';
import TimerBar from './common/TimerBar';
import Markdown from './common/Markdown';
import Modal from './common/Modal';
import Tooltip from './common/Tooltip';
import { validateFillInTheBlankAnswer } from '../services/geminiService';

interface StudyScreenProps {
  quiz: Quiz;
  onFinish: (finalScore: number, log: AnswerLog[]) => void;
  onQuit: () => void;
  mode: StudyMode;
  updateSRSItem: (question: Question, isCorrect: boolean) => Promise<void>;
  quizConfig: QuizConfig | null;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'partial';

const QUESTION_TIME_LIMIT = 20; // 20 seconds per question
const FIB_TIME_LIMIT = 35; // Extra time for typing
const SPEED_BONUS_THRESHOLD = 15; // Answer with >= 15s left for bonus
const SPEED_BONUS_POINTS = 5;
const BASE_POINTS = 10;
const STREAK_BONUS_MULTIPLIER = 2;

const StudyScreen = ({ quiz, onFinish, onQuit, mode, updateSRSItem, quizConfig }: StudyScreenProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>([]);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [bonusPointsAwarded, setBonusPointsAwarded] = useState(0);
  const [answerExplanation, setAnswerExplanation] = useState<string | null>(null);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const isReviewMode = mode === StudyMode.REVIEW;
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const timeLimitForCurrentQuestion = currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK ? FIB_TIME_LIMIT : QUESTION_TIME_LIMIT;

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onFinish(score, answerLog);
    }
  }, [currentQuestionIndex, totalQuestions, onFinish, score, answerLog]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const processAnswer = useCallback(async (
    pointsDetails: { awarded: number; max: number; comment?: string },
    userAnswer: UserAnswer
  ) => {
    if (answerStatus !== 'unanswered') return;

    const { awarded, max, comment } = pointsDetails;
    const isFullyCorrect = awarded === max;

    if (mode === StudyMode.PRACTICE || mode === StudyMode.SRS) {
        await updateSRSItem(currentQuestion, isFullyCorrect);
    }
    
    const isPartiallyCorrect = awarded > 0 && awarded < max;

    setAnswerLog(prevLog => [...prevLog, {
      question: currentQuestion,
      userAnswer,
      isCorrect: isFullyCorrect,
      pointsAwarded: awarded,
      maxPoints: max,
      aiFeedback: comment,
    }]);

    setAnswerExplanation(currentQuestion.explanation);
    setCorrectionFeedback(comment || null);

    if (isFullyCorrect || isPartiallyCorrect) {
      const streakBonus = isFullyCorrect ? (streak * STREAK_BONUS_MULTIPLIER) : 0;
      let currentSpeedBonus = 0;
      if (!isReviewMode && timeLeft >= SPEED_BONUS_THRESHOLD && isFullyCorrect) {
        currentSpeedBonus = SPEED_BONUS_POINTS;
        setBonusPointsAwarded(currentSpeedBonus);
      }
      setScore(s => s + awarded + streakBonus + currentSpeedBonus);
      setStreak(s => isFullyCorrect ? s + 1 : 0);
      setAnswerStatus(isFullyCorrect ? 'correct' : 'partial');
    } else {
      setStreak(0);
      setAnswerStatus('incorrect');
    }
  }, [answerStatus, streak, timeLeft, isReviewMode, currentQuestion, mode, updateSRSItem]);

    useEffect(() => {
        const logEntry = answerLog.find(log => log.question === quiz.questions[currentQuestionIndex]);

        if (logEntry) {
            const { pointsAwarded, maxPoints, aiFeedback } = logEntry;
            if (pointsAwarded === maxPoints) setAnswerStatus('correct');
            else if (pointsAwarded > 0) setAnswerStatus('partial');
            else setAnswerStatus('incorrect');

            setAnswerExplanation(logEntry.question.explanation);
            setTimeLeft(0);
            setBonusPointsAwarded(0); // Don't show bonus again on review
            setCorrectionFeedback(aiFeedback || null);
            setIsTimedOut(false);

            if (logEntry.question.questionType === QuestionType.MULTIPLE_CHOICE) {
                setSelectedOptionIndex(logEntry.userAnswer as number | null);
                setFillBlankAnswers([]);
            } else if (logEntry.question.questionType === QuestionType.FILL_IN_THE_BLANK) {
                setFillBlankAnswers(logEntry.userAnswer as string[] || []);
                setSelectedOptionIndex(null);
            } else { // True/False
                setSelectedOptionIndex(null);
                setFillBlankAnswers([]);
            }
        } else {
            // Reset for a new question
            setTimeLeft(timeLimitForCurrentQuestion);
            setBonusPointsAwarded(0);
            setAnswerStatus('unanswered');
            setIsTimedOut(false);
            setSelectedOptionIndex(null);
            setAnswerExplanation(null);
            setCorrectionFeedback(null);
            if (currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
                 const numBlanks = (currentQuestion as FillInTheBlankQuestion).correctAnswers.length;
                 setFillBlankAnswers(Array(numBlanks).fill(''));
            } else {
                 setFillBlankAnswers([]);
            }
        }
    }, [currentQuestionIndex, currentQuestion, answerLog, quiz.questions, timeLimitForCurrentQuestion]);


  useEffect(() => {
    if (isReviewMode || answerStatus !== 'unanswered') return;
    if (timeLeft <= 0) {
      setIsTimedOut(true);
      const handleTimeout = async () => {
        let maxPts = BASE_POINTS;
        if(currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK){
            maxPts = (currentQuestion as FillInTheBlankQuestion).correctAnswers.length * BASE_POINTS;
        }
        await processAnswer({ awarded: 0, max: maxPts }, null); 
      };
      handleTimeout();
      return;
    }
    const countdownTimer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(countdownTimer);
  }, [answerStatus, timeLeft, isReviewMode, processAnswer, currentQuestion]);

  const handleMcSubmit = async () => {
    if (selectedOptionIndex === null || currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE) return;
    const isCorrect = selectedOptionIndex === currentQuestion.correctAnswerIndex;
    await processAnswer({ awarded: isCorrect ? BASE_POINTS : 0, max: BASE_POINTS }, selectedOptionIndex);
  };
  
  const handleTfSubmit = async (answer: boolean) => {
    if (currentQuestion.questionType !== QuestionType.TRUE_FALSE) return;
    const isCorrect = answer === currentQuestion.correctAnswer;
    await processAnswer({ awarded: isCorrect ? BASE_POINTS : 0, max: BASE_POINTS }, answer);
  };

  const handleFibSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fillBlankAnswers.every(a => !a.trim()) || currentQuestion.questionType !== QuestionType.FILL_IN_THE_BLANK) return;

    setIsVerifyingAnswer(true);

    const typedQuestion = currentQuestion as FillInTheBlankQuestion;
    const numBlanks = typedQuestion.correctAnswers.length;
    const maxPoints = BASE_POINTS * numBlanks;
    let awardedPoints = 0;
    const comments: string[] = [];

    for (let i = 0; i < numBlanks; i++) {
        const userAnswerStr = fillBlankAnswers[i] || '';
        const userAnswerLower = userAnswerStr.trim().toLowerCase();
        const correctAnswer = typedQuestion.correctAnswers[i].toLowerCase();
        const acceptableAnswers = (typedQuestion.acceptableAnswers?.[i] || []).map(a => a.toLowerCase());

        if (userAnswerLower === correctAnswer || acceptableAnswers.includes(userAnswerLower)) {
            awardedPoints += BASE_POINTS;
        } else if (userAnswerStr.trim()) {
            try {
                const validationResult = await validateFillInTheBlankAnswer(
                    typedQuestion.questionText,
                    typedQuestion.correctAnswers[i],
                    userAnswerStr
                );
                awardedPoints += validationResult.pointsAwarded;
                if (validationResult.pointsAwarded > 0 && validationResult.comment) {
                    comments.push(`Blank #${i + 1}: ${validationResult.comment}`);
                }
            } catch (error) {
                console.error("AI validation failed for a blank:", error);
                comments.push(`AI validation failed for blank #${i + 1}.`);
            }
        }
    }

    await processAnswer({
        awarded: awardedPoints,
        max: maxPoints,
        comment: comments.join(' '),
    }, fillBlankAnswers);

    setIsVerifyingAnswer(false);
  };
  
  const renderAnswerFeedback = () => {
    if (answerStatus === 'unanswered') return null;
    
    let feedbackContent = null;
    switch(currentQuestion.questionType) {
      case QuestionType.FILL_IN_THE_BLANK:
        const fibQuestion = currentQuestion as FillInTheBlankQuestion;
        const userAnswerText = fillBlankAnswers.map(a => `"${a.trim() || '...'}"`).join(', ');
        const correctAnswersText = fibQuestion.correctAnswers.map(a => `"${a}"`).join(', ');
        feedbackContent = (
            <>
                <p className={`text-lg ${answerStatus !== 'incorrect' ? 'text-text-secondary' : 'text-incorrect'}`}>You answered: {userAnswerText}</p>
                {answerStatus === 'incorrect' && <p className="text-lg font-semibold mt-1">Correct answer(s): <span className="text-correct">{correctAnswersText}</span></p>}
            </>
        );
        break;
      case QuestionType.TRUE_FALSE:
        feedbackContent = answerStatus === 'incorrect' ? <p className="text-lg font-semibold">The correct answer was: <span className={currentQuestion.correctAnswer ? 'text-correct' : 'text-incorrect'}>{currentQuestion.correctAnswer ? 'True' : 'False'}</span></p> : null;
        break;
      case QuestionType.MULTIPLE_CHOICE:
         feedbackContent = answerStatus === 'incorrect' ? <p className="text-lg font-semibold">The correct answer was: <span className="text-correct">{currentQuestion.options[currentQuestion.correctAnswerIndex]}</span></p> : null;
         break;
    }

    return (
      <div className="mt-6 space-y-4 text-center">
        {feedbackContent}
        {answerExplanation && (
          <div className="text-left bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h4 className="font-bold text-text-secondary">Explanation</h4>
            <Markdown content={answerExplanation} webSources={quiz.webSources} className="prose prose-invert max-w-none text-text-secondary" />
          </div>
        )}
      </div>
    );
  }

  const renderQuestionBody = () => {
    const isAnswered = answerStatus !== 'unanswered';
    
    if (currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
        const parts = currentQuestion.questionText.split('___');
        
        return (
             <form onSubmit={isAnswered || isVerifyingAnswer ? (e) => e.preventDefault() : handleFibSubmit} className="flex flex-col items-center gap-4">
                <div className="text-2xl sm:text-3xl font-bold text-text-primary text-center flex flex-wrap items-center justify-center gap-2 leading-relaxed">
                    {parts.map((part, index) => (
                      <React.Fragment key={index}>
                        <Markdown content={part} as="span"/>
                        {index < parts.length - 1 && (
                             <input
                                type="text"
                                value={fillBlankAnswers[index] || ''}
                                onChange={isAnswered || isVerifyingAnswer ? undefined : e => {
                                    const newAnswers = [...fillBlankAnswers];
                                    newAnswers[index] = e.target.value;
                                    setFillBlankAnswers(newAnswers);
                                }}
                                readOnly={isAnswered || isVerifyingAnswer}
                                className="inline-block mx-2 px-2 py-1 text-center bg-gray-900 border-b-2 border-brand-primary focus:outline-none focus:ring-0 text-brand-primary font-bold"
                                autoFocus={!isAnswered && index === 0}
                                aria-label={`Fill in the blank answer ${index + 1}`}
                                size={Math.max(1, fillBlankAnswers[index]?.length || (currentQuestion as FillInTheBlankQuestion).correctAnswers[index].length/2)}
                            />
                        )}
                      </React.Fragment>
                    ))}
                </div>
                {!isAnswered && 
                  <button type="submit" disabled={fillBlankAnswers.every(a => !a.trim()) || isVerifyingAnswer} className="mt-4 px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]">
                      {isVerifyingAnswer && <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                      {isVerifyingAnswer ? 'Verifying...' : 'Submit'}
                  </button>
                }
            </form>
        );
    }
    
    if (isAnswered) {
        if (currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => {
                        const isCorrect = index === currentQuestion.correctAnswerIndex;
                        const isSelected = index === selectedOptionIndex;
                        let style = 'bg-surface-dark opacity-60 cursor-not-allowed';
                        if (isCorrect) style = 'bg-correct/80 ring-2 ring-correct animate-pulse cursor-not-allowed';
                        else if (isSelected) style = 'bg-incorrect/80 ring-2 ring-incorrect cursor-not-allowed';
                        return <button key={index} disabled className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${style}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span><Markdown content={option} as="span" /></button>;
                    })}
                </div>
            );
        }
        return null;
    }

    switch (currentQuestion.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => <button key={index} onClick={() => setSelectedOptionIndex(index)} className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${selectedOptionIndex === index ? 'bg-brand-primary ring-2 ring-white' : 'bg-surface-dark hover:bg-gray-600'}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span><Markdown content={option} as="span" /></button>)}
                </div>
                <div className="mt-6 flex justify-center"><button onClick={handleMcSubmit} disabled={selectedOptionIndex === null} className="px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">Submit</button></div>
              </>
            );
        case QuestionType.TRUE_FALSE:
            return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"><button onClick={() => handleTfSubmit(true)} className="p-6 text-2xl font-bold bg-green-700 hover:bg-green-600 rounded-lg transition-colors">TRUE</button><button onClick={() => handleTfSubmit(false)} className="p-6 text-2xl font-bold bg-red-700 hover:bg-red-600 rounded-lg transition-colors">FALSE</button></div>;
    }
  }

  const renderFeedbackMessage = () => {
    if (answerStatus === 'unanswered') return null;
    if (answerStatus === 'correct') {
        return (
            <div className="text-center">
                <p className="text-2xl font-bold text-correct animate-pulse">Correct! 🎉</p>
                {correctionFeedback && <p className="text-base text-yellow-300 mt-2">{correctionFeedback}</p>}
                {!isReviewMode && bonusPointsAwarded > 0 && <p className="text-lg font-bold text-yellow-400">+{bonusPointsAwarded} Speed Bonus!</p>}
            </div>
        );
    }
    if (answerStatus === 'partial') {
      return (
          <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400 animate-pulse">Partially Correct!</p>
              {correctionFeedback && <p className="text-base text-yellow-300 mt-2">{correctionFeedback}</p>}
          </div>
      );
    }
    if (answerStatus === 'incorrect') {
        return (
            <div className="text-center">
                <p className="text-2xl font-bold text-incorrect">{isTimedOut && !isReviewMode ? "Time's Up! ⌛" : "Incorrect 🙁"}</p>
                 {correctionFeedback && <p className="text-base text-yellow-300 mt-2">{correctionFeedback}</p>}
            </div>
        );
    }
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col animate-fade-in h-full">
      <header className="mb-6">
          <div className="bg-surface-dark p-3 sm:p-4 rounded-xl shadow-lg w-full">
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-x-4 gap-y-2 text-text-secondary font-semibold">
                  {/* Left Side: End Session */}
                  <div className="flex-shrink-0">
                      <button onClick={() => setIsQuitModalOpen(true)} className="font-semibold text-gray-400 hover:text-white transition-colors text-sm">
                          End Session
                      </button>
                  </div>

                  {/* Middle: Score and Streak (full width on mobile, centered) */}
                  <div className="w-full sm:w-auto order-3 sm:order-2 flex-grow flex justify-center items-center gap-x-6 sm:gap-x-6 border-t sm:border-none border-gray-700 pt-3 sm:pt-0">
                      <Tooltip text="Score">
                          <div className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <span className="text-lg text-brand-primary font-bold">{score}</span>
                          </div>
                      </Tooltip>
                      <Tooltip text="Streak">
                          <div className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.312 11.342c-.068.093-.127.19-.182.292-.099.183-.19.37-.275.563-.146.335-.28.688-.403 1.052-.132.387-.247.79-.345 1.206-.05.207-.09.418-.124.632a9.04 9.04 0 0 1-1.423.513c-.32.094-.648.172-.98.228-.313.053-.63.093-.95.12-.323.028-.65.04-.978.04-.33 0-.658-.013-.986-.042-.328-.028-.655-.068-.983-.12-.327-.056-.656-.134-.978-.228a9.04 9.04 0 0 1-1.423-.513c-.034-.214-.074-.425-.124-.632-.098-.416-.213-.819-.345-1.206-.123-.364-.257-.717-.403-1.052-.085-.193-.176-.38-.275-.563C4.19 11.532 4.13 11.435 4.063 11.34c-.458-.636-.713-1.442-.69-2.263.023-.82.325-1.603.856-2.228.38-.44.82-.815 1.29-1.125.47-.31.96-.563 1.46-.75.48-.18.96-.3 1.44-.36.46-.06.9-.09 1.32-.09.42 0 .86.03 1.32.09.48.06.96.18 1.44.36.5.187 1 .44 1.46.75.47.31.91.685 1.29 1.125.53.625.833 1.408.856 2.228.023.821-.233 1.627-.69 2.264Z" clipRule="evenodd" /></svg>
                              <span className="text-lg text-white font-bold">{streak}x</span>
                          </div>
                      </Tooltip>
                      {quizConfig?.customInstructions && (
                          <Tooltip text="Custom instructions active">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                          </Tooltip>
                      )}
                  </div>

                  {/* Right Side: Timer & Q Count */}
                  <div className="flex-shrink-0 order-2 sm:order-3">
                      <div className="flex items-center gap-x-3 sm:gap-x-4">
                          {mode === StudyMode.PRACTICE ? (
                              <span className="text-yellow-400 font-bold text-lg">{timeLeft}s</span>
                          ) : (
                              <span className="text-brand-secondary text-xs font-bold uppercase">{mode === StudyMode.SRS ? "SRS Review" : "Review"}</span>
                          )}
                          <span className="font-mono text-sm bg-gray-900/50 px-2 py-1 rounded-md">
                              {currentQuestionIndex + 1}/{totalQuestions}
                          </span>
                      </div>
                  </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                  {mode === StudyMode.PRACTICE ? (
                      <TimerBar timeLeft={timeLeft} timeLimit={timeLimitForCurrentQuestion} />
                  ) : (
                      <ProgressBar progress={((currentQuestionIndex + 1) / totalQuestions) * 100} />
                  )}
              </div>
          </div>
      </header>
      
      <div className="bg-surface-dark p-6 sm:p-8 rounded-xl shadow-2xl flex flex-col justify-center flex-grow">
        {currentQuestion.questionType !== QuestionType.FILL_IN_THE_BLANK && <Markdown as="h2" content={currentQuestion.questionText} className="text-2xl sm:text-3xl font-bold mb-8 text-text-primary text-center prose" />}
        {renderQuestionBody()}
        {answerStatus !== 'unanswered' && !isVerifyingAnswer && renderAnswerFeedback()}
      </div>
      
      <div className="mt-6 min-h-[8rem] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            {answerStatus !== 'unanswered' && !isVerifyingAnswer && renderFeedbackMessage()}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isReviewMode && currentQuestionIndex > 0 && <button onClick={goToPreviousQuestion} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-md hover:bg-gray-500 transition-all text-lg animate-fade-in">← Previous</button>}
                {answerStatus !== 'unanswered' && !isVerifyingAnswer && <button onClick={goToNextQuestion} className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-md hover:bg-brand-primary transition-all text-lg animate-fade-in">{currentQuestionIndex + 1 < totalQuestions ? 'Next Question →' : 'Finish Quiz'}</button>}
            </div>
        </div>
      </div>
      <Modal isOpen={isQuitModalOpen} onClose={() => setIsQuitModalOpen(false)} title="End Study Session?">
        <div className="text-text-secondary">
          <p>Are you sure you want to end this session? Your progress will not be saved, and you will be returned to the main menu.</p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={() => setIsQuitModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Continue Studying</button>
            <button onClick={onQuit} className="px-4 py-2 bg-incorrect text-white font-bold rounded-lg hover:bg-red-600 transition-colors">End Session</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudyScreen;