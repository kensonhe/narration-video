/* ===========================================
   THEME SYSTEM
   4 selectable visual templates. The active theme is chosen in
   video.config.json (`template` field) and provided to all scenes via
   <ThemeProvider> in Video.tsx — components read it with useTheme().

   Templates:
   - bold-signal     dark + orange neon glow (科技/硬核解说)
   - clean-light     near-white minimal, thin accents (知识/财经/高级感)
   - editorial       warm paper, big serif (人文/深度/故事)
   - vivid-gradient  bright animated gradient, rounded bold (抖音/小红书/年轻)
   =========================================== */

export type TemplateId = "bold-signal" | "clean-light" | "editorial" | "vivid-gradient";

/** Which loaded Google font family drives each text role. Root.tsx maps these
 *  keys to actual loaded font families and passes them to scenes as
 *  fontDisplay / fontBody / fontMono. */
export type FontRole = "archivoBlack" | "notoSansSC" | "notoSerifSC" | "spaceGrotesk";

export type ThemeMode = "dark" | "light" | "vibrant";
export type CardStyle = "solid" | "glass" | "paper";

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
  /* ---------- Bold Signal (current dark neon look) ---------- */
  "bold-signal": {
    id: "bold-signal",
    mode: "dark",
    bg: {
      base: "#0d0d0d",
      gradient: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 40%, #16213e 70%, #0d0d0d 100%)",
      meshColors: ["rgba(255,87,34,0.4)", "rgba(33,150,243,0.35)", "rgba(156,39,176,0.3)"],
      particleColor: "rgba(255,87,34,0.12)",
      gridOpacity: 0.015,
    },
    colors: {
      accent: "#FF5722",
      accent2: "#E91E63",
      accent3: "#2196F3",
      glow: "rgba(255,87,34,0.4)",
      textPrimary: "#ffffff",
      textSecondary: "#a0a0b0",
      textMuted: "#555566",
      textOnCard: "#0d0d0d",
      cardBg: "rgba(30,30,50,0.7)",
      cardBorder: "rgba(255,255,255,0.06)",
    },
    card: { radius: 28, style: "glass" },
    fonts: { display: "archivoBlack", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(0,0,0,0.65)",
      text: "#ffffff",
      border: "1px solid rgba(255,87,34,0.15)",
    },
  },

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
    fonts: { display: "notoSerifSC", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(36,29,21,0.80)",
      text: "#faf5ec",
      border: "1px solid rgba(192,73,43,0.30)",
    },
  },

  /* ---------- Vivid Gradient (bright, playful, rounded) ---------- */
  "vivid-gradient": {
    id: "vivid-gradient",
    mode: "vibrant",
    bg: {
      base: "#5b2bd6",
      gradient: "linear-gradient(135deg, #7C3AED 0%, #DB2777 45%, #F59E0B 100%)",
      meshColors: ["rgba(255,255,255,0.25)", "rgba(124,58,237,0.35)", "rgba(236,72,153,0.3)"],
      particleColor: "rgba(255,255,255,0.30)",
      gridOpacity: 0,
    },
    colors: {
      accent: "#ffffff",
      accent2: "#FDE68A",
      accent3: "#A7F3D0",
      glow: "rgba(255,255,255,0.45)",
      textPrimary: "#ffffff",
      textSecondary: "rgba(255,255,255,0.85)",
      textMuted: "rgba(255,255,255,0.55)",
      textOnCard: "#5b2bd6",
      cardBg: "rgba(255,255,255,0.16)",
      cardBorder: "rgba(255,255,255,0.35)",
    },
    card: { radius: 32, style: "glass" },
    fonts: { display: "archivoBlack", body: "notoSansSC", mono: "spaceGrotesk" },
    subtitle: {
      bg: "rgba(45,16,90,0.62)",
      text: "#ffffff",
      border: "1px solid rgba(255,255,255,0.30)",
    },
  },
};

export const DEFAULT_TEMPLATE: TemplateId = "bold-signal";

export function getTheme(id?: string): Theme {
  return THEMES[(id as TemplateId)] ?? THEMES[DEFAULT_TEMPLATE];
}
