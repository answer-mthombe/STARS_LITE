import "@/styles/global.css";
import "@/polyfills/setImmediate";

import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { AppProviders } from "@/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </AppProviders>
  );
}

