

import React, { useState, useCallback, useEffect } from 'react';
import { StudySet, QuizConfig, PromptPart, QuizResult } from '../types';
import { generateTopics } from '../services/geminiService';
import { processFilesToParts } from '../utils/fileProcessor';
import LoadingSpinner from './common/LoadingSpinner';
import ProgressBar from './common/ProgressBar';
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
  addSet: (set: Omit<StudySet, 'id' | 'createdAt'>) => StudySet;
  updateSet: (set: StudySet) => void;
  deleteSet: (setId: string) => void;
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
    deleteSet
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
    if (initialContent) {
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
            updateSet(updatedSetData);
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
            updateSet(updatedSetWithTopics);
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
            updateSet(currentSet);
        } else { // Creating
            currentSet = addSet({ name: data.name, content: combinedText.trim(), fileInfo, topics: generatedTopics });
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
            const newTopics = (contentChanged || filesChanged) ? [] : activeSet.topics;
            updateSet({ ...activeSet, name: data.name, content: combinedText.trim(), fileInfo: [...(activeSet.fileInfo || []), ...fileInfo], topics: newTopics });
        } else {
            addSet({ name: data.name, content: combinedText.trim(), fileInfo, topics: [] });
        }
        handleShowList();
    } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An error occurred.");
        setIsProcessing(false);
    }
  };
  
  const handleRegenerateTopics = useCallback(async () => {
    if (preparedParts.length === 0 || !activeSet) return;
    setIsAnalyzingTopics(true);
    setProcessingError(null);
    setTopics(null);
    try {
        const newTopics = await generateTopics(preparedParts);
        setTopics(newTopics);
        // Update the active set with the new topics and save it
        const updatedSet = { ...activeSet, topics: newTopics };
        updateSet(updatedSet);
        setActiveSet(updatedSet);
    } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An error occurred.");
        setTopics([]);
    } finally {
        setIsAnalyzingTopics(false);
    }
  }, [preparedParts, activeSet, updateSet]);

  const handleStartQuizWithConfig = (config: { numQuestions: number, studyMode: any, knowledgeSource: any, selectedTopics: string[]}) => {
    if (!activeSet) return;
    const quizConfig: QuizConfig = {
        numberOfQuestions: config.numQuestions,
        mode: config.studyMode,
        knowledgeSource: config.knowledgeSource,
        topics: config.selectedTopics,
    };
    onStart(preparedParts, quizConfig, activeSet.id);
  };

  if (isProcessing && action === 'LIST') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[80vh]"><LoadingSpinner /><p className="mt-4 text-lg text-text-secondary">{progressMessage || 'Preparing...'}</p><div className="w-full max-w-sm mt-2"><ProgressBar progress={progressPercent} /></div></div>
      );
  }

  const studySetListProps = {
    studySets,
    error,
    processingError,
    isProcessing,
    onNewSet: () => { resetState(); setAction('CREATE_EDIT'); },
    onEditSet: (set: StudySet) => { resetState(); setActiveSet(set); setAction('CREATE_EDIT'); },
    onDeleteSet: deleteSet,
    onPredict: onPredict,
    onPrepareForQuiz: handlePrepareForQuiz,
    onShowHistory: (set: StudySet) => { resetState(); setActiveSet(set); setAction('HISTORY'); },
  };

  switch (action) {
    case 'CREATE_EDIT': 
      return <StudySetForm 
        activeSet={activeSet}
        initialContent={initialContent}
        onSave={fullSaveAndAnalyze}
        onSaveOnly={fullSaveOnly}
        onCancel={handleShowList}
        isProcessing={isProcessing}
        isAnalyzingTopics={isAnalyzingTopics}
        processingError={processingError}
        progressMessage={progressMessage}
        progressPercent={progressPercent}
      />;
    case 'TOPIC_SELECTION': 
      if (!activeSet) return <StudySetList {...studySetListProps} />;
      return <TopicSelector 
        activeSet={activeSet}
        topics={topics}
        isAnalyzingTopics={isAnalyzingTopics}
        isProcessing={isProcessing}
        processingError={processingError}
        progressPercent={progressPercent}
        onStartQuiz={handleStartQuizWithConfig}
        onBack={handleShowList}
        onRegenerateTopics={handleRegenerateTopics}
        onReanalyzeWithFiles={(files) => handlePrepareForQuiz(activeSet, files)}
      />;
    case 'HISTORY': 
      if (!activeSet) return <StudySetList {...studySetListProps} />;
      return <QuizHistoryView 
        activeSet={activeSet}
        onBack={handleShowList}
        onReviewHistory={onReviewHistory}
      />;
    case 'LIST': 
    default: 
      return <StudySetList {...studySetListProps} />;
  }
};

export default SetupScreen;