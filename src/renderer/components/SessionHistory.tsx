import React from 'react';
import { FocusSession } from '../App';

interface SessionHistoryProps {
  sessions: FocusSession[];
  onClose: () => void;
  onClear: () => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  onClose,
  onClear,
}) => {
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalMinutes = sessions
    .filter((s) => s.wasCompleted)
    .reduce((acc, s) => acc + s.duration, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Histórico de Sessões</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{sessions.filter(s => s.wasCompleted).length}</span>
            <span className="stat-label">Sessões Completas</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`}
            </span>
            <span className="stat-label">Tempo Total de Foco</span>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="no-sessions">
            <span className="no-sessions-icon">🎯</span>
            <p>Nenhuma sessão registrada ainda.</p>
            <p className="no-sessions-hint">Inicie seu primeiro foco!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className={`session-item ${session.wasCompleted ? 'completed' : 'incomplete'}`}
              >
                <div className="session-status">
                  {session.wasCompleted ? '✅' : '⏹️'}
                </div>
                <div className="session-info">
                  <span className="session-duration">
                    {session.duration} minutos
                  </span>
                  <span className="session-date">
                    {formatDate(session.completedAt)}
                  </span>
                </div>
                <div className="session-apps">
                  {session.apps.length > 0 ? (
                    <span className="apps-count">
                      {session.apps.length} app{session.apps.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="apps-count none">Sem apps</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="modal-footer">
            <button className="clear-btn" onClick={onClear}>
              🗑️ Limpar Histórico
            </button>
            <button className="done-btn" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
