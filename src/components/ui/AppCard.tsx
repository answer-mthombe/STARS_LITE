import type { ReactNode } from "react";
import { View } from "react-native";

import { colors, radius } from "@/theme";

export function AppCard({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.soft,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: padded ? 14 : 0,
        shadowColor: colors.shadow.color,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}
