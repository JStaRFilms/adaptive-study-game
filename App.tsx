
import React, { useState, useCallback } from 'react';
import { AppState, Quiz, QuizConfig, StudyMode, AnswerLog, PromptPart, QuizResult } from './types';
import SetupScreen from './components/SetupScreen';
import StudyScreen from './components/StudyScreen';
import ResultsScreen from './components/ResultsScreen';
import ReviewScreen from './components/ReviewScreen';
import LoadingSpinner from './components/common/LoadingSpinner';
import LandingPage from './components/LandingPage';
import { generateQuiz } from './services/geminiService';
import { useQuizHistory } from './hooks/useQuizHistory';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [currentStudySetId, setCurrentStudySetId] = useState<string | null>(null);
  
  const [addQuizResult] = useQuizHistory();

  const handleLaunchApp = useCallback(() => {
    setInitialContent(null);
    setShowLanding(false);
  }, []);

  const handleLaunchWithContent = useCallback((content: string) => {
    setInitialContent(content);
    setShowLanding(false);
  }, []);

  const handleStartStudy = useCallback(async (parts: PromptPart[], config: QuizConfig, studySetId: string) => {
    setAppState(AppState.PROCESSING);
    setStudyMode(config.mode);
    setError(null);
    setQuiz(null);
    setAnswerLog([]);
    setCurrentStudySetId(studySetId);
    try {
      const generatedQuiz = await generateQuiz(parts, config);
      if (generatedQuiz && generatedQuiz.questions.length > 0) {
        setQuiz(generatedQuiz);
        setAppState(AppState.STUDYING);
      } else {
        setError("The AI couldn't generate a quiz from your notes. Please try with more detailed content.");
        setAppState(AppState.SETUP);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred. Please check your API key and try again.");
      setAppState(AppState.SETUP);
    }
  }, []);

  const handleFinishStudy = useCallback((score: number, log: AnswerLog[]) => {
    setFinalScore(score);
    setAnswerLog(log);
    setAppState(AppState.RESULTS);

    if (currentStudySetId) {
        const correctAnswers = log.filter(l => l.isCorrect).length;
        const accuracy = log.length > 0 ? Math.round((correctAnswers / log.length) * 100) : 0;
        const result: Omit<QuizResult, 'id'> = {
            studySetId: currentStudySetId,
            date: new Date().toISOString(),
            score: score,
            accuracy: accuracy,
            answerLog: log,
            webSources: quiz?.webSources,
            mode: studyMode,
        };
        addQuizResult(result);
    }

  }, [currentStudySetId, studyMode, quiz?.webSources, addQuizResult]);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    setError(null);
    setFinalScore(0);
    setAnswerLog([]);
    setCurrentStudySetId(null);
    setAppState(AppState.SETUP);
  }, []);

  const handleReview = useCallback((logToReview?: AnswerLog[]) => {
    if (logToReview) {
      setAnswerLog(logToReview);
    }
    setAppState(AppState.REVIEWING);
  }, []);

  const handleRetakeSameQuiz = useCallback(() => {
    setFinalScore(0);
    setAnswerLog([]);
    setAppState(AppState.STUDYING);
  }, []);
  
  const renderCoreApp = () => {
    switch (appState) {
      case AppState.SETUP:
        return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview} />;
      case AppState.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center h-screen">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">Analyzing your notes and building your custom quiz...</p>
          </div>
        );
      case AppState.STUDYING:
        return quiz ? <StudyScreen quiz={quiz} onFinish={handleFinishStudy} mode={studyMode} /> : null;
      case AppState.RESULTS:
        return <ResultsScreen score={finalScore} answerLog={answerLog} onRestart={handleRestart} onReview={() => handleReview()} webSources={quiz?.webSources} />;
      case AppState.REVIEWING:
        return <ReviewScreen answerLog={answerLog} onRetakeSameQuiz={handleRetakeSameQuiz} onStartNewQuiz={handleRestart} />;
      default:
        return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview}/>;
    }
  };

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunchApp} onLaunchWithContent={handleLaunchWithContent} />;
  }

  return (
    <main className="min-h-screen bg-background-dark font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl flex-grow flex flex-col">
        {renderCoreApp()}
      </div>
    </main>
  );
};

export default App;