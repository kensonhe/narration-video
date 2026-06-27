/**
 * download-images.ts — Download article images for narration video scenes
 *
 * Reads narration.json, downloads each scene's `imageUrl` to public/images/,
 * then writes the local path back to the scene's `image` field.
 *
 * Usage:
 *   npx tsx scripts/download-images.ts
 *
 * Prerequisites:
 *   - narration.json exists in the project root
 *   - Each scene optionally has an `imageUrl` field (original URL from article)
 *   - public/images/ directory exists (created by setup-project.sh)
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// =====================================================
// TYPES
// =====================================================
interface NarrationScene {
  id: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  image?: string | null;
  audioDuration?: number;
  subtitles?: unknown;
}

interface NarrationData {
  scenes: NarrationScene[];
}

// =====================================================
// CONFIG
// =====================================================
const NARRATION_PATH = path.resolve(process.cwd(), "narration.json");
const IMAGES_DIR = path.resolve(process.cwd(), "public", "images");
const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// =====================================================
// HELPERS
// =====================================================

/** Guess file extension from URL, defaulting to .jpg */
function guessExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    // ignore URL parse errors
  }
  return ".jpg";
}

/** Download a file from URL to a local path. Follows redirects (up to 5). */
function downloadFile(
  url: string,
  destPath: string,
  redirectCount = 0
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    if (redirectCount > 5) {
      resolve({ ok: false, error: "Too many redirects" });
      return;
    }

    const client = url.startsWith("https") ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*;q=0.8",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        // Follow redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          let redirectUrl = res.headers.location;
          // Handle relative redirects
          if (redirectUrl.startsWith("/")) {
            const parsed = new URL(url);
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          res.resume(); // drain the response
          resolve(downloadFile(redirectUrl, destPath, redirectCount + 1));
          return;
        }

        if (!res.statusCode || res.statusCode >= 400) {
          res.resume();
          resolve({
            ok: false,
            error: `HTTP ${res.statusCode || "unknown"}`,
          });
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          // Verify file is non-empty
          const stat = fs.statSync(destPath);
          if (stat.size < 100) {
            fs.unlinkSync(destPath);
            resolve({ ok: false, error: "Downloaded file too small" });
          } else {
            resolve({ ok: true, path: destPath });
          }
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => {});
          resolve({ ok: false, error: err.message });
        });
      }
    );

    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Request timeout" });
    });
  });
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log("=== Image Downloader ===\n");

  // Read narration.json
  if (!fs.existsSync(NARRATION_PATH)) {
    console.error("❌ narration.json not found in current directory");
    process.exit(1);
  }

  const narration: NarrationData = JSON.parse(
    fs.readFileSync(NARRATION_PATH, "utf-8")
  );

  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Find scenes with imageUrl
  const scenesWithImages = narration.scenes.filter(
    (s) => s.imageUrl && s.imageUrl.trim().length > 0
  );

  if (scenesWithImages.length === 0) {
    console.log("ℹ️  No scenes have imageUrl — nothing to download");
    return;
  }

  console.log(
    `Found ${scenesWithImages.length} scene(s) with images to download\n`
  );

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const scene of scenesWithImages) {
    const ext = guessExtension(scene.imageUrl!);
    const filename = `${scene.id}${ext}`;
    const destPath = path.join(IMAGES_DIR, filename);
    const relativePath = `images/${filename}`;

    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      console.log(`  ⏭  ${scene.id}: already exists (${filename})`);
      scene.image = relativePath;
      skipped++;
      continue;
    }

    process.stdout.write(`  ⬇  ${scene.id}: downloading... `);

    const result = await downloadFile(scene.imageUrl!, destPath);

    if (result.ok) {
      const stat = fs.statSync(destPath);
      const sizeKb = Math.round(stat.size / 1024);
      console.log(`✅ ${filename} (${sizeKb} KB)`);
      scene.image = relativePath;
      downloaded++;
    } else {
      console.log(`❌ ${result.error}`);
      scene.image = null;
      failed++;
    }

    // Small delay between downloads to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  // Write updated narration.json back
  fs.writeFileSync(NARRATION_PATH, JSON.stringify(narration, null, 2) + "\n");

  console.log(`\n=== Done ===`);
  console.log(
    `  Downloaded: ${downloaded}  |  Skipped: ${skipped}  |  Failed: ${failed}`
  );
  console.log(`  narration.json updated with local image paths`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
