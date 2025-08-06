

import React, { useState, useEffect, useCallback } from 'react';
import { StudySet, ReadingLayout, ReadingBlock as ReadingBlockType } from '../../types';
import ReadingBlock from './ReadingBlock';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSubConcepts, reflowLayoutForExpansion } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';

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

const PROVISIONAL_EXPAND_HEIGHT = 2;
const NUM_PLACEHOLDERS = 3;
const PLACEHOLDER_HEIGHT = 2;

const createProvisionalLayout = (baseLayout: ReadingLayout, blockId: string): ReadingLayout => {
    const blockToExpand = baseLayout.blocks.find(b => b.id === blockId);
    if (!blockToExpand) return baseLayout;

    const newBlocks: ReadingBlockType[] = [];
    let maxRow = baseLayout.rows;
    
    const addedHeight = PROVISIONAL_EXPAND_HEIGHT + PLACEHOLDER_HEIGHT;

    const expandedBlock = {
        ...blockToExpand,
        gridRowEnd: blockToExpand.gridRowEnd + PROVISIONAL_EXPAND_HEIGHT,
    };
    newBlocks.push(expandedBlock);
    
    const totalWidth = blockToExpand.gridColumnEnd - blockToExpand.gridColumnStart;
    const PLACEHOLDER_WIDTH = Math.max(3, Math.floor(totalWidth / NUM_PLACEHOLDERS));


    for (let i = 0; i < NUM_PLACEHOLDERS; i++) {
        const startCol = blockToExpand.gridColumnStart + (i * PLACEHOLDER_WIDTH);
        // Ensure the last placeholder fills the remaining width
        const endCol = i === NUM_PLACEHOLDERS - 1 ? blockToExpand.gridColumnEnd : startCol + PLACEHOLDER_WIDTH;
        newBlocks.push({
            id: `placeholder-${i}`,
            title: '', summary: '', isPlaceholder: true,
            gridColumnStart: startCol,
            gridColumnEnd: endCol,
            gridRowStart: expandedBlock.gridRowEnd,
            gridRowEnd: expandedBlock.gridRowEnd + PLACEHOLDER_HEIGHT,
        });
    }

    // Shift other blocks down
    baseLayout.blocks.forEach(block => {
        if (block.id === blockId) return;

        // If a block is completely below the area being expanded
        if (block.gridRowStart >= blockToExpand.gridRowEnd) {
            newBlocks.push({
                ...block,
                gridRowStart: block.gridRowStart + addedHeight,
                gridRowEnd: block.gridRowEnd + addedHeight,
            });
            maxRow = Math.max(maxRow, block.gridRowEnd + addedHeight);
        } else {
            newBlocks.push(block);
        }
    });

    return { ...baseLayout, blocks: newBlocks, rows: baseLayout.rows + addedHeight };
};


interface ReadingCanvasProps {
  studySet: StudySet;
  onBack: () => void;
  onRegenerate: () => Promise<void>;
  updateSet: (set: StudySet) => Promise<void>;
}

const ReadingCanvas: React.FC<ReadingCanvasProps> = ({ studySet, onBack, onRegenerate, updateSet }) => {
  const [layoutBeforeExpansion, setLayoutBeforeExpansion] = useState<ReadingLayout | null>(studySet.readingLayout);
  const [currentLayout, setCurrentLayout] = useState<ReadingLayout | null>(studySet.readingLayout);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the study set changes (e.g., after regeneration), update the canvas state
    setLayoutBeforeExpansion(studySet.readingLayout);
    setCurrentLayout(studySet.readingLayout);
    setExpandedBlockId(null);
    setIsLoadingAI(false);
    setError(null);
  }, [studySet]);
  
  const handleExpand = useCallback(async (blockId: string) => {
    if (isLoadingAI || !currentLayout) return;
    setError(null);
    setExpandedBlockId(blockId);

    // Store the layout state right before this expansion starts
    setLayoutBeforeExpansion(currentLayout);
    
    // Stage 1: Optimistic update
    const provisionalLayout = createProvisionalLayout(currentLayout, blockId);
    setCurrentLayout(provisionalLayout);
    setIsLoadingAI(true);
    
    // Stage 2: Parallel AI Pipeline
    try {
        const parentBlock = currentLayout.blocks.find(b => b.id === blockId);
        if (!parentBlock) throw new Error("Parent block not found for expansion.");

        let expansionColor = parentBlock.color;
        if (!expansionColor && !parentBlock.parentId) {
            expansionColor = getNextColor();
        }
        
        // Fire both API calls simultaneously
        const [subConcepts, reflowedOldBlocks] = await Promise.all([
            generateSubConcepts(parentBlock),
            reflowLayoutForExpansion(currentLayout, blockId, expansionColor)
        ]);

        // Stage 3: Stitch results on the client
        const expandedParent = reflowedOldBlocks.find(b => b.id === blockId);
        if (!expandedParent) throw new Error("Expanded parent block is missing from AI layout response.");

        // Add color to the expanded parent if it was newly assigned
        if (expansionColor) {
            expandedParent.color = expansionColor;
        }

        const newSubBlocks: ReadingBlockType[] = [];
        let currentY = expandedParent.gridRowEnd;
        const SUB_CONCEPT_HEIGHT = 2; // Each sub-concept block will be 2 rows high

        subConcepts.forEach((sc, index) => {
            newSubBlocks.push({
                ...sc,
                id: `${blockId}-sub-${index}`,
                parentId: blockId,
                color: expansionColor,
                gridColumnStart: expandedParent.gridColumnStart,
                gridColumnEnd: expandedParent.gridColumnEnd,
                gridRowStart: currentY,
                gridRowEnd: currentY + SUB_CONCEPT_HEIGHT,
            });
            currentY += SUB_CONCEPT_HEIGHT;
        });

        const finalBlocks = [...reflowedOldBlocks, ...newSubBlocks];
        const finalRows = Math.max(...finalBlocks.map(b => b.gridRowEnd), currentLayout.rows);

        const newLayout = {
            ...currentLayout,
            blocks: finalBlocks,
            rows: finalRows,
        };
        setCurrentLayout(newLayout);
        setLayoutBeforeExpansion(newLayout); // Update the base layout for future collapses
        
        await updateSet({ ...studySet, readingLayout: newLayout });

    } catch (err) {
        console.error("Failed to expand block with parallel AI pipeline:", err);
        setError(err instanceof Error ? err.message : "An AI error occurred. Reverting layout.");
        // Revert on error
        setCurrentLayout(layoutBeforeExpansion); 
        setExpandedBlockId(null);
    } finally {
        setIsLoadingAI(false);
    }
  }, [currentLayout, isLoadingAI, layoutBeforeExpansion, studySet, updateSet]);

  const handleCollapse = useCallback(async () => {
    if (isLoadingAI) return;
    setCurrentLayout(layoutBeforeExpansion);
    setExpandedBlockId(null);
    setError(null);
    if (layoutBeforeExpansion) {
        await updateSet({ ...studySet, readingLayout: layoutBeforeExpansion });
    }
  }, [layoutBeforeExpansion, isLoadingAI, studySet, updateSet]);

  const handleRegenerateClick = async () => {
    if (window.confirm("Are you sure you want to regenerate the entire canvas? This will create a new layout.")) {
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

  if (!currentLayout) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold text-incorrect">Layout Error</h2>
        <p className="text-text-secondary mt-2">Could not load the reading canvas for this set.</p>
        <button onClick={onBack} className="mt-6 px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary">
          Back to Sets
        </button>
      </div>
    );
  }

  const { blocks, columns, rows } = currentLayout;

  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
    gridAutoRows: 'minmax(9rem, auto)',
  };

  return (
    <div className="animate-fade-in w-full h-full flex flex-col">
      <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
         <div>
            <h1 className="text-3xl font-bold text-text-primary">Reading Canvas</h1>
            <p className="text-text-secondary">"{studySet.name}"</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
            <button onClick={handleRegenerateClick} disabled={isRegenerating} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-all flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRegenerating ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                Regenerate
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
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundSize: `calc(100% / ${columns}) 40px`,
            backgroundImage: 'linear-gradient(to right, rgba(107, 114, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(107, 114, 128, 0.1) 1px, transparent 1px)'
          }}
        ></div>
        
        <motion.div layout style={gridStyle} className="grid gap-3 relative z-10">
          <AnimatePresence>
            {blocks.map((block) => (
              <ReadingBlock 
                  key={block.id} 
                  block={block} 
                  isExpanded={block.id === expandedBlockId}
                  isLoadingAI={isLoadingAI && block.id === expandedBlockId}
                  onExpand={handleExpand}
                  onCollapse={handleCollapse}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ReadingCanvas;