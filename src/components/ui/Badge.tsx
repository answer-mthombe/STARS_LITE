import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";

export function Badge({ label, tone = "accent" }: { label: string; tone?: "accent" | "primary" | "muted" }) {
  const bg =
    tone === "primary" ? colors.palette.primary : tone === "muted" ? "rgba(39,49,58,0.12)" : "rgba(0,98,129,0.12)";
  const fg = tone === "primary" ? colors.ink.inverse : colors.palette.accent;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: tone === "muted" ? 0 : 1,
        borderColor: tone === "primary" ? "transparent" : colors.palette.accent,
      }}
    >
      <AppText variant="caption" color={fg} style={{ fontWeight: "800", letterSpacing: 0.3 }}>
        {label}
      </AppText>
    </View>
  );
}
