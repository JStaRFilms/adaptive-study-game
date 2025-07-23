
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, Quiz, QuizConfig, StudyMode, AnswerLog, PromptPart, QuizResult, OpenEndedAnswer, PredictedQuestion, StudySet, PersonalizedFeedback, KnowledgeSource } from './types';
import SetupScreen from './components/SetupScreen';
import StudyScreen from './components/StudyScreen';
import ResultsScreen from './components/ResultsScreen';
import ReviewScreen from './components/ReviewScreen';
import LoadingSpinner from './components/common/LoadingSpinner';
import LandingPage from './components/LandingPage';
import ExamScreen from './components/ExamScreen';
import PredictionSetupScreen from './components/PredictionSetupScreen';
import PredictionResultsScreen from './components/PredictionResultsScreen';
import StatsScreen from './components/StatsScreen';
import { generateQuiz, gradeExam, generateExamPrediction, generatePersonalizedFeedback } from './services/geminiService';
import { useQuizHistory } from './hooks/useQuizHistory';
import { useStudySets } from './hooks/useStudySets';
import { usePredictions } from './hooks/usePredictions';
import { useSRS } from './hooks/useSRS';
import { processFilesToParts } from './utils/fileProcessor';

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
  
  // Personalized Feedback State
  const [feedback, setFeedback] = useState<PersonalizedFeedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const [history, addQuizResult] = useQuizHistory();
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  const [predictions, addOrUpdatePrediction] = usePredictions();
  const [, updateSRSItem, getReviewPool] = useSRS();
  
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
    setFeedback(null);
    const set = studySets.find(s => s.id === studySetId) || null;
    setCurrentStudySet(set);
    try {
      const generatedQuiz = await generateQuiz(parts, config);
      if (generatedQuiz && generatedQuiz.questions) {
        generatedQuiz.questions.forEach(q => q.studySetId = studySetId);
      }
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
  
  const handleStartSrsQuiz = useCallback(() => {
    const reviewPool = getReviewPool();
    if (reviewPool.length === 0) {
      alert("No items are due for review yet. Keep practicing!");
      return;
    }

    const srsQuestions = reviewPool.map(item => {
        const questionWithId = { ...item.question, studySetId: item.studySetId };
        return questionWithId;
    });
    
    // Shuffle the questions so they aren't always in the same order
    for (let i = srsQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [srsQuestions[i], srsQuestions[j]] = [srsQuestions[j], srsQuestions[i]];
    }

    const srsQuiz: Quiz = {
        questions: srsQuestions.slice(0, 20), // Limit to 20 questions per session
    };

    setQuiz(srsQuiz);
    setStudyMode(StudyMode.SRS);
    setAnswerLog([]);
    setFeedback(null);
    setCurrentStudySet(null); // SRS quiz is cross-set
    setAppState(AppState.STUDYING);
  }, [getReviewPool]);

  const handleFinishStudy = useCallback(async (score: number, log: AnswerLog[]) => {
    setFinalScore(score);
    setAnswerLog(log);
    setAppState(AppState.RESULTS);
    setSubmissionForRetry(null);
    setGradingError(null);
    
    if (studyMode === StudyMode.SRS) {
        setFeedback(null);
        return;
    }

    if (!currentStudySet) return;
    
    const totalPointsAwarded = log.reduce((sum, l) => sum + l.pointsAwarded, 0);
    const totalMaxPoints = log.reduce((sum, l) => sum + l.maxPoints, 0);
    const accuracy = totalMaxPoints > 0 ? Math.round((totalPointsAwarded / totalMaxPoints) * 100) : 0;

    const resultStub: Omit<QuizResult, 'id' | 'feedback'> = {
        studySetId: currentStudySet.id,
        date: new Date().toISOString(),
        score: score,
        accuracy: accuracy,
        answerLog: log,
        webSources: quiz?.webSources,
        mode: studyMode,
    };
    
    let generatedFeedback: PersonalizedFeedback | null = null;
    if (studyMode !== StudyMode.EXAM) {
        setIsGeneratingFeedback(true);
        try {
            // Get the full history for this specific study set and add the current result for analysis
            const fullHistoryForAnalysis = [
                ...history.filter(h => h.studySetId === currentStudySet.id), 
                { ...resultStub, id: 'temp-id', feedback: null } // Add current result for analysis
            ];
            
            generatedFeedback = await generatePersonalizedFeedback(fullHistoryForAnalysis);
            setFeedback(generatedFeedback);

        } catch (feedbackError) {
            console.error("Failed to generate personalized feedback:", feedbackError);
            setFeedback(null); // Keep feedback null on error
        } finally {
            setIsGeneratingFeedback(false);
        }
    }
    
    // Add the final result to history, including the generated feedback
    addQuizResult({
        ...resultStub,
        feedback: generatedFeedback,
    });

  }, [studyMode, addQuizResult, currentStudySet, quiz?.webSources, history]);
  
  const handleFinishExam = useCallback(async (submission: OpenEndedAnswer) => {
    if (!quiz) return;
    setAppState(AppState.GRADING);
    setSubmissionForRetry(submission);
    setGradingError(null);
    setGradingMessage('Grading your exam answers...');
    try {
      const gradedLog = await gradeExam(quiz.questions, submission);
      const totalScore = gradedLog.reduce((acc, log) => acc + (log.pointsAwarded || 0), 0);
      const maxScore = gradedLog.reduce((acc, log) => acc + (log.maxPoints || 0), 0);
      const accuracy = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      
      setFinalScore(totalScore);
      setAnswerLog(gradedLog);

      if (currentStudySet) {
        addQuizResult({
            studySetId: currentStudySet.id,
            date: new Date().toISOString(),
            score: totalScore,
            accuracy: accuracy,
            answerLog: gradedLog,
            mode: StudyMode.EXAM,
            feedback: null,
        });
      }

      setAppState(AppState.RESULTS);
    } catch (err) {
      console.error("Error grading exam:", err);
      setGradingError(err instanceof Error ? err.message : "An unknown error occurred during grading.");
      setGradingMessage("Grading failed. You can retry.");
    }
  }, [quiz, addQuizResult, currentStudySet]);

  const handleRetryGrading = useCallback(async () => {
    if (submissionForRetry) {
        await handleFinishExam(submissionForRetry);
    }
  }, [submissionForRetry, handleFinishExam]);

  const handleReview = useCallback((resultToReview?: QuizResult) => {
    let logToReview: AnswerLog[];
    if (resultToReview) {
      logToReview = resultToReview.answerLog;
      setQuiz({ questions: resultToReview.answerLog.map(l => l.question), webSources: resultToReview.webSources });
      setFeedback(resultToReview.feedback || null);
      setIsGeneratingFeedback(false);
      // Find and set the study set to enable 'start focused quiz'
      setCurrentStudySet(studySets.find(s => s.id === resultToReview.studySetId) || null);
    } else {
      // This case handles reviewing the *current* session's results immediately after finishing
      logToReview = answerLog;
      setQuiz({ questions: answerLog.map(l => l.question), webSources: quiz?.webSources });
    }
    setAnswerLog(logToReview);
    setAppState(AppState.REVIEWING);
  }, [answerLog, quiz?.webSources, studySets]);

  const handleRestart = useCallback(() => {
    setAppState(AppState.SETUP);
    setQuiz(null);
    setError(null);
    setAnswerLog([]);
    setCurrentStudySet(null);
    setFeedback(null);
    setPredictionResults(null);
  }, []);
  
  const handlePredict = useCallback((studySetId: string) => {
    const set = studySets.find(s => s.id === studySetId) || null;
    if (!set) return;
    
    const existingPrediction = predictions.find(p => p.studySetId === studySetId);
    if (existingPrediction) {
      setPredictionResults(existingPrediction.results);
      setCurrentStudySet(set);
      setAppState(AppState.PREDICTION_RESULTS);
    } else {
      setCurrentStudySet(set);
      setAppState(AppState.PREDICTION_SETUP);
    }
  }, [studySets, predictions]);

  const handleGeneratePrediction = useCallback(async (data: any) => {
    if (!currentStudySet) return;
    setAppState(AppState.PREDICTING);
    setError(null);
    try {
      const results = await generateExamPrediction(data);
      setPredictionResults(results);
      addOrUpdatePrediction(currentStudySet.id, results);
      setAppState(AppState.PREDICTION_RESULTS);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during prediction.");
      setAppState(AppState.PREDICTION_SETUP);
    }
  }, [currentStudySet, addOrUpdatePrediction]);

  const handleUpdatePrediction = useCallback(() => {
    if (currentStudySet) {
      setAppState(AppState.PREDICTION_SETUP);
    }
  }, [currentStudySet]);

  const handleStartFocusedQuiz = useCallback(async (weaknessTopics: PersonalizedFeedback['weaknessTopics']) => {
    if (!currentStudySet) return;
    
    const { parts } = await processFilesToParts(currentStudySet.content, [], () => {});
    const topics = weaknessTopics.map(t => t.topic);
    const numQuestions = weaknessTopics.reduce((sum, t) => sum + t.suggestedQuestionCount, 0);

    const config: QuizConfig = {
      numberOfQuestions: Math.max(5, Math.min(50, numQuestions)),
      mode: StudyMode.REVIEW,
      knowledgeSource: KnowledgeSource.NOTES_ONLY,
      topics: topics,
    };
    
    await handleStartStudy(parts, config, currentStudySet.id);
  }, [currentStudySet, handleStartStudy]);
  
  const handleRetakeQuiz = useCallback(() => {
      setAppState(AppState.STUDYING);
      setAnswerLog([]);
      setFinalScore(0);
      setFeedback(null);
  }, []);
  
  const handleShowStats = useCallback(() => {
    setAppState(AppState.STATS);
  }, []);

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunchApp} onLaunchWithContent={handleLaunchWithContent} />;
  }

  const renderContent = () => {
    switch (appState) {
      case AppState.PROCESSING:
      case AppState.GRADING:
      case AppState.PREDICTING:
        const message =
          appState === AppState.PROCESSING ? 'Generating your quiz...' :
          appState === AppState.GRADING ? gradingMessage :
          'The AI detective is on the case...';
        return <div className="flex flex-col items-center justify-center min-h-[80vh]"><LoadingSpinner /><p className="mt-4 text-lg text-text-secondary">{message}</p>{appState === AppState.GRADING && gradingError && <button onClick={handleRetryGrading} className="mt-4 px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary">Retry Grading</button>}</div>;
      
      case AppState.STUDYING:
        if (!quiz) return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <StudyScreen quiz={quiz} onFinish={handleFinishStudy} onQuit={handleRestart} mode={studyMode} updateSRSItem={updateSRSItem} />;
      
      case AppState.RESULTS:
        return <ResultsScreen score={finalScore} answerLog={answerLog} onRestart={handleRestart} onReview={() => handleReview()} webSources={quiz?.webSources} feedback={feedback} isGeneratingFeedback={isGeneratingFeedback} onStartFocusedQuiz={handleStartFocusedQuiz}/>;
      
      case AppState.REVIEWING:
        if (answerLog.length === 0) return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <ReviewScreen answerLog={answerLog} webSources={quiz?.webSources} onRetakeSameQuiz={handleRetakeQuiz} onStartNewQuiz={handleRestart} feedback={feedback} isGeneratingFeedback={isGeneratingFeedback} onStartFocusedQuiz={handleStartFocusedQuiz} />;
      
      case AppState.EXAM_IN_PROGRESS:
        if (!quiz) return null;
        return <ExamScreen quiz={quiz} onFinish={handleFinishExam} onCancel={handleRestart} />;

      case AppState.PREDICTION_SETUP:
        if (!currentStudySet) return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <PredictionSetupScreen studySet={currentStudySet} onGenerate={handleGeneratePrediction} onCancel={handleRestart} error={error}/>;

      case AppState.PREDICTION_RESULTS:
        if (!predictionResults) return null;
        return <PredictionResultsScreen results={predictionResults} onBack={handleRestart} onUpdate={handleUpdatePrediction} />;
        
      case AppState.STATS:
        return <StatsScreen history={history} studySets={studySets} onBack={handleRestart} />;

      case AppState.SETUP:
      default:
        return <SetupScreen onStart={handleStartStudy} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
    }
  };

  const mainContainerClasses = isPredictionFlow
    ? 'min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8'
    : 'w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col justify-center';

  return (
    <div className={mainContainerClasses}>
      {renderContent()}
    </div>
  );
};

export default App;
