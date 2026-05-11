import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { colors } from "@/theme";

export default function SplashScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StarsWordmark large />
        <Text style={{ color: colors.ink.muted, marginTop: 16, fontSize: 14, fontWeight: "600" }}>Loading your space…</Text>
      </View>
    </SafeAreaView>
  );
}
