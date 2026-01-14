#!/bin/bash

# =============================================================================
# FocusLock Installer para Linux
# =============================================================================
# Este script baixa e instala a versão mais recente do FocusLock
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/diogobuzatto/focuslock/main/install.sh | bash
#   
# Ou baixe e execute:
#   wget https://raw.githubusercontent.com/diogobuzatto/focuslock/main/install.sh
#   chmod +x install.sh
#   ./install.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
REPO="diogobuzatto/focuslock"
APP_NAME="FocusLock"
INSTALL_DIR="/opt/focuslock"
DESKTOP_FILE="/usr/share/applications/focuslock.desktop"

# Funções de log
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Detectar arquitetura
get_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64|amd64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) echo "x64" ;;
    esac
}

# Detectar gerenciador de pacotes
get_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    elif command -v zypper &> /dev/null; then
        echo "zypper"
    else
        echo "unknown"
    fi
}

# Obter última versão do GitHub
get_latest_version() {
    curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v?([^"]+)".*/\1/'
}

# Download com barra de progresso
download_file() {
    local url=$1
    local output=$2
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$output" "$url"
    elif command -v curl &> /dev/null; then
        curl -fL# -o "$output" "$url"
    else
        log_error "wget ou curl são necessários para baixar"
        exit 1
    fi
}

# Instalar dependências
install_dependencies() {
    local pm=$(get_package_manager)
    
    log_info "Instalando dependências..."
    
    case $pm in
        apt)
            sudo apt-get update -qq
            sudo apt-get install -y -qq libnotify4 libxtst6 libnss3 libsecret-1-0 > /dev/null
            ;;
        dnf|yum)
            sudo $pm install -y -q libnotify libXtst nss libsecret > /dev/null
            ;;
        pacman)
            sudo pacman -S --noconfirm --quiet libnotify libxtst nss libsecret > /dev/null
            ;;
        zypper)
            sudo zypper install -y libnotify libXtst nss libsecret > /dev/null
            ;;
    esac
    
    log_success "Dependências instaladas"
}

# Instalar via pacote .deb
install_deb() {
    local version=$1
    local arch=$(get_arch)
    local filename="FocusLock-${version}-linux-${arch}.deb"
    local url="https://github.com/$REPO/releases/download/v${version}/${filename}"
    local tmpfile="/tmp/$filename"
    
    log_info "Baixando $filename..."
    download_file "$url" "$tmpfile"
    
    log_info "Instalando pacote .deb..."
    sudo dpkg -i "$tmpfile" 2>/dev/null || sudo apt-get install -f -y -qq
    rm -f "$tmpfile"
    
    log_success "FocusLock instalado via .deb"
}

# Instalar via pacote .rpm
install_rpm() {
    local version=$1
    local arch=$(get_arch)
    local filename="FocusLock-${version}-linux-${arch}.rpm"
    local url="https://github.com/$REPO/releases/download/v${version}/${filename}"
    local tmpfile="/tmp/$filename"
    
    log_info "Baixando $filename..."
    download_file "$url" "$tmpfile"
    
    log_info "Instalando pacote .rpm..."
    local pm=$(get_package_manager)
    if [ "$pm" = "dnf" ]; then
        sudo dnf install -y "$tmpfile"
    else
        sudo yum localinstall -y "$tmpfile"
    fi
    rm -f "$tmpfile"
    
    log_success "FocusLock instalado via .rpm"
}

# Instalar via AppImage
install_appimage() {
    local version=$1
    local arch=$(get_arch)
    local filename="FocusLock-${version}-linux-${arch}.AppImage"
    local url="https://github.com/$REPO/releases/download/v${version}/${filename}"
    
    log_info "Baixando AppImage..."
    sudo mkdir -p "$INSTALL_DIR"
    download_file "$url" "$INSTALL_DIR/FocusLock.AppImage"
    sudo chmod +x "$INSTALL_DIR/FocusLock.AppImage"
    
    # Criar link simbólico
    sudo ln -sf "$INSTALL_DIR/FocusLock.AppImage" /usr/local/bin/focuslock
    
    # Criar arquivo .desktop
    sudo tee "$DESKTOP_FILE" > /dev/null << EOF
[Desktop Entry]
Name=FocusLock
Comment=Bloqueie distrações e maximize seu foco
Exec=$INSTALL_DIR/FocusLock.AppImage
Icon=focuslock
Type=Application
Categories=Utility;Office;Productivity;
Keywords=focus;productivity;timer;pomodoro;blocker;
StartupWMClass=FocusLock
EOF
    
    log_success "FocusLock AppImage instalado"
}

# Desinstalar
uninstall() {
    log_info "Desinstalando FocusLock..."
    
    local pm=$(get_package_manager)
    
    # Tentar desinstalar pacote
    case $pm in
        apt)
            sudo apt-get remove -y focuslock 2>/dev/null || true
            ;;
        dnf)
            sudo dnf remove -y focuslock 2>/dev/null || true
            ;;
        yum)
            sudo yum remove -y focuslock 2>/dev/null || true
            ;;
    esac
    
    # Remover AppImage e arquivos relacionados
    sudo rm -rf "$INSTALL_DIR"
    sudo rm -f /usr/local/bin/focuslock
    sudo rm -f "$DESKTOP_FILE"
    
    log_success "FocusLock desinstalado"
}

# Menu principal
main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         ${NC}🔒 FocusLock Installer${BLUE}         ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    # Verificar se é root
    if [ "$EUID" -eq 0 ]; then
        log_warning "Não execute como root. O script pedirá sudo quando necessário."
        exit 1
    fi
    
    # Verificar argumento de desinstalação
    if [ "$1" = "--uninstall" ] || [ "$1" = "-u" ]; then
        uninstall
        exit 0
    fi
    
    # Obter versão mais recente
    log_info "Verificando última versão..."
    VERSION=$(get_latest_version)
    
    if [ -z "$VERSION" ]; then
        log_error "Não foi possível obter a versão mais recente"
        VERSION="1.0.0"
        log_warning "Usando versão padrão: $VERSION"
    else
        log_success "Última versão: $VERSION"
    fi
    
    # Detectar sistema
    ARCH=$(get_arch)
    PM=$(get_package_manager)
    
    log_info "Sistema: $(uname -s) $ARCH"
    log_info "Gerenciador de pacotes: $PM"
    echo ""
    
    # Instalar dependências
    install_dependencies
    
    # Escolher método de instalação
    case $PM in
        apt)
            install_deb "$VERSION"
            ;;
        dnf|yum)
            install_rpm "$VERSION"
            ;;
        *)
            log_warning "Gerenciador de pacotes não suportado, usando AppImage"
            install_appimage "$VERSION"
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ FocusLock instalado com sucesso!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
    echo "Execute com: focuslock"
    echo "Ou procure por 'FocusLock' no menu de aplicativos"
    echo ""
    echo "Para desinstalar: $0 --uninstall"
    echo ""
}

main "$@"
