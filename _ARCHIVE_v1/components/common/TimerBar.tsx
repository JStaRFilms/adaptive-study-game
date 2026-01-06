
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
    <div className="relative w-full h-3 bg-teal-900/70 rounded-full">
      <div
        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 linear ${barColor}`}
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
