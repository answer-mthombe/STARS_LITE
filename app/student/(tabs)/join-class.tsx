import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { moduleEnrollmentService } from "@/services/moduleEnrollmentService";
import { useToastStore } from "@/store/toastStore";

export default function StudentJoinClassScreen() {
  useRoleGuard("student");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <ScreenShell title="Join class" subtitle="Enter the class code from your lecturer" showBack>
      <AppInput label="Class code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. MUT-ITM301" />
      <View style={{ height: 14 }} />
      <AppButton
        title={busy ? "Joining…" : "Join instantly"}
        disabled={busy || !code.trim()}
        onPress={() => {
          if (!user || user.role !== "student") return;
          setBusy(true);
          try {
            moduleEnrollmentService.joinByClassCode(user.id, code);
            show({ type: "success", title: "Joined", message: "Module added to your dashboard." });
            router.replace("/student/dashboard");
          } catch (e) {
            show({ type: "error", title: "Could not join", message: e instanceof Error ? e.message : "Try again." });
          } finally {
            setBusy(false);
          }
        }}
      />
      <Text style={{ color: colors.ink.muted, marginTop: 18, lineHeight: 22 }}>
        Tip: pending requests for some modules are handled by your lecturer in Student management.
      </Text>
    </ScreenShell>
  );
}
