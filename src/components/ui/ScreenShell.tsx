import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme";
import { Header } from "./Header";
import { InnovationLabFooter } from "./InnovationLabFooter";

export function ScreenShell({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  showBack,
  hideHeader,
  showLabFooter = true,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  showBack?: boolean;
  /** Custom hero (e.g. STARS home) — no default header row */
  hideHeader?: boolean;
  showLabFooter?: boolean;
}) {
  const inner = (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: hideHeader ? 12 : 8, paddingBottom: 16 }}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      {!hideHeader && title ? <Header title={title} subtitle={subtitle} right={right} showBack={showBack} /> : null}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
      {showLabFooter ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10, backgroundColor: colors.palette.lightBg }}>
          <InnovationLabFooter />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
