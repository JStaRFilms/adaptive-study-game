
import React from 'react';

interface ProgressBarProps {
  progress: number; // A value between 0 and 100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full bg-surface-dark rounded-full h-2.5 shadow-inner">
      <div
        className="bg-brand-primary h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${safeProgress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
