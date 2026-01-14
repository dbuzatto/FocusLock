import React from 'react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, totalTime, isRunning }) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  // Mostra o tempo restante (100% no início, 0% quando acabar)
  const progress = (timeRemaining / totalTime) * 100;
  const circumference = 2 * Math.PI * 130; // raio de 130 (igual ao círculo SVG)
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className={`timer-container ${isRunning ? 'running' : ''}`}>
      <svg className="timer-svg" viewBox="0 0 280 280">
        <defs>
          {/* Gradiente para a trilha de progresso */}
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5AC8FA" />
            <stop offset="50%" stopColor="#007AFF" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          
          {/* Filtro de brilho */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Círculo de fundo (trilha) */}
        <circle
          className="timer-track"
          cx="140"
          cy="140"
          r="130"
          fill="none"
          strokeWidth="4"
        />
        
        {/* Círculo de progresso com gradiente */}
        <circle
          className="timer-progress"
          cx="140"
          cy="140"
          r="130"
          fill="none"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 140 140)"
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
