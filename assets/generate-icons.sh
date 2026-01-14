#!/bin/bash

# Script para gerar ícones em todos os formatos necessários
# Requer: inkscape, imagemagick (convert), icnsutils (png2icns)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR"
ICONS_DIR="$ASSETS_DIR/icons"
SVG_FILE="$ASSETS_DIR/icon.svg"

echo "🎨 Gerando ícones do FocusLock..."

# Criar diretório de ícones se não existir
mkdir -p "$ICONS_DIR"

# Verificar se o SVG existe
if [ ! -f "$SVG_FILE" ]; then
    echo "❌ Erro: icon.svg não encontrado em $ASSETS_DIR"
    exit 1
fi

# Função para converter SVG para PNG
convert_to_png() {
    local size=$1
    local output="$ICONS_DIR/${size}x${size}.png"
    
    if command -v inkscape &> /dev/null; then
        inkscape "$SVG_FILE" -w "$size" -h "$size" -o "$output" 2>/dev/null
    elif command -v convert &> /dev/null; then
        convert -background none -resize "${size}x${size}" "$SVG_FILE" "$output"
    elif command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w "$size" -h "$size" "$SVG_FILE" -o "$output"
    else
        echo "❌ Nenhuma ferramenta de conversão encontrada (inkscape, imagemagick, librsvg)"
        exit 1
    fi
    
    echo "  ✓ ${size}x${size}.png"
}

# Gerar PNGs em vários tamanhos
echo ""
echo "📦 Gerando PNGs..."
for size in 16 24 32 48 64 128 256 512 1024; do
    convert_to_png $size
done

# Copiar ícone principal
cp "$ICONS_DIR/512x512.png" "$ASSETS_DIR/icon.png"
echo "  ✓ icon.png (512x512)"

# Gerar ICO para Windows (requer ImageMagick)
echo ""
echo "🪟 Gerando ícone Windows (.ico)..."
if command -v convert &> /dev/null; then
    convert "$ICONS_DIR/16x16.png" "$ICONS_DIR/24x24.png" "$ICONS_DIR/32x32.png" \
            "$ICONS_DIR/48x48.png" "$ICONS_DIR/64x64.png" "$ICONS_DIR/128x128.png" \
            "$ICONS_DIR/256x256.png" "$ASSETS_DIR/icon.ico"
    echo "  ✓ icon.ico"
else
    echo "  ⚠ ImageMagick não encontrado, pulando .ico"
fi

# Gerar ICNS para macOS (requer icnsutils ou iconutil no macOS)
echo ""
echo "🍎 Gerando ícone macOS (.icns)..."
if command -v png2icns &> /dev/null; then
    png2icns "$ASSETS_DIR/icon.icns" "$ICONS_DIR/16x16.png" "$ICONS_DIR/32x32.png" \
             "$ICONS_DIR/128x128.png" "$ICONS_DIR/256x256.png" "$ICONS_DIR/512x512.png" \
             "$ICONS_DIR/1024x1024.png" 2>/dev/null || true
    echo "  ✓ icon.icns"
elif [[ "$OSTYPE" == "darwin"* ]] && command -v iconutil &> /dev/null; then
    # No macOS, usa iconutil
    ICONSET_DIR="$ASSETS_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    cp "$ICONS_DIR/16x16.png" "$ICONSET_DIR/icon_16x16.png"
    cp "$ICONS_DIR/32x32.png" "$ICONSET_DIR/icon_16x16@2x.png"
    cp "$ICONS_DIR/32x32.png" "$ICONSET_DIR/icon_32x32.png"
    cp "$ICONS_DIR/64x64.png" "$ICONSET_DIR/icon_32x32@2x.png"
    cp "$ICONS_DIR/128x128.png" "$ICONSET_DIR/icon_128x128.png"
    cp "$ICONS_DIR/256x256.png" "$ICONSET_DIR/icon_128x128@2x.png"
    cp "$ICONS_DIR/256x256.png" "$ICONSET_DIR/icon_256x256.png"
    cp "$ICONS_DIR/512x512.png" "$ICONSET_DIR/icon_256x256@2x.png"
    cp "$ICONS_DIR/512x512.png" "$ICONSET_DIR/icon_512x512.png"
    cp "$ICONS_DIR/1024x1024.png" "$ICONSET_DIR/icon_512x512@2x.png"
    iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"
    rm -rf "$ICONSET_DIR"
    echo "  ✓ icon.icns"
else
    echo "  ⚠ icnsutils não encontrado, pulando .icns"
fi

echo ""
echo "✅ Ícones gerados com sucesso!"
echo ""
echo "Arquivos gerados:"
ls -la "$ASSETS_DIR"/*.{png,ico,icns,svg} 2>/dev/null || true
echo ""
ls -la "$ICONS_DIR"/ 2>/dev/null || true
