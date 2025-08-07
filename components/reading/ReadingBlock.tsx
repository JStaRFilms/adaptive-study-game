

import React from 'react';
import { ReadingBlock as ReadingBlockType } from '../../types';
import Markdown from '../common/Markdown';
import { motion } from 'framer-motion';

interface ReadingBlockProps {
  block: ReadingBlockType;
  isExpanded: boolean;
  isLoadingAI: boolean;
  isMobile: boolean;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onRegenerate: (id: string) => void;
}

const ReadingBlock: React.FC<ReadingBlockProps> = ({ block, isExpanded, isLoadingAI, isMobile, onExpand, onCollapse, onRegenerate }) => {
  const gridStyle: React.CSSProperties = isMobile ? {} : {
    gridColumn: `${block.gridColumnStart} / ${block.gridColumnEnd}`,
    gridRow: `${block.gridRowStart} / ${block.gridRowEnd}`,
  };

  const isSubBlock = !!block.parentId;

  if (block.isPlaceholder) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={gridStyle}
        className="bg-surface-dark/50 p-3 rounded-lg border border-gray-700 shadow-md flex flex-col animate-pulse"
      >
        <div className="h-5 bg-gray-600 rounded w-3/4 mb-3"></div>
        <div className="space-y-2 flex-grow">
          <div className="h-3 bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        </div>
      </motion.div>
    );
  }
  
  // Dynamic styles based on color
  const dynamicStyles: React.CSSProperties = {};
  if (block.color) {
    if (isExpanded || isSubBlock) {
      dynamicStyles.borderColor = block.color;
      dynamicStyles.borderWidth = isExpanded ? '2px' : '1px';
    }
    if (isSubBlock) {
      // Add 1A for ~10% alpha to the hex color
      dynamicStyles.backgroundColor = `${block.color}1A`;
    }
  }

  const titleStyle: React.CSSProperties = block.color ? { color: block.color } : {};


  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{...gridStyle, ...dynamicStyles}}
      className={`relative group bg-surface-dark p-3 rounded-lg border shadow-md flex flex-col transition-colors duration-300
        ${isExpanded ? 'shadow-2xl z-20' : 'border-gray-700 hover:border-brand-primary'}
      `}
    >
      {isLoadingAI && isExpanded && (
        <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-30">
           <div className="w-8 h-8 border-2 border-solid border-gray-600 rounded-full border-t-brand-primary animate-spin"></div>
           <span className="sr-only">AI is refining layout...</span>
        </div>
      )}

      {!isExpanded && (
        <button
            onClick={(e) => { e.stopPropagation(); onExpand(block.id); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-surface-dark/50 text-gray-400 hover:bg-brand-primary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
            aria-label="Expand concept"
            title="Expand"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
        </button>
      )}

      {isExpanded && !isSubBlock && (
        <div className="absolute top-2 right-2 flex gap-1.5 z-40">
           <button 
              onClick={(e) => { e.stopPropagation(); onRegenerate(block.id); }}
              className="p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700"
              aria-label="Regenerate sub-concepts"
              title="Regenerate sub-concepts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onCollapse(block.id); }}
              className="p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700"
              aria-label="Collapse block"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            </button>
        </div>
      )}

      <h3 style={titleStyle} className="font-bold text-lg text-brand-primary mb-2 flex-shrink-0 pr-6">{block.title}</h3>
      <div className="text-text-secondary text-sm overflow-y-auto flex-grow pretty-scrollbar">
         <Markdown content={block.summary} className="prose prose-sm prose-invert max-w-none" />
      </div>
    </motion.div>
  );
};

export default ReadingBlock;