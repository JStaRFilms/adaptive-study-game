
import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group flex items-center">
      {children}
      <div 
        className={`absolute ${positionClasses[position]} px-3 py-1.5 bg-case-text-primary text-case-paper text-sm rounded-md shadow-lg
                    whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                    transition-opacity duration-300 z-30 pointer-events-none`}
        role="tooltip"
      >
        {text}
        <div 
            className={`absolute bg-case-text-primary h-2 w-2 transform rotate-45 
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
            ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
            ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}`}
        ></div>
      </div>
    </div>
  );
};

export default Tooltip;
