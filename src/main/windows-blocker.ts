import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WindowInfo {
  handle: string;
  title: string;
  processName: string;
}

// Obter lista de janelas no Windows usando Get-Process (mais simples e confiável)
export async function getWindowsWindows(): Promise<WindowInfo[]> {
  try {
    // Usar chcp 65001 para forçar UTF-8 no console
    const { stdout } = await execAsync(
      'chcp 65001 >nul && powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process | Where-Object { $_.MainWindowTitle -ne \'\' } | ForEach-Object { Write-Output ($_.MainWindowHandle.ToString() + \'|\' + $_.MainWindowTitle + \'|\' + $_.ProcessName) }"',
      {
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
        shell: 'cmd.exe'
      }
    );
    
    const windows: WindowInfo[] = [];
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 3 && parts[0] !== '0') {
        windows.push({
          handle: parts[0].trim(),
          title: parts[1].trim(),
          processName: parts[2].trim()
        });
      }
    }
    
    console.log('Windows - Janelas encontradas:', windows.length);
    return windows;
  } catch (error) {
    console.error('Erro ao listar janelas Windows:', error);
    return [];
  }
}

// Obter janela ativa no Windows
export async function getWindowsActiveWindow(): Promise<WindowInfo | null> {
  try {
    const { stdout } = await execAsync(
      'chcp 65001 >nul && powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -Name WinAPI -Namespace Win32 -MemberDefinition \'[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);\'; $h = [Win32.WinAPI]::GetForegroundWindow(); $pid = 0; [Win32.WinAPI]::GetWindowThreadProcessId($h, [ref]$pid) | Out-Null; $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; if ($p -and $p.MainWindowTitle) { Write-Output ($h.ToString() + \'|\' + $p.MainWindowTitle + \'|\' + $p.ProcessName) }"',
      { timeout: 5000, encoding: 'utf8', shell: 'cmd.exe' }
    );
    
    const line = stdout.trim();
    if (!line) return null;
    
    const parts = line.split('|');
    if (parts.length >= 3) {
      return {
        handle: parts[0].trim(),
        title: parts[1].trim(),
        processName: parts[2].trim()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter janela ativa Windows:', error);
    return null;
  }
}

// Minimizar janela no Windows usando nircmd (mais confiável) ou PowerShell
export async function minimizeWindowsWindow(handle: string): Promise<boolean> {
  try {
    // Usar PowerShell com sintaxe correta para IntPtr
    const { stdout } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -Name WinAPI -Namespace Win32 -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; [Win32.WinAPI]::ShowWindow([IntPtr]::new(${handle}), 6)"`,
      { timeout: 5000 }
    );
    
    console.log('Windows - Janela minimizada, handle:', handle);
    return true;
  } catch (error) {
    console.error('Erro ao minimizar janela Windows:', error);
    return false;
  }
}

// Ativar Focus Assist (Não Perturbe) no Windows
export async function enableWindowsFocusAssist(): Promise<boolean> {
  try {
    // Desativa notificações toast via Registry
    await execAsync(
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications\' -Name \'ToastEnabled\' -Value 0 -ErrorAction SilentlyContinue"',
      { timeout: 10000 }
    );
    
    console.log('Focus Assist ativado no Windows');
    return true;
  } catch (error) {
    console.error('Erro ao ativar Focus Assist:', error);
    return false;
  }
}

// Desativar Focus Assist no Windows
export async function disableWindowsFocusAssist(): Promise<boolean> {
  try {
    await execAsync(
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications\' -Name \'ToastEnabled\' -Value 1 -ErrorAction SilentlyContinue"',
      { timeout: 10000 }
    );
    
    console.log('Focus Assist desativado no Windows');
    return true;
  } catch (error) {
    console.error('Erro ao desativar Focus Assist:', error);
    return false;
  }
}

// Verificar se está no Windows
export function isWindows(): boolean {
  return process.platform === 'win32';
}

// Apps do sistema Windows que nunca devem ser bloqueados
export const WINDOWS_SYSTEM_APPS = [
  'explorer',
  'Explorer',
  'ShellExperienceHost',
  'SearchHost',
  'SearchApp',
  'SearchUI',
  'StartMenuExperienceHost',
  'TextInputHost',
  'SystemSettings',
  'ApplicationFrameHost',
  'RuntimeBroker',
  'taskhostw',
  'dwm',
  'csrss',
  'winlogon',
  'services',
  'svchost',
  'lsass',
  'conhost',
  'fontdrvhost',
  'sihost',
  'ctfmon',
  'FocusLock',
  'focuslock',
  'electron',
  'Electron',
  'Code',
  'WindowsTerminal',
  'powershell',
  'cmd',
];
