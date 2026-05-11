import { Pressable, Text, View } from "react-native";

import { colors, radius } from "@/theme";
import { Badge } from "./Badge";

export function ModuleCard({
  code,
  name,
  meta,
  onPress,
}: {
  code: string;
  name: string;
  meta?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.palette.accent,
        padding: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink.muted, fontSize: 12, fontWeight: "700" }}>{code}</Text>
          <Text style={{ color: colors.ink.default, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{name}</Text>
          {meta ? (
            <Text style={{ color: colors.ink.subtle, fontSize: 13, marginTop: 6 }}>{meta}</Text>
          ) : null}
        </View>
        <Badge label="Module" tone="muted" />
      </View>
    </Pressable>
  );
}
