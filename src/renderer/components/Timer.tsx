import React from 'react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, totalTime, isRunning }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const circumference = 2 * Math.PI * 120; // raio de 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className={`timer-container ${isRunning ? 'running' : ''}`}>
      <svg className="timer-svg" viewBox="0 0 260 260">
        {/* Círculo de fundo */}
        <circle
          className="timer-bg"
          cx="130"
          cy="130"
          r="120"
          fill="none"
          strokeWidth="8"
        />
        {/* Círculo de progresso */}
        <circle
          className="timer-progress"
          cx="130"
          cy="130"
          r="120"
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 130 130)"
        />
      </svg>
      
      <div className="timer-display">
        <span className="timer-minutes">{formatTime(minutes)}</span>
        <span className="timer-separator">:</span>
        <span className="timer-seconds">{formatTime(seconds)}</span>
      </div>

      {isRunning && (
        <div className="timer-status">
          <span className="pulse-dot"></span>
          <span>Focando...</span>
        </div>
      )}
    </div>
  );
};

export default Timer;
