import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Settings" showBack>
      <AppCard>
        <Text style={{ color: colors.ink.default, fontWeight: "900" }}>Appearance</Text>
        <Text style={{ color: colors.ink.muted, marginTop: 8, lineHeight: 22 }}>
          Dark mode tokens exist in the design system; wiring to system theme can be enabled when you add a theme provider toggle.
        </Text>
      </AppCard>
      <View style={{ height: 14 }} />
      <AppCard>
        <Text style={{ color: colors.ink.default, fontWeight: "900" }}>Privacy</Text>
        <Text style={{ color: colors.ink.muted, marginTop: 8, lineHeight: 22 }}>
          Attendance uses one-shot GPS checks and local rotating codes to minimise tracking and database churn.
        </Text>
      </AppCard>
      <Text style={{ color: colors.palette.primary, fontWeight: "900", marginTop: 22 }} onPress={() => router.back()}>
        Done
      </Text>
    </ScreenShell>
  );
}
