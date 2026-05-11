import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { colors } from "@/theme";

export function Header({
  title,
  subtitle,
  right,
  showBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.palette.accent,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {showBack ? (
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: colors.palette.primary, fontWeight: "800", fontSize: 15 }}>←</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.palette.accent, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.ink.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
