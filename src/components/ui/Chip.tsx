import { Pressable } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";

export type ChipVariant = "accent" | "primary" | "muted" | "outline";

export function Chip({
  label,
  selected,
  onPress,
  variant = "accent",
  capitalize,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  capitalize?: boolean;
}) {
  const isAccent = variant === "accent";
  const isPrimary = variant === "primary";
  const isMuted = variant === "muted";
  const active = selected ?? false;

  let bg = "transparent";
  let border: string = colors.palette.accent;
  let textColor: string = colors.palette.accent;

  if (isAccent) {
    bg = active ? colors.palette.accent : "rgba(0,98,129,0.10)";
    textColor = active ? colors.ink.inverse : colors.palette.accent;
  } else if (isPrimary) {
    bg = colors.palette.primary;
    border = colors.palette.primary;
    textColor = colors.ink.inverse;
  } else if (isMuted) {
    bg = "rgba(79,26,29,0.08)";
    border = colors.border.subtle;
    textColor = colors.ink.default;
  } else {
    bg = colors.surface.base;
    border = active ? colors.palette.accent : colors.border.subtle;
    textColor = active ? colors.palette.accent : colors.ink.default;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        paddingVertical: isMuted ? 6 : 8,
        paddingHorizontal: isMuted ? 10 : 12,
        borderRadius: isMuted ? radius.sm : radius.pill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <AppText
        variant={isMuted ? "chipSm" : "chip"}
        color={textColor}
        style={capitalize ? { textTransform: "capitalize" } : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
