import { ActivityIndicator, View } from "react-native";

import { colors } from "@/theme";

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <View style={{ padding: 24, alignItems: "center", justifyContent: "center", gap: 10 }}>
      <ActivityIndicator size="small" color={colors.palette.accent} />
    </View>
  );
}
