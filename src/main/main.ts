import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';
import { startBlocking, stopBlocking, checkDependencies, showPermissionsDialog, testWindowControl } from './blocker';

let mainWindow: BrowserWindow | null = null;
let permissionsChecked = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 750,
    minWidth: 320,
    minHeight: 500,
    maxWidth: 800,
    maxHeight: 1200,
    resizable: true,
    frame: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Padrões para filtrar apps que não são apps reais
const EXCLUDED_PATTERNS = [
  /^kcm_/,           // Módulos de configuração do KDE
  /^kde-/,           // Configurações KDE
  /^org\.kde\.kinfocenter/,
  /^systemsettings/, // Configurações do sistema
  /^kdesystemsettings/,
  /^xdg-/,           // Utilitários XDG
  /^gnome-/,         // Alguns utilitários GNOME (mantemos apps principais)
  /^yelp/,           // Help
  /^nm-/,            // Network Manager
  /^debian/,         // Debian utils
  /^gcr-/,           // GNOME Crypto
  /^gkbd/,           // Keyboard
  /^im-config/,
  /^info\./,
  /^htop/,
  /^avahi/,
  /^cups/,
  /^bluetooth-sendto/,
  /^org\.gnome\.Extensions/,
  /^software-properties/,
  /^update-manager/,
  /-preferences$/,
  /-settings$/,
];

// Mapeamento de nomes técnicos para nomes amigáveis
const APP_NAME_MAP: Record<string, string> = {
  'code': 'Visual Studio Code',
  'code-oss': 'VS Code OSS',
  'codium': 'VSCodium',
  'firefox': 'Firefox',
  'firefox-esr': 'Firefox',
  'google-chrome': 'Google Chrome',
  'chromium': 'Chromium',
  'chromium-browser': 'Chromium',
  'org.gnome.Terminal': 'Terminal GNOME',
  'gnome-terminal': 'Terminal GNOME',
  'konsole': 'Konsole',
  'org.kde.konsole': 'Konsole',
  'alacritty': 'Alacritty',
  'kitty': 'Kitty',
  'slack': 'Slack',
  'discord': 'Discord',
  'spotify': 'Spotify',
  'telegram-desktop': 'Telegram',
  'org.telegram.desktop': 'Telegram',
  'whatsapp-desktop': 'WhatsApp',
  'notion': 'Notion',
  'notion-app': 'Notion',
  'obsidian': 'Obsidian',
  'postman': 'Postman',
  'insomnia': 'Insomnia',
  'dbeaver': 'DBeaver',
  'org.dbeaver.enterprise': 'DBeaver',
  'docker-desktop': 'Docker Desktop',
  'gitkraken': 'GitKraken',
  'sublime_text': 'Sublime Text',
  'intellij-idea': 'IntelliJ IDEA',
  'webstorm': 'WebStorm',
  'pycharm': 'PyCharm',
  'android-studio': 'Android Studio',
  'figma-linux': 'Figma',
  'org.gimp.GIMP': 'GIMP',
  'gimp': 'GIMP',
  'inkscape': 'Inkscape',
  'org.inkscape.Inkscape': 'Inkscape',
  'blender': 'Blender',
  'vlc': 'VLC',
  'org.videolan.VLC': 'VLC',
  'libreoffice-writer': 'LibreOffice Writer',
  'libreoffice-calc': 'LibreOffice Calc',
  'libreoffice-impress': 'LibreOffice Impress',
  'thunderbird': 'Thunderbird',
  'org.mozilla.Thunderbird': 'Thunderbird',
  'nautilus': 'Arquivos',
  'org.gnome.Nautilus': 'Arquivos',
  'dolphin': 'Dolphin',
  'org.kde.dolphin': 'Dolphin',
  'org.gnome.gedit': 'gedit',
  'gedit': 'gedit',
  'org.gnome.Calculator': 'Calculadora',
  'gnome-calculator': 'Calculadora',
  'evince': 'Visualizador de PDF',
  'org.gnome.Evince': 'Visualizador de PDF',
  'eog': 'Visualizador de Imagens',
  'org.gnome.eog': 'Visualizador de Imagens',
  'steam': 'Steam',
  'zoom': 'Zoom',
  'teams': 'Microsoft Teams',
  'teams-for-linux': 'Microsoft Teams',
};

// Obter lista de aplicativos instalados (multiplataforma)
function getInstalledApps(): Promise<string[]> {
  return new Promise((resolve) => {
    const platform = process.platform;

    if (platform === 'linux') {
      // Busca arquivos .desktop e extrai o nome do app
      const command = `grep -l "Type=Application" /usr/share/applications/*.desktop ~/.local/share/applications/*.desktop 2>/dev/null | xargs -I {} sh -c 'grep -m1 "^Name=" "{}" | cut -d= -f2' 2>/dev/null`;
      
      exec(command, (error, stdout) => {
        if (error || !stdout.trim()) {
          // Fallback: listar arquivos desktop e filtrar
          const fallbackCmd = 'ls /usr/share/applications/*.desktop 2>/dev/null | xargs -I {} basename {} .desktop';
          exec(fallbackCmd, (err2, stdout2) => {
            if (err2) {
              resolve(getDefaultApps());
              return;
            }
            const apps = processLinuxApps(stdout2);
            resolve(apps.length > 0 ? apps : getDefaultApps());
          });
          return;
        }
        
        const apps = stdout
          .split('\n')
          .map((app) => app.trim())
          .filter((app) => app.length > 0 && app.length < 50) // Nomes muito longos não são apps
          .filter((app, index, self) => self.indexOf(app) === index) // Remove duplicados
          .sort();
        
        resolve(apps.length > 0 ? apps : getDefaultApps());
      });
    } else if (platform === 'darwin') {
      const command = 'ls /Applications | grep ".app" | sed "s/.app//"';
      exec(command, (error, stdout) => {
        if (error) {
          resolve(getDefaultApps());
          return;
        }
        const apps = stdout.split('\n').map((app) => app.trim()).filter((app) => app.length > 0).sort();
        resolve(apps.length > 0 ? apps : getDefaultApps());
      });
    } else if (platform === 'win32') {
      // Lista apps do Windows de múltiplas fontes
      const commands = [
        // Força encoding UTF-8
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
        // Apps instalados via registro (x64)
        'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName } | Select-Object -ExpandProperty DisplayName',
        // Apps instalados via registro (x86)
        'Get-ItemProperty HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName } | Select-Object -ExpandProperty DisplayName',
        // Apps do usuário
        'Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName } | Select-Object -ExpandProperty DisplayName',
        // UWP/Microsoft Store apps
        'Get-AppxPackage | Where-Object { $_.IsFramework -eq $false } | Select-Object -ExpandProperty Name'
      ];
      
      const command = `chcp 65001 >nul && powershell -NoProfile -ExecutionPolicy Bypass -Command "${commands.join('; ')}"`;
      exec(command, { encoding: 'utf8', shell: 'cmd.exe' }, (error, stdout) => {
        if (error) {
          resolve(getDefaultApps());
          return;
        }
        const apps = stdout
          .split('\n')
          .map((app) => app.trim())
          .filter((app) => app.length > 0 && app.length < 60)
          .filter((app) => !app.startsWith('Microsoft.') || app.includes('Office') || app.includes('Teams') || app.includes('Edge'))
          .filter((app) => !app.includes('Update') && !app.includes('Redistributable') && !app.includes('SDK'))
          .map((app) => formatWindowsAppName(app))
          .filter((app, index, self) => self.indexOf(app) === index) // Remove duplicados
          .sort();
        resolve(apps.length > 0 ? apps : getDefaultApps());
      });
    } else {
      resolve(getDefaultApps());
    }
  });
}

// Processa lista de apps do Linux, filtrando e renomeando
function processLinuxApps(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((app) => app.trim())
    .filter((app) => app.length > 0)
    .filter((app) => !EXCLUDED_PATTERNS.some((pattern) => pattern.test(app)))
    .map((app) => APP_NAME_MAP[app] || formatAppName(app))
    .filter((app, index, self) => self.indexOf(app) === index) // Remove duplicados
    .sort();
}

// Formata nome do app para ficar mais legível
function formatAppName(name: string): string {
  // Remove extensões e prefixos comuns
  let formatted = name
    .replace(/\.desktop$/, '')
    .replace(/^org\.[^.]+\./, '') // Remove prefixos como org.gnome.
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');
  
  // Capitaliza primeira letra de cada palavra
  formatted = formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}

// Formata nome do app Windows
function formatWindowsAppName(name: string): string {
  // Remove prefixos de pacotes UWP
  let formatted = name
    .replace(/^Microsoft\./g, '')
    .replace(/\.x64$/g, '')
    .replace(/\.x86$/g, '')
    .replace(/\(x64\)/g, '')
    .replace(/\(x86\)/g, '')
    .trim();
  
  return formatted;
}

// Lista padrão de apps comuns para devs
function getDefaultApps(): string[] {
  return [
    'Visual Studio Code',
    'code',
    'Terminal',
    'gnome-terminal',
    'konsole',
    'Firefox',
    'Google Chrome',
    'Slack',
    'Discord',
    'Notion',
    'Figma',
    'Postman',
    'Docker',
    'GitKraken',
    'Sublime Text',
    'IntelliJ IDEA',
    'Android Studio',
    'Insomnia',
    'DBeaver',
    'Obsidian',
  ];
}

app.whenReady().then(() => {
  createWindow();

  // Handler para obter apps instalados
  ipcMain.handle('get-installed-apps', async () => {
    return await getInstalledApps();
  });

  // Handler para iniciar o modo foco com bloqueio
  ipcMain.handle('start-focus', async (_event, allowedApps: string[]) => {
    console.log('Iniciando modo foco com apps:', allowedApps);
    
    // Verifica permissões apenas na primeira vez
    if (!permissionsChecked && allowedApps.length > 0) {
      const canProceed = await showPermissionsDialog(mainWindow);
      if (!canProceed) {
        return false;
      }
      permissionsChecked = true;
      
      // Testa se o controle de janelas funciona
      const windowControlWorks = await testWindowControl();
      if (!windowControlWorks) {
        console.log('Aviso: Controle de janelas pode não funcionar corretamente');
      }
    }
    
    await startBlocking(allowedApps);
    return true;
  });

  // Handler para parar o modo foco
  ipcMain.handle('stop-focus', async () => {
    console.log('Parando modo foco');
    await stopBlocking();
    return true;
  });

  // Handler para pausar o modo foco (para o bloqueio temporariamente)
  ipcMain.handle('pause-focus', async () => {
    console.log('Pausando modo foco');
    await stopBlocking();
    return true;
  });

  // Handler para retomar o modo foco
  ipcMain.handle('resume-focus', async (_event, allowedApps: string[]) => {
    console.log('Retomando modo foco com apps:', allowedApps);
    await startBlocking(allowedApps);
    return true;
  });

  // Handler para verificar dependências
  ipcMain.handle('check-dependencies', async () => {
    return await checkDependencies();
  });

  // Handler para testar controle de janelas
  ipcMain.handle('test-window-control', async () => {
    return await testWindowControl();
  });

  // Handler para mostrar diálogo de permissões
  ipcMain.handle('show-permissions', async () => {
    return await showPermissionsDialog(mainWindow);
  });

  // Handler para notificação quando o tempo acabar
  ipcMain.handle('focus-ended', async () => {
    await stopBlocking();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await stopBlocking();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
