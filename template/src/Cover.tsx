import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  ThemeProvider,
  ParticleField,
  GradientMesh,
  useTheme,
} from "./components/SharedComponents";
import { getTheme, type TemplateId } from "./components/themes";

/* ===========================================
   COVER — video thumbnail / cover image
   Rendered as a single still frame via:
     npx remotion still src/index.ts Cover out/cover.png

   Always 1920×1080 landscape regardless of video orientation.
   Reuses the same theme system for visual consistency.
   =========================================== */

export interface CoverProps {
  title: string;
  subtitle?: string;
  tag?: string;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  coverImage?: string | null;
  templateId?: TemplateId;
}

const CoverContent: React.FC<CoverProps> = ({
  title,
  subtitle,
  tag,
  fontDisplay,
  fontBody,
  fontMono,
  coverImage,
}) => {
  const theme = useTheme();

  // Auto-size title based on character count
  const charCount = title.length;
  const titleSize = charCount <= 6 ? 120 : charCount <= 12 ? 90 : charCount <= 20 ? 72 : 58;
  const subtitleSize = 30;

  // Determine text colors based on whether we have a hero image
  // With image: white text with strong shadow for readability
  // Without image: use theme colors
  const hasImage = !!coverImage;
  const titleColor = hasImage ? "#ffffff" : theme.colors.textPrimary;
  const subtitleColor = hasImage ? "rgba(255,255,255,0.85)" : theme.colors.textSecondary;
  const tagBg = hasImage ? "rgba(0,0,0,0.55)" : `${theme.colors.accent}18`;
  const tagColor = hasImage ? "#ffffff" : theme.colors.accent;
  const tagBorder = hasImage
    ? "1px solid rgba(255,255,255,0.25)"
    : `1px solid ${theme.colors.accent}35`;

  const textShadow = hasImage
    ? "0 4px 30px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)"
    : `0 0 40px ${theme.colors.glow}`;

  return (
    <AbsoluteFill>
      {/* Layer 1: Themed background */}
      <div style={{ position: "absolute", inset: 0, background: theme.bg.gradient }} />
      <GradientMesh />
      <ParticleField />

      {/* Grid overlay */}
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

      {/* Layer 2: Hero image (optional) */}
      {coverImage && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Img
            src={staticFile(coverImage)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Gradient overlay for text readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        </div>
      )}

      {/* Layer 3: Decorative accent elements */}
      {/* Top-left accent line */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 100,
          width: 60,
          height: 4,
          background: theme.colors.accent,
          borderRadius: 2,
          boxShadow: `0 0 16px ${theme.colors.glow}`,
        }}
      />
      {/* Bottom-right corner ring */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 100,
          width: 56,
          height: 56,
          border: `1.5px solid ${hasImage ? "rgba(255,255,255,0.2)" : theme.colors.accent + "40"}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            background: theme.colors.accent,
            borderRadius: "50%",
            boxShadow: `0 0 12px ${theme.colors.glow}`,
          }}
        />
      </div>
      {/* Bottom-left subtle line */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 100,
          width: 120,
          height: 1,
          background: `linear-gradient(90deg, ${hasImage ? "rgba(255,255,255,0.25)" : theme.colors.accent + "40"}, transparent)`,
        }}
      />

      {/* Layer 4: Text content — centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 160px",
        }}
      >
        {/* Tag pill */}
        {tag && (
          <div
            style={{
              fontFamily: fontMono,
              fontSize: 18,
              color: tagColor,
              letterSpacing: "0.15em",
              padding: "8px 24px",
              background: tagBg,
              border: tagBorder,
              borderRadius: 20,
              marginBottom: 32,
              backdropFilter: "blur(8px)",
            }}
          >
            {tag}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontFamily: fontDisplay,
            fontSize: titleSize,
            color: titleColor,
            textAlign: "center",
            lineHeight: 1.25,
            fontWeight: 800,
            textShadow,
            maxWidth: 1500,
            letterSpacing: titleSize > 80 ? "0.02em" : "0.01em",
          }}
        >
          {title}
        </div>

        {/* Accent line below title */}
        <div
          style={{
            width: 80,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${theme.colors.accent}, transparent)`,
            borderRadius: 2,
            marginTop: 36,
            marginBottom: 28,
          }}
        />

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontFamily: fontBody,
              fontSize: subtitleSize,
              color: subtitleColor,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: 1100,
              textShadow: hasImage ? "0 2px 12px rgba(0,0,0,0.5)" : "none",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Layer 5: Bottom accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accent2}, ${theme.colors.accent3 || theme.colors.accent})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Cover: React.FC<CoverProps> = (props) => {
  const theme = getTheme(props.templateId);
  return (
    <ThemeProvider theme={theme}>
      <CoverContent {...props} />
    </ThemeProvider>
  );
};
