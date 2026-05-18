import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/theme";

export type AppButtonVariant = "primary" | "accent" | "outline" | "ghost";
export type AppButtonSize = "sm" | "md" | "lg";

const sizeStyles: Record<AppButtonSize, { py: number; px: number; fontSize: number }> = {
  sm: { py: 8, px: 12, fontSize: 12 },
  md: { py: 10, px: 14, fontSize: 14 },
  lg: { py: 12, px: 18, fontSize: 15 },
};

export function AppButton({
  title,
  onPress,
  disabled,
  variant = "primary",
  size = "md",
  leftIcon,
  fullWidth,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const sz = sizeStyles[size];

  const bg =
    variant === "primary"
      ? colors.palette.primary
      : variant === "accent"
        ? colors.palette.accent
        : "transparent";
  const borderColor = variant === "outline" ? colors.palette.accent : "transparent";
  const textColor =
    variant === "primary" || variant === "accent" ? colors.ink.inverse : colors.palette.primary;

  return (
    <Animated.View style={[anim, fullWidth ? { width: "100%" } : null]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        style={{
          backgroundColor: disabled ? "rgba(79,26,29,0.45)" : bg,
          borderColor,
          borderWidth: variant === "outline" ? 1 : 0,
          borderRadius: radius.pill,
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
        }}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}
        <AppText variant="chip" color={textColor} style={{ fontSize: sz.fontSize }}>
          {title}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}
