import { Text, View } from "react-native";

import { colors, radius } from "@/theme";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  const a = p[0]?.[0] ?? "?";
  const b = p[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(0,98,129,0.15)",
        borderWidth: 1,
        borderColor: colors.palette.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.palette.accent, fontWeight: "900", fontSize: size * 0.32 }}>{initials(name)}</Text>
    </View>
  );
}
