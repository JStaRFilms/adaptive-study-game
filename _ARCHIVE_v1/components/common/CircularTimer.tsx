import React from 'react';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
}

const CircularTimer: React.FC<CircularTimerProps> = ({ timeLeft, totalTime }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? (timeLeft / totalTime) : 0;
  const offset = circumference - progress * circumference;

  const percentageLeft = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  let colorClass = 'text-brand-primary';
  let pulseClass = '';
  if (percentageLeft < 50 && percentageLeft >= 20) colorClass = 'text-yellow-400';
  if (percentageLeft < 20) {
    colorClass = 'text-incorrect';
    pulseClass = 'animate-pulse';
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`relative h-16 w-16 ${pulseClass}`}>
      <svg className="w-full h-full" viewBox="0 0 64 64">
        {/* Background Circle */}
        <circle
          className="text-gray-700"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="32"
          cy="32"
        />
        {/* Progress Circle */}
        <circle
          className={`transition-all duration-500 ease-linear ${colorClass}`}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="32"
          cy="32"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <span className={`text-sm font-bold font-mono ${colorClass}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
};

export default CircularTimer;
