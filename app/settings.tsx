import { useRouter } from "expo-router";

import { AppCard, AppText, LinkText, ScreenShell, Spacer } from "@/components/ui";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Settings" showBack>
      <AppCard>
        <AppText variant="heading">Appearance</AppText>
        <AppText variant="body" style={{ marginTop: 8 }}>
          Dark mode tokens exist in the design system; wiring to system theme can be enabled when you add a theme
          provider toggle.
        </AppText>
      </AppCard>
      <Spacer size="md" />
      <AppCard>
        <AppText variant="heading">Privacy</AppText>
        <AppText variant="body" style={{ marginTop: 8 }}>
          Attendance uses one-shot GPS checks and local rotating codes to minimise tracking and database churn.
        </AppText>
      </AppCard>
      <LinkText onPress={() => router.back()}>Done</LinkText>
    </ScreenShell>
  );
}
