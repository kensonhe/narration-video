import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig, Easing, Img, staticFile } from "remotion";
import { Theme, getTheme, DEFAULT_TEMPLATE } from "./themes";

/* ===========================================
   THEME CONTEXT
   Video.tsx wraps all scenes in <ThemeProvider theme={...}>.
   Components read colors/fonts via useTheme() so the same scene code
   works across all 6 templates without edits.
   =========================================== */
const ThemeContext = React.createContext<Theme>(getTheme(DEFAULT_TEMPLATE));

export const ThemeProvider: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = (): Theme => React.useContext(ThemeContext);

/* ===========================================
   Shared Props for all scenes
   =========================================== */
export interface SceneProps {
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  sceneIndex: number;
  totalScenes: number;
}

/* ===========================================
   THEME (legacy compat)
   Older scene code referenced a module-level THEME object. It now points
   at the default theme's colors. New scenes should use useTheme() instead.
   =========================================== */
const dflt = getTheme(DEFAULT_TEMPLATE);
export const THEME = {
  bg: dflt.bg.base,
  bgGradient: dflt.bg.gradient,
  orange: dflt.colors.accent,
  orangeGlow: dflt.colors.glow,
  pink: dflt.colors.accent2,
  pinkGlow: "rgba(233,30,99,0.35)",
  blue: dflt.colors.accent3,
  blueGlow: "rgba(33,150,243,0.35)",
  green: "#4CAF50",
  amber: "#FFC107",
  purple: "#9C27B0",
  purpleGlow: "rgba(156,39,176,0.3)",
  cyan: "#00BCD4",
  cyanGlow: "rgba(0,188,212,0.3)",
  textPrimary: dflt.colors.textPrimary,
  textSecondary: dflt.colors.textSecondary,
  textMuted: dflt.colors.textMuted,
  textOnCard: dflt.colors.textOnCard,
  cardDark: dflt.colors.cardBg,
  cardBorder: dflt.colors.cardBorder,
};

/* ===========================================
   PARTICLE FIELD — floating light particles
   Creates depth and atmosphere in background
   =========================================== */
export const ParticleField: React.FC<{
  count?: number;
  color?: string;
  speed?: number;
}> = ({ count = 25, color, speed = 1 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const particleColor = color ?? theme.bg.particleColor;
  if (particleColor === "none") return null;
  // Deterministic particle positions using index-based calculation
  const particles = Array.from({ length: count }, (_, i) => {
    const seed = i * 137.508; // golden angle
    const x = ((seed * 7.3) % 100);
    const y = ((seed * 13.7) % 100);
    const size = 2 + (i % 5) * 1.5;
    const phase = (i * 0.7) % (Math.PI * 2);
    const driftX = Math.sin(frame * 0.008 * speed + phase) * 20;
    const driftY = Math.cos(frame * 0.006 * speed + phase) * 15;
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.015 + phase));
    return { x, y, size, driftX, driftY, pulse };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: particleColor,
            boxShadow: `0 0 ${p.size * 3}px ${particleColor}`,
            transform: `translate(${p.driftX}px, ${p.driftY}px)`,
            opacity: p.pulse,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/* ===========================================
   GRADIENT MESH — multi-layer atmospheric bg
   =========================================== */
export const GradientMesh: React.FC<{
  colors?: string[];
  intensity?: number;
}> = ({ colors, intensity = 1 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const meshColors = colors ?? theme.bg.meshColors;
  const drift = frame * 0.3;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {meshColors.map((c, i) => {
        const cx = 20 + i * 30 + Math.sin(drift * 0.01 + i) * 10;
        const cy = 30 + i * 20 + Math.cos(drift * 0.008 + i * 2) * 15;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${cx}%`,
              top: `${cy}%`,
              width: `${40 + i * 10}%`,
              height: `${40 + i * 10}%`,
              background: `radial-gradient(ellipse at center, ${c}, transparent 70%)`,
              filter: "blur(60px)",
              opacity: 0.5 * intensity,
              transform: `translate(-50%, -50%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ===========================================
   ANIMATED BACKGROUND — combines all bg layers
   Look is driven entirely by the active theme.
   =========================================== */
export const AnimatedBackground: React.FC = () => {
  const theme = useTheme();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: theme.bg.gradient }} />
      <GradientMesh />
      <ParticleField />
      {/* Grid overlay — only if the theme enables it */}
      {theme.bg.gridOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundImage: `
              linear-gradient(rgba(${theme.mode === "light" ? "0,0,0" : "255,255,255"},${theme.bg.gridOpacity}) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${theme.mode === "light" ? "0,0,0" : "255,255,255"},${theme.bg.gridOpacity}) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/* Legacy alias — older scene code imports `Background`. */
export const Background = AnimatedBackground;

/* ===========================================
   SCENE TRANSITION — fade wrapper for scenes
   =========================================== */
export const SceneTransition: React.FC<{
  children: React.ReactNode;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, fadeInFrames = 20, fadeOutFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  );
};

/* ===========================================
   Slide Number — top-left (enhanced with glow)
   =========================================== */
export const SlideNumber: React.FC<{
  current: number;
  total: number;
  fontFamily: string;
}> = ({ current, total, fontFamily }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 50, left: 70, fontFamily, fontSize: 16, color: theme.colors.textMuted, letterSpacing: "0.2em", opacity, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 24, height: 2, background: theme.colors.accent, borderRadius: 1 }} />
      {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </div>
  );
};

/* ===========================================
   Top Navigation — breadcrumb (with active glow)
   =========================================== */
export const TopNav: React.FC<{
  labels: string[];
  activeIndex: number;
  fontFamily: string;
}> = ({ labels, activeIndex, fontFamily }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [5, 30], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 50, right: 70, display: "flex", gap: 18, fontFamily, fontSize: 15, opacity }}>
      {labels.map((label, i) => (
        <span key={i} style={{
          color: i === activeIndex ? theme.colors.textPrimary : theme.colors.textMuted,
          fontWeight: i === activeIndex ? 700 : 400,
          textShadow: i === activeIndex ? `0 0 20px ${theme.colors.glow}` : "none",
        }}>
          {label}
        </span>
      ))}
    </div>
  );
};

/* ===========================================
   Bold Card — signature focal element (enhanced with glow)
   Filled with the theme accent; text on it uses colors.textOnCard.
   =========================================== */
export const BoldCard: React.FC<{
  children: React.ReactNode;
  bgColor?: string;
  glowColor?: string;
  delay?: number;
  maxWidth?: number;
  padding?: string;
}> = ({ children, bgColor, glowColor, delay = 0, maxWidth = 1400, padding = "56px 80px" }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fill = bgColor ?? theme.colors.accent;
  const scale = spring({ frame: frame - delay, fps, from: 0.88, to: 1, config: { damping: 12, stiffness: 60 } });
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const glow = glowColor ?? theme.colors.glow;
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.04);

  return (
    <div style={{
      background: fill,
      borderRadius: theme.card.radius,
      padding,
      maxWidth,
      width: "100%",
      position: "relative",
      overflow: "hidden",
      transform: `scale(${scale})`,
      opacity,
      boxShadow: `0 0 ${40 * pulse}px ${glow}, 0 20px 60px rgba(0,0,0,0.4)`,
    }}>
      <div style={{ position: "absolute", top: "-50%", right: "-20%", width: "60%", height: "200%", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "-30%", left: "-10%", width: "40%", height: "120%", background: "rgba(0,0,0,0.05)", borderRadius: "50%" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

/* ===========================================
   Glass Card — frosted glass / solid / paper card
   Adapts to theme.card.style.
   =========================================== */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  delay?: number;
  borderColor?: string;
  glowColor?: string;
}> = ({ children, delay = 0, borderColor, glowColor }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const translateY = spring({ frame: frame - delay, fps, from: 40, to: 0, config: { damping: 16, stiffness: 70 } });
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const border = borderColor ?? theme.colors.cardBorder;
  const isPaper = theme.card.style === "paper";
  const isSolid = theme.card.style === "solid";
  const isBrutal = theme.card.style === "brutal";

  return (
    <div style={{
      background: theme.colors.cardBg,
      backdropFilter: theme.card.style === "glass" ? "blur(20px)" : undefined,
      borderRadius: theme.card.radius,
      padding: "36px 44px",
      border: isBrutal ? `3px solid ${theme.colors.cardBorder}` : `1px solid ${border}`,
      transform: `translateY(${translateY}px)`,
      opacity,
      boxShadow: isBrutal
        ? `6px 6px 0 ${theme.colors.accent3}`
        : isPaper
        ? `0 2px 0 ${border}, 0 18px 40px rgba(60,40,20,0.12)`
        : isSolid
        ? `0 12px 30px rgba(15,23,42,0.08)`
        : `0 0 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
    }}>
      {children}
    </div>
  );
};

/* ===========================================
   Scene Image — article image with animation
   Displays a downloaded article image with spring entrance animation
   and theme-aware styling. Gracefully renders nothing if src is empty.
   =========================================== */
export const SceneImage: React.FC<{
  /** Filename relative to public/ (e.g. "images/scene01.jpg") */
  src?: string | null;
  delay?: number;
  style?: React.CSSProperties;
  borderRadius?: number;
  /** How the image fits inside its container. Default "cover". */
  fit?: "cover" | "contain";
}> = ({ src, delay = 0, style, borderRadius, fit = "cover" }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!src) return null;

  const scale = spring({ frame: frame - delay, fps, from: 0.92, to: 1, config: { damping: 14, stiffness: 60 } });
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const radius = borderRadius ?? theme.card.radius;

  return (
    <div style={{
      borderRadius: radius,
      overflow: "hidden",
      transform: `scale(${scale})`,
      opacity,
      border: `1px solid ${theme.colors.cardBorder}`,
      boxShadow: `0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px ${theme.colors.cardBorder}`,
      ...style,
    }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit,
          display: "block",
        }}
      />
    </div>
  );
};

/* ===========================================
   Dark Card — secondary content (legacy compat)
   =========================================== */
export const DarkCard: React.FC<{
  children: React.ReactNode;
  delay?: number;
  accentColor?: string;
}> = ({ children, delay = 0, accentColor }) => {
  const theme = useTheme();
  const accent = accentColor ?? theme.colors.accent;
  return (
    <GlassCard delay={delay} borderColor={`${accent}44`} glowColor={`${accent}33`}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent, borderRadius: `${theme.card.radius}px 0 0 ${theme.card.radius}px` }} />
      <div style={{ position: "relative" }}>{children}</div>
    </GlassCard>
  );
};

/* ===========================================
   ANIMATED COUNTER — number counting up effect
   Links visuals to data narration
   =========================================== */
export const AnimatedCounter: React.FC<{
  value: number;
  suffix?: string;
  prefix?: string;
  fontFamily: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  duration?: number;
}> = ({ value, suffix = "", prefix = "", fontFamily, fontSize = 64, color, delay = 0, duration = 40 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) });
  const displayValue = Math.round(value * progress);
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ fontFamily, fontSize, color: color ?? theme.colors.textPrimary, opacity, lineHeight: 1 }}>
      {prefix}{displayValue}{suffix}
    </div>
  );
};

/* ===========================================
   TEXT REVEAL — character-by-character appearance
   Creates dramatic title entrance
   =========================================== */
export const TextReveal: React.FC<{
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  delay?: number;
  staggerFrames?: number;
  lineHeight?: number;
  textAlign?: React.CSSProperties["textAlign"];
  glowColor?: string;
}> = ({ text, fontFamily, fontSize, color, delay = 0, staggerFrames = 2, lineHeight = 1.3, textAlign = "left", glowColor }) => {
  const frame = useCurrentFrame();
  const chars = text.split("");

  return (
    <div style={{ fontFamily, fontSize, color, lineHeight, textAlign, display: "flex", flexWrap: "wrap", gap: 0 }}>
      {chars.map((char, i) => {
        const charDelay = delay + i * staggerFrames;
        const charOpacity = interpolate(frame - charDelay, [0, 8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        const charY = interpolate(frame - charDelay, [0, 10], [12, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        return (
          <span key={i} style={{
            opacity: charOpacity,
            transform: `translateY(${charY}px)`,
            display: "inline-block",
            textShadow: glowColor && charOpacity > 0.5 ? `0 0 30px ${glowColor}` : "none",
            whiteSpace: char === " " ? "pre" : "normal",
          }}>
            {char}
          </span>
        );
      })}
    </div>
  );
};

/* ===========================================
   GLOW LINE — animated accent line with pulse
   =========================================== */
export const GlowLine: React.FC<{
  delay?: number;
  color?: string;
  width?: number;
  direction?: "left" | "right" | "center";
}> = ({ delay = 0, color, width = 80, direction = "left" }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const lineColor = color ?? theme.colors.accent;
  const progress = interpolate(frame - delay, [0, 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pulse = 0.7 + 0.3 * Math.sin(frame * 0.06);
  const align = direction === "center" ? "center" : direction === "right" ? "flex-end" : "flex-start";

  return (
    <div style={{ display: "flex", justifyContent: align, marginBottom: 24 }}>
      <div style={{
        width: width * progress,
        height: 3,
        background: `linear-gradient(90deg, ${lineColor}, transparent)`,
        borderRadius: 2,
        boxShadow: `0 0 ${12 * pulse}px ${lineColor}`,
      }} />
    </div>
  );
};

/* ===========================================
   Section Line — legacy compat wrapper
   =========================================== */
export const SectionLine: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return <GlowLine delay={delay} />;
};

/* ===========================================
   Animated Text — staggered reveal (enhanced)
   =========================================== */
export const AnimatedText: React.FC<{
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  delay?: number;
  lineHeight?: number;
  fontWeight?: number;
  textAlign?: React.CSSProperties["textAlign"];
}> = ({ text, fontFamily, fontSize, color, delay = 0, lineHeight = 1.4, fontWeight, textAlign }) => {
  const frame = useCurrentFrame();
  const translateY = interpolate(frame - delay, [0, 25], [30, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ fontFamily, fontSize, color, lineHeight, fontWeight, textAlign, transform: `translateY(${translateY}px)`, opacity }}>
      {text}
    </div>
  );
};

/* ===========================================
   FLOW ARROW — animated connecting arrow
   For process/flow diagrams
   =========================================== */
export const FlowArrow: React.FC<{
  delay?: number;
  color?: string;
  direction?: "right" | "down";
}> = ({ delay = 0, color, direction = "right" }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const arrowColor = color ?? theme.colors.accent;
  const progress = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const isRight = direction === "right";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isRight ? "0 8px" : "8px 0",
      opacity: progress,
    }}>
      <div style={{
        width: isRight ? 40 * progress : 2,
        height: isRight ? 2 : 40 * progress,
        background: arrowColor,
        boxShadow: `0 0 8px ${arrowColor}`,
        borderRadius: 1,
      }} />
      <div style={{
        width: 0, height: 0,
        [isRight ? "borderTop" : "borderLeft"]: "6px solid transparent",
        [isRight ? "borderBottom" : "borderRight"]: "6px solid transparent",
        [isRight ? "borderLeft" : "borderTop"]: `10px solid ${arrowColor}`,
        filter: `drop-shadow(0 0 4px ${arrowColor})`,
        opacity: progress,
      }} />
    </div>
  );
};

/* ===========================================
   PULSE DOT — breathing accent indicator
   =========================================== */
export const PulseDot: React.FC<{
  color?: string;
  size?: number;
  delay?: number;
}> = ({ color, size = 10, delay = 0 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const dotColor = color ?? theme.colors.accent;
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const pulse = 0.5 + 0.5 * Math.sin((frame - delay) * 0.08);
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: dotColor,
      boxShadow: `0 0 ${size * 2 * pulse}px ${dotColor}`,
      opacity,
    }} />
  );
};

/* ===========================================
   Progress Bar — bottom
   =========================================== */
export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const theme = useTheme();
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accent2})`, boxShadow: `0 0 10px ${theme.colors.glow}` }} />
  );
};

/* ===========================================
   Corner Ring — decorative (enhanced)
   =========================================== */
export const CornerRing: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 30], [0, 0.5], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const rotation = frame * 0.5;
  return (
    <div style={{ position: "absolute", bottom: 60, right: 60, width: 64, height: 64, border: `1.5px solid ${theme.colors.accent}40`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity, transform: `rotate(${rotation}deg)` }}>
      <div style={{ width: 6, height: 6, background: theme.colors.accent, borderRadius: "50%", boxShadow: `0 0 12px ${theme.colors.glow}` }} />
    </div>
  );
};

/* ===========================================
   SUBTITLE TYPES & COMPONENT
   =========================================== */
export interface SubtitleSegment {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleData {
  segments: SubtitleSegment[];
}

export const Subtitles: React.FC<{
  subtitles: SubtitleData;
  fontFamily: string;
  audioOffsetFrames?: number;
  /** Larger sizing + higher safe-zone for portrait (1080×1920). */
  portrait?: boolean;
}> = ({ subtitles, fontFamily, audioOffsetFrames = 45, portrait = false }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();

  const activeSegment = subtitles.segments.find(
    (seg) => frame >= seg.startFrame && frame <= seg.endFrame
  );
  if (!activeSegment) return null;

  const segDuration = activeSegment.endFrame - activeSegment.startFrame;
  const fadeFrames = Math.min(8, Math.floor(segDuration * 0.2));
  const fadeIn = interpolate(frame - activeSegment.startFrame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const fadeOut = interpolate(frame - (activeSegment.endFrame - fadeFrames), [0, fadeFrames], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);
  const translateY = interpolate(frame - activeSegment.startFrame, [0, fadeFrames], [6, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{ position: "absolute", bottom: portrait ? 220 : 80, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 100, padding: "0 40px" }}>
      <div style={{
        fontFamily,
        fontSize: portrait ? 40 : 32,
        color: theme.subtitle.text,
        lineHeight: 1.6,
        textAlign: "center",
        maxWidth: portrait ? 940 : 1400,
        padding: "10px 32px",
        background: theme.subtitle.bg,
        borderRadius: 12,
        border: theme.subtitle.border,
        backdropFilter: "blur(12px)",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}>
        {activeSegment.text}
      </div>
    </div>
  );
};
