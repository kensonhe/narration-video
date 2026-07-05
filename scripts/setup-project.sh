#!/bin/bash
# setup-project.sh — Initialize a Remotion narration video project
# Usage: bash setup-project.sh <project-directory>
#
# This script:
# 1. Creates a Remotion project from the blank template
# 2. Installs dependencies
# 3. Copies the shared components template
# 4. Sets up tsconfig for JSON imports and Chinese fonts

set -e

PROJECT_DIR="${1:?Usage: setup-project.sh <project-directory>}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Narration Video Project Setup ==="
echo "Project: $PROJECT_DIR"
echo "Skill:   $SKILL_DIR"
echo ""

# Step 1: Create Remotion project
if [ -d "$PROJECT_DIR" ]; then
  echo "⚠ Directory already exists: $PROJECT_DIR"
  echo "  Skipping create-video step."
else
  echo "→ Creating Remotion project..."
  PARENT_DIR="$(dirname "$PROJECT_DIR")"
  PROJECT_NAME="$(basename "$PROJECT_DIR")"
  cd "$PARENT_DIR"
  npx create-video@latest --yes --blank "$PROJECT_NAME"
fi

cd "$PROJECT_DIR"

# Step 2: Install dependencies
echo "→ Installing dependencies..."
npm install
npm install @remotion/google-fonts @remotion/media

# Step 2b: Copy cached Chrome Headless Shell (avoids VPN download)
echo "→ Setting up Chrome Headless Shell..."
CHROME_CACHE="$SKILL_DIR/cache/chrome-headless-shell"
CHROME_DEST="$PROJECT_DIR/node_modules/.remotion/chrome-headless-shell"
if [ -d "$CHROME_CACHE" ] && [ ! -d "$CHROME_DEST" ]; then
  mkdir -p "$CHROME_DEST"
  cp -R "$CHROME_CACHE/"* "$CHROME_DEST/"
  echo "  ✓ Chrome copied from cache"
else
  if [ -d "$CHROME_DEST" ]; then
    echo "  ⏭ Chrome already exists in project"
  else
    echo "  ⚠ Chrome cache not found at $CHROME_CACHE (will download on first render)"
  fi
fi

# Step 2c: Copy cached Google Fonts (avoids VPN download)
echo "→ Setting up local fonts..."
FONTS_CACHE="$SKILL_DIR/cache/fonts"
FONTS_DEST="$PROJECT_DIR/public/fonts"
if [ -d "$FONTS_CACHE" ] && [ -f "$FONTS_CACHE/manifest.json" ]; then
  mkdir -p "$FONTS_DEST"
  # Copy each font family directory
  for family_dir in "$FONTS_CACHE"/*/; do
    if [ -d "$family_dir" ]; then
      family_name=$(basename "$family_dir")
      mkdir -p "$FONTS_DEST/$family_name"
      cp "$family_dir"*.woff2 "$FONTS_DEST/$family_name/" 2>/dev/null || true
    fi
  done
  # Generate font-manifest.json for Root.tsx
  cp "$FONTS_CACHE/manifest.json" "$PROJECT_DIR/font-manifest.json"
  echo "  ✓ Fonts copied from cache + manifest generated"
else
  echo "  ⚠ Font cache not found (run: npx tsx scripts/download-fonts.ts with VPN first)"
fi

# Step 3: Create directory structure
echo "→ Setting up directories..."
mkdir -p src/scenes src/components public/audio public/images scripts

# Step 4: Copy shared components + theme system
echo "→ Copying shared components..."
cp "$SKILL_DIR/template/src/components/SharedComponents.tsx" src/components/
cp "$SKILL_DIR/template/src/components/themes.ts" src/components/
cp "$SKILL_DIR/template/src/components/LocalFonts.tsx" src/components/

# Step 4b: Copy default video config (orientation / template / voice / duration)
echo "→ Copying video.config.json..."
if [ ! -f video.config.json ]; then
  cp "$SKILL_DIR/template/video.config.json" video.config.json
fi

# Step 5: Copy audio generation script
echo "→ Copying TTS script..."
cp "$SKILL_DIR/template/scripts/generate-audio.ts" scripts/

# Step 5b: Copy image download script
echo "→ Copying image download script..."
cp "$SKILL_DIR/template/scripts/download-images.ts" scripts/

# Step 6: Copy Root.tsx and Video.tsx templates
echo "→ Copying Root.tsx and Video.tsx..."
cp "$SKILL_DIR/template/src/Root.tsx" src/
cp "$SKILL_DIR/template/src/Video.tsx" src/

# Step 7: Write index.ts entry point
echo "→ Writing entry point..."
cat > src/index.ts << 'EOF'
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
EOF

# Step 8: Write index.css
cat > src/index.css << 'EOF'
/* Reset styles for Remotion rendering */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
EOF

# Step 9: Update tsconfig.json
echo "→ Configuring TypeScript..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "lib": ["es2015", "dom"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": false
  },
  "exclude": ["remotion.config.ts", "scripts"]
}
EOF

# Step 10: Remove default Composition.tsx if it exists
rm -f src/Composition.tsx

echo ""
echo "✅ Project ready!"
echo ""
echo "Next steps:"
echo "  1. Edit video.config.json (orientation / template / voice / duration)"
echo "  2. Create narration.json in the project root"
echo "  3. Write scene components in src/scenes/"
echo "  4. Update src/Video.tsx with scene imports"
echo "  5. Generate audio: MINIMAX_API_KEY=xxx npx tsx scripts/generate-audio.ts"
echo "  6. Preview: npm run dev"
echo "  7. Render: npx remotion render src/index.ts NarrationVideo out/video.mp4 --codec=h264 --crf=18"