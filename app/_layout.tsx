import "@/styles/global.css";
import "@/polyfills/setImmediate";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { AppProviders } from "@/providers/AppProviders";
import { processOutboxOnce } from "@/services/offline/offlineSync";



export default function RootLayout() {

  // === ADDED FOR JOB-022: Background Sync Loop ===
  useEffect(() => {
    // 1. Run it once immediately when the app starts
    processOutboxOnce();

    // 2. Set up a heartbeat to run it every 15 seconds
    const intervalId = setInterval(() => {
      processOutboxOnce()
        .then(({ pushed }) => {
          if (pushed > 0) {
            console.log(`[Sync] Successfully pushed ${pushed} items from offline outbox.`);
          }
        })
        .catch((err) => console.error("[Sync] Background sync error:", err));
    }, 15000); // 15,000 milliseconds = 15 seconds

    // 3. Clean up the timer if the app unmounts
    return () => clearInterval(intervalId);
  }, []);
  // ===============================================
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

