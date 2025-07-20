
import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, Question, QuestionType, StudyMode, FillInTheBlankQuestion, AnswerLog, UserAnswer } from '../types';
import ProgressBar from './common/ProgressBar';
import TimerBar from './common/TimerBar';
import Markdown from './common/Markdown';
import Modal from './common/Modal';

interface StudyScreenProps {
  quiz: Quiz;
  onFinish: (finalScore: number, log: AnswerLog[]) => void;
  onQuit: () => void;
  mode: StudyMode;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

const QUESTION_TIME_LIMIT = 20; // 20 seconds per question
const SPEED_BONUS_THRESHOLD = 15; // Answer with >= 15s left for bonus
const SPEED_BONUS_POINTS = 5;
const BASE_POINTS = 10;
const STREAK_BONUS_MULTIPLIER = 2;

const StudyScreen = ({ quiz, onFinish, onQuit, mode }: StudyScreenProps) => {
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
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);

  const isReviewMode = mode === StudyMode.REVIEW;
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

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
  }, [answerStatus, streak, timeLeft, isReviewMode, currentQuestion, setAnswerLog, setAnswerExplanation, setAnswerStatus, setScore, setStreak]);

    useEffect(() => {
        const logEntry = answerLog.find(log => log.question === quiz.questions[currentQuestionIndex]);

        if (logEntry) {
            setAnswerStatus(logEntry.isCorrect ? 'correct' : 'incorrect');
            setAnswerExplanation(logEntry.question.explanation);
            setTimeLeft(0);
            setBonusPointsAwarded(0);

            if (logEntry.question.questionType === QuestionType.MULTIPLE_CHOICE) {
                setSelectedOptionIndex(logEntry.userAnswer as number | null);
                setFillBlankAnswer('');
            } else if (logEntry.question.questionType === QuestionType.FILL_IN_THE_BLANK) {
                setFillBlankAnswer(logEntry.userAnswer as string || '');
                setSelectedOptionIndex(null);
                const typedQuestion = logEntry.question as FillInTheBlankQuestion;
                const userAnswer = (logEntry.userAnswer as string || '').toLowerCase();
                const correctAnswer = typedQuestion.correctAnswer.toLowerCase();
                const acceptableAnswers = (typedQuestion.acceptableAnswers || []).map(a => a.toLowerCase());
                const isAcceptable = userAnswer !== correctAnswer && acceptableAnswers.includes(userAnswer);
                if (logEntry.isCorrect && isAcceptable) {
                    setCorrectionFeedback(`We accepted your answer, but the ideal answer is: "${typedQuestion.correctAnswer}"`);
                } else {
                     setCorrectionFeedback(null);
                }
            } else { // True/False
                setSelectedOptionIndex(null);
                setFillBlankAnswer('');
                setCorrectionFeedback(null);
            }
        } else {
            setTimeLeft(QUESTION_TIME_LIMIT);
            setBonusPointsAwarded(0);
            setAnswerStatus('unanswered');
            setSelectedOptionIndex(null);
            setFillBlankAnswer('');
            setAnswerExplanation(null);
            setCorrectionFeedback(null);
        }
    }, [currentQuestionIndex, answerLog, quiz.questions]);


  useEffect(() => {
    if (isReviewMode || answerStatus !== 'unanswered') return;
    if (timeLeft <= 0) {
      processAnswer(false, null); 
      return;
    }
    const countdownTimer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(countdownTimer);
  }, [answerStatus, timeLeft, isReviewMode, processAnswer]);

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

    const isPerfectMatch = userAnswer === correctAnswer;
    const isAcceptable = !isPerfectMatch && acceptableAnswers.includes(userAnswer);

    if (isPerfectMatch || isAcceptable) {
        if (isAcceptable) setCorrectionFeedback(`We accepted your answer, but the ideal answer is: "${typedQuestion.correctAnswer}"`);
        processAnswer(true, userAnswerStr);
    } else {
        processAnswer(false, userAnswerStr);
    }
  };
  
  const renderAnswerFeedback = () => {
    if (answerStatus === 'unanswered') return null;
    
    let feedbackContent = null;
    switch(currentQuestion.questionType) {
      case QuestionType.FILL_IN_THE_BLANK:
        const userAnswerText = fillBlankAnswer.trim() ? `"${fillBlankAnswer}"` : "nothing";
        feedbackContent = <><p className={`text-lg ${answerStatus === 'correct' ? 'text-text-secondary' : 'text-incorrect'}`}>You answered: {userAnswerText}</p>{answerStatus === 'incorrect' && <p className="text-lg font-semibold mt-1">Correct answer: <span className="text-correct">{currentQuestion.correctAnswer}</span></p>}</>;
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
        const [part1, ...rest] = currentQuestion.questionText.split('___');
        const part2 = rest.join('___');
        const inputSize = fillBlankAnswer.length > 0 ? fillBlankAnswer.length : 1;
        
        return (
             <form onSubmit={isAnswered ? (e) => e.preventDefault() : handleFibSubmit} className="flex flex-col items-center gap-4">
                <div className="text-2xl sm:text-3xl font-bold text-text-primary text-center flex flex-wrap items-center justify-center gap-2">
                    <Markdown content={part1} as="span"/>
                    <input
                        type="text"
                        value={fillBlankAnswer}
                        onChange={isAnswered ? undefined : e => setFillBlankAnswer(e.target.value)}
                        readOnly={isAnswered}
                        className="mx-2 px-2 py-1 text-center w-auto max-w-xs bg-gray-900 border-b-2 border-brand-primary focus:outline-none focus:ring-0 text-brand-primary font-bold"
                        autoFocus={!isAnswered}
                        aria-label="Fill in the blank answer"
                        size={inputSize}
                    />
                    <Markdown content={part2} as="span"/>
                </div>
                {!isAnswered && <button type="submit" disabled={!fillBlankAnswer.trim()} className="px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">Submit</button>}
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
    if (answerStatus === 'correct') return <div className="text-center"><p className="text-2xl font-bold text-correct animate-pulse">Correct! 🎉</p>{correctionFeedback && <p className="text-base text-yellow-300 mt-2">{correctionFeedback}</p>}{!isReviewMode && bonusPointsAwarded > 0 && <p className="text-lg font-bold text-yellow-400">+{bonusPointsAwarded} Speed Bonus!</p>}</div>;
    if (answerStatus === 'incorrect') return <p className="text-2xl font-bold text-incorrect">{timeLeft <= 0 && !isReviewMode ? "Time's Up! ⌛" : "Incorrect 🙁"}</p>;
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col animate-fade-in h-full">
      <header className="mb-6">
        <div className="flex flex-wrap justify-between items-center text-text-secondary mb-2 gap-y-1 gap-x-4">
            <button onClick={() => setIsQuitModalOpen(true)} className="text-sm font-semibold text-gray-400 hover:text-white hover:underline transition-colors">End Session</button>
            <div className="flex items-baseline gap-4"><span className="font-bold text-lg">Score: <span className="text-brand-primary">{score}</span></span><span className="text-sm">Streak: <span className="text-white">{streak}x</span></span></div>
            <div className="flex items-baseline gap-4"><div className="flex items-center justify-center gap-2 font-bold text-lg">{!isReviewMode && <span className="text-yellow-400">{timeLeft}s</span>}{isReviewMode && <span className="text-brand-secondary font-semibold">Review Mode</span>}</div><span className="font-bold text-lg">Q: {currentQuestionIndex + 1}/{totalQuestions}</span></div>
        </div>
        <ProgressBar progress={((currentQuestionIndex + 1) / totalQuestions) * 100} />
        {!isReviewMode && <div className="mt-2"><TimerBar timeLeft={timeLeft} timeLimit={QUESTION_TIME_LIMIT} /></div>}
      </header>
      
      <div className="bg-surface-dark p-6 sm:p-8 rounded-xl shadow-2xl flex flex-col justify-center flex-grow">
        {currentQuestion.questionType !== QuestionType.FILL_IN_THE_BLANK && <Markdown as="h2" content={currentQuestion.questionText} className="text-2xl sm:text-3xl font-bold mb-8 text-text-primary text-center prose" />}
        {renderQuestionBody()}
        {answerStatus !== 'unanswered' && renderAnswerFeedback()}
      </div>
      
      <div className="mt-6 min-h-[8rem] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            {answerStatus !== 'unanswered' && renderFeedbackMessage()}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isReviewMode && currentQuestionIndex > 0 && <button onClick={goToPreviousQuestion} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-md hover:bg-gray-500 transition-all text-lg animate-fade-in">← Previous</button>}
                {answerStatus !== 'unanswered' && <button onClick={goToNextQuestion} className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-md hover:bg-brand-primary transition-all text-lg animate-fade-in">{currentQuestionIndex + 1 < totalQuestions ? 'Next Question →' : 'Finish Quiz'}</button>}
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