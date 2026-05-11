import { Text, View } from "react-native";

import { colors } from "@/theme";
import { AppButton } from "./AppButton";

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ paddingVertical: 28, paddingHorizontal: 8, alignItems: "center", gap: 10 }}>
      <Text style={{ color: colors.ink.default, fontSize: 17, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: colors.ink.muted, textAlign: "center", lineHeight: 22 }}>{message}</Text>
      {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} variant="outline" /> : null}
    </View>
  );
}
