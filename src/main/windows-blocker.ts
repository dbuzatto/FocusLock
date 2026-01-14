import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WindowInfo {
  handle: string;
  title: string;
  processName: string;
}

// PowerShell script para listar janelas visíveis
const LIST_WINDOWS_PS = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using System.Diagnostics;

public class WindowHelper {
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    [DllImport("user32.dll")]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public static List<string> GetVisibleWindows() {
        List<string> windows = new List<string>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                StringBuilder title = new StringBuilder(256);
                GetWindowText(hWnd, title, 256);
                if (title.Length > 0) {
                    uint processId;
                    GetWindowThreadProcessId(hWnd, out processId);
                    try {
                        Process p = Process.GetProcessById((int)processId);
                        windows.Add(hWnd.ToString() + "|" + title.ToString() + "|" + p.ProcessName);
                    } catch { }
                }
            }
            return true;
        }, IntPtr.Zero);
        return windows;
    }
    
    public static string GetForegroundWindowInfo() {
        IntPtr hWnd = GetForegroundWindow();
        if (hWnd == IntPtr.Zero) return "";
        
        StringBuilder title = new StringBuilder(256);
        GetWindowText(hWnd, title, 256);
        
        uint processId;
        GetWindowThreadProcessId(hWnd, out processId);
        
        try {
            Process p = Process.GetProcessById((int)processId);
            return hWnd.ToString() + "|" + title.ToString() + "|" + p.ProcessName;
        } catch {
            return hWnd.ToString() + "|" + title.ToString() + "|unknown";
        }
    }
    
    public static void MinimizeWindow(IntPtr hWnd) {
        ShowWindow(hWnd, 6); // SW_MINIMIZE = 6
    }
}
"@
`;

// Obter lista de janelas no Windows
export async function getWindowsWindows(): Promise<WindowInfo[]> {
  try {
    const script = `${LIST_WINDOWS_PS}
[WindowHelper]::GetVisibleWindows() | ForEach-Object { Write-Output $_ }`;
    
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      maxBuffer: 1024 * 1024
    });
    
    const windows: WindowInfo[] = [];
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        windows.push({
          handle: parts[0],
          title: parts[1],
          processName: parts[2].trim()
        });
      }
    }
    
    return windows;
  } catch (error) {
    console.error('Erro ao listar janelas Windows:', error);
    return [];
  }
}

// Obter janela ativa no Windows
export async function getWindowsActiveWindow(): Promise<WindowInfo | null> {
  try {
    const script = `${LIST_WINDOWS_PS}
Write-Output ([WindowHelper]::GetForegroundWindowInfo())`;
    
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      timeout: 5000
    });
    
    const line = stdout.trim();
    if (!line) return null;
    
    const parts = line.split('|');
    if (parts.length >= 3) {
      return {
        handle: parts[0],
        title: parts[1],
        processName: parts[2].trim()
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Minimizar janela no Windows
export async function minimizeWindowsWindow(handle: string): Promise<boolean> {
  try {
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
[Win32]::ShowWindow([IntPtr]${handle}, 6)
`;
    
    await execAsync(`powershell -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      timeout: 5000
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao minimizar janela Windows:', error);
    return false;
  }
}

// Ativar Focus Assist (Não Perturbe) no Windows
export async function enableWindowsFocusAssist(): Promise<boolean> {
  try {
    // Define Focus Assist para Priority Only (1) ou Alarms Only (2)
    // Método via Registry
    await execAsync(`powershell -Command "
      $path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.immersive.notification\\windows.immersive.notification'
      if (Test-Path $path) {
        # Focus Assist Priority Only
        Set-ItemProperty -Path '$path' -Name 'Data' -Value ([byte[]](0x00,0x00,0x00,0x00,0x02,0x00,0x00,0x00))
      }
      # Disable toast notifications
      Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications' -Name 'ToastEnabled' -Value 0 -ErrorAction SilentlyContinue
    "`.replace(/\n/g, ' '), { timeout: 10000 });
    
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
    await execAsync(`powershell -Command "
      # Re-enable toast notifications
      Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications' -Name 'ToastEnabled' -Value 1 -ErrorAction SilentlyContinue
    "`.replace(/\n/g, ' '), { timeout: 10000 });
    
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
  'FocusLock',
  'focuslock',
  'electron',
  'Electron',
];
