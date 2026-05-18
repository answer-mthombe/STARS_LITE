import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";

export function ListPressableItem({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 14,
        marginBottom: 8,
        borderRadius: radius.md,
        backgroundColor: colors.surface.base,
        borderWidth: 1,
        borderColor: colors.border.subtle,
      }}
    >
      <AppText variant="bodyStrong">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" style={{ marginTop: 4 }}>
          {subtitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function PromoBanner({
  title,
  subtitle,
  onPress,
  tone = "accent",
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: "accent" | "neutral";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 14,
        marginBottom: 16,
        borderRadius: radius.md,
        backgroundColor: tone === "accent" ? "rgba(0,98,129,0.12)" : colors.surface.base,
        borderWidth: 1,
        borderColor: tone === "accent" ? colors.palette.accent : colors.border.subtle,
      }}
    >
      <AppText variant="bodyStrong" color={tone === "accent" ? colors.palette.accent : colors.ink.default}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" style={{ marginTop: 4 }}>
          {subtitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function DividerListRow({
  left,
  right,
}: {
  left: string;
  right: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {left}
      </AppText>
      <AppText variant="body">{right}</AppText>
    </View>
  );
}
