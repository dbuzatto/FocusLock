import { exec } from 'child_process';
import { promisify } from 'util';
import { dialog, BrowserWindow } from 'electron';
import {
  detectDesktopEnvironment,
  isWayland,
  getKDEWindows,
  minimizeWindowDBus,
  minimizeKDEWindow,
  enableKDEDoNotDisturb,
  disableKDEDoNotDisturb,
  getKDEActiveWindow,
  checkKDEDependencies,
  getKDEInstallCommand
} from './kde-blocker';
import {
  isWindows,
  getWindowsWindows,
  getWindowsActiveWindow,
  minimizeWindowsWindow,
  enableWindowsFocusAssist,
  disableWindowsFocusAssist,
  WINDOWS_SYSTEM_APPS
} from './windows-blocker';

const execAsync = promisify(exec);

// Cache do ambiente detectado
let cachedDesktop: 'kde' | 'gnome' | 'xfce' | 'other' | null = null;
let cachedWayland: boolean | null = null;

// Mapeamento de nomes de apps para nomes de processos/janelas
const APP_TO_PROCESS: Record<string, string[]> = {
  'Visual Studio Code': ['code', 'Code', 'code-oss', 'codium'],
  'VS Code OSS': ['code-oss', 'Code - OSS'],
  'Firefox': ['firefox', 'Firefox', 'firefox-esr'],
  'Google Chrome': ['chrome', 'Chrome', 'google-chrome'],
  'Chromium': ['chromium', 'Chromium', 'chromium-browser'],
  'Terminal GNOME': ['gnome-terminal', 'gnome-terminal-server'],
  'Konsole': ['konsole'],
  'Alacritty': ['alacritty', 'Alacritty'],
  'Kitty': ['kitty'],
  'Slack': ['slack', 'Slack'],
  'Discord': ['discord', 'Discord'],
  'Spotify': ['spotify', 'Spotify'],
  'Telegram': ['telegram', 'telegram-desktop', 'Telegram'],
  'WhatsApp': ['whatsapp', 'WhatsApp'],
  'Notion': ['notion', 'Notion'],
  'Obsidian': ['obsidian', 'Obsidian'],
  'Postman': ['postman', 'Postman'],
  'Insomnia': ['insomnia', 'Insomnia'],
  'DBeaver': ['dbeaver', 'DBeaver'],
  'GitKraken': ['gitkraken', 'GitKraken'],
  'Sublime Text': ['sublime_text', 'subl', 'Sublime'],
  'IntelliJ IDEA': ['idea', 'intellij', 'jetbrains-idea'],
  'WebStorm': ['webstorm', 'jetbrains-webstorm'],
  'PyCharm': ['pycharm', 'jetbrains-pycharm'],
  'Android Studio': ['studio', 'android-studio'],
  'Figma': ['figma', 'Figma'],
  'GIMP': ['gimp', 'GIMP'],
  'Inkscape': ['inkscape', 'Inkscape'],
  'Blender': ['blender', 'Blender'],
  'VLC': ['vlc', 'VLC'],
  'LibreOffice Writer': ['soffice', 'libreoffice'],
  'LibreOffice Calc': ['soffice', 'libreoffice'],
  'Thunderbird': ['thunderbird', 'Thunderbird'],
  'Arquivos': ['nautilus', 'Nautilus', 'Files'],
  'Dolphin': ['dolphin', 'Dolphin'],
  'Steam': ['steam', 'Steam'],
  'Zoom': ['zoom', 'Zoom'],
  'Microsoft Teams': ['teams', 'Teams'],
};

// Apps que nunca devem ser bloqueados (sistema)
const SYSTEM_APPS = [
  'focuslock',
  'FocusLock',
  'electron',
  'Electron',
  'gnome-shell',
  'plasmashell',
  'kwin',
  'kwin_wayland',
  'mutter',
  'Xorg',
  'Xwayland',
  'xwayland',
  'wayland',
  'Wayland',
  'ponte',
  'bridge',
  'pulseaudio',
  'pipewire',
  'systemd',
  'dbus',
  'polkit',
  'gsd-',
  'gnome-settings',
  'kded',
  'plasmashell',
  'krunner',
  'albert',
  'ulauncher',
  'rofi',
  'dmenu',
  'polybar',
  'waybar',
  'panel',
  'dock',
  'plank',
  'cairo-dock',
];

let monitorInterval: NodeJS.Timeout | null = null;
let isBlocking = false;

// Detectar ambiente uma vez
async function getDesktopEnvironment(): Promise<'kde' | 'gnome' | 'xfce' | 'other'> {
  if (cachedDesktop === null) {
    cachedDesktop = await detectDesktopEnvironment();
    console.log('Ambiente detectado:', cachedDesktop);
  }
  return cachedDesktop;
}

async function getIsWayland(): Promise<boolean> {
  if (cachedWayland === null) {
    cachedWayland = await isWayland();
    console.log('Wayland:', cachedWayland);
  }
  return cachedWayland;
}

// Ativar modo Não Perturbe
export async function enableDoNotDisturb(): Promise<void> {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      // Windows - Focus Assist via PowerShell
      await enableWindowsFocusAssist();
    } else if (platform === 'linux') {
      const desktop = await getDesktopEnvironment();
      if (desktop === 'kde') {
        await enableKDEDoNotDisturb();
      } else {
        // GNOME e outros
        await execAsync('gsettings set org.gnome.desktop.notifications show-banners false').catch(() => {});
      }
    } else if (platform === 'darwin') {
      // macOS - ativa Do Not Disturb
      await execAsync('defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean true');
      await execAsync('killall NotificationCenter');
    }
    console.log('Modo Não Perturbe ativado');
  } catch (error) {
    console.log('Aviso: Não foi possível ativar modo Não Perturbe:', error);
  }
}

// Desativar modo Não Perturbe
export async function disableDoNotDisturb(): Promise<void> {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      // Windows - Focus Assist
      await disableWindowsFocusAssist();
    } else if (platform === 'linux') {
      const desktop = await getDesktopEnvironment();
      if (desktop === 'kde') {
        await disableKDEDoNotDisturb();
      } else {
        await execAsync('gsettings set org.gnome.desktop.notifications show-banners true').catch(() => {});
      }
    } else if (platform === 'darwin') {
      await execAsync('defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean false');
      await execAsync('killall NotificationCenter');
    }
    console.log('Modo Não Perturbe desativado');
  } catch (error) {
    console.log('Aviso: Não foi possível desativar modo Não Perturbe:', error);
  }
}

// Obter lista de janelas abertas (Linux)
async function getOpenWindows(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('wmctrl -l 2>/dev/null || xdotool search --name "" getwindowname 2>/dev/null');
    return stdout.split('\n').filter(line => line.trim().length > 0);
  } catch {
    return [];
  }
}

// Minimizar janela por ID (Linux) - usa múltiplos métodos
async function minimizeWindowById(windowId: string): Promise<boolean> {
  const hexId = windowId.startsWith('0x') ? windowId : `0x${windowId}`;
  let success = false;
  
  try {
    // Método 1: xdotool windowminimize (mais confiável)
    await execAsync(`xdotool windowminimize ${hexId} 2>/dev/null`);
    success = true;
  } catch {}
  
  try {
    // Método 2: wmctrl -i -c (fecha/minimiza)
    await execAsync(`wmctrl -i -c ${hexId} 2>/dev/null`);
    success = true;
  } catch {}
  
  try {
    // Método 3: wmctrl -i -r com ação de minimizar
    await execAsync(`wmctrl -i -r ${hexId} -b add,hidden 2>/dev/null`);
    success = true;
  } catch {}
  
  try {
    // Método 4: xdotool com window activate + minimize
    await execAsync(`xdotool windowactivate --sync ${hexId} windowminimize ${hexId} 2>/dev/null`);
    success = true;
  } catch {}
  
  return success;
}

// Obter janela ativa atual
async function getActiveWindow(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('xdotool getactivewindow 2>/dev/null');
    return stdout.trim();
  } catch {
    return null;
  }
}

// Obter informações da janela
async function getWindowInfo(windowId: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`xdotool getwindowname ${windowId} 2>/dev/null`);
    return stdout.trim();
  } catch {
    return '';
  }
}

// Verificar se um processo/janela é permitido
function isAppAllowed(windowTitle: string, allowedApps: string[]): boolean {
  // Se não há apps selecionados, permite tudo
  if (allowedApps.length === 0) return true;
  
  // FocusLock sempre é permitido
  if (windowTitle.toLowerCase().includes('focuslock')) return true;
  
  // Verifica se é um app do sistema (Linux)
  for (const sysApp of SYSTEM_APPS) {
    if (windowTitle.toLowerCase().includes(sysApp.toLowerCase())) return true;
  }
  
  // Verifica se é um app do sistema (Windows)
  if (process.platform === 'win32') {
    for (const sysApp of WINDOWS_SYSTEM_APPS) {
      if (windowTitle.toLowerCase().includes(sysApp.toLowerCase())) return true;
    }
  }
  
  // Verifica se está na lista de permitidos
  for (const app of allowedApps) {
    // Verifica pelo nome do app
    if (windowTitle.toLowerCase().includes(app.toLowerCase())) return true;
    
    // Verifica pelos nomes de processo mapeados
    const processes = APP_TO_PROCESS[app] || [];
    for (const proc of processes) {
      if (windowTitle.toLowerCase().includes(proc.toLowerCase())) return true;
    }
  }
  
  return false;
}

// Iniciar monitoramento e bloqueio
export async function startBlocking(allowedApps: string[]): Promise<void> {
  if (isBlocking) return;
  isBlocking = true;
  
  const platform = process.platform;
  const desktop = platform === 'linux' ? await getDesktopEnvironment() : 'windows';
  const usingWayland = platform === 'linux' ? await getIsWayland() : false;
  
  console.log('Iniciando bloqueio. Apps permitidos:', allowedApps);
  console.log('Platform:', platform, 'Desktop:', desktop, 'Wayland:', usingWayland);
  
  // Sempre ativa o modo Não Perturbe
  await enableDoNotDisturb();
  
  // Primeiro, minimiza todas as janelas não permitidas imediatamente
  if (allowedApps.length > 0) {
    await minimizeBlockedWindows(allowedApps, desktop);
  }
  
  // Se há apps selecionados, monitora constantemente
  if (allowedApps.length > 0) {
    // Verifica a cada 800ms para resposta rápida
    monitorInterval = setInterval(async () => {
      if (!isBlocking) return;
      
      try {
        if (platform === 'win32') {
          // Windows - usa PowerShell para controle de janelas
          const windows = await getWindowsWindows();
          for (const win of windows) {
            // Verifica pelo título E pelo nome do processo
            if (!isAppAllowed(win.title, allowedApps) && !isAppAllowed(win.processName, allowedApps)) {
              console.log('Minimizando (Windows):', win.title, `(${win.processName})`);
              await minimizeWindowsWindow(win.handle);
            }
          }
          
          // Verifica a janela ativa
          const activeWin = await getWindowsActiveWindow();
          if (activeWin && !isAppAllowed(activeWin.title, allowedApps) && !isAppAllowed(activeWin.processName, allowedApps)) {
            console.log('Minimizando janela ativa (Windows):', activeWin.title, `(${activeWin.processName})`);
            await minimizeWindowsWindow(activeWin.handle);
          }
        } else if (desktop === 'kde') {
          // No KDE, usa a API específica
          const windows = await getKDEWindows();
          for (const win of windows) {
            if (!isAppAllowed(win.caption, allowedApps) && !isAppAllowed(win.resourceClass, allowedApps)) {
              console.log('Minimizando (KDE):', win.caption);
              await minimizeWindowDBus(win.caption);
            }
          }
          
          // Também verifica a janela ativa
          const activeWin = await getKDEActiveWindow();
          if (activeWin && !isAppAllowed(activeWin.caption, allowedApps)) {
            console.log('Minimizando janela ativa (KDE):', activeWin.caption);
            await minimizeWindowDBus(activeWin.caption);
          }
        } else {
          // Para outros ambientes, usa xdotool/wmctrl
          const activeWindowId = await getActiveWindow();
          if (activeWindowId) {
            const windowName = await getWindowInfo(activeWindowId);
            if (windowName && !isAppAllowed(windowName, allowedApps)) {
              console.log('Bloqueando janela ativa:', windowName);
              await minimizeWindowById(activeWindowId);
            }
          }
          
          const windows = await getOpenWindows();
          for (const window of windows) {
            const windowId = window.split(/\s+/)[0] || window;
            if (!isAppAllowed(window, allowedApps)) {
              await minimizeWindowById(windowId);
            }
          }
        }
      } catch (error) {
        // Ignora erros silenciosamente
      }
    }, 800); // Verifica a cada 800ms
  }
}

// Minimiza todas as janelas bloqueadas
async function minimizeBlockedWindows(allowedApps: string[], desktop: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // No Windows, usa PowerShell com Win32 API
      console.log('Buscando janelas Windows...');
      const windows = await getWindowsWindows();
      console.log('Janelas encontradas no Windows:', windows.length, windows.map(w => `${w.processName}: ${w.title}`));
      
      for (const win of windows) {
        // Verifica pelo título E pelo nome do processo
        const allowed = isAppAllowed(win.title, allowedApps) || isAppAllowed(win.processName, allowedApps);
        console.log(`Janela: "${win.title}" (${win.processName}) - Permitida: ${allowed}`);
        
        if (!allowed) {
          console.log('>>> Minimizando janela (Windows):', win.title, `(${win.processName})`);
          await minimizeWindowsWindow(win.handle);
        }
      }
    } else if (desktop === 'kde') {
      // No KDE, usa DBus para minimizar
      console.log('Buscando janelas KDE...');
      const windows = await getKDEWindows();
      console.log('Janelas encontradas no KDE:', windows.length, windows.map(w => w.caption));
      
      for (const win of windows) {
        const allowed = isAppAllowed(win.caption, allowedApps) || isAppAllowed(win.resourceClass, allowedApps);
        console.log(`Janela: "${win.caption}" (${win.resourceClass}) - Permitida: ${allowed}`);
        
        if (!allowed) {
          console.log('>>> Minimizando janela (KDE):', win.caption);
          await minimizeKDEWindow(win.id, win.caption);
        }
      }
    } else {
      // Para outros, usa wmctrl/xdotool
      const windows = await getOpenWindows();
      for (const window of windows) {
        const windowId = window.split(/\s+/)[0] || window;
        if (!isAppAllowed(window, allowedApps)) {
          console.log('Minimizando janela:', window);
          await minimizeWindowById(windowId);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao minimizar janelas:', error);
  }
}

// Parar monitoramento e bloqueio
export async function stopBlocking(): Promise<void> {
  isBlocking = false;
  
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  
  await disableDoNotDisturb();
  console.log('Bloqueio desativado');
}

// Verificar se ferramentas necessárias estão instaladas
export async function checkDependencies(): Promise<{ hasWmctrl: boolean; hasXdotool: boolean; isWayland: boolean; isWindows: boolean }> {
  let hasWmctrl = false;
  let hasXdotool = false;
  let usingWayland = false;
  
  // Windows não precisa de dependências externas
  if (process.platform === 'win32') {
    return { hasWmctrl: true, hasXdotool: true, isWayland: false, isWindows: true };
  }
  
  try {
    await execAsync('which wmctrl');
    hasWmctrl = true;
  } catch {}
  
  try {
    await execAsync('which xdotool');
    hasXdotool = true;
  } catch {}
  
  // Verificar se está no Wayland
  try {
    const { stdout } = await execAsync('echo $XDG_SESSION_TYPE');
    usingWayland = stdout.trim() === 'wayland';
  } catch {}
  
  return { hasWmctrl, hasXdotool, isWayland: usingWayland, isWindows: false };
}

// Mostrar diálogo de permissões/dependências
export async function showPermissionsDialog(mainWindow: BrowserWindow | null): Promise<boolean> {
  // Windows não precisa de diálogo de configuração
  if (process.platform === 'win32') {
    return true;
  }
  
  const deps = await checkDependencies();
  const desktop = await getDesktopEnvironment();
  const kdeDeps = desktop === 'kde' ? await checkKDEDependencies() : null;
  
  const missingDeps: string[] = [];
  if (!deps.hasWmctrl) missingDeps.push('wmctrl');
  if (!deps.hasXdotool) missingDeps.push('xdotool');
  
  let message = '';
  
  if (desktop === 'kde') {
    // Mensagem específica para KDE
    if (missingDeps.length > 0 || (kdeDeps && !kdeDeps.hasDbusSend)) {
      message += `⚠️ Dependências necessárias para KDE Plasma:\n\n`;
      message += `Instale com:\n${getKDEInstallCommand()}\n\n`;
    }
    
    if (deps.isWayland) {
      message += `ℹ️ KDE Plasma com Wayland detectado.\n\n`;
      message += `O FocusLock usa KWin Scripting via DBus para controlar janelas.\n`;
      message += `Isso funciona nativamente no KDE Plasma!\n\n`;
      message += `Se o bloqueio não funcionar corretamente:\n`;
      message += `1. Verifique se qdbus está instalado\n`;
      message += `2. Ou use uma sessão X11 (Plasma X11) no login\n`;
    }
  } else {
    // Mensagem para GNOME e outros
    if (missingDeps.length > 0) {
      message += `⚠️ Dependências necessárias não encontradas:\n\n`;
      message += `Instale com:\nsudo apt install ${missingDeps.join(' ')}\n\n`;
    }
    
    if (deps.isWayland) {
      message += `ℹ️ Você está usando Wayland.\n\n`;
      message += `Para o bloqueio funcionar corretamente no Wayland, você pode:\n\n`;
      message += `1. Usar uma sessão X11 (Xorg) no login\n`;
      message += `   OU\n`;
      message += `2. Instalar extensão para GNOME:\n`;
      message += `   - "Fokus" ou "Do Not Disturb"\n\n`;
      message += `O bloqueio pode ter funcionalidade limitada no Wayland.`;
    }
  }
  
  if (message) {
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'FocusLock - Configuração',
      message: `Configuração para ${desktop.toUpperCase()}`,
      detail: message,
      buttons: ['Continuar', 'Cancelar'],
      defaultId: 0,
      cancelId: 1,
    });
    
    return result.response === 0;
  }
  
  return true;
}

// Verificar se o ambiente suporta controle de janelas
export async function testWindowControl(): Promise<boolean> {
  try {
    // Windows sempre suporta via PowerShell
    if (process.platform === 'win32') {
      const windows = await getWindowsWindows();
      return windows.length > 0;
    }
    
    // Linux - tenta listar janelas para ver se funciona
    const { stdout } = await execAsync('wmctrl -l 2>/dev/null || xdotool search --name "" 2>/dev/null');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
