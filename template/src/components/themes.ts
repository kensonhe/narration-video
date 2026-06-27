/* ===========================================
   THEME SYSTEM
   6 selectable visual templates. The active theme is chosen in
   video.config.json (`template` field) and provided to all scenes via
   <ThemeProvider> in Video.tsx — components read it with useTheme().

   Templates:
   - clean-light     near-white minimal, thin accents (知识/财经/高级感)
   - editorial       warm paper, big serif (人文/深度/故事)
   - aurora-night    aurora borealis glow, flowing gradients (科技/科学/未来)
   - neubrutalist    bold hard shadows, bright blocks (Gen Z/潮流/病毒式)
   - zen-garden      organic biophilic, natural calm (生活/健康/文化)
   - retro-sunset    vaporwave sunset, retro vibes (创意/怀旧/音乐)
   =========================================== */

export type TemplateId =
  | "clean-light"
  | "editorial"
  | "aurora-night"
  | "neubrutalist"
  | "zen-garden"
  | "retro-sunset";

/** Which loaded Google font family drives each text role. Root.tsx maps these
 *  keys to actual loaded font families and passes them to scenes as
 *  fontDisplay / fontBody / fontMono. */
export type FontRole =
  | "archivoBlack"
  | "notoSansSC"
  | "notoSerifSC"
  | "spaceGrotesk"
  | "playfairDisplay"
  | "bebasNeue"
  | "russoOne"
  | "jetBrainsMono";

export type ThemeMode = "dark" | "light" | "vibrant";
export type CardStyle = "solid" | "glass" | "paper" | "brutal";

export interface Theme {
  id: TemplateId;
  mode: ThemeMode;
  bg: {
    /** Base flat color (also the AbsoluteFill backdrop in Video.tsx). */
    base: string;
    /** Full-bleed gradient painted on top of base. */
    gradient: string;
    /** Soft radial mesh blob colors layered over the gradient. */
    meshColors: string[];
    /** Floating particle color. Set to "none" to disable particles. */
    particleColor: string;
    /** Opacity (0–1) of the faint grid overlay. 0 hides the grid. */
    gridOpacity: number;
  };
  colors: {
    accent: string;
    accent2: string;
    accent3: string;
    glow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    /** Text color when placed on top of an accent-filled BoldCard. */
    textOnCard: string;
    cardBg: string;
    cardBorder: string;
  };
  card: {
    radius: number;
    style: CardStyle;
  };
  fonts: {
    display: FontRole;
    body: FontRole;
    mono: FontRole;
  };
  subtitle: {
    bg: string;
    text: string;
    border: string;
  };
}

export const THEMES: Record<TemplateId, Theme> = {
  /* ---------- Clean Light (minimal, near-white) ---------- */
  "clean-light": {
    id: "clean-light",
    mode: "light",
    bg: {
      base: "#f7f7f5",
      gradient: "linear-gradient(160deg, #ffffff 0%, #f4f4f2 60%, #eeeeec 100%)",
      meshColors: ["rgba(37,99,235,0.06)", "rgba(15,23,42,0.04)"],
      particleColor: "none",
      gridOpacity: 0.02,
    },
    colors: {
      accent: "#2563EB",
      accent2: "#0F172A",
      accent3: "#0EA5E9",
      glow: "rgba(37,99,235,0.18)",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#94a3b8",
      textOnCard: "#ffffff",
      cardBg: "rgba(255,255,255,0.9)",
      cardBorder: "rgba(15,23,42,0.08)",
    },
    card: { radius: 18, style: "solid" },
    fonts: { display: "notoSerifSC", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(15,23,42,0.82)",
      text: "#ffffff",
      border: "1px solid rgba(37,99,235,0.25)",
    },
  },

  /* ---------- Editorial (warm paper, magazine serif) ---------- */
  editorial: {
    id: "editorial",
    mode: "light",
    bg: {
      base: "#f3ece1",
      gradient: "linear-gradient(165deg, #faf5ec 0%, #f3ece1 55%, #ece1d0 100%)",
      meshColors: ["rgba(193,108,55,0.10)", "rgba(120,80,40,0.06)"],
      particleColor: "none",
      gridOpacity: 0,
    },
    colors: {
      accent: "#C0492B",
      accent2: "#1f1a14",
      accent3: "#8A6D3B",
      glow: "rgba(192,73,43,0.18)",
      textPrimary: "#241d15",
      textSecondary: "#5c5043",
      textMuted: "#9a8c79",
      textOnCard: "#faf5ec",
      cardBg: "rgba(255,250,242,0.92)",
      cardBorder: "rgba(120,90,55,0.18)",
    },
    card: { radius: 6, style: "paper" },
    fonts: { display: "playfairDisplay", body: "notoSerifSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(36,29,21,0.80)",
      text: "#faf5ec",
      border: "1px solid rgba(192,73,43,0.30)",
    },
  },

  /* ---------- Aurora Night (flowing aurora borealis, dark tech) ---------- */
  "aurora-night": {
    id: "aurora-night",
    mode: "dark",
    bg: {
      base: "#060613",
      gradient:
        "linear-gradient(135deg, #060613 0%, #0a1628 30%, #0d1f3c 55%, #0a1a2e 80%, #060613 100%)",
      meshColors: [
        "rgba(34,211,238,0.30)",
        "rgba(139,92,246,0.28)",
        "rgba(16,185,129,0.22)",
      ],
      particleColor: "rgba(34,211,238,0.10)",
      gridOpacity: 0.01,
    },
    colors: {
      accent: "#22D3EE",
      accent2: "#8B5CF6",
      accent3: "#10B981",
      glow: "rgba(34,211,238,0.40)",
      textPrimary: "#f0f4ff",
      textSecondary: "#8899bb",
      textMuted: "#445577",
      textOnCard: "#060613",
      cardBg: "rgba(12,20,40,0.72)",
      cardBorder: "rgba(34,211,238,0.10)",
    },
    card: { radius: 22, style: "glass" },
    fonts: { display: "spaceGrotesk", body: "notoSansSC", mono: "jetBrainsMono" },
    subtitle: {
      bg: "rgba(6,6,19,0.72)",
      text: "#f0f4ff",
      border: "1px solid rgba(34,211,238,0.18)",
    },
  },

  /* ---------- Neubrutalist (hard shadows, bold blocks, Gen Z) ---------- */
  neubrutalist: {
    id: "neubrutalist",
    mode: "vibrant",
    bg: {
      base: "#FFEB3B",
      gradient:
        "linear-gradient(145deg, #FFEB3B 0%, #FFD600 45%, #FFC107 100%)",
      meshColors: [
        "rgba(255,82,82,0.12)",
        "rgba(33,150,243,0.10)",
      ],
      particleColor: "none",
      gridOpacity: 0,
    },
    colors: {
      accent: "#FF5252",
      accent2: "#2196F3",
      accent3: "#000000",
      glow: "rgba(0,0,0,0.12)",
      textPrimary: "#1a1a1a",
      textSecondary: "#333333",
      textMuted: "#666666",
      textOnCard: "#ffffff",
      cardBg: "#ffffff",
      cardBorder: "#000000",
    },
    card: { radius: 4, style: "brutal" },
    fonts: { display: "russoOne", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(0,0,0,0.88)",
      text: "#FFEB3B",
      border: "2px solid #FF5252",
    },
  },

  /* ---------- Zen Garden (organic biophilic, natural calm) ---------- */
  "zen-garden": {
    id: "zen-garden",
    mode: "light",
    bg: {
      base: "#f5f5f0",
      gradient:
        "linear-gradient(170deg, #fafaf5 0%, #f0f0e8 40%, #e8e8df 100%)",
      meshColors: [
        "rgba(74,124,89,0.07)",
        "rgba(139,160,122,0.05)",
      ],
      particleColor: "none",
      gridOpacity: 0,
    },
    colors: {
      accent: "#4A7C59",
      accent2: "#2D372C",
      accent3: "#8BA07A",
      glow: "rgba(74,124,89,0.18)",
      textPrimary: "#2D372C",
      textSecondary: "#556B55",
      textMuted: "#8FA08F",
      textOnCard: "#fafaf5",
      cardBg: "rgba(255,255,252,0.92)",
      cardBorder: "rgba(74,124,89,0.12)",
    },
    card: { radius: 14, style: "solid" },
    fonts: { display: "notoSerifSC", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(45,55,44,0.82)",
      text: "#f5f5f0",
      border: "1px solid rgba(74,124,89,0.25)",
    },
  },

  /* ---------- Retro Sunset (vaporwave sunset, retro vibes) ---------- */
  "retro-sunset": {
    id: "retro-sunset",
    mode: "dark",
    bg: {
      base: "#1a0a2e",
      gradient:
        "linear-gradient(180deg, #1a0a2e 0%, #2d1458 28%, #5c1a5e 52%, #a83279 76%, #e8655a 100%)",
      meshColors: [
        "rgba(255,107,107,0.25)",
        "rgba(168,50,121,0.22)",
        "rgba(92,26,94,0.18)",
      ],
      particleColor: "rgba(255,180,120,0.08)",
      gridOpacity: 0.012,
    },
    colors: {
      accent: "#FF6B6B",
      accent2: "#FFD93D",
      accent3: "#C084FC",
      glow: "rgba(255,107,107,0.40)",
      textPrimary: "#fff0f0",
      textSecondary: "#dda0a0",
      textMuted: "#885566",
      textOnCard: "#1a0a2e",
      cardBg: "rgba(45,20,88,0.70)",
      cardBorder: "rgba(255,107,107,0.12)",
    },
    card: { radius: 24, style: "glass" },
    fonts: { display: "bebasNeue", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(26,10,46,0.75)",
      text: "#fff0f0",
      border: "1px solid rgba(255,107,107,0.22)",
    },
  },
};

export const DEFAULT_TEMPLATE: TemplateId = "clean-light";

export function getTheme(id?: string): Theme {
  return THEMES[(id as TemplateId)] ?? THEMES[DEFAULT_TEMPLATE];
}
