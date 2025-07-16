import React from 'react';

interface TimerBarProps {
  timeLeft: number;
  timeLimit: number;
}

const TimerBar: React.FC<TimerBarProps> = ({ timeLeft, timeLimit }) => {
  const percentageLeft = (timeLeft / timeLimit) * 100;
  
  let barColor = 'bg-brand-primary';
  if (percentageLeft < 50) barColor = 'bg-yellow-400';
  if (percentageLeft < 25) barColor = 'bg-red-500';

  return (
    <div className="w-full bg-surface-dark rounded-full h-2 shadow-inner">
      <div
        className={`h-2 rounded-full transition-all duration-1000 linear ${barColor}`}
        style={{ width: `${percentageLeft}%` }}
        aria-valuenow={timeLeft}
        aria-valuemin={0}
        aria-valuemax={timeLimit}
        role="timer"
      ></div>
    </div>
  );
};

export default TimerBar;
