/**
 * download-fonts.ts — Pre-download all Google Fonts woff2 files for offline use
 *
 * Extracts the exact woff2 URLs from @remotion/google-fonts module metadata,
 * downloads them to cache/fonts/, preserving the font family directory structure.
 *
 * Usage (requires VPN or network access to fonts.gstatic.com):
 *   cd <skill-directory>
 *   npx tsx scripts/download-fonts.ts
 *
 * The downloaded fonts are then copied to each project's public/fonts/ by setup-project.sh.
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// =====================================================
// CONFIG — matches Root.tsx font loading configuration
// =====================================================
const FONT_CONFIGS = [
  { name: "ArchivoBlack", weights: null as string[] | null, subsets: null as string[] | null },
  { name: "NotoSansSC", weights: ["400", "700"], subsets: ["chinese-simplified", "latin"] },
  { name: "NotoSerifSC", weights: ["400", "700", "900"], subsets: ["chinese-simplified", "latin"] },
  { name: "SpaceGrotesk", weights: ["400", "500", "700"], subsets: ["latin"] },
  { name: "PlayfairDisplay", weights: ["400", "700", "900"], subsets: ["latin"] },
  { name: "BebasNeue", weights: null, subsets: null },
  { name: "RussoOne", weights: null, subsets: null },
  { name: "JetBrainsMono", weights: ["400", "500", "700"], subsets: ["latin"] },
];

const SKILL_DIR = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(SKILL_DIR, "cache", "fonts");

// We need a project with @remotion/google-fonts installed to extract URLs from
// Use any existing project, or the first one found
function findProjectWithGoogleFonts(): string {
  // Check common locations
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const searchDirs = [
    path.join(homeDir, "narration-video"),
    path.join(homeDir, "claude"),
    path.join(homeDir, "projects"),
  ];

  for (const searchDir of searchDirs) {
    if (!fs.existsSync(searchDir)) continue;
    const entries = fs.readdirSync(searchDir);
    for (const entry of entries) {
      const gfPath = path.join(searchDir, entry, "node_modules", "@remotion", "google-fonts");
      if (fs.existsSync(gfPath)) {
        return path.join(searchDir, entry);
      }
    }
  }
  throw new Error("Could not find a project with @remotion/google-fonts installed. Run setup-project.sh first.");
}

// =====================================================
// FONT URL EXTRACTION
// =====================================================

interface FontFileInfo {
  family: string;
  weight: string;
  subset: string;
  url: string;
  filename: string; // derived from URL
}

/**
 * Extract all needed woff2 URLs from a @remotion/google-fonts module.
 * This resolves 'chinese-simplified' etc. to the actual numbered chunk subsets.
 */
function extractFontUrls(fontName: string, projectDir: string, weights: string[] | null, subsets: string[] | null): FontFileInfo[] {
  const modulePath = path.join(projectDir, "node_modules", "@remotion", "google-fonts", "dist", "cjs", `${fontName}.js`);
  if (!fs.existsSync(modulePath)) {
    console.error(`  ⚠ Module not found: ${modulePath}`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(modulePath);
  const info = mod.getInfo();
  const fonts = info.fonts;
  const metaSubsets: string[] = info.subsets || [];
  const files: FontFileInfo[] = [];

  const isChunkSubset = (s: string) => /^\[\d+\]$/.test(s);

  for (const style of Object.keys(fonts)) {
    if (style !== "normal") continue;
    for (const weight of Object.keys(fonts[style])) {
      if (weights && !weights.includes(weight)) continue;
      const availableSubsetKeys = Object.keys(fonts[style][weight]);

      // Resolve requested subsets to actual keys
      let requestedSubsets: string[];
      if (!subsets) {
        requestedSubsets = availableSubsetKeys;
      } else {
        requestedSubsets = [];
        for (const reqSubset of subsets) {
          if (availableSubsetKeys.includes(reqSubset)) {
            requestedSubsets.push(reqSubset);
          } else if (metaSubsets.includes(reqSubset)) {
            // Expand to all numbered chunks (CJK fonts)
            const chunks = availableSubsetKeys.filter(isChunkSubset).sort((a, b) => {
              return Number(a.slice(1, -1)) - Number(b.slice(1, -1));
            });
            if (chunks.length > 0) {
              requestedSubsets.push(...chunks);
            } else {
              requestedSubsets.push(reqSubset);
            }
          }
        }
      }

      for (const subset of requestedSubsets) {
        const url = fonts[style]?.[weight]?.[subset];
        if (!url || typeof url !== "string") continue;

        // Derive filename from URL — use the last path segment
        const urlPath = new URL(url).pathname;
        const baseName = path.basename(urlPath, ".woff2");
        // Create a unique filename: weight_subset_basename.woff2
        const safeSubset = subset.replace(/[\[\]]/g, "");
        const filename = `${weight}_${safeSubset}_${baseName}.woff2`;

        files.push({
          family: fontName,
          weight,
          subset,
          url,
          filename,
        });
      }
    }
  }

  return files;
}

// =====================================================
// DOWNLOAD HELPERS
// =====================================================

function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(downloadFile(res.headers.location, destPath));
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        res.resume();
        resolve(false);
        return;
      }
      const ws = fs.createWriteStream(destPath);
      res.pipe(ws);
      ws.on("finish", () => { ws.close(); resolve(true); });
      ws.on("error", () => { fs.unlink(destPath, () => {}); resolve(false); });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log("=== Google Fonts Offline Downloader ===\n");

  // Find a project with @remotion/google-fonts
  const projectDir = findProjectWithGoogleFonts();
  console.log(`Using font metadata from: ${projectDir}\n`);

  // Ensure cache directory exists
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Extract all needed font URLs
  const allFiles: FontFileInfo[] = [];
  for (const cfg of FONT_CONFIGS) {
    const files = extractFontUrls(cfg.name, projectDir, cfg.weights, cfg.subsets);
    console.log(`  ${cfg.name}: ${files.length} woff2 files to download`);
    allFiles.push(...files);
  }
  console.log(`\n  Total: ${allFiles.length} woff2 files\n`);

  // Download each file
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of allFiles) {
    const familyDir = path.join(CACHE_DIR, file.family);
    fs.mkdirSync(familyDir, { recursive: true });

    const destPath = path.join(familyDir, file.filename);

    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    const ok = await downloadFile(file.url, destPath);
    if (ok) {
      downloaded++;
      if ((downloaded + failed) % 50 === 0) {
        console.log(`  Progress: ${downloaded + failed + skipped}/${allFiles.length}`);
      }
    } else {
      failed++;
      console.log(`  ✗ Failed: ${file.family}/${file.filename}`);
    }

    // Small delay to avoid rate limiting
    if (downloaded % 20 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Also write a manifest file for setup-project.sh to use
  const manifest: Record<string, Array<{ weight: string; subset: string; filename: string }>> = {};
  for (const file of allFiles) {
    if (!manifest[file.family]) manifest[file.family] = [];
    manifest[file.family].push({
      weight: file.weight,
      subset: file.subset,
      filename: file.filename,
    });
  }
  fs.writeFileSync(
    path.join(CACHE_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  console.log(`\n=== Done ===`);
  console.log(`  Downloaded: ${downloaded}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
  console.log(`  Cache: ${CACHE_DIR}`);
  console.log(`  Manifest: ${path.join(CACHE_DIR, "manifest.json")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
