import React, { useState, useCallback, useEffect } from 'react';
import { StudySet, QuizConfig, PromptPart, QuizResult } from '../types';
import { identifyCoreConcepts } from '../services/geminiService';
import { processFilesToParts } from '../utils/fileProcessor';
import StudySetList from './setup/StudySetList';
import StudySetForm from './setup/StudySetForm';
import TopicSelector from './setup/TopicSelector';
import QuizHistoryView from './setup/QuizHistoryView';
import LoadingSpinner from './common/LoadingSpinner';
import ProgressBar from './common/ProgressBar';

const ProcessingModal: React.FC<{ title: string; message: string; progress: number; }> = ({ title, message, progress }) => (
    <div className="fixed inset-0 bg-background-dark bg-opacity-90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="bg-surface-dark p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-6">{title}</h2>
            <div className="flex justify-center mb-6">
                <LoadingSpinner />
            </div>
            <p className="text-xl font-semibold text-text-secondary mb-4">{message}</p>
            <div className="w-full max-w-xs mx-auto mb-4">
                <ProgressBar progress={progress} />
            </div>
            <p className="text-sm text-text-secondary mb-4">This may take a moment...</p>
            <p className="text-sm text-yellow-400 font-semibold">Please keep this page open. Leaving the app may interrupt the process.</p>
        </div>
    </div>
);

interface SetupScreenProps {
  onStart: (parts: PromptPart[], config: QuizConfig, studySetId: string) => void;
  onStartReading: (set: StudySet) => void;
  onStartCanvasGeneration: (studySet: StudySet, config: { topics: string[], customPrompt: string }) => void;
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

type Action = 'LIST' | 'CREATE_EDIT' | 'HISTORY' | 'TOPIC_SELECTION' | 'CANVAS_TOPIC_SELECTION';

const SetupScreen: React.FC<SetupScreenProps> = ({ 
    onStart, 
    onStartReading,
    onStartCanvasGeneration,
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

  const prepareAndAnalyzeTopics = useCallback(async (set: StudySet, parts: PromptPart[], nextAction: Action) => {
    resetState();
    setActiveSet(set);
    setIsProcessing(true);
    setProcessingError(null);
    setProgressPercent(0);
    setPreparedParts(parts);

    try {
        let currentSet = set;
        const onTopicProgress = (message: string, percent: number) => {
            setProgressMessage(message);
            setProgressPercent(percent);
        };
        onTopicProgress('Checking for topics...', 25);
        
        if (currentSet.topics && currentSet.topics.length > 0) {
            onTopicProgress('Loading existing topics...', 100);
            setTopics(currentSet.topics);
        } else {
            onTopicProgress('Analyzing for topics...', 75);
            const generatedTopics = await identifyCoreConcepts(parts);
            const updatedSetWithTopics: StudySet = { ...currentSet, topics: generatedTopics };
            await updateSet(updatedSetWithTopics);
            setActiveSet(updatedSetWithTopics);
            setTopics(generatedTopics);
            onTopicProgress('Topics generated!', 90);
        }
        
        setProgressPercent(100);
        await new Promise(res => setTimeout(res, 300));

        setAction(nextAction);
    } catch (err) {
        console.error("Error preparing for action:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setProcessingError(errorMessage);
        setAction('LIST');
    } finally {
        setIsProcessing(false);
    }
  }, [resetState, updateSet]);


    const handlePrepareForQuiz = useCallback(async (parts: PromptPart[], set: StudySet) => {
        await prepareAndAnalyzeTopics(set, parts, 'TOPIC_SELECTION');
    }, [prepareAndAnalyzeTopics]);
    
    const handlePrepareForCanvas = useCallback(async (set: StudySet) => {
        const { parts } = await processFilesToParts(set.content, [], () => {});
        await prepareAndAnalyzeTopics(set, parts, 'CANVAS_TOPIC_SELECTION');
    }, [prepareAndAnalyzeTopics]);


    const fullSaveAndAnalyze = async (data: {name: string, content: string, files: File[], youtubeUrls: string[]}) => {
        setIsProcessing(true);
        setProcessingError(null);

        try {
            const { combinedText, persistedFiles } = await processFilesToParts(data.content, data.files, onProgress);
            
            let currentSet: StudySet;
            let finalPersistedFiles = persistedFiles;

            if (activeSet) { // Editing
                finalPersistedFiles = [...(activeSet.persistedFiles || []), ...persistedFiles];
                currentSet = { ...activeSet, name: data.name, content: combinedText.trim(), persistedFiles: finalPersistedFiles, topics: [], youtubeUrls: data.youtubeUrls }; // Clear topics on content change
                await updateSet(currentSet);
            } else { // Creating
                currentSet = await addSet({ name: data.name, content: combinedText.trim(), persistedFiles: finalPersistedFiles, topics: [], youtubeUrls: data.youtubeUrls });
            }
            
            // Now that the set is saved, prepare the parts for topic analysis
            const parts: PromptPart[] = [];
            if (currentSet.content) { parts.push({ text: currentSet.content }); }
            if (currentSet.persistedFiles) {
                currentSet.persistedFiles.forEach(pf => {
                     if (pf.type.startsWith('image/') || pf.type.startsWith('audio/')) {
                        parts.push({ inlineData: { mimeType: pf.type, data: pf.data } });
                     }
                });
            }
            if (currentSet.youtubeUrls) {
                currentSet.youtubeUrls.forEach(url => {
                    parts.push({text: `\n\n[Content from YouTube video: ${url}]\nThis content should be analyzed by watching the video or reading its transcript.`});
                });
            }

            setPreparedParts(parts);
            
            setIsProcessing(false);
            setIsAnalyzingTopics(true);
            const generatedTopics = await identifyCoreConcepts(parts);
            setTopics(generatedTopics);
            
            // Save the new topics to the study set
            const updatedSetWithTopics: StudySet = { ...currentSet, topics: generatedTopics };
            await updateSet(updatedSetWithTopics);
            setActiveSet(updatedSetWithTopics);
            
            setIsAnalyzingTopics(false);
            setAction('TOPIC_SELECTION');
        } catch (err) {
            console.error("Error during analysis pipeline:", err);
            setProcessingError(err instanceof Error ? err.message : "An unknown error occurred.");
            setIsProcessing(false);
            setIsAnalyzingTopics(false);
        }
    };
    
    const fullSaveOnly = async (data: {name: string, content: string, files: File[], youtubeUrls: string[]}) => {
        setIsProcessing(true);
        setProcessingError(null);
        try {
            const { combinedText, persistedFiles } = await processFilesToParts(data.content, data.files, onProgress);
            
            if (activeSet) {
                const contentChanged = activeSet.content !== combinedText.trim() 
                    || persistedFiles.length > 0 
                    || JSON.stringify(activeSet.youtubeUrls) !== JSON.stringify(data.youtubeUrls);

                const finalPersistedFiles = [...(activeSet.persistedFiles || []), ...persistedFiles];
                await updateSet({ 
                    ...activeSet, 
                    name: data.name, 
                    content: combinedText.trim(),
                    persistedFiles: finalPersistedFiles,
                    youtubeUrls: data.youtubeUrls,
                    topics: contentChanged ? [] : activeSet.topics || [] // Clear topics if content changed
                });
            } else {
                await addSet({ name: data.name, content: combinedText.trim(), persistedFiles, topics: [], youtubeUrls: data.youtubeUrls });
            }
            handleShowList();
        } catch (err) {
            setProcessingError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };
  
    const handleStartQuiz = (config: {numQuestions: number, studyMode: any, knowledgeSource: any, selectedTopics: string[], customInstructions: string}) => {
        if (!activeSet) return;
        const finalConfig: QuizConfig = {
          numberOfQuestions: config.numQuestions,
          mode: config.studyMode,
          knowledgeSource: config.knowledgeSource,
          topics: config.selectedTopics,
          customInstructions: config.customInstructions,
        };
        onStart(preparedParts, finalConfig, activeSet.id);
    };

    const handleGenerateCanvas = (config: { selectedTopics: string[], customPrompt: string }) => {
        if (!activeSet) return;
        onStartCanvasGeneration(activeSet, { topics: config.selectedTopics, customPrompt: config.customPrompt });
    };
  
    const handleRegenerateTopics = async () => {
        if (!activeSet) return;
        setIsAnalyzingTopics(true);
        try {
            const generatedTopics = await identifyCoreConcepts(preparedParts);
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
        setIsProcessing(true);
        setProcessingError(null);

        try {
            const { combinedText: newText, persistedFiles: newPersistedFiles } = await processFilesToParts('', files, onProgress);
            const updatedSetData: StudySet = {
                ...activeSet,
                content: (activeSet.content + '\n' + newText).trim(),
                persistedFiles: [...(activeSet.persistedFiles || []), ...newPersistedFiles],
                topics: [] // Invalidate topics since content changed
            };
            await updateSet(updatedSetData);
            
            const parts: PromptPart[] = [];
            if (updatedSetData.content) { parts.push({ text: updatedSetData.content }); }
            if (updatedSetData.persistedFiles) {
                updatedSetData.persistedFiles.forEach(pf => {
                    if (pf.type.startsWith('image/') || pf.type.startsWith('audio/')) {
                        parts.push({ inlineData: { mimeType: pf.type, data: pf.data } });
                    }
                });
            }
            setPreparedParts(parts);
            
            setIsProcessing(false);
            setIsAnalyzingTopics(true);
            const generatedTopics = await identifyCoreConcepts(parts);
            setTopics(generatedTopics);

            const finalSetWithTopics = { ...updatedSetData, topics: generatedTopics };
            await updateSet(finalSetWithTopics);
            setActiveSet(finalSetWithTopics);
            
            setIsAnalyzingTopics(false);
        } catch (err) {
            console.error("Error re-analyzing with files", err);
            setProcessingError(err instanceof Error ? err.message : "An error occurred.");
            setIsProcessing(false);
            setIsAnalyzingTopics(false);
        }
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

    if (isProcessing && (action === 'LIST' || action === 'CANVAS_TOPIC_SELECTION') && activeSet) {
      return (
          <ProcessingModal
              title={`Preparing "${activeSet.name}"`}
              message={progressMessage || 'Analyzing topics...'}
              progress={progressPercent}
          />
      );
    }

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
                flow="quiz"
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
        case 'CANVAS_TOPIC_SELECTION':
             return activeSet ? <TopicSelector 
                flow="canvas"
                activeSet={activeSet}
                topics={topics}
                isAnalyzingTopics={isAnalyzingTopics}
                isProcessing={isProcessing}
                processingError={processingError}
                progressPercent={progressPercent}
                onGenerateCanvas={handleGenerateCanvas}
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
                onPrepareForCanvas={handlePrepareForCanvas}
                onPredict={onPredict}
                onShowHistory={handleShowHistory}
                onShowStats={onShowStats}
                onStartSrsQuiz={onStartSrsQuiz}
                reviewPoolCount={reviewPoolCount}
                onStartReading={onStartReading}
            />;
    }
};

export default SetupScreen;