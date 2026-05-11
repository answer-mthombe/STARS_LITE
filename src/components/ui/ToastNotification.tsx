import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { colors } from "@/theme";
import type { Toast } from "@/store/toastStore";

export function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const bg =
    toast.type === "success"
      ? "rgba(0,98,129,0.95)"
      : toast.type === "error"
        ? "rgba(79,26,29,0.95)"
        : "rgba(0,0,0,0.85)";

  return (
    <Animated.View
      entering={FadeInDown.duration(160)}
      exiting={FadeOutUp.duration(140)}
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 18,
      }}
    >
      <View
        style={{
          backgroundColor: bg,
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 14,
          shadowColor: "rgba(0,0,0,0.22)",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Text style={{ color: colors.ink.inverse, fontWeight: "800" }}>{toast.title}</Text>
        {toast.message ? (
          <Text style={{ color: "rgba(255,255,255,0.92)", marginTop: 2 }}>{toast.message}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

