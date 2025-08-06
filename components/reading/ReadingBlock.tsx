
import React from 'react';
import { ReadingBlock as ReadingBlockType } from '../../types';
import Markdown from '../common/Markdown';

interface ReadingBlockProps {
  block: ReadingBlockType;
  animationDelay: string;
}

const ReadingBlock: React.FC<ReadingBlockProps> = ({ block, animationDelay }) => {
  const style = {
    gridColumn: `${block.gridColumnStart} / ${block.gridColumnEnd}`,
    gridRow: `${block.gridRowStart} / ${block.gridRowEnd}`,
    animationDelay,
    backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent)',
  };

  return (
    <div
      style={style}
      className="bg-surface-dark p-3 rounded-lg border border-gray-700 shadow-md hover:shadow-lg hover:border-brand-primary transition-all duration-300 animate-fade-in-down flex flex-col min-h-[9rem]"
    >
      <h3 className="font-bold text-lg text-brand-primary mb-2 flex-shrink-0">{block.title}</h3>
      <div className="text-text-secondary text-sm overflow-y-auto flex-grow">
         <Markdown content={block.summary} className="prose prose-sm prose-invert max-w-none" />
      </div>
    </div>
  );
};

export default ReadingBlock;
