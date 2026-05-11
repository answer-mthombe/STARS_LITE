import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { ToastNotification } from "@/components/ui/ToastNotification";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {children}
        <ToastNotification toast={toast} onDismiss={hide} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

