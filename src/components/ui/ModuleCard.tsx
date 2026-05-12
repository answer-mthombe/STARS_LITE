import { Pressable, Text, View } from "react-native";

import { colors, radius } from "@/theme";
import { Badge } from "./Badge";

export function ModuleCard({
  code,
  name,
  meta,
  onPress,
  actionLabel,
  onActionPress,
}: {
  code: string;
  name: string;
  meta?: string;
  onPress?: () => void;
  /** Optional primary action (e.g. attend) shown below the header row */
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.palette.accent,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
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
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => ({
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: "rgba(79, 26, 29, 0.06)",
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ color: colors.palette.primary, fontWeight: "900", fontSize: 14, textAlign: "center" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
