import React, { useState, useEffect } from 'react';

interface AppSelectorProps {
  selectedApps: string[];
  onToggleApp: (app: string) => void;
  onClose: () => void;
}

const AppSelector: React.FC<AppSelectorProps> = ({
  selectedApps,
  onToggleApp,
  onClose,
}) => {
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [customApp, setCustomApp] = useState('');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const apps = await window.electronAPI.getInstalledApps();
        setAvailableApps(apps);
      } else {
        // Fallback para desenvolvimento no browser
        setAvailableApps([
          'Visual Studio Code',
          'Terminal',
          'Firefox',
          'Google Chrome',
          'Slack',
          'Discord',
          'Notion',
          'Figma',
          'Postman',
          'Docker',
          'Spotify',
          'Telegram',
          'WhatsApp',
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar apps:', error);
    }
    setIsLoading(false);
  };

  const filteredApps = availableApps.filter((app) =>
    app.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomApp = () => {
    if (customApp.trim() && !availableApps.includes(customApp.trim())) {
      setAvailableApps((prev) => [...prev, customApp.trim()]);
      onToggleApp(customApp.trim());
      setCustomApp('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomApp();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content app-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📱 Apps Permitidos</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p className="modal-description">
          Selecione os aplicativos que você poderá usar durante o período de foco.
        </p>

        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Buscar aplicativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="add-custom-app">
          <input
            type="text"
            placeholder="Adicionar app personalizado..."
            value={customApp}
            onChange={(e) => setCustomApp(e.target.value)}
            onKeyPress={handleKeyPress}
            className="custom-app-input"
          />
          <button 
            className="add-app-btn"
            onClick={handleAddCustomApp}
            disabled={!customApp.trim()}
          >
            +
          </button>
        </div>

        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Carregando aplicativos...</span>
          </div>
        ) : (
          <div className="apps-grid">
            {filteredApps.map((app) => (
              <button
                key={app}
                className={`app-item ${selectedApps.includes(app) ? 'selected' : ''}`}
                onClick={() => onToggleApp(app)}
              >
                <span className="app-check">
                  {selectedApps.includes(app) ? '✓' : ''}
                </span>
                <span className="app-name">{app}</span>
              </button>
            ))}
          </div>
        )}

        {filteredApps.length === 0 && !isLoading && (
          <div className="no-results">
            <span>😕</span>
            <p>Nenhum aplicativo encontrado</p>
          </div>
        )}

        <div className="modal-footer">
          <span className="selected-count">
            {selectedApps.length} app{selectedApps.length !== 1 ? 's' : ''} selecionado{selectedApps.length !== 1 ? 's' : ''}
          </span>
          <button className="done-btn" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSelector;
