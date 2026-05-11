import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import { InnovationLabFooter } from "@/components/ui/InnovationLabFooter";
import { colors } from "@/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: colors.palette.accent, fontSize: 22, fontWeight: "900" }}>Page not found</Text>
        <Text style={{ color: colors.ink.muted, marginTop: 10, lineHeight: 22 }}>
          Route groups like (admin) are not part of the URL. STARS admin tools live at{" "}
          <Text style={{ fontWeight: "900", color: colors.ink.default }}>/admin/seed</Text>.
        </Text>
        <View style={{ height: 20 }} />
        <Link href="/admin/seed" asChild>
          <Pressable style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.palette.primary, fontWeight: "900" }}>Go to /admin/seed</Text>
          </Pressable>
        </Link>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ color: colors.palette.accent, fontWeight: "900" }}>Home</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <InnovationLabFooter />
      </View>
    </SafeAreaView>
  );
}
