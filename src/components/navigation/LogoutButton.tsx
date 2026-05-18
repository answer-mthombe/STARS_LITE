import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { useLogout } from "@/hooks/useLogout";
import { colors } from "@/theme";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const signOut = useLogout();

  if (compact) {
    return (
      <Pressable onPress={signOut} hitSlop={12} accessibilityLabel="Sign out">
        <Ionicons name="log-out-outline" size={22} color={colors.palette.primary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={signOut}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.palette.primary,
      }}
    >
      <Ionicons name="log-out-outline" size={18} color={colors.palette.primary} />
      <AppText variant="chip" color={colors.palette.primary} style={{ fontSize: 12 }}>
        Sign out
      </AppText>
    </Pressable>
  );
}
