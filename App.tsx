
import React, { useState, useCallback } from 'react';
import { AppState, Quiz, QuizConfig, StudyMode, AnswerLog, PromptPart } from './types';
import SetupScreen from './components/SetupScreen';
import StudyScreen from './components/StudyScreen';
import ResultsScreen from './components/ResultsScreen';
import ReviewScreen from './components/ReviewScreen';
import LoadingSpinner from './components/common/LoadingSpinner';
import { generateQuiz } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState<number>(0);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);

  const handleStartStudy = useCallback(async (parts: PromptPart[], config: QuizConfig) => {
    setAppState(AppState.PROCESSING);
    setStudyMode(config.mode);
    setError(null);
    setQuiz(null);
    setAnswerLog([]);
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

  const handleFinishStudy = useCallback((score: number, maxScore: number, log: AnswerLog[]) => {
    setFinalScore(score);
    setMaxPossibleScore(maxScore);
    setAnswerLog(log);
    setAppState(AppState.RESULTS);
  }, []);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    setError(null);
    setFinalScore(0);
    setMaxPossibleScore(0);
    setAnswerLog([]);
    setAppState(AppState.SETUP);
  }, []);

  const handleReview = useCallback(() => {
    setAppState(AppState.REVIEWING);
  }, []);

  const handleRetakeSameQuiz = useCallback(() => {
    setFinalScore(0);
    setMaxPossibleScore(0);
    setAnswerLog([]);
    setAppState(AppState.STUDYING);
  }, []);
  
  const renderContent = () => {
    switch (appState) {
      case AppState.SETUP:
        return <SetupScreen onStart={handleStartStudy} error={error} />;
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
        return <ResultsScreen score={finalScore} maxPossibleScore={maxPossibleScore} onRestart={handleRestart} onReview={handleReview} webSources={quiz?.webSources} />;
      case AppState.REVIEWING:
        return <ReviewScreen answerLog={answerLog} onRetakeSameQuiz={handleRetakeSameQuiz} onStartNewQuiz={handleRestart} />;
      default:
        return <SetupScreen onStart={handleStartStudy} error={error} />;
    }
  };

  return (
    <main className="min-h-screen bg-background-dark font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        {renderContent()}
      </div>
    </main>
  );
};

export default App;