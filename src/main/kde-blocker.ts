import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Detectar o ambiente de desktop
export async function detectDesktopEnvironment(): Promise<'kde' | 'gnome' | 'xfce' | 'other'> {
  try {
    const { stdout: desktop } = await execAsync('echo $XDG_CURRENT_DESKTOP');
    const env = desktop.trim().toLowerCase();
    
    if (env.includes('kde') || env.includes('plasma')) return 'kde';
    if (env.includes('gnome')) return 'gnome';
    if (env.includes('xfce')) return 'xfce';
    return 'other';
  } catch {
    return 'other';
  }
}

// Detectar se está usando Wayland
export async function isWayland(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('echo $XDG_SESSION_TYPE');
    return stdout.trim() === 'wayland';
  } catch {
    return false;
  }
}

// ============= KDE PLASMA =============

// Obter lista de janelas no KDE usando WindowsRunner via DBus
export async function getKDEWindows(): Promise<Array<{ id: string; caption: string; resourceClass: string }>> {
  try {
    console.log('getKDEWindows: Listando janelas via WindowsRunner...');
    
    // Usa o WindowsRunner que funciona perfeitamente no Wayland!
    const { stdout } = await execAsync('qdbus --literal org.kde.KWin /WindowsRunner org.kde.krunner1.Match ""');
    
    const windows: Array<{ id: string; caption: string; resourceClass: string }> = [];
    
    // Parse o output do WindowsRunner
    // Formato: [Argument: (sssida{sv}) "ID", "caption", "resourceClass", ...]
    const regex = /\[Argument: \(sssida\{sv\}\) "([^"]+)", "([^"]+)", "([^"]+)",/g;
    let match;
    const seen = new Set<string>();
    
    while ((match = regex.exec(stdout)) !== null) {
      const id = match[1];
      const caption = match[2];
      const resourceClass = match[3];
      
      // Evita duplicatas (WindowsRunner pode retornar mesma janela 2x)
      if (seen.has(id)) continue;
      seen.add(id);
      
      // Ignora o próprio FocusLock e apps internos
      if (caption.toLowerCase().includes('focuslock') ||
          resourceClass.toLowerCase().includes('electron') ||
          resourceClass === 'xwaylandvideobridge') {
        continue;
      }
      
      windows.push({ id, caption, resourceClass });
    }
    
    console.log('WindowsRunner encontrou', windows.length, 'janelas:');
    windows.forEach(w => console.log(`  - ${w.caption} (${w.resourceClass})`));
    
    return windows;
  } catch (error) {
    console.error('Erro ao listar janelas KDE:', error);
    
    // Fallback para wmctrl
    try {
      const { stdout } = await execAsync('wmctrl -l -x 2>/dev/null');
      const windows: Array<{ id: string; caption: string; resourceClass: string }> = [];
      
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\s+/);
        const id = parts[0];
        const resourceClass = parts[2] || '';
        const caption = parts.slice(4).join(' ');
        
        if (caption.toLowerCase().includes('focuslock') || 
            resourceClass.toLowerCase().includes('electron')) {
          continue;
        }
        
        windows.push({ 
          id, 
          caption, 
          resourceClass: resourceClass.split('.')[0] 
        });
      }
      
      return windows;
    } catch {
      return [];
    }
  }
}

// Minimizar janela no KDE usando WindowsRunner/KWin Scripting (funciona no Wayland!)
export async function minimizeKDEWindow(windowId: string, caption: string): Promise<boolean> {
  console.log('Tentando minimizar:', caption, 'ID:', windowId);
  
  try {
    // Método principal: KWin Script para minimizar por caption (funciona para TODOS os tipos de janela)
    const safeCaption = caption.replace(/'/g, "\\'").replace(/"/g, '\\"').substring(0, 50);
    const kwinScript = `
(function() {
    var clients = workspace.windowList();
    for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        var name = c.caption || '';
        if (name.indexOf('${safeCaption}') !== -1) {
            c.minimized = true;
        }
    }
})();
`;
    
    const scriptPath = `/tmp/focuslock_min_${Date.now()}.js`;
    await execAsync(`echo '${kwinScript.replace(/'/g, "'\\''")}' > ${scriptPath}`);
    
    // Carrega, executa e remove o script
    const scriptId = await execAsync(`qdbus org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript "${scriptPath}" "focuslock_min" 2>/dev/null`);
    
    if (scriptId.stdout.trim()) {
      // Executar via start() que inicia todos os scripts carregados
      await execAsync(`qdbus org.kde.KWin /Scripting org.kde.kwin.Scripting.start 2>/dev/null`);
      await new Promise(resolve => setTimeout(resolve, 50));
      await execAsync(`qdbus org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript "focuslock_min" 2>/dev/null`);
      console.log('✓ Minimizado via KWin Script:', caption);
    }
    
    await execAsync(`rm -f ${scriptPath} 2>/dev/null`).catch(() => {});
    
    return true;
  } catch (error) {
    console.error('Erro ao minimizar janela KDE:', error);
    return false;
  }
}

// Minimizar janela usando KWin (wrapper)
export async function minimizeWindowDBus(caption: string): Promise<boolean> {
  return await minimizeKDEWindow('', caption);
}

// Estado do DND para saber se precisamos desativar
let dndWasEnabled = false;

// Ativar modo Não Perturbe no KDE
export async function enableKDEDoNotDisturb(): Promise<void> {
  try {
    // Mostra notificação informando que o foco iniciou
    await execAsync('notify-send -i dialog-information -a "FocusLock" "🎯 Modo Foco Ativado" "Foco ativado! Bom trabalho!" -t 3000 2>/dev/null').catch(() => {});
    
    // Aguarda a notificação aparecer
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verifica se DND já está ativo
    try {
      const { stdout } = await execAsync('qdbus org.kde.plasmashell /org/freedesktop/Notifications org.freedesktop.DBus.Properties.Get org.freedesktop.Notifications Inhibited');
      if (stdout.trim() === 'true') {
        console.log('KDE: Não Perturbe já estava ativo');
        dndWasEnabled = false; // Não desativar depois pois já estava ativo
        return;
      }
    } catch {}
    
    // Ativa o modo Não Perturbe usando o atalho global do plasmashell
    try {
      await execAsync('qdbus org.kde.kglobalaccel /component/plasmashell org.kde.kglobalaccel.Component.invokeShortcut "toggle do not disturb"');
      dndWasEnabled = true;
      console.log('KDE: Modo Não Perturbe ativado via kglobalaccel');
    } catch (e) {
      console.log('Aviso: Não foi possível ativar DND via kglobalaccel:', e);
      dndWasEnabled = false;
    }
  } catch (error) {
    console.log('Aviso: Não foi possível ativar DND no KDE:', error);
  }
}

// Desativar modo Não Perturbe no KDE
export async function disableKDEDoNotDisturb(): Promise<void> {
  try {
    // Só desativa se nós ativamos
    if (dndWasEnabled) {
      try {
        // Verifica se ainda está ativo antes de desativar
        const { stdout } = await execAsync('qdbus org.kde.plasmashell /org/freedesktop/Notifications org.freedesktop.DBus.Properties.Get org.freedesktop.Notifications Inhibited');
        if (stdout.trim() === 'true') {
          await execAsync('qdbus org.kde.kglobalaccel /component/plasmashell org.kde.kglobalaccel.Component.invokeShortcut "toggle do not disturb"');
          console.log('KDE: Modo Não Perturbe desativado via kglobalaccel');
        }
      } catch (e) {
        console.log('Aviso: Não foi possível desativar DND:', e);
      }
      dndWasEnabled = false;
    }
    
    // Mostra notificação de fim do foco
    await execAsync('notify-send -i dialog-information -a "FocusLock" "☕ Modo Foco Desativado" "Parabéns pelo foco! Hora de descansar." -t 3000 2>/dev/null').catch(() => {});
    
    console.log('KDE: Modo Foco desativado');
  } catch (error) {
    console.log('Aviso: Não foi possível desativar DND no KDE:', error);
  }
}

// Obter janela ativa no KDE
export async function getKDEActiveWindow(): Promise<{ id: string; caption: string } | null> {
  try {
    // Tentar com xdotool primeiro (funciona via XWayland)
    const { stdout: winId } = await execAsync('xdotool getactivewindow 2>/dev/null');
    const { stdout: winName } = await execAsync(`xdotool getwindowname ${winId.trim()} 2>/dev/null`);
    
    return {
      id: winId.trim(),
      caption: winName.trim()
    };
  } catch {
    return null;
  }
}

// Verificar dependências do KDE
export async function checkKDEDependencies(): Promise<{ hasQdbus: boolean; hasWmctrl: boolean; hasXdotool: boolean; hasDbusSend: boolean }> {
  const deps = {
    hasQdbus: false,
    hasWmctrl: false,
    hasXdotool: false,
    hasDbusSend: false
  };
  
  try { await execAsync('which qdbus'); deps.hasQdbus = true; } catch {}
  try { await execAsync('which wmctrl'); deps.hasWmctrl = true; } catch {}
  try { await execAsync('which xdotool'); deps.hasXdotool = true; } catch {}
  try { await execAsync('which dbus-send'); deps.hasDbusSend = true; } catch {}
  
  return deps;
}

// Instalar dependências necessárias (mostra comando)
export function getKDEInstallCommand(): string {
  return 'sudo apt install wmctrl xdotool qdbus-qt5';
}
