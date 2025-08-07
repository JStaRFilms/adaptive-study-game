

import React, { useState, useCallback, useEffect } from 'react';
import { AppState, Quiz, QuizConfig, StudyMode, AnswerLog, PromptPart, QuizResult, OpenEndedAnswer, PredictedQuestion, StudySet, PersonalizedFeedback, KnowledgeSource, ChatMessage, Question, QuestionType, MultipleChoiceQuestion, UserAnswer, MatchingQuestion, SequenceQuestion, ReadingLayout, CanvasGenerationProgress, ReadingBlock as ReadingBlockType } from './types';
import { GoogleGenAI, Chat } from '@google/genai';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
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
import ReadingCanvas from './components/reading/ReadingCanvas';
import AnnouncementBanner from './components/common/AnnouncementBanner';
import { generateQuiz, gradeExam, generateExamPrediction, generatePersonalizedFeedbackStreamed, buildReadingLayoutInParallel, identifyCoreConcepts, summarizeConcept } from './services/geminiService';
import { getStudyChatSystemInstruction, getReviewChatSystemInstruction, getReadingCanvasChatSystemInstruction } from './services/geminiPrompts';
import { useQuizHistory } from './hooks/useQuizHistory';
import { useStudySets } from './hooks/useStudySets';
import { usePredictions } from './hooks/usePredictions';
import { useSRS } from './hooks/useSRS';
import { processFilesToParts } from './utils/fileProcessor';
import { initializeDb } from './utils/db';
import MigrationScreen from './components/MigrationScreen';
import ProgressBar from './components/common/ProgressBar';

const LEGACY_STORAGE_KEYS = [
  'adaptive-study-game-sets',
  'adaptive-study-game-history',
  'adaptive-study-game-predictions',
  'adaptive-study-game-srs',
];

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [quizConfigForDisplay, setQuizConfigForDisplay] = useState<QuizConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [currentStudySet, setCurrentStudySet] = useState<StudySet | null>(null);
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictedQuestion[] | null>(null);
  
  // Grading & Retry State
  const [gradingMessage, setGradingMessage] = useState<string>('Grading your exam answers...');
  const [submissionForRetry, setSubmissionForRetry] = useState<OpenEndedAnswer | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // Processing State
  const [processingTask, setProcessingTask] = useState<'quiz' | 'canvas' | null>(null);
  const [canvasProgress, setCanvasProgress] = useState<CanvasGenerationProgress | null>(null);
  const [isUpdatingCanvas, setIsUpdatingCanvas] = useState<boolean>(false);
  
  // Personalized Feedback State
  const [feedback, setFeedback] = useState<Partial<PersonalizedFeedback> | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  // Chat State
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [pendingUIAction, setPendingUIAction] = useState<{ type: string; payload: any } | null>(null);


  const [history, addQuizResult, updateQuizResult] = useQuizHistory();
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  const [predictions, addOrUpdatePrediction] = usePredictions();
  const [, updateSRSItem, getReviewPool] = useSRS();
  
  useEffect(() => {
    const checkForMigration = async () => {
      // Check if any old data exists in localStorage
      const needsMigration = LEGACY_STORAGE_KEYS.some(key => localStorage.getItem(key) !== null);

      if (needsMigration) {
        setIsMigrating(true);
        // Trigger the database initialization which will run the migration logic.
        // Awaiting this ensures we don't proceed until the migration is complete.
        await initializeDb();
        setIsMigrating(false);
      }
      
      setMigrationChecked(true);
    };

    checkForMigration();
  }, []); // Empty dependency array ensures this runs only once on mount.

  const isPredictionFlow = [
    AppState.PREDICTION_SETUP,
    AppState.PREDICTING,
    AppState.PREDICTION_RESULTS,
  ].includes(appState);

  useEffect(() => {
    if (isPredictionFlow || isMigrating) {
        document.body.classList.remove('bg-background-dark', 'font-sans');
        document.body.classList.add('bg-pattern', 'font-serif');
    } else {
        document.body.classList.remove('bg-pattern', 'font-serif');
        document.body.classList.add('bg-background-dark', 'font-sans');
    }
  }, [isPredictionFlow, isMigrating]);


  const handleLaunchApp = useCallback(() => {
    setInitialContent(null);
    setShowLanding(false);
  }, []);

  const handleLaunchWithContent = useCallback((content: string) => {
    setInitialContent(content);
    setShowLanding(false);
  }, []);

  const handleStartStudy = useCallback(async (parts: PromptPart[], config: QuizConfig, studySetId: string) => {
    setProcessingTask('quiz');
    setAppState(AppState.PROCESSING);
    setStudyMode(config.mode);
    setError(null);
    setQuiz(null);
    setAnswerLog([]);
    setFeedback(null);
    setQuizConfigForDisplay(config);
    const set = studySets.find(s => s.id === studySetId) || null;
    setCurrentStudySet(set);
    try {
      const generatedQuiz = await generateQuiz(parts, config);
      if (generatedQuiz && generatedQuiz.questions) {
        generatedQuiz.questions.forEach(q => q.studySetId = studySetId);
      }
      if (generatedQuiz && generatedQuiz.questions.length > 0) {
        setQuiz(generatedQuiz);

        // Initialize Chat
        const firstKey = (process.env.API_KEY_POOL || process.env.API_KEY || process.env.GEMINI_API_KEY)?.split(',')[0].trim();
        if (firstKey && set) {
            try {
                const ai = new GoogleGenAI({ apiKey: firstKey });
                const historyForSet = history.filter(r => r.studySetId === studySetId);
                const systemInstruction = getStudyChatSystemInstruction(set, generatedQuiz, historyForSet);
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                });
                setChat(newChat);
                setChatMessages([
                    { role: 'model', text: `Hi! I'm your AI study coach. I have context on your notes for "${set.name}" and the questions in this quiz. Ask me anything about the current question!` }
                ]);
                setChatError(null);
            } catch (e) {
                console.error("Failed to initialize chat", e);
                setChatError("Could not start AI chat session.");
            }
        }

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
    } finally {
        setProcessingTask(null);
    }
  }, [studySets, history]);
  
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
    setQuizConfigForDisplay({
        numberOfQuestions: srsQuiz.questions.length,
        mode: StudyMode.SRS,
        knowledgeSource: KnowledgeSource.NOTES_ONLY
    });
    setAppState(AppState.STUDYING);
  }, [getReviewPool]);

  const handleFinishStudy = useCallback((log: AnswerLog[]) => {
    setAnswerLog(log);
    setAppState(AppState.RESULTS);
    setSubmissionForRetry(null);
    setGradingError(null);
    
    const totalPointsAwarded = log.reduce((sum, l) => sum + l.pointsAwarded, 0);
    const totalMaxPoints = log.reduce((sum, l) => sum + (l.maxPoints || 0), 0);
    const accuracy = totalMaxPoints > 0 ? Math.round((totalPointsAwarded / totalMaxPoints) * 100) : 0;
    const finalScore = totalPointsAwarded;

    if (studyMode === StudyMode.SRS) {
        setFeedback(null);
        setCurrentResult({
            id: `srs-session-${new Date().toISOString()}`,
            studySetId: 'srs-set',
            date: new Date().toISOString(),
            score: finalScore,
            accuracy,
            answerLog: log,
            mode: StudyMode.SRS,
        });
        return;
    }

    if (!currentStudySet) return;
    
    // Immediately calculate and show results, then fetch feedback
    (async () => {
        // Sanitize chat history by removing non-serializable 'action' property before saving
        const cleanedChatHistory = chatMessages.map(({ action, ...rest }) => rest);

        const initialResultData: Omit<QuizResult, 'id'> = {
            studySetId: currentStudySet.id,
            date: new Date().toISOString(),
            score: finalScore,
            accuracy: accuracy,
            answerLog: log,
            webSources: quiz?.webSources,
            mode: studyMode,
            feedback: null,
            chatHistory: cleanedChatHistory,
        };
        
        const initialResult = await addQuizResult(initialResultData);
        setCurrentResult(initialResult);

        if (studyMode !== StudyMode.EXAM) {
            setIsGeneratingFeedback(true);
            setFeedback({}); // Initialize as empty object for streaming

            let finalFeedback: PersonalizedFeedback | null = null;
            const fullHistoryForAnalysis = [initialResult, ...history];

            try {
                await generatePersonalizedFeedbackStreamed(fullHistoryForAnalysis, (partialFeedback) => {
                    setFeedback(prev => {
                        const newFeedback = { ...prev, ...partialFeedback };
                        finalFeedback = newFeedback as PersonalizedFeedback; // Keep track of the complete object
                        return newFeedback;
                    });
                });
                
                if (finalFeedback) {
                    const finalResult: QuizResult = { ...initialResult, feedback: finalFeedback };
                    setCurrentResult(finalResult);
                    await updateQuizResult(finalResult);
                }
            } catch (feedbackError) {
                console.error("Failed to generate personalized feedback:", feedbackError);
                setFeedback(null);
            } finally {
                setIsGeneratingFeedback(false);
            }
        }
    })();
  }, [studyMode, addQuizResult, updateQuizResult, currentStudySet, quiz?.webSources, history, chatMessages]);
  
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
      
      setAnswerLog(gradedLog);

      if (currentStudySet) {
        const newResult = await addQuizResult({
            studySetId: currentStudySet.id,
            date: new Date().toISOString(),
            score: totalScore,
            accuracy: accuracy,
            answerLog: gradedLog,
            mode: StudyMode.EXAM,
            feedback: null,
            chatHistory: [], // No chat in exam mode
        });
        setCurrentResult(newResult);
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

  const saveReviewChatIfDirty = useCallback(async () => {
    if (appState === AppState.REVIEWING && currentResult) {
        const cleanedChatHistory = chatMessages.map(({ action, ...rest }) => rest);
        // Only update if there's a change to prevent unnecessary writes
        if (JSON.stringify(cleanedChatHistory) !== JSON.stringify(currentResult.chatHistory || [])) {
             const updatedResult = { ...currentResult, chatHistory: cleanedChatHistory };
             await updateQuizResult(updatedResult);
        }
    }
  }, [appState, currentResult, chatMessages, updateQuizResult]);

  const saveReadingChatIfDirty = useCallback(async () => {
    if (appState === AppState.READING_CANVAS && currentStudySet) {
        const cleanedChatHistory = chatMessages.map(({ action, ...rest }) => rest);
        if (JSON.stringify(cleanedChatHistory) !== JSON.stringify(currentStudySet.readingChatHistory || [])) {
             const updatedSet = { ...currentStudySet, readingChatHistory: cleanedChatHistory };
             await updateSet(updatedSet);
             setCurrentStudySet(updatedSet); // Keep local state in sync
        }
    }
  }, [appState, currentStudySet, chatMessages, updateSet]);

  const handleStartFocusedQuiz = useCallback(async (
    weaknessTopics: PersonalizedFeedback['weaknessTopics'], 
    studySetForQuiz: StudySet | null
  ) => {
    await saveReviewChatIfDirty();
    setIsChatOpen(false);
    if (!studySetForQuiz) {
        console.error("handleStartFocusedQuiz called without a study set.");
        return;
    };
    
    const { parts } = await processFilesToParts(studySetForQuiz.content, [], () => {});
    const topics = weaknessTopics.map(t => t.topic);
    const numQuestions = weaknessTopics.reduce((sum, t) => sum + t.suggestedQuestionCount, 0);

    const config: QuizConfig = {
      numberOfQuestions: Math.max(5, Math.min(50, numQuestions)),
      mode: StudyMode.REVIEW,
      knowledgeSource: KnowledgeSource.NOTES_ONLY,
      topics: topics,
      customInstructions: `This is a focused review session. The user previously struggled with these topics: ${topics.join(', ')}. Generate questions that specifically test their understanding of these areas.`
    };
    
    await handleStartStudy(parts, config, studySetForQuiz.id);
  }, [handleStartStudy, saveReviewChatIfDirty]);

  const handleReview = useCallback(async (resultToReview: QuizResult) => {
    const reviewSet = studySets.find(s => s.id === resultToReview.studySetId) || null;
    
    setQuiz({ questions: resultToReview.answerLog.map(l => l.question), webSources: resultToReview.webSources });
    setFeedback(resultToReview.feedback || null);
    setIsGeneratingFeedback(false);
    setCurrentStudySet(reviewSet);
    setCurrentResult(resultToReview);
    setAnswerLog(resultToReview.answerLog);
    
    // Load chat for review, re-hydrating buttons and preventing duplicates
    const initialMessages: ChatMessage[] = resultToReview.chatHistory 
      ? JSON.parse(JSON.stringify(resultToReview.chatHistory))
      : [];
    
    if (initialMessages.length === 0 && reviewSet) {
        initialMessages.push({ role: 'model', text: `You are reviewing your quiz on "${reviewSet.name}". Feel free to ask me anything about your performance or the questions.` });
    }

    let hasWeaknessSuggestion = initialMessages.some(msg => msg.action && msg.action.text.includes('Create Focused Quiz'));
    const weaknessTopics = resultToReview.feedback?.weaknessTopics;

    // Re-hydrate existing suggestion buttons from saved history
    if (weaknessTopics && weaknessTopics.length > 0 && reviewSet) {
        initialMessages.forEach(msg => {
            const suggestionText = "Based on your results, I've identified some areas we can work on";
            if (msg.role === 'model' && msg.text.includes(suggestionText)) {
                msg.action = {
                    text: `Create Focused Quiz (${weaknessTopics.length} topic${weaknessTopics.length > 1 ? 's' : ''})`,
                    onClick: () => handleStartFocusedQuiz(weaknessTopics, reviewSet)
                };
                hasWeaknessSuggestion = true;
            }
        });
    }
    
    // Add a new suggestion if no existing one was found and re-hydrated
    if (weaknessTopics && weaknessTopics.length > 0 && !hasWeaknessSuggestion && reviewSet) {
        const suggestionMessage: ChatMessage = {
            role: 'model',
            text: "Based on your results, I've identified some areas we can work on. I can create a quiz to help you practice.",
            action: {
                text: `Create Focused Quiz (${weaknessTopics.length} topic${weaknessTopics.length > 1 ? 's' : ''})`,
                onClick: () => handleStartFocusedQuiz(weaknessTopics, reviewSet)
            }
        };
        initialMessages.push(suggestionMessage);
    }

    setChatMessages(initialMessages);
    
    if (reviewSet) {
        try {
            const firstKey = (process.env.API_KEY_POOL || process.env.API_KEY || process.env.GEMINI_API_KEY)?.split(',')[0].trim();
            if (firstKey) {
                const ai = new GoogleGenAI({ apiKey: firstKey });
                const systemInstruction = getReviewChatSystemInstruction(reviewSet, resultToReview, resultToReview.feedback || null);
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                });
                setChat(newChat);
                setChatError(null);
            }
        } catch (e) {
            console.error("Failed to initialize review chat", e);
            setChatError("Could not start AI review chat session.");
        }
    }

    setAppState(AppState.REVIEWING);
  }, [studySets, handleStartFocusedQuiz]);

  const handleRestart = useCallback(async () => {
    await saveReviewChatIfDirty();
    await saveReadingChatIfDirty();

    setAppState(AppState.SETUP);
    setQuiz(null);
    setError(null);
    setAnswerLog([]);
    setCurrentStudySet(null);
    setCurrentResult(null);
    setFeedback(null);
    setPredictionResults(null);
    setQuizConfigForDisplay(null);
    setChat(null);
    setChatMessages([]);
    setIsChatOpen(false);
    setIsAITyping(false);
    setChatError(null);
    setProcessingTask(null);
  }, [saveReviewChatIfDirty, saveReadingChatIfDirty]);
  
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
      await addOrUpdatePrediction(currentStudySet.id, results);
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

  
  const handleStartCustomQuiz = useCallback(async (
    topics: string[], 
    studySetForQuiz: StudySet | null, 
    numQuestions?: number
) => {
    await saveReviewChatIfDirty();
    await saveReadingChatIfDirty();
    setIsChatOpen(false);
    if (!studySetForQuiz) {
      console.error("handleStartCustomQuiz called without a study set.");
      return;
    }
    
    const { parts } = await processFilesToParts(studySetForQuiz.content, [], () => {});
    
    const config: QuizConfig = {
      numberOfQuestions: numQuestions 
        ? Math.min(50, Math.max(3, numQuestions)) // User-defined, capped
        : Math.min(25, Math.max(5, topics.length * 5)), // Heuristic
      mode: StudyMode.REVIEW,
      knowledgeSource: KnowledgeSource.NOTES_ONLY,
      topics: topics,
      customInstructions: `This is a focused review session. The user requested a quiz on these specific topics: ${topics.join(', ')}. Generate questions that test their understanding of these areas.`
    };
    
    await handleStartStudy(parts, config, studySetForQuiz.id);
  }, [handleStartStudy, saveReviewChatIfDirty, saveReadingChatIfDirty]);

  const handleRetakeQuiz = useCallback(async () => {
      await saveReviewChatIfDirty();
      setAppState(AppState.STUDYING);
      setAnswerLog([]);
      setFeedback(null);
  }, [saveReviewChatIfDirty]);
  
  const handleShowStats = useCallback(() => {
    setAppState(AppState.STATS);
  }, []);

  const handleGenerateCanvas = async (studySet: StudySet, config: { focusTopics?: string[], customPrompt?: string }) => {
    setProcessingTask('canvas');
    setAppState(AppState.PROCESSING);
    setCanvasProgress(null);
    try {
        const allParts: PromptPart[] = [];
        if (studySet.content?.trim()) {
            allParts.push({ text: studySet.content.trim() });
        }
        if (studySet.persistedFiles) {
            for (const pFile of studySet.persistedFiles) {
                if (pFile.type.startsWith('image/') || pFile.type.startsWith('audio/')) {
                    allParts.push({ inlineData: { mimeType: pFile.type, data: pFile.data }});
                }
            }
        }
        if (studySet.youtubeUrls) {
            studySet.youtubeUrls.forEach(url => {
                allParts.push({text: `\n\n[Content from YouTube video: ${url}]\nThis content should be analyzed by watching the video or reading its transcript.`});
            });
        }

        let topicsForLayout: string[] | undefined = config.focusTopics;

        if (config.customPrompt && config.customPrompt.trim()) {
            setCanvasProgress({ stage: 'Analyzing custom focus...', progress: 5 });
            topicsForLayout = await identifyCoreConcepts(allParts, config.customPrompt.trim());
        }

        const layout = await buildReadingLayoutInParallel(allParts, (progressUpdate) => {
            setCanvasProgress(progressUpdate);
        }, topicsForLayout);
        
        const updatedSet = { ...studySet, readingLayout: layout, subConceptCache: {} }; // Reset cache on new generation
        await updateSet(updatedSet);
        setCurrentStudySet(updatedSet);

        // Initialize chat for the newly generated canvas
        const firstKey = (process.env.API_KEY_POOL || process.env.API_KEY || process.env.GEMINI_API_KEY)?.split(',')[0].trim();
        if (firstKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: firstKey });
                const historyForSet = history.filter(r => r.studySetId === studySet.id);
                const systemInstruction = getReadingCanvasChatSystemInstruction(updatedSet, layout, historyForSet);
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                });
                setChat(newChat);
                // This is a new canvas, so chat history should be new.
                setChatMessages([
                    { role: 'model', text: `Hello! I'm your AI tutor for "${updatedSet.name}". Ask me anything about the concepts on the canvas, or ask me to create a custom quiz for you!` }
                ]);
                setChatError(null);
            } catch (e) {
                console.error("Failed to initialize reading chat after canvas generation", e);
                setChatError("Could not start AI chat session.");
            }
        }
        
        setAppState(AppState.READING_CANVAS);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while building the canvas. Please try again.");
        setAppState(AppState.SETUP);
    } finally {
        setProcessingTask(null);
        setCanvasProgress(null);
    }
  };

  const handleStartReading = useCallback(async (studySet: StudySet) => {
    setCurrentStudySet(studySet);
    setError(null);
    
    if (studySet.readingLayout) {
        // Chat Initialization for existing Reading Canvas
        const firstKey = (process.env.API_KEY_POOL || process.env.API_KEY || process.env.GEMINI_API_KEY)?.split(',')[0].trim();
        if (firstKey) {
            try {
                const ai = new GoogleGenAI({ apiKey: firstKey });
                const historyForSet = history.filter(r => r.studySetId === studySet.id);
                const systemInstruction = getReadingCanvasChatSystemInstruction(studySet, studySet.readingLayout, historyForSet);
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                });
                setChat(newChat);
                const initialMessages: ChatMessage[] = studySet.readingChatHistory ? JSON.parse(JSON.stringify(studySet.readingChatHistory)) : [];
                if (initialMessages.length === 0) {
                    initialMessages.push({ role: 'model', text: `Hello! I'm your AI tutor for "${studySet.name}". Ask me anything about the concepts on the canvas, or ask me to create a custom quiz for you!` });
                }
                setChatMessages(initialMessages);
                setChatError(null);
            } catch (e) {
                console.error("Failed to initialize reading chat", e);
                setChatError("Could not start AI chat session.");
            }
        }
        setAppState(AppState.READING_CANVAS);
    } else {
        // No layout exists, go to topic selection first
        setAppState(AppState.READING_SETUP);
    }
  }, [history]);
  
  const handleRegenerateCanvas = useCallback(async () => {
      if (!currentStudySet) return;
      // Go back to setup to allow re-selecting topics
      setAppState(AppState.READING_SETUP);
  }, [currentStudySet]);

  const handleUpdateCanvas = useCallback(async (newTopics: string[]) => {
    if (!currentStudySet) return;

    setError(null);

    const currentLayout = currentStudySet.readingLayout || { blocks: [], columns: 24, rows: 0 };
    const existingBlocksByTitle: Map<string, ReadingBlockType> = new Map(
        currentLayout.blocks.map(b => [b.title.toLowerCase().trim(), b])
    );
    
    const topicsToExpand: ReadingBlockType[] = [];
    const topicsToAdd: string[] = [];

    newTopics.forEach(topicStr => {
        const topicKey = topicStr.toLowerCase().trim();
        if (existingBlocksByTitle.has(topicKey)) {
            topicsToExpand.push(existingBlocksByTitle.get(topicKey)!);
        } else {
            topicsToAdd.push(topicStr);
        }
    });

    // Handle expansions for existing topics
    if (topicsToExpand.length > 0) {
        const blockToExp = topicsToExpand[0]; // Handle one at a time for simplicity
        
        const isAlreadyExpanded = currentLayout.blocks.some(b => b.parentId === blockToExp.id);
        
        if (!isAlreadyExpanded) {
            setPendingUIAction({ type: 'EXPAND_BLOCK', payload: { blockId: blockToExp.id } });
        } else {
            // Inform the user it's already expanded.
            setChatMessages(prev => [...prev, { role: 'model', text: `It looks like "${blockToExp.title}" is already expanded with more details.` }]);
        }
    }

    // Handle adding new blocks for new topics
    if (topicsToAdd.length === 0) {
        return; // No new topics to add, exit.
    }

    setIsUpdatingCanvas(true);

    try {
        const parts: PromptPart[] = [];
        if (currentStudySet.content?.trim()) {
            parts.push({ text: currentStudySet.content.trim() });
        }
        if (currentStudySet.persistedFiles) {
            for (const pFile of currentStudySet.persistedFiles) {
                if (pFile.type.startsWith('image/') || pFile.type.startsWith('audio/')) {
                    parts.push({ inlineData: { mimeType: pFile.type, data: pFile.data }});
                }
            }
        }
        if (currentStudySet.youtubeUrls) {
            currentStudySet.youtubeUrls.forEach(url => {
                parts.push({text: `\n\n[Content from YouTube video: ${url}]\nThis content should be analyzed by watching the video or reading its transcript.`});
            });
        }
        
        const newBlockPromises = topicsToAdd.map(topic => summarizeConcept(parts, topic));
        const newSummaries = await Promise.all(newBlockPromises);

        let nextRowStart = currentLayout.rows + 1;
        const DYNAMIC_BLOCK_ROW_HEIGHT = 2; // Each new block will take 2 rows height

        const newBlocks: ReadingBlockType[] = newSummaries.map((summary) => {
            if (!summary.title || !summary.summary) return null; // Guard against bad AI response
            const block: ReadingBlockType = {
                id: `dynamic-${Date.now()}-${summary.title.replace(/\s+/g, '-')}`,
                title: summary.title,
                summary: summary.summary,
                gridColumnStart: 1,
                gridColumnEnd: currentLayout.columns + 1,
                gridRowStart: nextRowStart,
                gridRowEnd: nextRowStart + DYNAMIC_BLOCK_ROW_HEIGHT,
            };
            nextRowStart += DYNAMIC_BLOCK_ROW_HEIGHT;
            return block;
        }).filter((b): b is ReadingBlockType => b !== null); // Filter out nulls
        
        const updatedBlocks = [...currentLayout.blocks, ...newBlocks];
        const updatedRows = nextRowStart - 1;

        const newLayout: ReadingLayout = {
            ...currentLayout,
            blocks: updatedBlocks,
            rows: updatedRows,
        };

        const updatedSet = { ...currentStudySet, readingLayout: newLayout };
        await updateSet(updatedSet);
        setCurrentStudySet(updatedSet);

    } catch (err) {
        console.error("Failed to update canvas:", err);
        setError(err instanceof Error ? err.message : "An AI error occurred while adding new topics.");
    } finally {
        setIsUpdatingCanvas(false);
    }
}, [currentStudySet, updateSet]);


  const handleSendMessage = useCallback(async (userMessage: string, contextQuestion?: Question, contextLog?: AnswerLog) => {
    if (!chat || isAITyping) return;
    
    const newUserMessage: ChatMessage = { role: 'user', text: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsAITyping(true);
    setChatError(null);

    setChatMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      let messageForAI = userMessage;
      if (contextQuestion && appState === AppState.STUDYING) {
        // This is for the STUDYING screen, add question context
        let contextString = `The user is on the following question:\n"""\n${contextQuestion.questionText}\n"""\n`;

        if (contextLog && contextLog.userAnswer !== null) {
            let userAnswerText = 'The user skipped this question.';
            if (contextLog.userAnswer !== 'SKIPPED') {
                 if (contextQuestion.questionType === QuestionType.MULTIPLE_CHOICE) {
                    const selectedOption = (contextQuestion as MultipleChoiceQuestion).options[contextLog.userAnswer as number];
                    userAnswerText = `The user answered: "${selectedOption}"`;
                } else if (contextQuestion.questionType === QuestionType.TRUE_FALSE) {
                    userAnswerText = `The user answered: ${contextLog.userAnswer ? 'True' : 'False'}`;
                } else if (contextQuestion.questionType === QuestionType.FILL_IN_THE_BLANK) {
                    userAnswerText = `The user answered: "${(contextLog.userAnswer as string[]).join('", "')}"`;
                } else if (contextQuestion.questionType === QuestionType.MATCHING) {
                    const matchingQ = contextQuestion as MatchingQuestion;
                    const userAnswerArray = contextLog.userAnswer as (number | null)[];
                    const matches = userAnswerArray
                        .map((promptIndex, answerIndex) => {
                            if (promptIndex === null) return null; // Skip unmatched answers
                            const promptText = `"${matchingQ.prompts[promptIndex]}"`;
                            const answerText = `"${matchingQ.answers[answerIndex]}"`;
                            return `${promptText} with ${answerText}`;
                        })
                        .filter(Boolean) // Remove nulls
                        .join('; and ');
                    
                    userAnswerText = matches ? `The user made the following matches: ${matches}.` : 'The user did not make any matches.';
                } else if (contextQuestion.questionType === QuestionType.SEQUENCE) {
                    const sequenceQ = contextQuestion as SequenceQuestion;
                    const userOrderIndices = contextLog.userAnswer as number[];
                    const orderedItemsText = userOrderIndices.map((originalIndex, displayIndex) => 
                        `${displayIndex + 1}. ${sequenceQ.items[originalIndex]}`
                    ).join('\n');
                    userAnswerText = `The user submitted the following order:\n${orderedItemsText}`;
                } else if (typeof contextLog.userAnswer === 'string' || typeof contextLog.userAnswer === 'number' || typeof contextLog.userAnswer === 'boolean') {
                    userAnswerText = `The user answered: "${contextLog.userAnswer}"`
                }
            }
            
            let correctness: string;
            if (contextLog.pointsAwarded === contextLog.maxPoints) {
                correctness = 'correctly';
            } else if (contextLog.pointsAwarded > 0) {
                correctness = 'partially correctly';
            } else {
                correctness = 'incorrectly';
            }
            contextString += `\nThey answered it ${correctness}. ${userAnswerText}\n`;
        }

        messageForAI = `${contextString}\nUser's message: ${userMessage}`;
      }
      
      const stream = await chat.sendMessageStream({ message: messageForAI });

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          setChatMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              const updatedMessages = [...prev];
              updatedMessages[prev.length - 1] = {
                ...lastMessage,
                text: lastMessage.text + chunkText,
              };
              return updatedMessages;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorText = err instanceof Error ? err.message : "An error occurred in the chat.";
      setChatError(errorText);
      setChatMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'model' && lastMessage.text === '') {
          const updatedMessages = [...prev];
          updatedMessages[prev.length - 1] = { role: 'model', text: `Sorry, I encountered an error: ${errorText}` };
          return updatedMessages;
        }
        return [...prev, { role: 'model', text: `Sorry, I encountered an error: ${errorText}` }];
      });
    } finally {
      setIsAITyping(false);
      // Check for action command in the last message
      setChatMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
            const quizActionMatch = lastMessage.text.match(/\[ACTION:CREATE_QUIZ:(.*?)\]/);
            const canvasActionMatch = lastMessage.text.match(/\[ACTION:UPDATE_CANVAS:(.*?)\]/);

            if (quizActionMatch && quizActionMatch[1]) {
                const paramsStr = quizActionMatch[1];
                const params = paramsStr.split('|').reduce((acc, part) => {
                    const [key, value] = part.split('=');
                    if (key && value) acc[key.trim()] = value.trim();
                    return acc;
                }, {} as Record<string, string>);

                const topics = params.topics ? params.topics.split(',').map(t => t.trim()).filter(Boolean) : [];
                const numQuestions = params.questions ? parseInt(params.questions, 10) : undefined;
                
                if (topics.length > 0) {
                    const cleanedText = lastMessage.text.replace(/\[ACTION:CREATE_QUIZ:.*?\]/, '').trim();
                    let buttonText = `Create Focused Quiz (${topics.length} topic${topics.length > 1 ? 's' : ''}${numQuestions ? `, ${numQuestions} questions` : ''})`;
                    const newMessages = [...prev];
                    newMessages[prev.length - 1] = {
                        ...lastMessage,
                        text: cleanedText,
                        action: { text: buttonText, onClick: () => handleStartCustomQuiz(topics, currentStudySet, numQuestions) }
                    };
                    return newMessages;
                }
            } else if (canvasActionMatch && canvasActionMatch[1]) {
                 const paramsStr = canvasActionMatch[1];
                 const topicsParam = paramsStr.split('=').slice(1).join('=');
                 const topics = topicsParam ? topicsParam.split(',').map(t => t.trim()).filter(Boolean) : [];
                 if (topics.length > 0) {
                    const cleanedText = lastMessage.text.replace(/\[ACTION:UPDATE_CANVAS:.*?\]/, '').trim();
                    let buttonText = `Update Canvas with "${topics.join(', ')}"`;
                    const newMessages = [...prev];
                    newMessages[prev.length - 1] = {
                        ...lastMessage,
                        text: cleanedText,
                        action: { text: buttonText, onClick: () => handleUpdateCanvas(topics) }
                    };
                    return newMessages;
                 }
            }
        }
        return prev;
      });
    }
  }, [chat, isAITyping, handleStartCustomQuiz, currentStudySet, appState, handleUpdateCanvas]);

  const handleClearChat = useCallback(() => {
    if (appState === AppState.READING_CANVAS && currentStudySet) {
        setChatMessages([{ role: 'model', text: `Hello! I'm your AI tutor for "${currentStudySet.name}". Ask me anything about the concepts on the canvas, or ask me to create a custom quiz for you!` }]);
    } else if (appState === AppState.REVIEWING && currentResult) {
         const reviewSet = studySets.find(s => s.id === currentResult.studySetId);
         setChatMessages([{ role: 'model', text: `You are reviewing your quiz on "${reviewSet?.name}". Feel free to ask me anything about your performance or the questions.` }]);
    }
  }, [appState, currentStudySet, currentResult, studySets]);

  if (!migrationChecked) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;
  }
  
  if (isMigrating) {
    return <MigrationScreen />;
  }

  if (showLanding) {
    return <LandingPage onLaunch={handleLaunchApp} onLaunchWithContent={handleLaunchWithContent} />;
  }

  const renderContent = () => {
    switch (appState) {
      case AppState.PROCESSING:
      case AppState.GRADING:
      case AppState.PREDICTING:
        const isCanvasTask = processingTask === 'canvas' && canvasProgress;
        const message =
          isCanvasTask ? canvasProgress.stage :
          appState === AppState.PROCESSING ? 'Generating your quiz...' :
          appState === AppState.GRADING ? gradingMessage :
          'The AI detective is on the case...';
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">{message}</p>
            {isCanvasTask && <div className="w-full max-w-xs mt-2"><ProgressBar progress={canvasProgress.progress} /></div>}
            <p className="mt-2 text-sm text-yellow-400">Please keep this page open. Leaving the app may interrupt the process.</p>
            {appState === AppState.GRADING && gradingError && <button onClick={handleRetryGrading} className="mt-4 px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary">Retry Grading</button>}
          </div>
        );
      
      case AppState.STUDYING:
        if (!quiz) return <SetupScreen onStart={handleStartStudy} onStartReading={handleStartReading} onStartCanvasGeneration={(studySet, config) => handleGenerateCanvas(studySet, { focusTopics: config.topics, customPrompt: config.customPrompt })} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <StudyScreen 
                    quiz={quiz} 
                    onFinish={handleFinishStudy} 
                    mode={studyMode} 
                    updateSRSItem={updateSRSItem} 
                    quizConfig={quizConfigForDisplay}
                    history={history}
                    chatMessages={chatMessages}
                    isChatOpen={isChatOpen}
                    isAITyping={isAITyping}
                    chatError={chatError}
                    isChatEnabled={!!chat}
                    onSendMessage={(msg, q, log) => handleSendMessage(msg, q, log)}
                    onToggleChat={() => setIsChatOpen(!isChatOpen)}
                    onCloseChat={() => setIsChatOpen(false)}
                />;
      
      case AppState.RESULTS:
        if (!currentResult) return null; // This now correctly handles the period before feedback is ready
        return <ResultsScreen result={currentResult} onRestart={handleRestart} onReview={handleReview} feedback={feedback} isGeneratingFeedback={isGeneratingFeedback} onStartFocusedQuiz={(topics) => handleStartFocusedQuiz(topics, currentStudySet)} />;
      
      case AppState.REVIEWING:
        if (answerLog.length === 0 || !currentResult) return <SetupScreen onStart={handleStartStudy} onStartReading={handleStartReading} onStartCanvasGeneration={(studySet, config) => handleGenerateCanvas(studySet, { focusTopics: config.topics, customPrompt: config.customPrompt })} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <ReviewScreen 
                  result={currentResult} 
                  onRetakeSameQuiz={handleRetakeQuiz} 
                  onStartNewQuiz={handleRestart} 
                  isGeneratingFeedback={isGeneratingFeedback} 
                  onStartFocusedQuiz={(topics) => handleStartFocusedQuiz(topics, currentStudySet)}
                  chatMessages={chatMessages}
                  isChatOpen={isChatOpen}
                  isAITyping={isAITyping}
                  chatError={chatError}
                  isChatEnabled={!!chat}
                  onSendMessage={(msg) => handleSendMessage(msg)}
                  onToggleChat={() => setIsChatOpen(!isChatOpen)}
                  onCloseChat={() => setIsChatOpen(false)}
               />;
      
      case AppState.EXAM_IN_PROGRESS:
        if (!quiz) return null;
        return <ExamScreen quiz={quiz} onFinish={handleFinishExam} onCancel={handleRestart} />;

      case AppState.PREDICTION_SETUP:
        if (!currentStudySet) return <SetupScreen onStart={handleStartStudy} onStartReading={handleStartReading} onStartCanvasGeneration={(studySet, config) => handleGenerateCanvas(studySet, { focusTopics: config.topics, customPrompt: config.customPrompt })} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <PredictionSetupScreen studySet={currentStudySet} onGenerate={handleGeneratePrediction} onCancel={handleRestart} error={error}/>;

      case AppState.PREDICTION_RESULTS:
        if (!predictionResults) return null;
        return <PredictionResultsScreen results={predictionResults} onBack={handleRestart} onUpdate={handleUpdatePrediction} />;
        
      case AppState.STATS:
        return <StatsScreen history={history} studySets={studySets} onBack={handleRestart} />;

      case AppState.READING_SETUP:
      case AppState.READING_CANVAS:
        if (!currentStudySet) return <SetupScreen onStart={handleStartStudy} onStartReading={handleStartReading} onStartCanvasGeneration={(studySet, config) => handleGenerateCanvas(studySet, { focusTopics: config.topics, customPrompt: config.customPrompt })} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
        return <ReadingCanvas 
                    studySet={currentStudySet}
                    appState={appState}
                    isUpdatingCanvas={isUpdatingCanvas}
                    onBack={handleRestart} 
                    onRegenerate={handleRegenerateCanvas}
                    onGenerate={(config) => handleGenerateCanvas(currentStudySet, { focusTopics: config.selectedTopics, customPrompt: config.customPrompt })}
                    updateSet={updateSet}
                    chatMessages={chatMessages}
                    isChatOpen={isChatOpen}
                    isAITyping={isAITyping}
                    chatError={chatError}
                    isChatEnabled={!!chat}
                    onSendMessage={(msg) => handleSendMessage(msg)}
                    onToggleChat={() => setIsChatOpen(!isChatOpen)}
                    onCloseChat={() => setIsChatOpen(false)}
                    onClearChat={handleClearChat}
                    onStartCustomQuiz={handleStartCustomQuiz}
                    pendingUIAction={pendingUIAction}
                    onActionConsumed={() => setPendingUIAction(null)}
                />;

      case AppState.SETUP:
      default:
        return <SetupScreen onStart={handleStartStudy} onStartReading={handleStartReading} onStartCanvasGeneration={(studySet, config) => handleGenerateCanvas(studySet, { focusTopics: config.topics, customPrompt: config.customPrompt })} error={error} initialContent={initialContent} onReviewHistory={handleReview} onPredict={handlePredict} studySets={studySets} addSet={addSet} updateSet={updateSet} deleteSet={deleteSet} history={history} onShowStats={handleShowStats} onStartSrsQuiz={handleStartSrsQuiz} reviewPoolCount={getReviewPool().length} />;
    }
  };

  const mainContainerClasses = (() => {
    if (isPredictionFlow) {
        return 'flex-grow flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8';
    }
    if (appState === AppState.READING_CANVAS || appState === AppState.READING_SETUP) {
        // Full width for the canvas view
        return 'w-full p-4 sm:p-6 lg:p-8 flex-grow flex flex-col';
    }
    // Default centered layout for other screens like Setup, Study, Results
    return 'w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col justify-center';
  })();

  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBanner />
      <main className={mainContainerClasses}>
        {renderContent()}
      </main>
      <SpeedInsights />
      <Analytics />
    </div>
  );
};

export default App;
