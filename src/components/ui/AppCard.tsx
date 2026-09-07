import type { ReactNode } from "react";
import { View } from "react-native";

import { colors, radius } from "@/theme";

export function AppCard({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: "rgba(11,15,20,0.06)",
        padding: padded ? 16 : 0,
        shadowColor: colors.shadow.color,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}
