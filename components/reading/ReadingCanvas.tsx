import React from 'react';
import { StudySet } from '../../types';
import ReadingBlock from './ReadingBlock';

interface ReadingCanvasProps {
  studySet: StudySet;
  onBack: () => void;
}

const ReadingCanvas: React.FC<ReadingCanvasProps> = ({ studySet, onBack }) => {
  if (!studySet.readingLayout) {
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

  const { blocks, columns } = studySet.readingLayout;

  const gridStyle = {
    // The display property is now handled by Tailwind's responsive classes (`md:grid`)
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    // Use grid-auto-rows for more flexible row heights that adapt to content.
    gridAutoRows: 'minmax(80px, auto)',
  };

  return (
    <div className="animate-fade-in w-full h-full flex flex-col">
      <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Reading Canvas</h1>
            <p className="text-text-secondary">"{studySet.name}"</p>
        </div>
        <button onClick={onBack} className="px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all self-start sm:self-auto">
          Back to Sets
        </button>
      </header>

      <div className="flex-grow overflow-auto p-2 sm:p-4 bg-background-dark rounded-lg relative border border-gray-800">
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundSize: `calc(100% / ${columns}) 80px`, // Match column count and min row height
            backgroundImage: 'linear-gradient(to right, rgba(107, 114, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(107, 114, 128, 0.1) 1px, transparent 1px)'
          }}
        ></div>
        
        {/*
          - On mobile (default), `flex flex-col` creates a single stacked column.
          - On medium screens and up, `md:grid` activates the grid layout.
          - The inline `gridStyle` then applies column/row templates only when display is grid.
        */}
        <div style={gridStyle} className="flex flex-col md:grid gap-4 relative z-10">
          {blocks.map((block, index) => (
            <ReadingBlock key={block.id} block={block} animationDelay={`${index * 50}ms`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReadingCanvas;