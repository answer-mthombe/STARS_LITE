import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { LogoutButton } from "@/components/navigation/LogoutButton";
import { AppText } from "@/components/ui/AppText";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/theme";

export function Header({
  title,
  subtitle,
  right,
  showBack,
  showLogout = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showBack?: boolean;
  showLogout?: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
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
          <AppText variant="link" color={colors.palette.primary}>
            ←
          </AppText>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {right}
        {showLogout && user ? <LogoutButton compact /> : null}
      </View>
    </View>
  );
}
