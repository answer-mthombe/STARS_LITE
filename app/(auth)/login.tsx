import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { InnovationLabFooter } from "@/components/ui/InnovationLabFooter";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/roles";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const show = useToastStore((s) => s.show);

  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("22001234@live.mut.ac.za");
  const [password, setPassword] = useState("password");
  const [busy, setBusy] = useState(false);

  const hint = useMemo(() => {
    if (role === "student") return "Student demo: 22001234@live.mut.ac.za / password";
    if (role === "lecturer") return "Lecturer demo: mkhize@mut.ac.za / password";
    return "Admin demo: admin@mut.ac.za / password";
  }, [role]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <StarsWordmark />
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ color: colors.palette.accent, fontSize: 26, fontWeight: "800" }}>Sign in</Text>
          <Text style={{ color: colors.ink.muted, marginTop: 8 }}>{hint}</Text>

          <View style={{ marginTop: 18, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["student", "lecturer", "admin"] as UserRole[]).map((r) => {
                const active = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRole(r);
                      if (r === "student") setEmail("22001234@live.mut.ac.za");
                      if (r === "lecturer") setEmail("mkhize@mut.ac.za");
                      if (r === "admin") setEmail("admin@mut.ac.za");
                      setPassword("password");
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 9999,
                      backgroundColor: active ? colors.palette.accent : "rgba(0,98,129,0.10)",
                      borderWidth: 1,
                      borderColor: colors.palette.accent,
                    }}
                  >
                    <Text style={{ color: active ? colors.ink.inverse : colors.palette.accent, fontWeight: "800" }}>
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

            <AppButton
              title={busy ? "Signing in…" : "Sign in"}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await login({ role, email, password });
                  router.replace("/");
                } catch (e) {
                  show({
                    type: "error",
                    title: "Sign in failed",
                    message: e instanceof Error ? e.message : "Please try again.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />

            <Pressable onPress={() => router.push("/register-student")} style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.palette.primary, fontWeight: "700" }}>Create a student account</Text>
            </Pressable>
          </View>
        </View>

        <InnovationLabFooter />
      </View>
    </SafeAreaView>
  );
}
