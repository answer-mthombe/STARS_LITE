export const colors = {
  palette: {
    lightBg: "#E8E8E8",
    accent: "#006281",
    primary: "#4F1A1D",
  },
  ink: {
    default: "#0B0F14",
    muted: "#27313A",
    subtle: "#4A5560",
    inverse: "#FFFFFF",
  },
  surface: {
    base: "#FFFFFF",
    soft: "#E8E8E8",
    /** Card surface — white so cards lift off the #E8E8E8 canvas */
    card: "#FFFFFF",
  },
  border: {
    accent: "#006281",
    subtle: "rgba(0, 98, 129, 0.25)",
  },
  shadow: {
    color: "rgba(11, 15, 20, 0.10)",
  },
} as const;

export type AppColors = typeof colors;

