import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { spacing, type SpacingKey } from "@/theme";

export function Stack({
  children,
  gap = "md",
  style,
}: {
  children: ReactNode;
  gap?: SpacingKey;
  style?: ViewStyle;
}) {
  return <View style={[{ gap: spacing[gap] }, style]}>{children}</View>;
}

export function Row({
  children,
  gap = "sm",
  wrap,
  style,
}: {
  children: ReactNode;
  gap?: SpacingKey;
  wrap?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { flexDirection: "row", gap: spacing[gap], alignItems: "center" },
        wrap ? { flexWrap: "wrap" } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Spacer({ size = "lg" }: { size?: SpacingKey }) {
  return <View style={{ height: spacing[size] }} />;
}
