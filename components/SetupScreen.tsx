
import React, { useState, useCallback, useEffect } from 'react';
import { StudySet, QuizConfig, PromptPart, QuizResult } from '../types';
import { generateTopics } from '../services/geminiService';
import { processFilesToParts } from '../utils/fileProcessor';
import StudySetList from './setup/StudySetList';
import StudySetForm from './setup/StudySetForm';
import TopicSelector from './setup/TopicSelector';
import QuizHistoryView from './setup/QuizHistoryView';

interface SetupScreenProps {
  onStart: (parts: PromptPart[], config: QuizConfig, studySetId: string) => void;
  error: string | null;
  initialContent?: string | null;
  onReviewHistory: (result: QuizResult) => void;
  onPredict: (studySetId: string) => void;
  studySets: StudySet[];
  addSet: (set: Omit<StudySet, 'id' | 'createdAt'>) => Promise<StudySet>;
  updateSet: (set: StudySet) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  onShowStats: () => void;
  history: QuizResult[];
  onStartSrsQuiz: () => void;
  reviewPoolCount: number;
}

type Action = 'LIST' | 'CREATE_EDIT' | 'HISTORY' | 'TOPIC_SELECTION';

const SetupScreen: React.FC<SetupScreenProps> = ({ 
    onStart, 
    error, 
    initialContent, 
    onReviewHistory, 
    onPredict,
    studySets,
    addSet,
    updateSet,
    deleteSet,
    onShowStats,
    history,
    onStartSrsQuiz,
    reviewPoolCount
}) => {
  const [action, setAction] = useState<Action>('LIST');
  
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
  const [processingError, setProcessingError] = useState<string|null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [preparedParts, setPreparedParts] = useState<PromptPart[]>([]);
  const [topics, setTopics] = useState<string[] | null>(null);

  const resetState = useCallback(() => {
    setActiveSet(null);
    setIsProcessing(false);
    setProcessingError(null);
    setProgressMessage(null);
    setProgressPercent(0);
    setPreparedParts([]);
    setIsAnalyzingTopics(false);
    setTopics(null);
  }, []);

  const handleShowList = useCallback(() => {
    resetState();
    setAction('LIST');
  }, [resetState]);

  useEffect(() => {
    if (initialContent !== null) {
      resetState();
      setAction('CREATE_EDIT');
    }
  }, [initialContent, resetState]);

  const onProgress = useCallback((message: string, percent: number) => {
    setProgressMessage(message);
    setProgressPercent(percent);
  }, []);

  const handlePrepareForQuiz = useCallback(async (set: StudySet, supplementalFiles: File[] = []) => {
    resetState();
    setActiveSet(set);
    setIsProcessing(true);
    setProcessingError(null);
    setProgressPercent(0);

    try {
        const onReanalyzeProgress = (message: string, percent: number) => {
            setProgressMessage(message);
            setProgressPercent(Math.round(percent * 0.7)); // Reserve 30% for topic step
        };

        const { parts, combinedText, fileInfo } = await processFilesToParts(set.content, supplementalFiles, onReanalyzeProgress);
        setPreparedParts(parts);
        
        let currentSet = set;
        if (supplementalFiles.length > 0) {
            const updatedSetData: StudySet = {
                ...set,
                content: combinedText.trim(),
                fileInfo: [...(set.fileInfo || []), ...fileInfo],
                topics: [] // Invalidate topics if new files are added
            };
            await updateSet(updatedSetData);
            currentSet = updatedSetData;
        }
        setActiveSet(currentSet);

        // Check for existing topics
        if (currentSet.topics && currentSet.topics.length > 0) {
            setProgressMessage('Loading existing topics...');
            setProgressPercent(100);
            setTopics(currentSet.topics);
        } else {
            setProgressMessage('Analyzing for topics...');
            setProgressPercent(75);
            const generatedTopics = await generateTopics(parts);
            
            // Save the new topics to the study set
            const updatedSetWithTopics: StudySet = { ...currentSet, topics: generatedTopics };
            await updateSet(updatedSetWithTopics);
            setActiveSet(updatedSetWithTopics);
            setTopics(generatedTopics);
            setProgressPercent(90);
        }
        
        setProgressPercent(100);
        await new Promise(res => setTimeout(res, 300));

        setAction('TOPIC_SELECTION');
    } catch (err) {
        console.error("Error preparing quiz:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setProcessingError(errorMessage);
        setAction('LIST');
    } finally {
        setIsProcessing(false);
    }
  }, [resetState, updateSet]);

  const fullSaveAndAnalyze = async (data: {name: string, content: string, files: File[]}) => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
        const { parts, combinedText, fileInfo } = await processFilesToParts(data.content, data.files, onProgress);
        setPreparedParts(parts);
        
        setIsProcessing(false);
        setIsAnalyzingTopics(true);

        const generatedTopics = await generateTopics(parts);
        setTopics(generatedTopics);
        
        setIsAnalyzingTopics(false);
        
        let currentSet: StudySet;
        if (activeSet) { // Editing
            currentSet = { ...activeSet, name: data.name, content: combinedText.trim(), fileInfo: [...(activeSet.fileInfo || []), ...fileInfo], topics: generatedTopics };
            await updateSet(currentSet);
        } else { // Creating
            currentSet = await addSet({ name: data.name, content: combinedText.trim(), fileInfo, topics: generatedTopics });
        }
        setActiveSet(currentSet);

        setAction('TOPIC_SELECTION');
    } catch (err) {
        console.error("Error during analysis pipeline:", err);
        setProcessingError(err instanceof Error ? err.message : "An unknown error occurred.");
        setIsProcessing(false);
        setIsAnalyzingTopics(false);
    }
  };

  const fullSaveOnly = async (data: {name: string, content: string, files: File[]}) => {
    setIsProcessing(true);
    setProcessingError(null);
    try {
        const { combinedText, fileInfo } = await processFilesToParts(data.content, data.files, onProgress);
        if (activeSet) {
            const contentChanged = activeSet.content !== combinedText.trim();
            const filesChanged = data.files.length > 0;
            // Clear topics if content changed, otherwise preserve them.
            const newTopics = (contentChanged || filesChanged) ? [] : activeSet.topics || [];
            await updateSet({ ...activeSet, name: data.name, content: combinedText.trim(), fileInfo: [...(activeSet.fileInfo || []), ...fileInfo], topics: newTopics });
        } else {
            await addSet({ name: data.name, content: combinedText.trim(), fileInfo, topics: [] });
        }
        handleShowList();
    } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleStartQuiz = (config: {numQuestions: number, studyMode: any, knowledgeSource: any, selectedTopics: string[]}) => {
    if (!activeSet) return;
    const finalConfig: QuizConfig = {
      numberOfQuestions: config.numQuestions,
      mode: config.studyMode,
      knowledgeSource: config.knowledgeSource,
      topics: config.selectedTopics,
    };
    onStart(preparedParts, finalConfig, activeSet.id);
  };
  
  const handleRegenerateTopics = async () => {
    if (!activeSet) return;
    setIsAnalyzingTopics(true);
    try {
        const generatedTopics = await generateTopics(preparedParts);
        const updatedSetWithTopics: StudySet = { ...activeSet, topics: generatedTopics };
        await updateSet(updatedSetWithTopics);
        setActiveSet(updatedSetWithTopics);
        setTopics(generatedTopics);
    } catch (err) {
        console.error("Error regenerating topics", err);
    } finally {
        setIsAnalyzingTopics(false);
    }
  };

  const handleReanalyzeWithFiles = async (files: File[]) => {
      if (!activeSet) return;
      await handlePrepareForQuiz(activeSet, files);
  };
  
  const handleNewSet = () => {
    resetState();
    setAction('CREATE_EDIT');
  };

  const handleEditSet = (set: StudySet) => {
    resetState();
    setActiveSet(set);
    setAction('CREATE_EDIT');
  };

  const handleShowHistory = (set: StudySet) => {
      setActiveSet(set);
      setAction('HISTORY');
  };

  const handleDeleteSet = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this study set?")) {
        await deleteSet(id);
    }
  };

  switch (action) {
    case 'CREATE_EDIT':
      return <StudySetForm 
                activeSet={activeSet}
                initialContent={initialContent}
                isProcessing={isProcessing}
                isAnalyzingTopics={isAnalyzingTopics}
                processingError={processingError}
                progressMessage={progressMessage}
                progressPercent={progressPercent}
                onSave={fullSaveAndAnalyze}
                onSaveOnly={fullSaveOnly}
                onCancel={handleShowList}
             />;
    case 'TOPIC_SELECTION':
        return activeSet ? <TopicSelector 
            activeSet={activeSet}
            topics={topics}
            isAnalyzingTopics={isAnalyzingTopics}
            isProcessing={isProcessing}
            processingError={processingError}
            progressPercent={progressPercent}
            onStartQuiz={handleStartQuiz}
            onBack={handleShowList}
            onRegenerateTopics={handleRegenerateTopics}
            onReanalyzeWithFiles={handleReanalyzeWithFiles}
        /> : null;
    case 'HISTORY':
        return activeSet ? <QuizHistoryView 
            activeSet={activeSet}
            history={history.filter(h => h.studySetId === activeSet.id)}
            onBack={handleShowList}
            onReviewHistory={onReviewHistory}
        /> : null;
    case 'LIST':
    default:
      return <StudySetList 
                studySets={studySets}
                error={error}
                processingError={processingError}
                isProcessing={isProcessing}
                onNewSet={handleNewSet}
                onEditSet={handleEditSet}
                onDeleteSet={handleDeleteSet}
                onPrepareForQuiz={handlePrepareForQuiz}
                onPredict={onPredict}
                onShowHistory={handleShowHistory}
                onShowStats={onShowStats}
                onStartSrsQuiz={onStartSrsQuiz}
                reviewPoolCount={reviewPoolCount}
             />;
  }
};

export default SetupScreen;
