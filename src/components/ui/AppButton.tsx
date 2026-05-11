import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radius } from "@/theme";

type Variant = "primary" | "outline" | "ghost";

export function AppButton({
  title,
  onPress,
  disabled,
  variant = "primary",
  leftIcon,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  leftIcon?: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === "primary" ? colors.palette.primary : variant === "outline" ? "transparent" : "transparent";
  const borderColor = variant === "outline" ? colors.palette.accent : "transparent";
  const textColor = variant === "primary" ? colors.ink.inverse : colors.palette.primary;

  return (
    <Animated.View style={anim}>
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
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}
        <Text style={{ color: textColor, fontWeight: "700", fontSize: 14 }}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

