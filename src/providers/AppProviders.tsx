import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { processOutboxOnce } from "@/services/offline/offlineSync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    // Simple background sync loop (push-only) — safe to call even when Firebase isn't configured yet.
    const id = setInterval(() => {
      void processOutboxOnce();
    }, 12_000);
    return () => clearInterval(id);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {children}
        <ToastNotification toast={toast} onDismiss={hide} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

