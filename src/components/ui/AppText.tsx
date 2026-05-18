import type { TextProps, TextStyle } from "react-native";
import { Text } from "react-native";

import { colors, typography } from "@/theme";

/** Typography variants — use instead of inline Text styles */
export type AppTextVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "caption"
  | "label"
  | "overline"
  | "metric"
  | "metricMd"
  | "metricLabel"
  | "link"
  | "linkMuted"
  | "chip"
  | "chipSm";

const variantStyles: Record<AppTextVariant, TextStyle> = {
  display: {
    fontSize: typography.size["2xl"],
    fontWeight: "800",
    color: colors.palette.accent,
    letterSpacing: typography.letterSpacing.tight,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: "800",
    color: colors.palette.accent,
    letterSpacing: typography.letterSpacing.tight,
  },
  heading: {
    fontSize: typography.size.md,
    fontWeight: "800",
    color: colors.palette.primary,
  },
  body: {
    fontSize: typography.size.sm + 1,
    fontWeight: "400",
    color: colors.ink.muted,
    lineHeight: typography.lineHeight.md,
  },
  bodyStrong: {
    fontSize: typography.size.sm + 1,
    fontWeight: "700",
    color: colors.ink.default,
  },
  caption: {
    fontSize: typography.size.xs,
    fontWeight: "400",
    color: colors.ink.muted,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: "800",
    color: colors.palette.accent,
  },
  overline: {
    fontSize: typography.size.xs,
    fontWeight: "900",
    color: colors.palette.accent,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metric: {
    fontSize: 40,
    fontWeight: "900",
    color: colors.ink.default,
    letterSpacing: -1,
  },
  metricMd: {
    fontSize: typography.size["3xl"],
    fontWeight: "900",
    color: colors.palette.accent,
    letterSpacing: typography.letterSpacing.tight,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    fontWeight: "400",
    color: colors.ink.muted,
  },
  link: {
    fontSize: typography.size.sm,
    fontWeight: "800",
    color: colors.palette.accent,
  },
  linkMuted: {
    fontSize: typography.size.sm,
    fontWeight: "700",
    color: colors.ink.muted,
  },
  chip: {
    fontSize: typography.size.sm,
    fontWeight: "800",
  },
  chipSm: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink.default,
  },
};

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: string;
  align?: TextStyle["textAlign"];
};

export function AppText({
  variant = "body",
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[variantStyles[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
