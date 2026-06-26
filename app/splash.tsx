import { Redirect } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";

export default function SplashScreen() {
  const { status, user } = useAuthStore();

  if (status !== "loading") {
    if (!user) return <Redirect href="/onboarding" />;

    if (user.role === "admin") return <Redirect href="/admin/dashboard" />;
    if (user.role === "dean") return <Redirect href="/dean/dashboard" />;
    if (user.role === "hod") return <Redirect href="/hod/dashboard" />;
    if (user.role === "lecturer") return <Redirect href="/lecturer/dashboard" />;
    if (user.role === "tutor") return <Redirect href="/tutor/dashboard" />;
    if (user.role === "student") return <Redirect href="/student/dashboard" />;
    // Unknown role: never bounce into a guarded screen (would loop) — restart onboarding.
    return <Redirect href="/onboarding" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StarsWordmark large />
        <Text style={{ color: colors.ink.muted, marginTop: 16, fontSize: 14, fontWeight: "600" }}>Loading your space…</Text>
      </View>
    </SafeAreaView>
  );
}
