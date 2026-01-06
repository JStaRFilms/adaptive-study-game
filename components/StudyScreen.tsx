import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quiz, Question, QuestionType, StudyMode, FillInTheBlankQuestion, AnswerLog, UserAnswer, QuizConfig, ChatMessage, MultipleChoiceQuestion, MatchingQuestion, SequenceQuestion, QuizResult, ChatContentPart } from '../types';
import ProgressBar from './common/ProgressBar';
import TimerBar from './common/TimerBar';
import Markdown from './common/Markdown';
import Modal from './common/Modal';
import Tooltip from './common/Tooltip';
import ChatPanel from './common/ChatPanel';
import { validateFillInTheBlankAnswer } from '../services/geminiService';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface StudyScreenProps {
  quiz: Quiz;
  onFinish: (log: AnswerLog[]) => void;
  mode: StudyMode;
  updateSRSItem: (question: Question, isCorrect: boolean) => Promise<void>;
  quizConfig: QuizConfig | null;
  history: QuizResult[];
  // Chat props
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isAITyping: boolean;
  chatError: string | null;
  isChatEnabled: boolean;
  onSendMessage: (parts: ChatContentPart[], messageId?: string, currentQuestion?: Question, currentAnswerLog?: AnswerLog) => Promise<void>;
  onToggleChat: () => void;
  onCloseChat: () => void;
}

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect' | 'partial';

const QUESTION_TIME_LIMIT = 20; // 20 seconds per question
const FIB_TIME_LIMIT = 35; // Extra time for typing
const MATCHING_TIME_LIMIT_BASE = 15; // 15 seconds base
const MATCHING_TIME_LIMIT_PER_ITEM = 8; // 8 seconds per item
const SEQUENCE_TIME_LIMIT_BASE = 15;
const SEQUENCE_TIME_LIMIT_PER_ITEM = 8;
const SPEED_BONUS_THRESHOLD = 15; // Answer with >= 15s left for bonus
const SPEED_BONUS_POINTS = 5;
const IMPROVEMENT_BONUS_POINTS = 5;
const BASE_POINTS = 10;
const STREAK_BONUS_MULTIPLIER = 2;

const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();

const ConfidenceSelector: React.FC<{ onSelect: (confidence: number) => void }> = ({ onSelect }) => (
    <div className="w-full text-center animate-fade-in space-y-4">
        <h3 className="text-xl font-bold text-text-primary">How confident were you?</h3>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => onSelect(1)} className="px-6 py-3 bg-red-800/80 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                <span className="text-2xl">🤨</span> Not Confident
            </button>
            <button onClick={() => onSelect(2)} className="px-6 py-3 bg-yellow-600/80 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-2">
                <span className="text-2xl">🤔</span> Unsure
            </button>
            <button onClick={() => onSelect(3)} className="px-6 py-3 bg-green-700/80 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2">
                <span className="text-2xl">😎</span> Confident
            </button>
        </div>
    </div>
);

// This interface holds all the data required to update the screen state after confidence is selected.
interface PendingResult {
    log: Omit<AnswerLog, 'confidence'>;
    status: AnswerStatus;
    scoreDelta: number;
    newStreak: number;
    bonusPoints: number;
    improvementBonus: number;
    explanation: string | null;
    feedback: string | null;
    matchResults?: ('correct' | 'incorrect' | null)[] | null;
    sequenceResults?: ('correct' | 'incorrect')[] | null;
}

const StudyScreen = ({ 
    quiz, onFinish, mode, updateSRSItem, quizConfig, history,
    chatMessages, isChatOpen, isAITyping, chatError, isChatEnabled,
    onSendMessage, onToggleChat, onCloseChat
}: StudyScreenProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [bonusPointsAwarded, setBonusPointsAwarded] = useState(0);
  const [improvementBonus, setImprovementBonus] = useState(0);
  const [answerExplanation, setAnswerExplanation] = useState<string | null>(null);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [explanationRequestedMap, setExplanationRequestedMap] = useState<Record<number, boolean>>({});
  
  // State for new confidence flow: holds the graded result before it's shown to the user.
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);

  // State for different question types
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>([]);
  
  // State for Matching questions
  const [shuffledPrompts, setShuffledPrompts] = useState<{ text: string, originalIndex: number }[]>([]);
  const [placedMatches, setPlacedMatches] = useState<(number | null)[]>([]); // index = answer slot, value = original prompt index
  const [draggedItem, setDraggedItem] = useState<{ prompt: { text: string, originalIndex: number }, fromAnswerSlot?: number } | null>(null);
  const [selectedMatchingPrompt, setSelectedMatchingPrompt] = useState<{ text: string, originalIndex: number } | null>(null);
  const [matchResults, setMatchResults] = useState<('correct' | 'incorrect' | null)[] | null>(null);

  // State for Sequence questions
  const [sequenceItems, setSequenceItems] = useState<{ text: string, originalIndex: number }[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState<number | null>(null);
  const [sequenceResults, setSequenceResults] = useState<('correct' | 'incorrect')[] | null>(null);
  
  const isUntimedMode = mode === StudyMode.REVIEW || mode === StudyMode.SRS;
  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;

  const getTimeLimitForCurrentQuestion = () => {
    switch(currentQuestion.questionType) {
        case QuestionType.FILL_IN_THE_BLANK: return FIB_TIME_LIMIT;
        case QuestionType.MATCHING:
            const matchingQ = currentQuestion as MatchingQuestion;
            return MATCHING_TIME_LIMIT_BASE + matchingQ.prompts.length * MATCHING_TIME_LIMIT_PER_ITEM;
        case QuestionType.SEQUENCE:
            const sequenceQ = currentQuestion as SequenceQuestion;
            return SEQUENCE_TIME_LIMIT_BASE + sequenceQ.items.length * SEQUENCE_TIME_LIMIT_PER_ITEM;
        default: return QUESTION_TIME_LIMIT;
    }
  };
  const timeLimitForCurrentQuestion = getTimeLimitForCurrentQuestion();
  const isChatAllowedNow = isChatEnabled && answerStatus !== 'unanswered';

  const handleSendMessageWrapper = useCallback((parts: ChatContentPart[], messageId?: string) => {
      if (!isChatAllowedNow) return;
      const currentLog = answerLog.find(l => l.question.questionText === currentQuestion.questionText);
      void onSendMessage(parts, messageId, currentQuestion, currentLog);
  }, [isChatAllowedNow, onSendMessage, currentQuestion, answerLog]);

  const voiceChat = useVoiceChat({
    chatMessages,
    isAITyping,
    onSendMessage: handleSendMessageWrapper,
  });

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onFinish(answerLog);
    }
  }, [currentQuestionIndex, totalQuestions, onFinish, answerLog]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);
  
  /**
   * Commits the pending result to the screen after confidence is selected.
   * This function applies all state changes to show feedback.
   */
  const commitResult = useCallback(async (result: PendingResult, confidence: number) => {
    setAnswerStatus(result.status);
    setScore(s => s + result.scoreDelta);
    setStreak(result.newStreak);
    setBonusPointsAwarded(result.bonusPoints);
    setImprovementBonus(result.improvementBonus);
    setAnswerExplanation(result.explanation);
    setCorrectionFeedback(result.feedback);

    if (result.matchResults) {
        setMatchResults(result.matchResults);
    }
    if (result.sequenceResults) {
        setSequenceResults(result.sequenceResults);
    }

    const finalLog: AnswerLog = { ...result.log, confidence };
    
    if (mode === StudyMode.PRACTICE || mode === StudyMode.SRS) {
        await updateSRSItem(currentQuestion, finalLog.isCorrect);
    }
    
    setAnswerLog(prevLog => [...prevLog, finalLog]);
    setPendingResult(null); // Clear the pending result, which triggers UI to show feedback
  }, [mode, updateSRSItem, currentQuestion]);

  /**
   * Handles when the user selects their confidence level.
   */
  const handleConfidenceSelect = useCallback(async (confidence: number) => {
    if (!pendingResult) return;
    await commitResult(pendingResult, confidence);
  }, [pendingResult, commitResult]);

    /**
     * Grades the user's answer and prepares it for the confidence selection step.
     * It does NOT update the UI with the result directly.
     */
    const gradeAndFinalizeAnswer = useCallback(async (
        pointsDetails: { awarded: number; max: number; comment?: string },
        userAnswer: UserAnswer,
        options: {
            bypassConfidence?: boolean;
            matchResults?: ('correct' | 'incorrect' | null)[] | null;
            sequenceResults?: ('correct' | 'incorrect')[] | null;
        } = {}
    ) => {
        if (answerStatus !== 'unanswered') return;

        const { bypassConfidence = false, matchResults = null, sequenceResults = null } = options;
        const { awarded, max, comment } = pointsDetails;
        const isFullyCorrect = awarded === max;
        const isPartiallyCorrect = awarded > 0 && awarded < max;

        let status: AnswerStatus;
        let scoreDelta = 0;
        let currentNewStreak = streak;
        let currentSpeedBonus = 0;
        let currentImprovementBonus = 0;
        
        if (isFullyCorrect) {
            status = 'correct';
            const streakBonus = streak * STREAK_BONUS_MULTIPLIER;
            
            if (!isUntimedMode && timeLeft >= SPEED_BONUS_THRESHOLD) {
                currentSpeedBonus = SPEED_BONUS_POINTS;
            }
    
            if (currentQuestion.studySetId) {
                const hasBeenAnsweredIncorrectlyBefore = history.some(quizResult =>
                    quizResult.studySetId === currentQuestion.studySetId &&
                    quizResult.answerLog.some(log => {
                        if (!log.isCorrect) {
                            if (currentQuestion.conceptId && log.question.conceptId) {
                                return currentQuestion.conceptId === log.question.conceptId;
                            }
                            return normalizeText(log.question.questionText) === normalizeText(currentQuestion.questionText);
                        }
                        return false;
                    })
                );

                if (hasBeenAnsweredIncorrectlyBefore) {
                    currentImprovementBonus = IMPROVEMENT_BONUS_POINTS;
                }
            }
    
            scoreDelta = awarded + streakBonus + currentSpeedBonus + currentImprovementBonus;
            currentNewStreak = streak + 1;
        } else if (isPartiallyCorrect) {
            status = 'partial';
            scoreDelta = awarded;
            currentNewStreak = 0;
        } else { // Incorrect
            status = 'incorrect';
            scoreDelta = 0;
            currentNewStreak = 0;
        }

        const newLogEntry: Omit<AnswerLog, 'confidence'> = {
            question: currentQuestion,
            userAnswer,
            isCorrect: isFullyCorrect,
            pointsAwarded: awarded,
            maxPoints: max,
            aiFeedback: comment,
        };
        
        const resultToCommit: PendingResult = {
            log: newLogEntry,
            status: status,
            scoreDelta: scoreDelta,
            newStreak: currentNewStreak,
            bonusPoints: currentSpeedBonus,
            improvementBonus: currentImprovementBonus,
            explanation: currentQuestion.explanation,
            feedback: comment || null,
            matchResults,
            sequenceResults,
        };

        if (bypassConfidence) {
            await commitResult(resultToCommit, 0);
        } else {
            setPendingResult(resultToCommit);
        }
    }, [answerStatus, streak, timeLeft, isUntimedMode, currentQuestion, history, commitResult]);

    useEffect(() => {
        const logEntry = answerLog.find(log => log.question.questionText === quiz.questions[currentQuestionIndex].questionText);
        setPendingResult(null);

        if (logEntry) { // REVIEWING a previously answered question
            const { pointsAwarded, maxPoints, aiFeedback, userAnswer } = logEntry;
            if (pointsAwarded === maxPoints) setAnswerStatus('correct');
            else if (pointsAwarded > 0) setAnswerStatus('partial');
            else setAnswerStatus('incorrect');

            setAnswerExplanation(logEntry.question.explanation);
            setTimeLeft(0);
            setBonusPointsAwarded(0); // Don't show bonus again on review
            setImprovementBonus(0);
            setCorrectionFeedback(aiFeedback || null);
            setIsTimedOut(false);

            // Set answer state based on question type
            if (logEntry.question.questionType === QuestionType.MATCHING) {
                const matchingQ = logEntry.question as MatchingQuestion;
                setShuffledPrompts(matchingQ.prompts.map((text, originalIndex) => ({ text, originalIndex })));
                setPlacedMatches(userAnswer as number[]);
                // Set results for styling
                const results = (userAnswer as number[]).map((promptIdx, answerIdx) => promptIdx === answerIdx ? 'correct' : 'incorrect');
                setMatchResults(results);
            } else if (logEntry.question.questionType === QuestionType.SEQUENCE) {
                const sequenceQ = logEntry.question as SequenceQuestion;
                const userOrder = userAnswer as number[];
                const reorderedItems = userOrder.map(originalIndex => ({
                    text: sequenceQ.items[originalIndex],
                    originalIndex
                }));
                setSequenceItems(reorderedItems);
                setSequenceResults(userOrder.map((originalIdx, currentIdx) => originalIdx === currentIdx ? 'correct' : 'incorrect'));
            } else if (logEntry.question.questionType === QuestionType.MULTIPLE_CHOICE || userAnswer === 'SKIPPED') {
                setSelectedOptionIndex(userAnswer as number | null);
            } else if (logEntry.question.questionType === QuestionType.FILL_IN_THE_BLANK) {
                setFillBlankAnswers(userAnswer as string[] || []);
            }
        } else { // NEW question
            setTimeLeft(timeLimitForCurrentQuestion);
            setBonusPointsAwarded(0);
            setImprovementBonus(0);
            setAnswerStatus('unanswered');
            setIsTimedOut(false);
            setAnswerExplanation(null);
            setCorrectionFeedback(null);
            
            // Reset all answer states
            setSelectedOptionIndex(null);
            setFillBlankAnswers([]);
            setPlacedMatches([]);
            setShuffledPrompts([]);
            setMatchResults(null);
            setSelectedMatchingPrompt(null);
            setSequenceItems([]);
            setSequenceResults(null);
            setSelectedSequenceIndex(null);

            if (currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
                 const numBlanks = (currentQuestion as FillInTheBlankQuestion).correctAnswers.length;
                 setFillBlankAnswers(Array(numBlanks).fill(''));
            } else if (currentQuestion.questionType === QuestionType.MATCHING) {
                const matchingQ = currentQuestion as MatchingQuestion;
                // Shuffle prompts for the game
                const promptsToShuffle = matchingQ.prompts.map((text, originalIndex) => ({ text, originalIndex }));
                for (let i = promptsToShuffle.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [promptsToShuffle[i], promptsToShuffle[j]] = [promptsToShuffle[j], promptsToShuffle[i]];
                }
                setShuffledPrompts(promptsToShuffle);
                setPlacedMatches(Array(matchingQ.answers.length).fill(null));
            } else if (currentQuestion.questionType === QuestionType.SEQUENCE) {
                const sequenceQ = currentQuestion as SequenceQuestion;
                const itemsToShuffle = sequenceQ.items.map((text, originalIndex) => ({ text, originalIndex }));
                for (let i = itemsToShuffle.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [itemsToShuffle[i], itemsToShuffle[j]] = [itemsToShuffle[j], itemsToShuffle[i]];
                }
                setSequenceItems(itemsToShuffle);
            }
        }
    }, [currentQuestionIndex, currentQuestion, answerLog, quiz.questions, timeLimitForCurrentQuestion]);


  useEffect(() => {
    // Timer should stop while we are awaiting confidence selection
    if (isUntimedMode || answerStatus !== 'unanswered' || pendingResult) return;

    if (timeLeft <= 0) {
      setIsTimedOut(true);
      const handleTimeout = async () => {
        let maxPts = BASE_POINTS;
        if(currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK){
            maxPts = (currentQuestion as FillInTheBlankQuestion).correctAnswers.length * BASE_POINTS;
        } else if (currentQuestion.questionType === QuestionType.MATCHING || currentQuestion.questionType === QuestionType.SEQUENCE) {
            maxPts = BASE_POINTS;
        }
        await gradeAndFinalizeAnswer({ awarded: 0, max: maxPts }, null, { bypassConfidence: true }); 
      };
      handleTimeout();
      return;
    }
    const countdownTimer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(countdownTimer);
  }, [answerStatus, timeLeft, isUntimedMode, gradeAndFinalizeAnswer, currentQuestion, pendingResult]);

  const handleMcSubmit = async () => {
    if (selectedOptionIndex === null || currentQuestion.questionType !== QuestionType.MULTIPLE_CHOICE) return;
    const isCorrect = selectedOptionIndex === currentQuestion.correctAnswerIndex;
    await gradeAndFinalizeAnswer({ awarded: isCorrect ? BASE_POINTS : 0, max: BASE_POINTS }, selectedOptionIndex);
  };
  
  const handleTfSubmit = async (answer: boolean) => {
    if (currentQuestion.questionType !== QuestionType.TRUE_FALSE) return;
    const isCorrect = answer === currentQuestion.correctAnswer;
    await gradeAndFinalizeAnswer({ awarded: isCorrect ? BASE_POINTS : 0, max: BASE_POINTS }, answer);
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

    await gradeAndFinalizeAnswer({
        awarded: awardedPoints,
        max: maxPoints,
        comment: comments.join(' '),
    }, fillBlankAnswers);

    setIsVerifyingAnswer(false);
  };

  const handleMatchingSubmit = async () => {
    if (currentQuestion.questionType !== QuestionType.MATCHING) return;
    
    const matchingQ = currentQuestion as MatchingQuestion;
    const maxPoints = BASE_POINTS;
    let correctCount = 0;
    const results: ('correct' | 'incorrect' | null)[] = Array(matchingQ.answers.length).fill(null);

    placedMatches.forEach((promptOriginalIndex, answerIndex) => {
        if (promptOriginalIndex === answerIndex) {
            correctCount++;
            results[answerIndex] = 'correct';
        } else if (promptOriginalIndex !== null) {
            results[answerIndex] = 'incorrect';
        }
    });

    const awardedPoints = Math.round((correctCount / matchingQ.prompts.length) * maxPoints);
    await gradeAndFinalizeAnswer(
        { awarded: awardedPoints, max: maxPoints }, 
        placedMatches, 
        { matchResults: results }
    );
  };

    const handleSequenceSubmit = async () => {
        if (currentQuestion.questionType !== QuestionType.SEQUENCE) return;
        const userOrder = sequenceItems.map(item => item.originalIndex);
        const results: ('correct' | 'incorrect')[] = [];
        let isFullyCorrect = true;
        for (let i = 0; i < userOrder.length; i++) {
            if (userOrder[i] !== i) {
                isFullyCorrect = false;
                results[i] = 'incorrect';
            } else {
                results[i] = 'correct';
            }
        }
        await gradeAndFinalizeAnswer(
            { awarded: isFullyCorrect ? BASE_POINTS : 0, max: BASE_POINTS }, 
            userOrder,
            { sequenceResults: results }
        );
    };
  
    const handleSkip = useCallback(async () => {
        if (answerStatus !== 'unanswered' || mode === StudyMode.SRS) return;

        let maxPts = BASE_POINTS;
        if (currentQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
            maxPts = (currentQuestion as FillInTheBlankQuestion).correctAnswers.length * BASE_POINTS;
        } else if (currentQuestion.questionType === QuestionType.MATCHING || currentQuestion.questionType === QuestionType.SEQUENCE) {
            maxPts = BASE_POINTS;
        }

        await gradeAndFinalizeAnswer(
            { awarded: 0, max: maxPts, comment: 'Question was skipped.' },
            'SKIPPED',
            { bypassConfidence: true }
        );
    }, [answerStatus, currentQuestion, gradeAndFinalizeAnswer, mode]);

    const handleOpenChat = () => {
        onToggleChat();

        const isIncorrectOrPartial = answerStatus === 'incorrect' || answerStatus === 'partial';
        const hasNotRequested = !explanationRequestedMap[currentQuestionIndex];

        if (isIncorrectOrPartial && hasNotRequested && !isChatOpen) {
            const currentLog = answerLog.find(l => l.question.questionText === currentQuestion.questionText);
            if (currentLog) {
                let userMessage = "Explain why I got this wrong.";
                if (currentLog.userAnswer === 'SKIPPED') {
                    userMessage = "I skipped this, please explain.";
                }
                void onSendMessage([{type: 'text', text: userMessage}], undefined, currentQuestion, currentLog);
                setExplanationRequestedMap(prev => ({ ...prev, [currentQuestionIndex]: true }));
            }
        }
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
      case QuestionType.MATCHING:
      case QuestionType.SEQUENCE:
          // Feedback for these types is shown inline on the items themselves.
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

    switch (currentQuestion.questionType) {
        case QuestionType.SEQUENCE:
            const handleSequenceItemClick = (clickedIndex: number) => {
                if (isAnswered) return;
                if (selectedSequenceIndex === null) {
                    setSelectedSequenceIndex(clickedIndex);
                } else if (selectedSequenceIndex === clickedIndex) {
                    setSelectedSequenceIndex(null);
                } else {
                    const newItems = [...sequenceItems];
                    [newItems[selectedSequenceIndex], newItems[clickedIndex]] = [newItems[clickedIndex], newItems[selectedSequenceIndex]];
                    setSequenceItems(newItems);
                    setSelectedSequenceIndex(null);
                }
            };
            const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
                if (isAnswered) return;
                setSelectedSequenceIndex(null);
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData("text/plain", index.toString());
            };
            const handleDragEnd = () => {
                setDraggedIndex(null);
                setDragOverIndex(null);
            };
            const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
            const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
                e.preventDefault();
                if (draggedIndex === null || isAnswered) return;
                const newItems = [...sequenceItems];
                const [draggedItem] = newItems.splice(draggedIndex, 1);
                newItems.splice(dropIndex, 0, draggedItem);
                setSequenceItems(newItems);
            };

            return (
                 <div className="flex flex-col items-center">
                    <Markdown as="p" content={currentQuestion.questionText} className="text-center text-text-primary mb-4" />
                    <div className="bg-yellow-900/50 text-yellow-200 text-sm px-4 py-2 rounded-lg mb-6 flex items-center gap-2">
                        <span className="text-lg">💡</span>
                        <span>Tap to select, tap again to swap. Or drag and drop.</span>
                    </div>
                    <div className="w-full max-w-lg space-y-3">
                        {sequenceItems.map((item, index) => {
                             const resultState = sequenceResults?.[index];
                             const isSelected = selectedSequenceIndex === index;
                             let borderClass = 'border-transparent';
                             if (isSelected) borderClass = 'border-brand-primary ring-2 ring-brand-primary';
                             if (resultState === 'correct' && isAnswered) borderClass = 'border-correct';
                             if (resultState === 'incorrect' && isAnswered) borderClass = 'border-incorrect';
                            return (
                                <div
                                    key={item.originalIndex}
                                    draggable={!isAnswered}
                                    onClick={() => handleSequenceItemClick(index)}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnter={() => !isAnswered && setDragOverIndex(index)}
                                    onDragLeave={() => !isAnswered && setDragOverIndex(null)}
                                    className={`sequence-item ${isAnswered ? 'answered' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} border-2 ${borderClass}`}
                                >
                                    <div className="drag-handle">⋮⋮</div>
                                    <div className="sequence-number">{index + 1}</div>
                                    <div className="flex-1">
                                      <Markdown content={item.text} as="span" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {!isAnswered && (
                        <button onClick={handleSequenceSubmit} className="mt-8 px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Submit Order
                        </button>
                    )}
                </div>
            );

        case QuestionType.MATCHING:
            const matchingQ = currentQuestion as MatchingQuestion;
            const promptItems = shuffledPrompts.map(p => ({
                ...p,
                isPlaced: placedMatches.includes(p.originalIndex),
            }));

            const handlePromptClick = (prompt: { text: string; originalIndex: number }) => {
                if (isAnswered) return;
                if (selectedMatchingPrompt?.originalIndex === prompt.originalIndex) {
                    setSelectedMatchingPrompt(null);
                } else {
                    setSelectedMatchingPrompt(prompt);
                }
            };

            const handleAnswerSlotClick = (targetAnswerIndex: number) => {
                if (isAnswered) return;
                if (!selectedMatchingPrompt) { // Nothing selected, maybe pick up from slot?
                    const itemToSelect = placedMatches[targetAnswerIndex];
                    if (itemToSelect !== null) {
                        const promptObject = matchingQ.prompts.map((text, originalIndex) => ({text, originalIndex})).find(p => p.originalIndex === itemToSelect);
                        if(promptObject) {
                            const newPlaced = [...placedMatches];
                            newPlaced[targetAnswerIndex] = null;
                            setPlacedMatches(newPlaced);
                            setSelectedMatchingPrompt(promptObject);
                        }
                    }
                    return;
                }
            
                const newPlaced = [...placedMatches];
                const promptToPlace = selectedMatchingPrompt.originalIndex;
                const occupantOfTargetSlot = newPlaced[targetAnswerIndex];
            
                // Is the selected prompt already in a slot?
                const fromAnswerSlot = placedMatches.indexOf(promptToPlace);
            
                newPlaced[targetAnswerIndex] = promptToPlace;
                if (fromAnswerSlot !== -1) {
                    newPlaced[fromAnswerSlot] = occupantOfTargetSlot;
                }
            
                setPlacedMatches(newPlaced);
                setSelectedMatchingPrompt(null);
            };

            const handleMatchingDragStart = (e: React.DragEvent, prompt: { text: string; originalIndex: number; }, fromAnswerSlot?: number) => {
                if (isAnswered) return;
                setSelectedMatchingPrompt(null);
                setDraggedItem({ prompt, fromAnswerSlot });
                e.dataTransfer.effectAllowed = 'move';
            };

            const handleMatchingDrop = (e: React.DragEvent, targetAnswerIndex: number) => {
                e.preventDefault();
                if (!draggedItem || isAnswered) return;
                
                const newPlaced = [...placedMatches];
                const { prompt, fromAnswerSlot } = draggedItem;

                const occupantOfTargetSlot = newPlaced[targetAnswerIndex];
                if (fromAnswerSlot === targetAnswerIndex) {
                    setDraggedItem(null);
                    return;
                }
                
                newPlaced[targetAnswerIndex] = prompt.originalIndex;
                if (fromAnswerSlot !== undefined) {
                    newPlaced[fromAnswerSlot] = occupantOfTargetSlot;
                }

                setPlacedMatches(newPlaced);
                setDraggedItem(null);
            };
            
            return (
                <div className="flex flex-col items-center">
                    <Markdown as="p" content={matchingQ.questionText} className="text-center text-text-primary mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
                        {/* Prompts Column */}
                        <div className="flex flex-col gap-3">
                            <h3 className="font-bold text-center text-lg text-text-secondary">{matchingQ.promptTitle || 'Concepts'}</h3>
                            {promptItems.map((p) => {
                                const isSelected = selectedMatchingPrompt?.originalIndex === p.originalIndex;
                                return (
                                <div
                                    key={p.originalIndex}
                                    draggable={!p.isPlaced && !isAnswered}
                                    onClick={() => !p.isPlaced && handlePromptClick(p)}
                                    onDragStart={(e) => handleMatchingDragStart(e, p)}
                                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                                        p.isPlaced ? 'bg-surface-dark border-gray-700 text-gray-500 cursor-not-allowed' :
                                        isSelected ? 'ring-2 ring-brand-primary border-brand-primary bg-gray-600 cursor-pointer' :
                                        'bg-gray-700/80 border-gray-600 hover:bg-gray-600 cursor-pointer active:cursor-grabbing'
                                    }`}
                                >
                                    <Markdown content={p.text} as="span" />
                                </div>
                            )})}
                        </div>

                        {/* Answers Column (Drop Zones) */}
                        <div className="flex flex-col gap-3">
                            <h3 className="font-bold text-center text-lg text-text-secondary">{matchingQ.answerTitle || 'Definitions'}</h3>
                            {matchingQ.answers.map((answerText, answerIndex) => {
                                const placedPromptIndex = placedMatches[answerIndex];
                                const placedPrompt = placedPromptIndex !== null ? matchingQ.prompts[placedPromptIndex] : null;
                                const resultState = matchResults?.[answerIndex];

                                return (
                                    <div
                                        key={answerIndex}
                                        onClick={() => handleAnswerSlotClick(answerIndex)}
                                        onDrop={(e) => handleMatchingDrop(e, answerIndex)}
                                        onDragOver={(e) => e.preventDefault()}
                                        className={`p-4 rounded-lg border-2 min-h-[80px] flex flex-col justify-center transition-all duration-200 cursor-pointer ${
                                            resultState === 'correct' ? 'border-correct bg-correct/10' :
                                            resultState === 'incorrect' ? 'border-incorrect bg-incorrect/10' :
                                            'border-dashed border-gray-600 hover:border-brand-primary hover:bg-brand-primary/10'
                                        }`}
                                    >
                                        <p className="text-text-secondary mb-2 pointer-events-none">{answerText}</p>
                                        {placedPrompt ? (
                                            <div 
                                                draggable={!isAnswered}
                                                onDragStart={(e) => handleMatchingDragStart(e, {text: placedPrompt, originalIndex: placedPromptIndex!}, answerIndex)}
                                                className={`mt-2 p-2 rounded-md text-center text-white font-semibold ${
                                                     resultState === 'correct' ? 'bg-correct/80' :
                                                     resultState === 'incorrect' ? 'bg-incorrect/80' :
                                                     'bg-brand-secondary'
                                                }`}
                                            >
                                                {placedPrompt}
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 italic text-sm pointer-events-none">Drop here</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {!isAnswered && (
                        <button onClick={handleMatchingSubmit} disabled={placedMatches.every(p => p === null)} className="mt-8 px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Submit Matches
                        </button>
                    )}
                </div>
            );

        case QuestionType.FILL_IN_THE_BLANK:
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
        
        case QuestionType.MULTIPLE_CHOICE:
            if (isAnswered) {
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(currentQuestion as MultipleChoiceQuestion).options.map((option, index) => {
                            const isCorrect = index === (currentQuestion as MultipleChoiceQuestion).correctAnswerIndex;
                            const isSelected = index === selectedOptionIndex;
                            let style = 'bg-surface-dark opacity-60 cursor-not-allowed';
                            if (isCorrect) style = 'bg-correct/80 ring-2 ring-correct animate-pulse cursor-not-allowed';
                            else if (isSelected) style = 'bg-incorrect/80 ring-2 ring-incorrect cursor-not-allowed';
                            return <button key={index} disabled className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${style}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span><Markdown content={option} as="span" /></button>;
                        })}
                    </div>
                );
            }
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(currentQuestion as MultipleChoiceQuestion).options.map((option, index) => <button key={index} onClick={() => setSelectedOptionIndex(index)} className={`w-full p-4 rounded-lg text-left text-lg font-medium transition-all duration-300 ${selectedOptionIndex === index ? 'bg-brand-primary ring-2 ring-white' : 'bg-surface-dark hover:bg-gray-600'}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span><Markdown content={option} as="span" /></button>)}
                </div>
                <div className="mt-6 flex justify-center"><button onClick={handleMcSubmit} disabled={selectedOptionIndex === null} className="px-10 py-3 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">Submit</button></div>
              </>
            );

        case QuestionType.TRUE_FALSE:
            if (isAnswered) return null;
            return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"><button onClick={() => handleTfSubmit(true)} className="p-6 text-2xl font-bold bg-green-700 hover:bg-green-600 rounded-lg transition-colors">TRUE</button><button onClick={() => handleTfSubmit(false)} className="p-6 text-2xl font-bold bg-red-700 hover:bg-red-600 rounded-lg transition-colors">FALSE</button></div>;
    }
    return null;
  }

  const renderFeedbackMessage = () => {
    if (answerStatus === 'unanswered') return null;

    const relevantLog = answerLog.find(l => l.question.questionText === currentQuestion.questionText) || pendingResult?.log;

    if (relevantLog?.userAnswer === 'SKIPPED') {
        return (
            <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">Question Skipped</p>
            </div>
        );
    }

    if (answerStatus === 'correct') {
        return (
            <div className="text-center space-y-3">
                <p className="text-2xl font-bold text-correct animate-pulse">Correct! 🎉</p>
                {improvementBonus > 0 && (
                    <div className="bg-green-800/60 border border-green-600 p-3 rounded-lg animate-fade-in shadow-lg">
                        <p className="font-bold text-lg text-green-200 flex items-center justify-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span>Redemption Bonus! +{improvementBonus}pts</span>
                        </p>
                        <p className="text-sm text-green-300 mt-1">You nailed a question you previously missed. Great progress!</p>
                    </div>
                )}
                {correctionFeedback && <p className="text-base text-yellow-300">{correctionFeedback}</p>}
                {!isUntimedMode && bonusPointsAwarded > 0 && <p className="text-lg font-bold text-yellow-400">+{bonusPointsAwarded} Speed Bonus!</p>}
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
                <p className="text-2xl font-bold text-incorrect">{isTimedOut && !isUntimedMode ? "Time's Up! ⌛" : "Incorrect 🙁"}</p>
                 {correctionFeedback && <p className="text-base text-yellow-300 mt-2">{correctionFeedback}</p>}
            </div>
        );
    }
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col animate-fade-in h-full relative">
      <header className="mb-6">
          <div className="bg-surface-dark p-3 sm:p-4 rounded-xl shadow-lg w-full">
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-x-4 gap-y-2 text-text-secondary font-semibold">
                  {/* Left Side: End Session */}
                  <div className="flex-shrink-0">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setIsQuitModalOpen(true)} className="font-semibold text-gray-400 hover:text-white transition-colors text-sm">
                              End Session
                          </button>
                          {answerStatus === 'unanswered' && mode !== StudyMode.SRS && (
                              <button onClick={handleSkip} className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors">
                                  Skip Question
                              </button>
                          )}
                      </div>
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
        {currentQuestion.questionType !== QuestionType.FILL_IN_THE_BLANK && currentQuestion.questionType !== QuestionType.MATCHING && currentQuestion.questionType !== QuestionType.SEQUENCE && <Markdown as="h2" content={currentQuestion.questionText} className="text-2xl sm:text-3xl font-bold mb-8 text-text-primary text-center prose" />}
        {renderQuestionBody()}
        {answerStatus !== 'unanswered' && !pendingResult && renderAnswerFeedback()}
      </div>
      
      <div className="mt-6 min-h-[8rem] flex items-center justify-center">
        {answerStatus === 'unanswered' && !pendingResult && !isVerifyingAnswer ? null : (
            pendingResult ? (
                <ConfidenceSelector onSelect={handleConfidenceSelect} />
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    {renderFeedbackMessage()}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {mode === StudyMode.REVIEW && currentQuestionIndex > 0 && <button onClick={goToPreviousQuestion} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-md hover:bg-gray-500 transition-all text-lg animate-fade-in">← Previous</button>}
                        <button onClick={goToNextQuestion} className="px-8 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-md hover:bg-brand-primary transition-all text-lg animate-fade-in">{currentQuestionIndex + 1 < totalQuestions ? 'Next Question →' : 'Finish Quiz'}</button>
                    </div>
                </div>
            )
        )}
      </div>

      <ChatPanel 
        key={currentQuestion.questionText}
        isOpen={isChatOpen}
        onOpen={handleOpenChat}
        onClose={onCloseChat}
        onSendMessage={handleSendMessageWrapper}
        messages={chatMessages}
        isTyping={isAITyping}
        error={chatError}
        isEnabled={isChatAllowedNow}
        disabledTooltipText="Answer the question to unlock the AI Coach"
        isCallActive={voiceChat.isCallActive}
        isListening={voiceChat.isListening}
        isSpeaking={voiceChat.isSpeaking}
        onStartCall={voiceChat.startCall}
        onEndCall={voiceChat.endCall}
        onPttMouseDown={voiceChat.handlePttMouseDown}
        onPttMouseUp={voiceChat.handlePttMouseUp}
      />

      <Modal isOpen={isQuitModalOpen} onClose={() => setIsQuitModalOpen(false)} title="End Study Session?">
        <div className="text-text-secondary">
          <p>Are you sure you want to end this session? Your progress will be saved, and you will proceed to the results screen.</p>
          <div className="mt-6 flex justify-end gap-4">
            <button onClick={() => setIsQuitModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Continue Studying</button>
            <button onClick={() => onFinish(answerLog)} className="px-4 py-2 bg-incorrect text-white font-bold rounded-lg hover:bg-red-600 transition-colors">End Session</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudyScreen;
