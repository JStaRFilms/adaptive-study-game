


import React, { useState, useCallback } from 'react';
import { AppState, Quiz, QuizConfig, StudyMode, AnswerLog, PromptPart, QuizResult, OpenEndedAnswer, PredictedQuestion, StudySet } from './types';
import SetupScreen from './components/SetupScreen';
import StudyScreen from './components/StudyScreen';
import ResultsScreen from './components/ResultsScreen';
import ReviewScreen from './components/ReviewScreen';
import LoadingSpinner from './components/common/LoadingSpinner';
import LandingPage from './components/LandingPage';
import ExamScreen from './components/ExamScreen';
import PredictionSetupScreen from './components/PredictionSetupScreen';
import PredictionResultsScreen from './components/PredictionResultsScreen';
import { generateQuiz, gradeExam, generateExamPrediction } from './services/geminiService';
import { useQuizHistory } from './hooks/useQuizHistory';
import { useStudySets } from './hooks/useStudySets';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [currentStudySet, setCurrentStudySet] = useState<StudySet | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictedQuestion[] | null>(null);
  
  const [addQuizResult] = useQuizHistory();
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();

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
    const set = studySets.find(s => s.id === studySetId) || null;
    setCurrentStudySet(set);
    try {
      const generatedQuiz = await generateQuiz(parts, config);
      if (generatedQuiz && generatedQuiz.questions.length > 0) {
        setQuiz(generatedQuiz);
        if (config.mode === StudyMode.EXAM) {
            setAppState(AppState.EXAM_IN_PROGRESS);
        } else {
            setAppState(AppState.STUDYING);
        }
      } else {
        setError("The AI couldn't generate a quiz from your notes. Please try with more detailed content.");
        setAppState(AppState.SETUP);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred. Please check your API key and try again.");
      setAppState(AppState.SETUP);
    }
  }, [studySets]);

  const handleFinishStudy = useCallback((score: number, log: AnswerLog[]) => {
    setFinalScore(score);
    setAnswerLog(log);
    setAppState(AppState.RESULTS);

    if (currentStudySet) {
        const correctAnswers = log.filter(l => l.isCorrect).length;
        const accuracy = log.length > 0 ? Math.round((correctAnswers / log.length) * 100) : 0;
        const result: Omit<QuizResult, 'id'> = {
            studySetId: currentStudySet.id,
            date: new Date().toISOString(),
            score: score,
            accuracy: accuracy,
            answerLog: log,
            webSources: quiz?.webSources,
            mode: studyMode,
        };
        addQuizResult(result);
    }

  }, [currentStudySet, studyMode, quiz?.webSources, addQuizResult]);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    setError(null);
    setFinalScore(0);
    setAnswerLog([]);
    setCurrentStudySet(null);
    setPredictionResults(null);
    setAppState(AppState.SETUP);
  }, []);
  
  const handleGoToPrediction = useCallback((studySetId: string) => {
    const set = studySets.find(s => s.id === studySetId) || null;
    if (set) {
      setCurrentStudySet(set);
      setAppState(AppState.PREDICTION_SETUP);
    }
  }, [studySets]);

  const handleGeneratePrediction = useCallback(async (predictionData: any) => {
      setAppState(AppState.PREDICTING);
      setError(null);
      try {
          const results = await generateExamPrediction(predictionData);
          setPredictionResults(results);
          setAppState(AppState.PREDICTION_RESULTS);
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : "An unknown error occurred during prediction.");
          setAppState(AppState.PREDICTION_SETUP);
      }
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

  const handleFinishExam = useCallback(async (submission: OpenEndedAnswer) => {
    if (!quiz) return;
    setAppState(AppState.GRADING);
    try {
        const gradedLog = await gradeExam(quiz.questions, submission);
        const totalScore = gradedLog.reduce((sum, log) => sum + (log.questionScore || 0), 0);
        handleFinishStudy(totalScore, gradedLog);
    } catch (err) {
        console.error("Error during exam grading:", err);
        setError(err instanceof Error ? err.message : "An error occurred while grading your exam.");
        setAppState(AppState.SETUP); // Or back to a review screen with an error
    }
  }, [quiz, handleFinishStudy]);
  
  const renderCoreApp = () => {
    switch (appState) {
      case AppState.SETUP:
        return <SetupScreen 
                    onStart={handleStartStudy} 
                    error={error} 
                    initialContent={initialContent} 
                    onReviewHistory={handleReview} 
                    onPredict={handleGoToPrediction}
                    studySets={studySets}
                    addSet={addSet}
                    updateSet={updateSet}
                    deleteSet={deleteSet}
                />;
      case AppState.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center h-screen">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">Analyzing your notes and building your custom quiz...</p>
          </div>
        );
      case AppState.GRADING:
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-text-secondary">Grading your exam answers...</p>
            </div>
        );
      case AppState.STUDYING:
        return quiz ? <StudyScreen quiz={quiz} onFinish={handleFinishStudy} mode={studyMode} /> : null;
      case AppState.EXAM_IN_PROGRESS:
        return quiz ? <ExamScreen quiz={quiz} onFinish={handleFinishExam} /> : null;
      case AppState.RESULTS:
        return <ResultsScreen score={finalScore} answerLog={answerLog} onRestart={handleRestart} onReview={() => handleReview()} webSources={quiz?.webSources} />;
      case AppState.REVIEWING:
        return <ReviewScreen answerLog={answerLog} onRetakeSameQuiz={handleRetakeSameQuiz} onStartNewQuiz={handleRestart} />;
      case AppState.PREDICTION_SETUP:
        return currentStudySet ? <PredictionSetupScreen studySet={currentStudySet} onGenerate={handleGeneratePrediction} onCancel={handleRestart} error={error} /> : null;
      case AppState.PREDICTING:
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-text-secondary">Generating exam predictions...</p>
            </div>
        );
      case AppState.PREDICTION_RESULTS:
          return predictionResults ? <PredictionResultsScreen results={predictionResults} onBack={handleRestart} /> : null;
      default:
        return <SetupScreen 
                    onStart={handleStartStudy} 
                    error={error} 
                    initialContent={initialContent} 
                    onReviewHistory={handleReview} 
                    onPredict={handleGoToPrediction}
                    studySets={studySets}
                    addSet={addSet}
                    updateSet={updateSet}
                    deleteSet={deleteSet}
                />;
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