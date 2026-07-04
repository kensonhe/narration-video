# China Network Setup

This skill is built to run end-to-end in mainland China **without a VPN**. The
only foreign host it ever needed was Google Fonts (blocked in China); everything
else either has a China endpoint or is routed through the China npm mirror.

## Summary of what's handled

| Concern | Fix |
|---|---|
| Google Fonts (blocked) | Replaced `@remotion/google-fonts` with `@fontsource` — woff2 ships in the npm package, bundled locally at render. No fetch from `fonts.gstatic.com`. |
| npm registry (slow) | Setup script defaults to `registry.npmmirror.com`. |
| MiniMax TTS | Script defaults to the China endpoint `api.minimaxi.com`. |
| Article images | Fetched from the article's own hosts (e.g. WeChat `mmbiz.qpic.cn`) — accessible in China. |
| Playwright Chromium (article-fetch fallback) | Install via the China mirror env var (below). |

## npm registry

`scripts/setup-project.sh` resolves the registry from `NV_NPM_REGISTRY`,
defaulting to the China mirror:

```bash
# Default (China) — used by the setup script
https://registry.npmmirror.com

# Override for non-China users
NV_NPM_REGISTRY=https://registry.npmjs.org/ bash scripts/setup-project.sh <dir>
```

Every `npm install` / `npx create-video` call in the script passes
`--registry="$NPM_REGISTRY"`, so it does not touch your global npm config.

## Fonts (@fontsource)

`Root.tsx` imports `@fontsource/<pkg>/<weight>.css` for each of the 8 font
families. Remotion's webpack resolves the `url()` references and bundles the
woff2 from `node_modules/@fontsource/.../files/` into the build. Rendering
therefore never contacts Google.

- The CJK families (`@fontsource/noto-sans-sc`, `@fontsource/noto-serif-sc`)
  include the `chinese-simplified` subset, so Chinese text renders correctly.
- Only the weights each theme actually uses are imported (see `Root.tsx`).
- If glyphs go missing, it's almost always a missing `node_modules/@fontsource/*`
  — re-run `npm install` in the project.

## MiniMax TTS endpoint

`template/scripts/generate-audio.ts` defaults `MINIMAX_API_BASE` to the China
endpoint:

```
https://api.minimaxi.com/v1   # China (default; note the extra "i")
https://api.minimax.io/v1     # Global — override for non-China
```

Run with the override if you're outside China:

```bash
MINIMAX_API_KEY="<key>" MINIMAX_API_BASE="https://api.minimax.io/v1" npx tsx scripts/generate-audio.ts
```

The API key is obtained from `https://platform.minimax.io` (the portal is on
the `.io` host regardless of which API endpoint you call).

## Playwright Chromium (article-fetch fallback)

Phase 1 falls back to Playwright when `WebFetch` is blocked (common with WeChat).
Playwright downloads Chromium from a Microsoft CDN that can be slow/flaky in
China. Install it once via the npmmirror mirror:

```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ \
  npx playwright install chromium
```

If you use the Playwright MCP server (so Claude can drive a browser for article
fetching), set the same env var in the environment that launches the MCP server.
