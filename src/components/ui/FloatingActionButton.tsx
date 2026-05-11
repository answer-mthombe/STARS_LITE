import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, radius } from "@/theme";

export function FloatingActionButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ position: "absolute", right: 20, bottom: 24 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        style={{
          backgroundColor: colors.palette.primary,
          borderRadius: radius.pill,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          shadowColor: "rgba(0,0,0,0.25)",
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {icon ? <View>{icon}</View> : null}
        <Text style={{ color: colors.ink.inverse, fontWeight: "900", fontSize: 13 }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
