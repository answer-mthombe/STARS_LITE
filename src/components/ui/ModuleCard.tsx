import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { colors, radius } from "@/theme";

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
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: radius.lg,
        shadowColor: colors.shadow.color,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
     <View
      style={{
        backgroundColor: colors.surface.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
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
            <AppText variant="label">{code}</AppText>
            <AppText variant="bodyStrong" style={{ fontSize: 16, marginTop: 4 }}>
              {name}
            </AppText>
            {meta ? (
              <AppText variant="caption" color={colors.ink.subtle} style={{ marginTop: 6 }}>
                {meta}
              </AppText>
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
          <AppText variant="chip" color={colors.palette.primary} style={{ textAlign: "center" }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
     </View>
    </View>
  );
}
