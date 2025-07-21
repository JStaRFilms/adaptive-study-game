
import React, { useState, useCallback, useEffect } from 'react';
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
  
  // Grading & Retry State
  const [gradingMessage, setGradingMessage] = useState<string>('Grading your exam answers...');
  const [submissionForRetry, setSubmissionForRetry] = useState<OpenEndedAnswer | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);
  
  const [addQuizResult] = useQuizHistory();
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  
  const isPredictionFlow = [
    AppState.PREDICTION_SETUP,
    AppState.PREDICTING,
    AppState.PREDICTION_RESULTS,
  ].includes(appState);

  useEffect(() => {
    if (isPredictionFlow) {
        document.body.classList.remove('bg-background-dark', 'font-sans');
        document.body.classList.add('bg-pattern', 'font-serif');
    } else {
        document.body.classList.remove('bg-pattern', 'font-serif');
        document.body.classList.add('bg-background-dark', 'font-sans');
    }
  }, [isPredictionFlow]);


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
    setSubmissionForRetry(null);
    setGradingError(null);

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

  }, [currentStudySet, studyMode, quiz, addQuizResult]);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    setError(null);
    setFinalScore(0);
    setAnswerLog([]);
    setCurrentStudySet(null);
    setPredictionResults(null);
    setSubmissionForRetry(null);
    setGradingError(null);
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

  const handleReview = useCallback((resultToReview: QuizResult) => {
    const set = studySets.find(s => s.id === resultToReview.studySetId);
    if (set) {
      setCurrentStudySet(set);
      setAnswerLog(resultToReview.answerLog);
      setStudyMode(resultToReview.mode);
      setQuiz({ questions: resultToReview.answerLog.map(l => l.question), webSources: resultToReview.webSources });
      setAppState(AppState.REVIEWING);
    } else {
      // This is a defensive check in case the study set was deleted but the history item remains.
      setError(`Could not find the original study set for this quiz result. It may have been deleted.`);
      handleRestart();
    }
  }, [studySets, handleRestart]);

  const handleRetakeSameQuiz = useCallback(() => {
    setFinalScore(0);
    setAnswerLog([]);
    if (studyMode === StudyMode.EXAM) {
        setAppState(AppState.EXAM_IN_PROGRESS);
    } else {
        setAppState(AppState.STUDYING);
    }
  }, [studyMode]);

  const handleFinishExam = useCallback(async (submission?: OpenEndedAnswer) => {
    const submissionToGrade = submission || submissionForRetry;
    if (!quiz || !submissionToGrade) return;

    setAppState(AppState.GRADING);
    setGradingError(null);
    if (submission) {
        setSubmissionForRetry(submission);
    }
    
    const timeouts: NodeJS.Timeout[] = [];
    
    // Staged loading messages for better UX
    setGradingMessage('Step 1/3: Locating answers in your submission...');
    timeouts.push(setTimeout(() => setGradingMessage('Step 2/3: Validating submission against rubric...'), 4000));
    timeouts.push(setTimeout(() => setGradingMessage('Step 3/3: Grading responses... this may take a moment.'), 8000));

    try {
        const gradedLog = await gradeExam(quiz.questions, submissionToGrade);
        timeouts.forEach(clearTimeout); // Clear scheduled messages on completion
        const totalScore = gradedLog.reduce((sum, log) => sum + (log.questionScore || 0), 0);
        handleFinishStudy(totalScore, gradedLog);
    } catch (err) {
        timeouts.forEach(clearTimeout);
        console.error("Error during exam grading:", err);
        const errorMessage = err instanceof Error ? err.message : "An error occurred while grading. Please check your network and try again.";
        setGradingError(errorMessage);
        // Do not change app state, stay in GRADING to allow for retry
    }
  }, [quiz, submissionForRetry, handleFinishStudy]);
  
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
          <div className="flex flex-col items-center justify-center h-full bg-background-dark/80">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">Analyzing your notes and building your custom quiz...</p>
          </div>
        );
      case AppState.GRADING:
        if (gradingError) {
          return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark/80 text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-incorrect mb-4">Submission Failed</h2>
              <p className="text-text-secondary max-w-md mb-6">{gradingError}</p>
              <div className="flex gap-4">
                  <button onClick={() => handleFinishExam()} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary">Retry Submission</button>
                  <button onClick={handleRestart} className="px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">Cancel</button>
              </div>
            </div>
          )
        }
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark/80">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-text-secondary">{gradingMessage}</p>
            </div>
        );
      case AppState.STUDYING:
        return quiz ? <StudyScreen quiz={quiz} onFinish={handleFinishStudy} mode={studyMode} onQuit={handleRestart} /> : null;
      case AppState.EXAM_IN_PROGRESS:
        return quiz ? <ExamScreen quiz={quiz} onFinish={handleFinishExam} onCancel={handleRestart} /> : null;
      case AppState.RESULTS:
        const correctAnswers = answerLog.filter(log => log.isCorrect).length;
        const accuracy = answerLog.length > 0 ? Math.round((correctAnswers / answerLog.length) * 100) : 0;
        return <ResultsScreen 
            score={finalScore} 
            answerLog={answerLog} 
            onRestart={handleRestart} 
            onReview={() => {
              if (answerLog.length > 0 && currentStudySet) {
                handleReview({
                    id: 'review-session-' + Date.now(),
                    studySetId: currentStudySet.id,
                    date: new Date().toISOString(),
                    score: finalScore,
                    accuracy: accuracy,
                    answerLog: answerLog,
                    webSources: quiz?.webSources,
                    mode: studyMode,
                });
              }
            }} 
            webSources={quiz?.webSources} />;
      case AppState.REVIEWING:
        return <ReviewScreen answerLog={answerLog} webSources={quiz?.webSources} onRetakeSameQuiz={handleRetakeSameQuiz} onStartNewQuiz={handleRestart} />;
      case AppState.PREDICTION_SETUP:
        return currentStudySet ? <PredictionSetupScreen studySet={currentStudySet} onGenerate={handleGeneratePrediction} onCancel={handleRestart} error={error} /> : null;
      case AppState.PREDICTING:
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-case-text-light font-display">Analyzing case file... generating predictions...</p>
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
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl flex-grow flex flex-col">
        {renderCoreApp()}
      </div>
    </main>
  );
};

export default App;
