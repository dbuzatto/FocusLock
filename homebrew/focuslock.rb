# Homebrew Cask for FocusLock
# 
# Para usar este cask, você pode:
# 1. Criar seu próprio tap: brew tap seu-usuario/focuslock
# 2. Ou instalar diretamente do arquivo:
#    brew install --cask ./focuslock.rb
#
# Após publicar no GitHub:
#    brew install --cask diogobuzatto/tap/focuslock

cask "focuslock" do
  version "1.0.0"
  sha256 :no_check  # Atualizar com o SHA256 real após o build

  url "https://github.com/diogobuzatto/focuslock/releases/download/v#{version}/FocusLock-#{version}-mac-x64.dmg"
  name "FocusLock"
  desc "Focus and productivity app - Block distractions and maximize focus"
  homepage "https://github.com/diogobuzatto/focuslock"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "FocusLock.app"

  zap trash: [
    "~/Library/Application Support/FocusLock",
    "~/Library/Preferences/com.focuslock.app.plist",
    "~/Library/Logs/FocusLock",
  ]
end
