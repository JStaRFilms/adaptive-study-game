import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, Question, QuestionType, StudyMode, FillInTheBlankQuestion, AnswerLog, UserAnswer } from '../types';
import ProgressBar from './common/ProgressBar';
import TimerBar from './common/TimerBar';

interface StudyScreenProps {
  quiz: Quiz;
  onFinish: (finalScore: number, maxPossibleScore: number, log: AnswerLog[]) => void;
  mode: StudyMode;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

const QUESTION_TIME_LIMIT = 20; // 20 seconds per question
const SPEED_BONUS_THRESHOLD = 15; // Answer with >= 15s left for bonus
const SPEED_BONUS_POINTS = 5;
const BASE_POINTS = 10;
const STREAK_BONUS_MULTIPLIER = 2;

const StudyScreen: React.FC<StudyScreenProps> = ({ quiz, onFinish, mode }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [bonusPointsAwarded, setBonusPointsAwarded] = useState(0);
  const [answerExplanation, setAnswerExplanation] = useState<string | null>(null);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);

  const isReviewMode = mode === StudyMode.REVIEW;
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  const calculateMaxScore = useCallback(() => {
    let max = 0;
    for (let i = 0; i < totalQuestions; i++) {
        max += BASE_POINTS; // Base points
        max += i * STREAK_BONUS_MULTIPLIER; // Streak bonus
        if (!isReviewMode) {
            max += SPEED_BONUS_POINTS; // Speed bonus
        }
    }
    return max;
  }, [totalQuestions, isReviewMode]);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onFinish(score, calculateMaxScore(), answerLog);
    }
  }, [currentQuestionIndex, totalQuestions, onFinish, score, calculateMaxScore, answerLog]);

  const processAnswer = useCallback((isCorrect: boolean, userAnswer: UserAnswer) => {
    if (answerStatus !== 'unanswered') return;

    setAnswerLog(prevLog => [...prevLog, { question: currentQuestion, userAnswer, isCorrect }]);
    setAnswerExplanation(currentQuestion.explanation);

    if (isCorrect) {
      const points = BASE_POINTS;
      const streakBonus = streak * STREAK_BONUS_MULTIPLIER;
      let currentSpeedBonus = 0;
      if (!isReviewMode && timeLeft >= SPEED_BONUS_THRESHOLD) {
        currentSpeedBonus = SPEED_BONUS_POINTS;
        setBonusPointsAwarded(currentSpeedBonus);
      }
      setScore(s => s + points + streakBonus + currentSpeedBonus);
      setStreak(s => s + 1);
      setAnswerStatus('correct');
    } else {
      setStreak(0);
      setAnswerStatus('incorrect');
    }
  }, [answerStatus, streak, timeLeft, isReviewMode, currentQuestion]);

  useEffect(() => {
    // Reset state for the new question
    setTimeLeft(QUESTION_TIME_LIMIT);
    setBonusPointsAwarded(0);
    setAnswerStatus('unanswered');
    setSelectedOptionIndex(null);
    setFillBlankAnswer('');
    setAnswerExplanation(null);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (isReviewMode) return;

    if (answerStatus !== 'unanswered') {
      const delay = (timeLeft <= 0 && answerStatus === 'incorrect') ? 3500 : 2500;
      const nextQuestionTimer = setTimeout(goToNextQuestion, delay);
      return () => clearTimeout(nextQuestionTimer);
    }

    if (timeLeft <= 0) {
      processAnswer(false, null); // Log 'null' for timed out unanswered questions
      return;
    }
    
    const countdownTimer = setTimeout(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearTimeout(countdownTimer);
  }, [answerStatus, timeLeft, processAnswer, goToNextQuestion, isReviewMode]);

  const handleMcSubmit = () => {
    if (selectedOptionIndex === null || currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE) return;
    processAnswer(selectedOptionIndex === currentQuestion.correctAnswerIndex, selectedOptionIndex);
  };
  
  const handleTfSubmit = (answer: boolean) => {
    if (currentQuestion.questionType !== QuestionType.TRUE_FALSE) return;
    processAnswer(answer === currentQuestion.correctAnswer, answer);
  };

  const handleFibSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userAnswerStr = fillBlankAnswer.trim();
    if (!userAnswerStr || currentQuestion.questionType !== QuestionType.FILL_IN_THE_BLANK) return;

    const typedQuestion = currentQuestion as FillInTheBlankQuestion;
    const userAnswer = userAnswerStr.toLowerCase();
    const correctAnswer = typedQuestion.correctAnswer.toLowerCase();
    const acceptableAnswers = (typedQuestion.acceptableAnswers || []).map(a => a.toLowerCase());

    const isCorrect = userAnswer === correctAnswer || acceptableAnswers.includes(userAnswer);
    processAnswer(isCorrect, userAnswerStr);
  };
  
  const renderAnswerFeedback = () => {
    if (answerStatus === 'unanswered') return null;
    
    let feedbackContent = null;

    switch(currentQuestion.questionType) {
      case QuestionType.FILL_IN_THE_BLANK:
        const userAnswerText = fillBlankAnswer.trim() ? `"${fillBlankAnswer}"` : "nothing";
        feedbackContent = (
          <>
            <p className={`text-lg ${answerStatus === 'correct' ? 'text-text-secondary' : 'text-incorrect'}`}>You answered: {userAnswerText}</p>
            {answerStatus === 'incorrect' && <p className="text-lg font-semibold mt-1">Correct answer: <span className="text-correct">{currentQuestion.correctAnswer}</span></p>}
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
            <p className="text-text-secondary">{answerExplanation}</p>
          </div>
        )}
      </div>
    );
  }

  const renderQuestionBody = () => {
    const isAnswered = answerStatus !== 'unanswered';
    if (isAnswered) {
        switch (currentQuestion.questionType) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentQuestion.options.map((option, index) => {
                            const isCorrect = index === currentQuestion.correctAnswerIndex;
                            const isSelected = index === selectedOptionIndex;
                            let style = 'bg-surface-dark opacity-60 cursor-not-allowed';
                            if (isCorrect) style = 'bg-correct/80 ring-2 ring-correct animate-pulse cursor-not-allowed';
                            else if (isSelected) style = 'bg-incorrect/80 ring-2 ring-incorrect cursor-not-allowed';
                            
                            return (
                                <button key={index} disabled className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${style}`}>
                                    <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                                    <span dangerouslySetInnerHTML={{ __html: option }} />
                                </button>
                            );
                        })}
                    </div>
                );
            default:
                 // For TF and FIB, the question text remains visible and feedback is shown below.
                 return null;
        }
    }

    switch (currentQuestion.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => (
                    <button key={index} onClick={() => setSelectedOptionIndex(index)} className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${selectedOptionIndex === index ? 'bg-brand-primary ring-2 ring-white' : 'bg-surface-dark hover:bg-gray-600'}`}>
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                      <span dangerouslySetInnerHTML={{ __html: option }} />
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <button onClick={handleMcSubmit} disabled={selectedOptionIndex === null} className="px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none">
                    Submit
                  </button>
                </div>
              </>
            );
        case QuestionType.TRUE_FALSE:
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <button onClick={() => handleTfSubmit(true)} className="p-6 text-2xl font-bold bg-green-700 hover:bg-green-600 rounded-lg transition-colors duration-300">TRUE</button>
                <button onClick={() => handleTfSubmit(false)} className="p-6 text-2xl font-bold bg-red-700 hover:bg-red-600 rounded-lg transition-colors duration-300">FALSE</button>
              </div>
            );
        case QuestionType.FILL_IN_THE_BLANK:
            const [part1, part2] = currentQuestion.questionText.split('___');
            return (
                <form onSubmit={handleFibSubmit} className="flex flex-col items-center gap-4">
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary text-center">
                        {part1}
                        <input type="text" value={fillBlankAnswer} onChange={e => setFillBlankAnswer(e.target.value)} className="mx-2 px-2 py-1 text-center w-48 bg-gray-900 border-b-2 border-brand-primary focus:outline-none focus:ring-0 text-brand-primary font-bold" autoFocus aria-label="Fill in the blank answer"/>
                        {part2}
                    </p>
                    <button type="submit" disabled={!fillBlankAnswer.trim()} className="px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none">
                        Submit
                    </button>
                </form>
            );
    }
  }

  const renderFeedbackMessage = () => {
    if (answerStatus === 'unanswered') return null;

    if (answerStatus === 'correct') {
      return (
        <div className="text-center">
            <p className="text-2xl font-bold text-correct animate-pulse">Correct! 🎉</p>
            {!isReviewMode && bonusPointsAwarded > 0 && <p className="text-lg font-bold text-yellow-400">+{bonusPointsAwarded} Speed Bonus!</p>}
        </div>
      );
    }
    
    if (answerStatus === 'incorrect') {
      return (
        <p className="text-2xl font-bold text-incorrect">
          {timeLeft <= 0 && !isReviewMode ? "Time's Up! ⌛" : "Incorrect 🙁"}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col animate-fade-in">
      <header className="mb-6">
        <div className="grid grid-cols-3 items-center text-text-secondary mb-2">
          <span className="font-bold text-lg">Score: <span className="text-brand-primary">{score}</span></span>
          <div className="flex items-center justify-center gap-2 font-bold text-lg">
             {!isReviewMode && <span className="text-yellow-400">{timeLeft}s</span>}
             {isReviewMode && <span className="text-brand-secondary font-semibold">Review Mode</span>}
          </div>
          <div className="text-right">
             <span className="text-sm mr-4">Streak: <span className="text-white">{streak}x</span></span>
             <span className="font-bold text-lg">Q: {currentQuestionIndex + 1}/{totalQuestions}</span>
          </div>
        </div>
        <ProgressBar progress={((currentQuestionIndex + 1) / totalQuestions) * 100} />
        {!isReviewMode && (
          <div className="mt-2">
            <TimerBar timeLeft={timeLeft} timeLimit={QUESTION_TIME_LIMIT} />
          </div>
        )}
      </header>
      
      <div className="bg-surface-dark p-6 sm:p-8 rounded-xl shadow-2xl min-h-[350px] flex flex-col justify-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-text-primary text-center" dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />
        
        {renderQuestionBody()}
        {renderAnswerFeedback()}
      </div>
      
      <div className="mt-6 h-16 flex items-center justify-center">
        <div className="flex items-center">
            {answerStatus === 'unanswered' ? null : renderFeedbackMessage()}
            {isReviewMode && answerStatus !== 'unanswered' && (
                <button 
                    onClick={goToNextQuestion}
                    className="ml-6 px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-md hover:bg-brand-primary transition-all text-lg animate-fade-in"
                >
                    Next Question →
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudyScreen;
