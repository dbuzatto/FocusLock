import React from 'react';

interface HeaderProps {
  onShowHistory: () => void;
  sessionsCount: number;
}

const Header: React.FC<HeaderProps> = ({ onShowHistory, sessionsCount }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">🔒</span>
          <h1 className="logo-text">FocusLock</h1>
        </div>
        
        <button className="history-btn" onClick={onShowHistory} title="Histórico de Sessões">
          <span className="history-icon">📊</span>
          {sessionsCount > 0 && (
            <span className="history-badge">{sessionsCount}</span>
          )}
        </button>
      </div>
      
      <p className="tagline">Bloqueie distrações. Maximize seu foco.</p>
    </header>
  );
};

export default Header;
