import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { AppButton } from "@/components/ui/AppButton";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { InnovationLabFooter } from "@/components/ui/InnovationLabFooter";
import { colors } from "@/theme";

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ color: colors.ink.subtle, fontSize: 12, fontWeight: "700", letterSpacing: 4, marginBottom: 16 }}>
            MANGOSUTHU UNIVERSITY OF TECHNOLOGY
          </Text>

          <StarsWordmark large />

          <View
            style={{
              marginTop: 20,
              height: 1,
              width: 56,
              backgroundColor: colors.palette.accent,
              opacity: 0.6,
            }}
          />

          <Text
            style={{
              color: colors.ink.default,
              fontSize: 20,
              fontWeight: "700",
              marginTop: 20,
              letterSpacing: -0.3,
              lineHeight: 28,
            }}
          >
            Smart attendance.{"\n"}
            <Text style={{ color: colors.ink.muted, fontWeight: "500", fontSize: 17 }}>One calm place for class.</Text>
          </Text>

          <Text style={{ color: colors.ink.muted, marginTop: 14, fontSize: 14, lineHeight: 22, maxWidth: 320 }}>
            Verify once, move on. Built for lecturers and students — ready to scale when you connect the cloud.
          </Text>

          <View style={{ flexDirection: "row", marginTop: 28, gap: 10, opacity: 0.45 }}>
            {["✦", "—", "✦", "—", "✦"].map((sym, i) => (
              <Text key={i} style={{ color: colors.palette.primary, fontSize: 11, letterSpacing: 8 }}>
                {sym}
              </Text>
            ))}
          </View>

          <View style={{ marginTop: 36, gap: 12 }}>
            <Link href="/login" asChild>
              <AppButton title="Sign in to STARS" variant="primary" />
            </Link>

            <Link href="/register-student" asChild>
              <AppButton title="New student — create account" variant="outline" />
            </Link>
          </View>
        </View>

        <InnovationLabFooter />
      </View>
    </SafeAreaView>
  );
}
