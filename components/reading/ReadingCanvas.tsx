import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudySet, ReadingLayout, ReadingBlock as ReadingBlockType, ChatMessage, AppState, ChatContentPart } from '../../types';
import ReadingBlock from './ReadingBlock';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSubConcepts, reflowLayoutForExpansion, identifyCoreConcepts } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import ChatPanel from '../common/ChatPanel';
import TopicSelector from '../setup/TopicSelector';
import { processFilesToParts } from '../../utils/fileProcessor';
import { useVoiceChat } from '../../hooks/useVoiceChat';

const COLOR_PALETTE = [
  '#4ade80', // green-400
  '#60a5fa', // blue-400
  '#facc15', // yellow-400
  '#fb923c', // orange-400
  '#f87171', // red-400
  '#c084fc', // purple-400
  '#fb7185', // pink-400
];

let colorIndex = 0;

const getNextColor = () => {
  const color = COLOR_PALETTE[colorIndex];
  colorIndex = (colorIndex + 1) % COLOR_PALETTE.length;
  return color;
};

const PARENT_EXPANSION_HEIGHT = 2;
const SUB_CONCEPT_HEIGHT = 2;

// Helper hook for media queries
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};


// Helper for creating the optimistic UI with placeholders
const createProvisionalLayout = (baseLayout: ReadingLayout, parentBlock: ReadingBlockType): ReadingLayout => {
    const totalAddedHeight = PARENT_EXPANSION_HEIGHT + (3 * SUB_CONCEPT_HEIGHT); // Assume 3 placeholders
    
    const newBlocks: ReadingBlockType[] = [];

    // Add the expanded parent
    const expandedParent = {
        ...parentBlock,
        gridRowEnd: parentBlock.gridRowEnd + PARENT_EXPANSION_HEIGHT,
    };
    newBlocks.push(expandedParent);
    
    // Add placeholder sub-concepts
    for (let i = 0; i < 3; i++) {
        newBlocks.push({
            id: `placeholder-${i}`, title: '', summary: '', isPlaceholder: true, parentId: parentBlock.id,
            gridColumnStart: parentBlock.gridColumnStart, gridColumnEnd: parentBlock.gridColumnEnd,
            gridRowStart: parentBlock.gridRowEnd + PARENT_EXPANSION_HEIGHT + (i * SUB_CONCEPT_HEIGHT),
            gridRowEnd: parentBlock.gridRowEnd + PARENT_EXPANSION_HEIGHT + ((i + 1) * SUB_CONCEPT_HEIGHT),
        });
    }

    // Shift all other blocks down
    baseLayout.blocks.forEach(block => {
        if (block.id === parentBlock.id || block.parentId === parentBlock.id) return;

        if (block.gridRowStart >= parentBlock.gridRowEnd) {
            newBlocks.push({
                ...block,
                gridRowStart: block.gridRowStart + totalAddedHeight,
                gridRowEnd: block.gridRowEnd + totalAddedHeight,
            });
        } else {
            newBlocks.push(block);
        }
    });
    
    const finalRows = Math.max(...newBlocks.map(b => b.gridRowEnd), baseLayout.rows) + totalAddedHeight;
    return { ...baseLayout, blocks: newBlocks, rows: finalRows };
};

const CanvasSetupScreen: React.FC<{
    studySet: StudySet,
    onGenerate: (config: { selectedTopics: string[], customPrompt: string }) => void,
    onBack: () => void
}> = ({ studySet, onGenerate, onBack }) => {
    const [topics, setTopics] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTopics = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (studySet.topics && studySet.topics.length > 0) {
                    setTopics(studySet.topics);
                } else {
                    const { parts } = await processFilesToParts(studySet.content, [], () => {});
                    const generatedTopics = await identifyCoreConcepts(parts);
                    setTopics(generatedTopics);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to analyze topics.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTopics();
    }, [studySet]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner />
                <p className="mt-4 text-lg font-semibold text-text-secondary">Analyzing topics...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-xl font-bold text-incorrect">Error analyzing topics</p>
                <p className="text-text-secondary mt-2">{error}</p>
                <button onClick={onBack} className="mt-6 px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary">
                  Back to Sets
                </button>
            </div>
        )
    }

    return (
        <TopicSelector 
            flow="canvas"
            activeSet={studySet}
            topics={topics}
            isAnalyzingTopics={false}
            isProcessing={false}
            processingError={null}
            progressPercent={0}
            onGenerateCanvas={onGenerate}
            onBack={onBack}
            onRegenerateTopics={() => {}} // Not needed here
            onReanalyzeWithFiles={() => {}} // Not needed here
        />
    )
}


interface ReadingCanvasProps {
  studySet: StudySet;
  appState: AppState;
  isUpdatingCanvas: boolean;
  onBack: () => void;
  onRegenerate: () => Promise<void>;
  onGenerate: (config: { selectedTopics: string[], customPrompt: string }) => void;
  updateSet: (set: StudySet) => Promise<void>;
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isAITyping: boolean;
  chatError: string | null;
  isChatEnabled: boolean;
  onSendMessage: (parts: ChatContentPart[], messageId?: string) => void;
  onToggleChat: () => void;
  onCloseChat: () => void;
  onClearChat: () => void;
  onStartCustomQuiz: (topics: string[], studySet: StudySet | null, numQuestions?: number) => void;
  pendingUIAction: { type: string; payload: any } | null;
  onActionConsumed: () => void;
}

const ReadingCanvas: React.FC<ReadingCanvasProps> = ({ 
    studySet, appState, isUpdatingCanvas, onBack, onRegenerate, onGenerate, updateSet,
    chatMessages, isChatOpen, isAITyping, chatError, isChatEnabled,
    onSendMessage, onToggleChat, onCloseChat, onClearChat, onStartCustomQuiz,
    pendingUIAction, onActionConsumed
}) => {
  const [currentLayout, setCurrentLayout] = useState<ReadingLayout | null>(studySet.readingLayout);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const voiceChat = useVoiceChat({
    chatMessages,
    isAITyping,
    onSendMessage,
  });

  useEffect(() => {
    setCurrentLayout(studySet.readingLayout);
    // Find if any block is expanded in the current layout to set the expandedBlockId
    const expandedParent = studySet.readingLayout?.blocks.find(b => 
        studySet.readingLayout?.blocks.some(sub => sub.parentId === b.id)
    );
    setExpandedBlockId(expandedParent?.id || null);
    setIsLoadingAI(false);
    setError(null);
  }, [studySet]);
  
  const handleExpand = useCallback(async (blockId: string) => {
    if (isLoadingAI || !currentLayout) return;
    setError(null);
    setExpandedBlockId(blockId);

    const parentBlock = currentLayout.blocks.find(b => b.id === blockId);
    if (!parentBlock) return;
    
    const cachedData = studySet.subConceptCache?.[blockId];

    if (cachedData) {
        // --- CACHED RE-EXPANSION (INSTANT) ---
        setCurrentLayout(cachedData.expandedLayout);
        await updateSet({ ...studySet, readingLayout: cachedData.expandedLayout });
        return;
    }

    // --- AI-POWERED FIRST-TIME EXPANSION ---
    setIsLoadingAI(true);
    const layoutBeforeExpansion = currentLayout; // Snapshot
    
    // Optimistic UI update for AI expansion
    const provisionalLayout = createProvisionalLayout(currentLayout, parentBlock);
    setCurrentLayout(provisionalLayout);
    
    try {
        let expansionColor = parentBlock.color || (!parentBlock.parentId ? getNextColor() : undefined);
        
        const [subConcepts, reflowedOldBlocks] = await Promise.all([
            generateSubConcepts(parentBlock),
            reflowLayoutForExpansion(layoutBeforeExpansion, blockId, expansionColor)
        ]);

        const expandedParent = reflowedOldBlocks.find(b => b.id === blockId);
        if (!expandedParent) throw new Error("Expanded parent block is missing from AI layout response.");

        if (expansionColor) expandedParent.color = expansionColor;

        const newSubBlocks: ReadingBlockType[] = subConcepts.map((sc, index) => ({
            ...sc,
            id: `${blockId}-sub-${index}`, parentId: blockId, color: expansionColor,
            gridColumnStart: expandedParent.gridColumnStart, gridColumnEnd: expandedParent.gridColumnEnd,
            gridRowStart: expandedParent.gridRowEnd, gridRowEnd: expandedParent.gridRowEnd + SUB_CONCEPT_HEIGHT,
        }));
        
        const finalBlocks = [...reflowedOldBlocks];
        let currentY = expandedParent.gridRowEnd;
        newSubBlocks.forEach(sub => {
            sub.gridRowStart = currentY;
            sub.gridRowEnd = currentY + SUB_CONCEPT_HEIGHT;
            finalBlocks.push(sub);
            currentY += SUB_CONCEPT_HEIGHT;
        });

        const finalRows = Math.max(...finalBlocks.map(b => b.gridRowEnd), currentLayout.rows);
        const finalLayout = { ...currentLayout, blocks: finalBlocks, rows: finalRows };
        
        const newCacheEntry = {
            subConcepts: newSubBlocks,
            expandedLayout: finalLayout,
            layoutBeforeExpansion: layoutBeforeExpansion
        };
        const newCache = { ...studySet.subConceptCache, [blockId]: newCacheEntry };

        setCurrentLayout(finalLayout);
        await updateSet({ ...studySet, readingLayout: finalLayout, subConceptCache: newCache });

    } catch (err) {
        console.error("Failed to expand block with AI:", err);
        setError(err instanceof Error ? err.message : "An AI error occurred. Reverting layout.");
        setCurrentLayout(layoutBeforeExpansion); // Restore snapshot on error
        setExpandedBlockId(null);
    } finally {
        setIsLoadingAI(false);
    }
  }, [currentLayout, isLoadingAI, studySet, updateSet]);

  const handleCollapse = useCallback(async (blockId: string) => {
    if (isLoadingAI || !currentLayout) return;
    
    const cachedData = studySet.subConceptCache?.[blockId];
    if (cachedData) {
        // --- "UNDO" using the cached snapshot ---
        setCurrentLayout(cachedData.layoutBeforeExpansion);
        setExpandedBlockId(null);
        setError(null);
        await updateSet({ ...studySet, readingLayout: cachedData.layoutBeforeExpansion });
    } else {
        // Fallback if cache is somehow missing, though this shouldn't happen in the new flow.
        console.warn(`Cache miss on collapse for blockId: ${blockId}. Cannot perform clean collapse.`);
        setError("Could not find previous state to collapse to.");
    }
  }, [currentLayout, isLoadingAI, studySet, updateSet]);

  const handleRegenerateBlock = useCallback(async (blockId: string) => {
      if (isLoadingAI || !currentLayout) return;

      const cache = { ...studySet.subConceptCache };
      const layoutBefore = cache[blockId]?.layoutBeforeExpansion;

      // Clear the cache entry to force regeneration
      delete cache[blockId];
      
      // If we have a snapshot, collapse to that state first.
      if (layoutBefore) {
          const setWithClearedCache = { ...studySet, readingLayout: layoutBefore, subConceptCache: cache };
          // Update the database with the collapsed state and cleared cache
          await updateSet(setWithClearedCache);
          // Now trigger the expansion, which will miss the cache and run the AI.
          // The useEffect will handle setting the new local layout state.
          // A small timeout helps ensure React has processed the state change before the next action.
          setTimeout(() => handleExpand(blockId), 50);
      } else {
          // If for some reason there's no snapshot, just clear the cache and re-expand.
          const setWithClearedCache = { ...studySet, subConceptCache: cache };
          await updateSet(setWithClearedCache);
          setTimeout(() => handleExpand(blockId), 50);
      }
  }, [currentLayout, isLoadingAI, studySet, updateSet, handleExpand]);

  const handleRegenerateClick = async () => {
    if (window.confirm("Are you sure you want to regenerate the entire canvas? This will let you re-select the focus topics.")) {
        setIsRegenerating(true);
        setError(null);
        try {
            await onRegenerate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to regenerate canvas.");
        } finally {
            setIsRegenerating(false);
        }
    }
  };

  const handleClearCanvasClick = async () => {
    if (window.confirm("Are you sure you want to clear the entire canvas? This cannot be undone. You can then build a new canvas from scratch using the AI chat.")) {
        setError(null);
        setExpandedBlockId(null);
        
        // This clears the persistent state. The next time the user enters this screen,
        // they will see the setup/topic selection screen.
        await updateSet({
            ...studySet,
            readingLayout: null,
            subConceptCache: {}
        });

        // This clears the visual state for the current session, showing a blank canvas
        // without navigating away, allowing the user to build a new one with the AI.
        setCurrentLayout({
            blocks: [],
            columns: 24,
            rows: 0
        });

        // Clear the chat to provide a fresh start for building the new canvas.
        onClearChat();
    }
  };
  
  const blocksToRender = useMemo(() => {
    let blocks = currentLayout?.blocks ? [...currentLayout.blocks] : [];

    if (isUpdatingCanvas && currentLayout) {
        const placeholder: ReadingBlockType = {
            id: 'updating-placeholder',
            title: 'Adding new concepts...',
            summary: '',
            isPlaceholder: true,
            gridColumnStart: 1,
            gridColumnEnd: currentLayout.columns + 1,
            gridRowStart: (currentLayout.rows || 0) + 1,
            gridRowEnd: (currentLayout.rows || 0) + 3,
        };
        blocks.push(placeholder);
    }

    if (isMobile) {
        return blocks.sort((a, b) => {
            if (a.gridRowStart !== b.gridRowStart) {
                return a.gridRowStart - b.gridRowStart;
            }
            return a.gridColumnStart - b.gridColumnStart;
        });
    }

    return blocks;
  }, [currentLayout, isUpdatingCanvas, isMobile]);


  useEffect(() => {
    if (pendingUIAction?.type === 'EXPAND_BLOCK') {
        const { blockId } = pendingUIAction.payload;
        // Check if the block exists and is not already expanded to prevent loops or redundant actions
        if (blockId && blockId !== expandedBlockId && currentLayout?.blocks.some(b => b.id === blockId)) {
            handleExpand(blockId);
        }
        onActionConsumed(); // Always consume the action
    }
  }, [pendingUIAction, onActionConsumed, handleExpand, expandedBlockId, currentLayout]);


  if (appState === AppState.READING_SETUP || !currentLayout) {
    return <CanvasSetupScreen studySet={studySet} onGenerate={onGenerate} onBack={onBack} />;
  }

  const { columns } = currentLayout;
  const newRows = (isUpdatingCanvas && currentLayout) ? (currentLayout.rows || 0) + 3 : currentLayout.rows;

  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${newRows}, minmax(0, auto))`,
    gridAutoRows: 'minmax(9rem, auto)',
  };

  return (
    <div className="animate-fade-in w-full h-full flex flex-col">
      <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
         <div>
            <h1 className="text-3xl font-bold text-text-primary">Reading Canvas</h1>
            <p className="text-text-secondary">"{studySet.name}"</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center flex-wrap justify-start sm:justify-end">
            <button onClick={handleClearCanvasClick} disabled={isRegenerating || isLoadingAI} className="px-4 py-2 bg-incorrect text-white font-bold rounded-lg hover:bg-red-600 transition-all flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                Clear Canvas
            </button>
            <button onClick={handleRegenerateClick} disabled={isRegenerating} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-all flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRegenerating ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                Reconfigure
            </button>
            <button onClick={onBack} className="px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">
              Back to Sets
            </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg mb-4 text-sm" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex-grow overflow-auto p-2 sm:p-4 bg-background-dark rounded-lg relative border border-gray-800">
        {isRegenerating && (
            <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 font-semibold text-text-secondary">Regenerating canvas...</p>
            </div>
        )}
        {!isMobile && (
          <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundSize: `calc(100% / ${columns}) 40px`,
              backgroundImage: 'linear-gradient(to right, rgba(107, 114, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(107, 114, 128, 0.1) 1px, transparent 1px)'
            }}
          ></div>
        )}
        
        <motion.div 
          layout 
          style={!isMobile ? gridStyle : {}} 
          className={isMobile ? "flex flex-col gap-3 relative z-10" : "grid gap-3 relative z-10"}
        >
          <AnimatePresence>
            {blocksToRender.length > 0 ? (
                blocksToRender.map((block) => (
                    <ReadingBlock 
                        key={block.id} 
                        block={block} 
                        isExpanded={block.id === expandedBlockId}
                        isLoadingAI={isLoadingAI && block.id === expandedBlockId}
                        isMobile={isMobile}
                        onExpand={handleExpand}
                        onCollapse={handleCollapse}
                        onRegenerate={handleRegenerateBlock}
                    />
                ))
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-text-secondary p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <h3 className="text-xl font-bold text-text-primary">Canvas Cleared</h3>
                    <p className="mt-2 max-w-sm">Your visual canvas is empty. Use the AI Study Coach chat to add new concepts and build your own custom layout from scratch!</p>
                </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <ChatPanel
        isOpen={isChatOpen}
        onOpen={onToggleChat}
        onClose={onCloseChat}
        onSendMessage={onSendMessage}
        messages={chatMessages}
        isTyping={isAITyping}
        error={chatError}
        isEnabled={isChatEnabled}
        disabledTooltipText="Chat is unavailable"
        onClearChat={onClearChat}
        isCallActive={voiceChat.isCallActive}
        isListening={voiceChat.isListening}
        isSpeaking={voiceChat.isSpeaking}
        onStartCall={voiceChat.startCall}
        onEndCall={voiceChat.endCall}
        onPttMouseDown={voiceChat.handlePttMouseDown}
        onPttMouseUp={voiceChat.handlePttMouseUp}
      />
    </div>
  );
};

export default ReadingCanvas;
