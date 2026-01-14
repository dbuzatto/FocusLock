# FocusLock 🔒

> Bloqueie distrações. Maximize seu foco.

FocusLock é um aplicativo desktop multiplataforma (Windows e Linux) que ajuda você a manter o foco durante sessões de trabalho. Defina o tempo de foco, escolha quais aplicativos são permitidos, ative o modo "Não Perturbe" automaticamente e acompanhe seu progresso.

![FocusLock](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Funcionalidades

- ⏱️ **Timer de Foco** - Defina sessões de foco de 5 a 120 minutos
- 📱 **Seleção de Apps** - Escolha quais aplicativos podem ser usados durante o foco
- 🚫 **Bloqueio Real** - Minimiza automaticamente apps não permitidos durante a sessão
- 🔕 **Modo Não Perturbe** - Ativa automaticamente o DND do sistema durante o foco
- 📊 **Histórico de Sessões** - Acompanhe suas sessões completas e tempo total focado
- 🔔 **Notificações** - Receba alertas quando a sessão terminar
- ⏸️ **Pausar/Continuar** - Pause o timer e o bloqueio quando necessário
- 🎨 **Interface Liquid Glass** - Design moderno inspirado no macOS com efeitos de vidro
- 🌈 **Animações Elegantes** - Trilha de progresso com gradiente colorido

## 🖥️ Plataformas Suportadas

### Windows 10/11
- Bloqueio de janelas via Win32 API (PowerShell)
- Focus Assist (Não Perturbe) automático
- Listagem de apps instalados via Registro e UWP

### Linux (KDE Plasma 6)
- Bloqueio de janelas via KWin Scripting (DBus)
- Modo Não Perturbe via kglobalaccel
- Suporte completo ao Wayland
- Listagem de apps via arquivos .desktop

### Linux (GNOME/Outros)
- Bloqueio via wmctrl/xdotool (X11)
- Modo Não Perturbe via gsettings

## 🚀 Instalação

### 📦 Download Rápido (Recomendado)

#### Linux (Debian/Ubuntu)
```bash
# Baixe o .deb diretamente
wget https://github.com/dbuzatto/FocusLock/releases/latest/download/FocusLock-1.0.0-linux-amd64.deb
sudo dpkg -i FocusLock-1.0.0-linux-amd64.deb
```

#### Linux (AppImage - Universal)
```bash
wget https://github.com/dbuzatto/FocusLock/releases/latest/download/FocusLock-1.0.0-linux-x86_64.AppImage
chmod +x FocusLock-1.0.0-linux-x86_64.AppImage
./FocusLock-1.0.0-linux-x86_64.AppImage
```

#### Windows
Baixe o instalador `.exe` da [página de releases](https://github.com/dbuzatto/FocusLock/releases).

#### macOS
```bash
# Via Homebrew (em breve)
brew install --cask dbuzatto/tap/focuslock
```

Ou baixe o `.dmg` da [página de releases](https://github.com/dbuzatto/FocusLock/releases):
- **Intel**: `FocusLock-1.0.0-mac-x64.dmg`
- **Apple Silicon (M1/M2/M3)**: `FocusLock-1.0.0-mac-arm64.dmg`

---

### 🔧 Build do Código Fonte

#### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm ou yarn

**Linux (KDE Plasma):**
- KDE Plasma 6 com Wayland
- `qdbus` (geralmente já instalado no KDE)

**Windows:**
- Windows 10 ou superior
- PowerShell (já incluído)

#### Passos

1. Clone o repositório:

```bash
git clone https://github.com/diogobuzatto/focuslock.git
cd focuslock
```

2. Instale as dependências:

```bash
npm install
```

3. Execute o aplicativo em modo de desenvolvimento:

```bash
npm run dev
```

Ou compile e execute:

```bash
npm start
```

## 🏗️ Build para Produção

### Gerar instalador

```bash
# Para todas as plataformas
npm run dist

# Ou apenas gerar os arquivos sem instalador
npm run pack
```

Os instaladores serão gerados na pasta `release/`.

## 📁 Estrutura do Projeto

```
FocusLock/
├── src/
│   ├── main/
│   │   ├── main.ts          # Processo principal do Electron
│   │   ├── preload.ts       # Script de preload (ponte IPC)
│   │   ├── blocker.ts       # Lógica de bloqueio de apps
│   │   ├── kde-blocker.ts   # Bloqueio específico para KDE/Wayland
│   │   └── windows-blocker.ts # Bloqueio específico para Windows
│   └── renderer/
│       ├── index.tsx        # Entrada do React
│       ├── App.tsx          # Componente principal
│       ├── components/
│       │   ├── Header.tsx       # Cabeçalho com logo
│       │   ├── Timer.tsx        # Display do timer circular
│       │   ├── TimerControls.tsx # Controles de duração e botões
│       │   ├── AppSelector.tsx  # Modal de seleção de apps
│       │   └── SessionHistory.tsx # Modal de histórico
│       └── styles/
│           └── global.css   # Estilos Liquid Glass
├── public/
│   └── index.html           # HTML principal
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 🎮 Como Usar

1. **Defina o Tempo** - Use os botões predefinidos (5, 15, 25, 45, 60 min) ou o slider para escolher a duração
2. **Selecione os Apps** - Clique em "Selecionar Apps Permitidos" e escolha quais apps você usará
   - Sem apps selecionados = apenas modo "Não Perturbe" (use qualquer app)
   - Use "Desmarcar Todos" para limpar a seleção
3. **Inicie o Foco** - Clique em "Iniciar Foco" e concentre-se!
4. **Durante o Foco**:
   - Apps não permitidos serão minimizados automaticamente
   - O modo "Não Perturbe" será ativado no KDE
   - Pause/continue quando precisar
5. **Acompanhe seu Progresso** - Veja seu histórico de sessões clicando no ícone 📊

## 🛠️ Tecnologias

- **Electron** - Framework para apps desktop
- **React** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Webpack** - Bundler
- **CSS3** - Estilos com variáveis CSS e animações

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Executa em modo desenvolvimento com hot-reload |
| `npm start` | Compila e executa o aplicativo |
| `npm run build` | Compila TypeScript e Webpack |
| `npm run pack` | Gera build sem instalador |
| `npm run dist` | Gera instaladores para distribuição |

## 🔮 Roadmap

### ✅ Implementado
- [x] Timer de foco com interface moderna
- [x] Seleção de apps permitidos
- [x] Bloqueio real de aplicativos (KDE/Wayland)
- [x] Bloqueio real de aplicativos (Windows)
- [x] Modo "Não Perturbe" automático (KDE e Windows)
- [x] Pausar/Continuar sessão
- [x] Histórico de sessões
- [x] Tema Liquid Glass (inspirado no macOS)
- [x] Trilha de progresso animada
- [x] Suporte multiplataforma (Windows + Linux)

### 🚧 Próximos Passos
- [ ] Suporte a macOS
- [ ] Suporte a GNOME/X11 melhorado
- [ ] Tema claro/escuro
- [ ] Estatísticas semanais/mensais
- [ ] Integração com Pomodoro (intervalos automáticos)
- [ ] Sons ambiente para foco
- [ ] Atalhos de teclado globais

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

