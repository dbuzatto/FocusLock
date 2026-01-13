import React from 'react';

interface TimerControlsProps {
  isRunning: boolean;
  focusActive: boolean;
  focusDuration: number;
  onDurationChange: (minutes: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const PRESET_DURATIONS = [15, 25, 45, 60, 90];

const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  focusActive,
  focusDuration,
  onDurationChange,
  onStart,
  onPause,
  onResume,
  onStop,
}) => {
  return (
    <div className="timer-controls">
      {!focusActive ? (
        <>
          <div className="duration-selector">
            <label className="duration-label">Tempo de Foco</label>
            <div className="duration-presets">
              {PRESET_DURATIONS.map((duration) => (
                <button
                  key={duration}
                  className={`duration-btn ${focusDuration === duration ? 'active' : ''}`}
                  onClick={() => onDurationChange(duration)}
                >
                  {duration}min
                </button>
              ))}
            </div>
            
            <div className="duration-custom">
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={focusDuration}
                onChange={(e) => onDurationChange(parseInt(e.target.value))}
                className="duration-slider"
              />
              <span className="duration-value">{focusDuration} minutos</span>
            </div>
          </div>

          <button className="start-btn" onClick={onStart}>
            <span className="btn-icon">▶️</span>
            <span>Iniciar Foco</span>
          </button>
        </>
      ) : (
        <div className="running-controls">
          {isRunning ? (
            <button className="pause-btn" onClick={onPause}>
              <span className="btn-icon">⏸️</span>
              <span>Pausar</span>
            </button>
          ) : (
            <button className="resume-btn" onClick={onResume}>
              <span className="btn-icon">▶️</span>
              <span>Continuar</span>
            </button>
          )}
          <button className="stop-btn" onClick={onStop}>
            <span className="btn-icon">⏹️</span>
            <span>Parar</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TimerControls;
