import { contextBridge, ipcRenderer } from 'electron';

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getInstalledApps: (): Promise<string[]> => ipcRenderer.invoke('get-installed-apps'),
  startFocus: (allowedApps: string[]): Promise<boolean> => ipcRenderer.invoke('start-focus', allowedApps),
  stopFocus: (): Promise<boolean> => ipcRenderer.invoke('stop-focus'),
  pauseFocus: (): Promise<boolean> => ipcRenderer.invoke('pause-focus'),
  resumeFocus: (allowedApps: string[]): Promise<boolean> => ipcRenderer.invoke('resume-focus', allowedApps),
  focusEnded: (): Promise<void> => ipcRenderer.invoke('focus-ended'),
  checkDependencies: (): Promise<{ hasWmctrl: boolean; hasXdotool: boolean }> => ipcRenderer.invoke('check-dependencies'),
});

// Tipagem para TypeScript
declare global {
  interface Window {
    electronAPI: {
      getInstalledApps: () => Promise<string[]>;
      startFocus: (allowedApps: string[]) => Promise<boolean>;
      stopFocus: () => Promise<boolean>;
      pauseFocus: () => Promise<boolean>;
      resumeFocus: (allowedApps: string[]) => Promise<boolean>;
      focusEnded: () => Promise<void>;
      checkDependencies: () => Promise<{ hasWmctrl: boolean; hasXdotool: boolean }>;
    };
  }
}
