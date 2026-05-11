import { Text, View } from "react-native";

import { colors } from "@/theme";

/**
 * Credit line: each word uses a distinct treatment from the STARS palette.
 */
export function InnovationLabFooter() {
  return (
    <View style={{ paddingTop: 16, paddingBottom: 4, alignItems: "center" }}>
      <View
        style={{
          height: 1,
          width: "100%",
          maxWidth: 280,
          backgroundColor: colors.border.subtle,
          marginBottom: 14,
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontSize: 11, color: colors.ink.subtle, fontWeight: "600", letterSpacing: 0.8 }}>Created</Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.palette.accent,
            fontWeight: "800",
            fontStyle: "italic",
            textDecorationLine: "underline",
            textDecorationColor: "rgba(0,98,129,0.35)",
          }}
        >
          by
        </Text>
        <Text style={{ fontSize: 11, color: colors.ink.muted, fontWeight: "500" }}>the</Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.palette.primary,
            fontWeight: "900",
            letterSpacing: 3,
          }}
        >
          MUT
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.palette.accent,
            fontWeight: "800",
            borderWidth: 1,
            borderColor: "rgba(0,98,129,0.35)",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          Innovation
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.palette.primary,
            fontWeight: "900",
            borderBottomWidth: 2,
            borderBottomColor: colors.palette.accent,
          }}
        >
          Lab
        </Text>
      </View>
    </View>
  );
}
