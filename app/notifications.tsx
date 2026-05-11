import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";

const ITEMS = [
  { id: "1", title: "Session starting soon", body: "Mobile Development — Dr. Mkhize may open attendance shortly." },
  { id: "2", title: "Join request", body: "A student requested Database Systems (demo)." },
  { id: "3", title: "System", body: "You are running the mock database simulation." },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Notifications" showBack>
      <View style={{ gap: 12 }}>
        {ITEMS.map((n) => (
          <AppCard key={n.id}>
            <Text style={{ color: colors.ink.default, fontWeight: "900" }}>{n.title}</Text>
            <Text style={{ color: colors.ink.muted, marginTop: 6, lineHeight: 20 }}>{n.body}</Text>
          </AppCard>
        ))}
      </View>
      <Text style={{ color: colors.palette.primary, fontWeight: "900", marginTop: 20 }} onPress={() => router.back()}>
        Close
      </Text>
    </ScreenShell>
  );
}
