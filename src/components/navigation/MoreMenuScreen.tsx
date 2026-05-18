import { useRouter } from "expo-router";

import { AppCard, AppText, ListPressableItem, ScreenShell, SectionHeader, SignOutLink, Spacer, Stack } from "@/components/ui";
import { LogoutButton } from "@/components/navigation/LogoutButton";
import { ROLE_MORE_LINKS, ROLE_TAB_HINTS } from "@/navigation/roleNavigation";
import { ROLE_TABS } from "@/navigation/roleTabs";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useLogout";
import type { InstitutionRole } from "@/types/roles";

const ROLE_LABELS: Record<InstitutionRole, string> = {
  admin: "System administrator",
  dean: "Dean",
  hod: "Head of department",
  lecturer: "Lecturer",
  tutor: "Module tutor",
  student: "Student",
};

type Props = {
  role: InstitutionRole;
  extraLinks?: { label: string; description?: string; href: string }[];
};

export function MoreMenuScreen({ role, extraLinks = [] }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useLogout();
  const navLinks = [...(ROLE_MORE_LINKS[role] ?? []), ...extraLinks];
  const tabHints = ROLE_TAB_HINTS[role];
  const tabs = ROLE_TABS[role];

  return (
    <ScreenShell
      title="More"
      subtitle={user?.fullName ?? ROLE_LABELS[role]}
      right={<LogoutButton compact />}
    >
      <AppCard>
        <AppText variant="label">Signed in as</AppText>
        <AppText variant="heading" style={{ marginTop: 4 }}>
          {user?.fullName ?? "—"}
        </AppText>
        <AppText variant="caption" style={{ marginTop: 4 }}>
          {ROLE_LABELS[role]} · {user?.email ?? ""}
        </AppText>
      </AppCard>

      <Spacer size="lg" />
      <SectionHeader title="Your tabs" />
      <Stack gap="xs">
        {tabs.map((t) => (
          <AppText key={t.name} variant="caption">
            · {t.title} — {tabHints?.[t.name] ?? "Main navigation"}
          </AppText>
        ))}
      </Stack>

      <Spacer size="lg" />
      <SectionHeader title="Tools & shortcuts" />

      <Stack gap="sm">
        {role === "student" ? (
          <ListPressableItem
            title="Profile"
            subtitle="Student number, faculty, course, and device"
            onPress={() => router.push("/student/profile")}
          />
        ) : null}
        {navLinks.map((link) => (
          <ListPressableItem
            key={link.href + link.label}
            title={link.label}
            subtitle={link.description}
            onPress={() => router.push(link.href as never)}
          />
        ))}
        <ListPressableItem
          title="Notifications"
          subtitle="Session alerts, join requests, and system messages"
          onPress={() => router.push("/notifications")}
        />
        <ListPressableItem
          title="Settings"
          subtitle="Appearance and privacy preferences"
          onPress={() => router.push("/settings")}
        />
      </Stack>

      <Spacer size="xl" />
      <LogoutButton />
      <Spacer size="md" />
      <SignOutLink onPress={signOut} />
    </ScreenShell>
  );
}
