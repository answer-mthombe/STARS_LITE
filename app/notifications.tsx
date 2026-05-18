import { useRouter } from "expo-router";

import { AppCard, AppText, LinkText, ScreenShell, Stack } from "@/components/ui";

const ITEMS = [
  { id: "1", title: "Session starting soon", body: "Mobile Development — Dr. Mkhize may open attendance shortly." },
  { id: "2", title: "Join request", body: "A student requested Database Systems (demo)." },
  { id: "3", title: "System", body: "You are running the mock database simulation." },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Notifications" showBack>
      <Stack gap="md">
        {ITEMS.map((n) => (
          <AppCard key={n.id}>
            <AppText variant="heading">{n.title}</AppText>
            <AppText variant="body" style={{ marginTop: 6 }}>
              {n.body}
            </AppText>
          </AppCard>
        ))}
      </Stack>
      <LinkText onPress={() => router.back()}>Close</LinkText>
    </ScreenShell>
  );
}
