import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Timer from './components/Timer';
import TimerControls from './components/TimerControls';
import AppSelector from './components/AppSelector';
import SessionHistory from './components/SessionHistory';

export interface FocusSession {
  id: number;
  duration: number;
  apps: string[];
  completedAt: Date;
  wasCompleted: boolean;
}

const App: React.FC = () => {
  const [focusDuration, setFocusDuration] = useState<number>(25); // minutos
  const [timeRemaining, setTimeRemaining] = useState<number>(25 * 60); // segundos
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [showAppSelector, setShowAppSelector] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [focusActive, setFocusActive] = useState<boolean>(false);

  // Carregar sessões salvas
  useEffect(() => {
    const savedSessions = localStorage.getItem('focuslock-sessions');
    const savedApps = localStorage.getItem('focuslock-apps');
    
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
    if (savedApps) {
      setSelectedApps(JSON.parse(savedApps));
    }
  }, []);

  // Salvar sessões e apps
  useEffect(() => {
    localStorage.setItem('focuslock-sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('focuslock-apps', JSON.stringify(selectedApps));
  }, [selectedApps]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      handleSessionComplete(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining]);

  const handleSessionComplete = useCallback(async (wasCompleted: boolean) => {
    setIsRunning(false);
    setFocusActive(false);
    
    // Parar bloqueio
    if (window.electronAPI?.stopFocus) {
      await window.electronAPI.stopFocus();
    }
    
    const newSession: FocusSession = {
      id: Date.now(),
      duration: focusDuration,
      apps: selectedApps,
      completedAt: new Date(),
      wasCompleted,
    };

    setSessions((prev) => [newSession, ...prev.slice(0, 49)]); // Manter últimas 50 sessões

    if (wasCompleted) {
      // Notificar usuário
      new Notification('🎉 FocusLock', {
        body: `Parabéns! Você completou ${focusDuration} minutos de foco!`,
      });
      window.electronAPI?.focusEnded();
    }

    setTimeRemaining(focusDuration * 60);
  }, [focusDuration, selectedApps]);

  const startFocus = async () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Iniciar bloqueio real
    if (window.electronAPI?.startFocus) {
      await window.electronAPI.startFocus(selectedApps);
    }
    
    setTimeRemaining(focusDuration * 60);
    setIsRunning(true);
    setFocusActive(true);
  };

  const pauseFocus = () => {
    // Pausa apenas o timer, mantém o bloqueio ativo
    setIsRunning(false);
  };

  const resumeFocus = () => {
    setIsRunning(true);
  };

  const stopFocus = () => {
    handleSessionComplete(false);
  };

  const handleDurationChange = (minutes: number) => {
    setFocusDuration(minutes);
    if (!isRunning) {
      setTimeRemaining(minutes * 60);
    }
  };

  const toggleApp = (app: string) => {
    setSelectedApps((prev) =>
      prev.includes(app)
        ? prev.filter((a) => a !== app)
        : [...prev, app]
    );
  };

  return (
    <div className="app-container">
      <Header 
        onShowHistory={() => setShowHistory(true)}
        sessionsCount={sessions.filter(s => s.wasCompleted).length}
      />

      <main className="main-content">
        <Timer 
          timeRemaining={timeRemaining} 
          totalTime={focusDuration * 60}
          isRunning={isRunning}
        />

        <TimerControls
          isRunning={isRunning}
          focusActive={focusActive}
          focusDuration={focusDuration}
          onDurationChange={handleDurationChange}
          onStart={startFocus}
          onPause={pauseFocus}
          onResume={resumeFocus}
          onStop={stopFocus}
        />

        <div className="apps-section">
          <button 
            className="apps-toggle-btn"
            onClick={() => setShowAppSelector(true)}
          >
            <span className="apps-icon">📱</span>
            <span className="apps-text">
              {selectedApps.length === 0 
                ? 'Selecionar Apps Permitidos' 
                : `${selectedApps.length} app${selectedApps.length > 1 ? 's' : ''} selecionado${selectedApps.length > 1 ? 's' : ''}`
              }
            </span>
            <span className="apps-arrow">→</span>
          </button>

          {selectedApps.length > 0 && (
            <div className="selected-apps-preview">
              {selectedApps.slice(0, 5).map((app) => (
                <span key={app} className="app-tag">{app}</span>
              ))}
              {selectedApps.length > 5 && (
                <span className="app-tag more">+{selectedApps.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </main>

      {showAppSelector && (
        <AppSelector
          selectedApps={selectedApps}
          onToggleApp={toggleApp}
          onClose={() => setShowAppSelector(false)}
        />
      )}

      {showHistory && (
        <SessionHistory
          sessions={sessions}
          onClose={() => setShowHistory(false)}
          onClear={() => setSessions([])}
        />
      )}
    </div>
  );
};

export default App;
